from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pulp

from .schema import Scenario


@dataclass
class SolveResult:
    objective: float
    cost: float
    reliability: float
    eue: float
    lole: float
    dispatch: Dict[str, List[float]]


def _build_model(scenario: Scenario, reliability_target: float | None) -> Tuple[pulp.LpProblem, Dict]:
    scenario.validate_lengths()
    t_range = range(scenario.horizon())
    dt = scenario.timeStepHours
    L = scenario.workload.deadlineHours
    a_range = range(L + 1)

    model = pulp.LpProblem("datacenter_bess_dispatch", pulp.LpMinimize)

    p_bess = pulp.LpVariable("P_bess", lowBound=0, upBound=scenario.bess["powerMaxMW"])
    e_bess = pulp.LpVariable("E_bess", lowBound=0, upBound=scenario.bess["energyMaxMWh"])

    if not scenario.bess["optimizeSizing"]:
        model += p_bess == scenario.bess["powerMaxMW"]
        model += e_bess == scenario.bess["energyMaxMWh"]

    # Workload queue
    q = pulp.LpVariable.dicts("q", (t_range, a_range), lowBound=0)
    served = pulp.LpVariable.dicts("served", (t_range, a_range), lowBound=0)
    unmet = pulp.LpVariable.dicts("unmet", t_range, lowBound=0)
    x = pulp.LpVariable.dicts("x", t_range, lowBound=0)
    p_compute = pulp.LpVariable.dicts("p_compute", t_range, lowBound=0)

    # Piecewise performance-power
    piecewise = scenario.workload.piecewise
    lambda_var = pulp.LpVariable.dicts(
        "lambda", (t_range, range(len(piecewise))), lowBound=0, upBound=1
    )

    for t in t_range:
        model += pulp.lpSum(lambda_var[t][k] for k in range(len(piecewise))) == 1
        model += p_compute[t] == pulp.lpSum(piecewise[k].powerMW * lambda_var[t][k] for k in range(len(piecewise)))
        model += x[t] == pulp.lpSum(piecewise[k].workUnits * lambda_var[t][k] for k in range(len(piecewise)))
        model += p_compute[t] >= scenario.workload.minComputeMW

        model += pulp.lpSum(served[t][a] for a in a_range) == x[t]
        for a in a_range:
            model += served[t][a] <= q[t][a]

    for t in t_range:
        for a in a_range:
            if t == 0:
                if a == L:
                    model += q[t][a] == scenario.workload.arrivals[t]
                else:
                    model += q[t][a] == 0
            else:
                if a == L:
                    model += q[t][a] == scenario.workload.arrivals[t]
                else:
                    model += q[t][a] == q[t - 1][a + 1] - served[t - 1][a + 1]

        if scenario.workload.softSla:
            model += unmet[t] == q[t][0] - served[t][0]
        else:
            model += unmet[t] == 0
            model += served[t][0] == q[t][0]

    # Optional min throughput
    total_work = sum(scenario.workload.arrivals)
    model += pulp.lpSum(x[t] for t in t_range) >= (1 - scenario.workload.curtailmentCap) * total_work

    scenarios = scenario.scenarios
    s_range = range(len(scenarios))

    # Scenario-specific dispatch
    p_ch = pulp.LpVariable.dicts("p_ch", (s_range, t_range), lowBound=0)
    p_dis = pulp.LpVariable.dicts("p_dis", (s_range, t_range), lowBound=0)
    soc = pulp.LpVariable.dicts("soc", (s_range, t_range), lowBound=0)
    imp = pulp.LpVariable.dicts("imp", (s_range, t_range), lowBound=0)
    exp = pulp.LpVariable.dicts("exp", (s_range, t_range), lowBound=0)
    z = pulp.LpVariable.dicts("unserved", (s_range, t_range), lowBound=0)
    charge_bin = pulp.LpVariable.dicts("charge_bin", (s_range, t_range), lowBound=0, upBound=1, cat="Binary")
    grid_bin = pulp.LpVariable.dicts("grid_bin", (s_range, t_range), lowBound=0, upBound=1, cat="Binary")

    gens = scenario.generators
    p_gen = pulp.LpVariable.dicts("p_gen", (range(len(gens)), s_range, t_range), lowBound=0)

    for s_idx, s in enumerate(scenarios):
        for t in t_range:
            model += p_ch[s_idx][t] <= p_bess * charge_bin[s_idx][t]
            model += p_dis[s_idx][t] <= p_bess * (1 - charge_bin[s_idx][t])
            model += imp[s_idx][t] <= s.gridImportCap * grid_bin[s_idx][t]
            model += exp[s_idx][t] <= scenario.grid["exportMaxMW"] * (1 - grid_bin[s_idx][t])

            if t == 0:
                model += soc[s_idx][t] == (
                    scenario.bess["efficiencyCharge"] * p_ch[s_idx][t] * dt
                    - p_dis[s_idx][t] / scenario.bess["efficiencyDischarge"] * dt
                )
            else:
                model += soc[s_idx][t] == (
                    soc[s_idx][t - 1]
                    + scenario.bess["efficiencyCharge"] * p_ch[s_idx][t] * dt
                    - p_dis[s_idx][t] / scenario.bess["efficiencyDischarge"] * dt
                )
            model += soc[s_idx][t] <= e_bess

            load = scenario.baseLoadMW[t] + p_compute[t]
            model += (
                pulp.lpSum(p_gen[g][s_idx][t] for g in range(len(gens)))
                + p_dis[s_idx][t]
                - p_ch[s_idx][t]
                + imp[s_idx][t]
                - exp[s_idx][t]
                + z[s_idx][t]
                == load
            )

            for g_idx, g in enumerate(gens):
                model += p_gen[g_idx][s_idx][t] <= g.pMax * s.generatorDerate

    # Reliability metric: EUE
    total_demand = sum(scenario.baseLoadMW) * dt
    eue = pulp.lpSum(scenarios[s_idx].probability * pulp.lpSum(z[s_idx][t] * dt for t in t_range) for s_idx in s_range)
    if reliability_target is not None:
        model += eue <= (1 - reliability_target) * total_demand

    # Objective
    capex = scenario.bess["capexPower"] * p_bess + scenario.bess["capexEnergy"] * e_bess
    energy_cost = pulp.lpSum(
        scenarios[s_idx].probability
        * pulp.lpSum(
            scenario.price[t] * imp[s_idx][t] * dt - scenario.price[t] * exp[s_idx][t] * dt
            for t in t_range
        )
        for s_idx in s_range
    )
    gen_cost = pulp.lpSum(
        scenarios[s_idx].probability
        * pulp.lpSum(gens[g_idx].marginalCost * p_gen[g_idx][s_idx][t] * dt for g_idx in range(len(gens)) for t in t_range)
        for s_idx in s_range
    )
    degradation = scenario.bess["degradationCost"] * pulp.lpSum(
        scenarios[s_idx].probability * pulp.lpSum((p_ch[s_idx][t] + p_dis[s_idx][t]) * dt for t in t_range)
        for s_idx in s_range
    )
    sla_penalty = scenario.workload.penaltyDeadline * pulp.lpSum(unmet[t] for t in t_range)

    model += capex + energy_cost + gen_cost + degradation + sla_penalty

    var_map = {
        "p_compute": p_compute,
        "p_gen": p_gen,
        "imp": imp,
        "exp": exp,
        "soc": soc,
        "z": z,
        "q": q,
        "p_ch": p_ch,
        "p_dis": p_dis,
        "unmet": unmet
    }
    return model, var_map


