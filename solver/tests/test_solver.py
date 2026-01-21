import math

from solver.model.milp import solve, solve_pareto
from solver.model.schema import Scenario


def build_base_scenario() -> Scenario:
    return Scenario.model_validate(
        {
            "name": "Toy",
            "mode": "heavy",
            "timeStepHours": 1,
            "baseLoadMW": [5, 5, 5, 5],
            "price": [10, 10, 10, 10],
            "iso": "ERCOT",
            "applications": {"pun": True, "btm": False, "ftm": False},
            "grid": {"importMaxMW": 20, "exportMaxMW": 0},
            "bess": {
                "powerMaxMW": 0,
                "energyMaxMWh": 0,
                "optimizeSizing": False,
                "capexPower": 0,
                "capexEnergy": 0,
                "efficiencyCharge": 0.95,
                "efficiencyDischarge": 0.95,
                "degradationCost": 0,
            },
            "generators": [],
            "workload": {
                "arrivals": [0, 0, 0, 0],
                "deadlineHours": 2,
                "softSla": True,
                "penaltyDeadline": 0,
                "curtailmentCap": 0,
                "piecewise": [
                    {"powerMW": 0, "workUnits": 0},
                    {"powerMW": 1, "workUnits": 1},
                ],
                "minComputeMW": 0,
            },
            "reliability": {"metric": "EnergyReliability", "target": 1.0, "sweep": [0.9, 0.95, 1.0]},
            "scenarios": [
                {"name": "Base", "probability": 1.0, "gridImportCap": 20, "generatorDerate": 1.0}
            ],
        }
    )


def test_toy_case_objective():
    scenario = build_base_scenario()
    result = solve(scenario, reliability_target=1.0)
    assert math.isclose(result.cost, 200.0, rel_tol=1e-4)


def test_soc_recursion():
    scenario = build_base_scenario()
    scenario.bess["powerMaxMW"] = 2
    scenario.bess["energyMaxMWh"] = 2
    scenario.bess["optimizeSizing"] = False
    result = solve(scenario, reliability_target=1.0)
    soc = result.dispatch["soc"]
    charge = result.dispatch["charge"]
    discharge = result.dispatch["discharge"]
    eta_c = scenario.bess["efficiencyCharge"]
    eta_d = scenario.bess["efficiencyDischarge"]
    for t in range(len(soc)):
        if t == 0:
            expected = eta_c * charge[t] - discharge[t] / eta_d
        else:
            expected = soc[t - 1] + eta_c * charge[t] - discharge[t] / eta_d
        assert math.isclose(soc[t], expected, rel_tol=1e-6, abs_tol=1e-6)


def test_no_simultaneous_import_export_or_charge_discharge():
    scenario = build_base_scenario()
    result = solve(scenario, reliability_target=1.0)
    for imp, exp in zip(result.dispatch["gridImport"], result.dispatch["gridExport"]):
        assert not (imp > 1e-6 and exp > 1e-6)
    for ch, dis in zip(result.dispatch["charge"], result.dispatch["discharge"]):
        assert not (ch > 1e-6 and dis > 1e-6)


def test_deadline_feasibility_hard_sla():
    scenario = build_base_scenario()
    scenario.workload.arrivals = [2, 2, 2, 2]
    scenario.workload.softSla = False
    scenario.workload.piecewise = [
        {"powerMW": 0, "workUnits": 0},
        {"powerMW": 5, "workUnits": 5},
    ]
    result = solve(scenario, reliability_target=1.0)
    assert all(unmet <= 1e-6 for unmet in result.dispatch["unmet"])


def test_scenario_reliability_aggregation():
    scenario = build_base_scenario()
    scenario.scenarios = [
        {"name": "Base", "probability": 0.7, "gridImportCap": 20, "generatorDerate": 1.0},
        {"name": "Outage", "probability": 0.3, "gridImportCap": 0, "generatorDerate": 0.0},
    ]
    result = solve(scenario, reliability_target=0.0)
    expected_eue = sum(result.dispatch["unserved"]) * scenario.timeStepHours
    assert math.isclose(result.eue, expected_eue, rel_tol=1e-5)


def test_pareto_monotonicity():
    scenario = build_base_scenario()
    targets = [0.5, 0.8, 1.0]
    results = solve_pareto(scenario, targets)
    costs = [r.cost for r in results]
    assert costs[0] <= costs[1] + 1e-6
    assert costs[1] <= costs[2] + 1e-6
