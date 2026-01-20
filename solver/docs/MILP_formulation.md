# MILP Formulation (Data Center + BESS + Grid-Interactive Optimizer)

This formulation implements a sizing + dispatch MILP with deadline-aware workload flexibility and scenario-based reliability. All notation follows the implementation in `solver/model/milp.py`.

## Indices and Sets
- **t ∈ {1..T}** time steps (hours), Δt = `timeStepHours`.
- **a ∈ {0..L}** time-to-deadline buckets (hours remaining until deadline).
- **k ∈ {1..K}** points on compute performance-power curve.
- **g ∈ {1..G}** on-site generators.
- **s ∈ {1..S}** reliability scenarios with probability π_s.

## Parameters
- **W_t** arriving work (work units).
- **L** deadline window (hours).
- **Δt** time step size (hours).
- **P_k, X_k** compute power / work point pairs.
- **D_base,t** base (non-compute) load.
- **P_import_max**, **P_export_max** grid limits; scenario grid derate `gridImportCap`.
- **P_bess_max**, **E_bess_max** BESS nameplate bounds.
- **η_ch**, **η_dis** charge/discharge efficiencies.
- **c_deg** degradation cost per throughput.
- **c_deadline** penalty for soft SLA.
- **c_grid,t** energy price.
- **p_g,max** generator limit; scenario derate `generatorDerate`.
- **capex_P**, **capex_E** annualized sizing cost.

## Decision Variables
- **q_{t,a} ≥ 0** queued work with `a` hours remaining.
- **served_{t,a} ≥ 0** work served from bucket a at t.
- **x_t ≥ 0** total executed work at t.
- **unmet_t ≥ 0** SLA-missed work at t (soft SLA).
- **λ_{t,k} ≥ 0** convex combination weights.
- **p_compute,t ≥ 0** compute power.
- **p_ch_{s,t}, p_dis_{s,t} ≥ 0** BESS charge/discharge.
- **SOC_{s,t}** state of charge.
- **imp_{s,t}, exp_{s,t} ≥ 0** grid import/export.
- **p_g_{g,s,t} ≥ 0** generator dispatch.
- **z_{s,t} ≥ 0** unserved energy.
- **b_{s,t} ∈ {0,1}** BESS charge/discharge binary.
- **g_{s,t} ∈ {0,1}** grid import/export binary.
- **P_bess, E_bess ≥ 0** BESS sizing.

## Workload Queue with Deadline Buckets
Buckets are **time-to-deadline**. New arrivals enter bucket **L**.

**Service allocation**
- `served_{t,a} ≤ q_{t,a}`
- `Σ_a served_{t,a} = x_t`

**Queue dynamics**
- t = 1 (initial): `q_{1,L} = W_1`, `q_{1,a< L} = 0`
- t > 1: `q_{t,L} = W_t`
- t > 1, a < L: `q_{t,a} = q_{t-1,a+1} - served_{t-1,a+1}`

**Deadline handling**
- Soft SLA: `unmet_t = q_{t,0} - served_{t,0}`
- Hard SLA: `unmet_t = 0`, `served_{t,0} = q_{t,0}`

**Minimum throughput**
`Σ_t x_t ≥ (1 - curtailment_cap) Σ_t W_t`

## Compute Power Model (Piecewise Performance)
Convex combination on curve points:

- `Σ_k λ_{t,k} = 1`
- `p_compute,t = Σ_k P_k λ_{t,k}`
- `x_t = Σ_k X_k λ_{t,k}`
- optional `p_compute,t ≥ P_min`

## Electrical Power Balance
Total demand per time step:

`D_t = D_base,t + p_compute,t`

Scenario-specific power balance:

`Σ_g p_g,g,s,t + p_dis,s,t - p_ch,s,t + imp_s,t - exp_s,t + z_s,t = D_t`

**Grid and BESS exclusivity**
- `imp_s,t ≤ M * g_s,t`
- `exp_s,t ≤ M * (1 - g_s,t)`
- `p_ch,s,t ≤ P_bess * b_s,t`
- `p_dis,s,t ≤ P_bess * (1 - b_s,t)`

**SOC recursion**
`SOC_s,t = SOC_s,t-1 + η_ch p_ch,s,t Δt - (p_dis,s,t / η_dis) Δt`

## Reliability Metrics
Expected unserved energy (EUE):

`EUE = Σ_s π_s Σ_t z_s,t Δt`

Energy-based reliability metric:

`R = 1 - EUE / (Σ_t D_t Δt)`

Reliability target constraint (ε-constraint):

`EUE ≤ (1 - R_target) Σ_t D_t Δt`

## Objective
Minimize total cost:

`CAPEX = capex_P * P_bess + capex_E * E_bess`

`OPEX = Σ_s π_s Σ_t (c_grid,t * imp_s,t - c_grid,t * exp_s,t + Σ_g c_g p_g,g,s,t) Δt`

`Degradation = c_deg Σ_s π_s Σ_t (p_ch + p_dis) Δt`

`SLA = c_deadline Σ_t unmet_t`

`Minimize: CAPEX + OPEX + Degradation + SLA`

## Pareto Frontier
For each reliability target `R_target` in the sweep, solve the MILP with the ε-constraint above and collect `(cost, reliability)` points. Adjacent points enable ΔCost/ΔReliability reporting in post-processing.