def solve(scenario: Scenario, reliability_target: float | None = None) -> SolveResult:
    model, var_map = _build_model(scenario, reliability_target)
    solver = pulp.PULP_CBC_CMD(msg=False)
    model.solve(solver)

    t_range = range(scenario.horizon())
    dt = scenario.timeStepHours
    scenarios = scenario.scenarios

    imp = np.array([[pulp.value(var_map["imp"][s_idx][t]) for t in t_range] for s_idx in range(len(scenarios))])
    exp = np.array([[pulp.value(var_map["exp"][s_idx][t]) for t in t_range] for s_idx in range(len(scenarios))])
    soc = np.array([[pulp.value(var_map["soc"][s_idx][t]) for t in t_range] for s_idx in range(len(scenarios))])
    z = np.array([[pulp.value(var_map["z"][s_idx][t]) for t in t_range] for s_idx in range(len(scenarios))])
    p_compute = np.array([pulp.value(var_map["p_compute"][t]) for t in t_range])
    p_ch = np.array([[pulp.value(var_map["p_ch"][s_idx][t]) for t in t_range] for s_idx in range(len(scenarios))])
    p_dis = np.array([[pulp.value(var_map["p_dis"][s_idx][t]) for t in t_range] for s_idx in range(len(scenarios))])
    unmet = np.array([pulp.value(var_map["unmet"][t]) for t in t_range])

    expected_imp = np.average(imp, axis=0, weights=[s.probability for s in scenarios])
    expected_exp = np.average(exp, axis=0, weights=[s.probability for s in scenarios])
    expected_soc = np.average(soc, axis=0, weights=[s.probability for s in scenarios])
    expected_z = np.average(z, axis=0, weights=[s.probability for s in scenarios])
    expected_ch = np.average(p_ch, axis=0, weights=[s.probability for s in scenarios])
    expected_dis = np.average(p_dis, axis=0, weights=[s.probability for s in scenarios])

    eue = float(np.sum(expected_z) * dt)
    total_demand = float(np.sum(scenario.baseLoadMW) * dt)
    reliability = 1 - eue / total_demand if total_demand > 0 else 1.0

    return SolveResult(
        objective=float(pulp.value(model.objective)),
        cost=float(pulp.value(model.objective)),
        reliability=reliability,
        eue=eue,
        lole=float(np.sum(expected_z > 1e-3)),
        dispatch={
            "time": list(range(scenario.horizon())),
            "gridImport": expected_imp.tolist(),
            "gridExport": expected_exp.tolist(),
            "computePower": p_compute.tolist(),
            "baseLoad": scenario.baseLoadMW,
            "soc": expected_soc.tolist(),
            "queue": [float(pulp.value(var_map["q"][t][0])) for t in t_range],
            "unserved": expected_z.tolist(),
            "charge": expected_ch.tolist(),
            "discharge": expected_dis.tolist(),
            "unmet": unmet.tolist()
        }
    )


def solve_pareto(scenario: Scenario, targets: List[float]) -> List[SolveResult]:
    results: List[SolveResult] = []
    for target in targets:
        results.append(solve(scenario, reliability_target=target))
    return results
