# Papers → Model Mapping

This project maps the mechanisms described in:
1. **“Reliable and Grid-Interactive Data Centers…”** (arXiv:2511.08759v1)
2. **“Turning AI Data Centers into Grid-Interactive Assets”** (Emerald AI / Conductor field demo, arXiv:2507.00909v1)

## Paper 1: Reliability-Driven Grid-Interactive Data Centers

| Paper concept | Implementation | Notes |
|---|---|---|
| Deadline-aware workload flexibility | `q_{t,a}`, `served_{t,a}`, `unmet_t` in `solver/model/milp.py` | Time-to-deadline buckets with hard/soft SLA toggle.
| Piecewise compute power curve | `λ_{t,k}` convex combination and `p_compute,t`, `x_t` | Matches DVFS/power-capping idea for flexible work rate.
| Scenario-based reliability | `z_{s,t}`, `EUE`, reliability target constraints | Scenario grid import caps and generator derates.
| ε-constraint Pareto sweep | `solve_pareto()` loop with reliability target | Cost minimized for each reliability target.
| BESS coupling | SOC recursion, throughput cost, charge/discharge exclusivity | Degradation modeled via throughput.
| Grid-interactive operation | Import/export limits and price-based dispatch | PUN/BTM/FTM flags surfaced in UI for future tariff expansion.

## Paper 2: Emerald AI / Conductor Field Demo

| Paper concept | Implementation | Notes |
|---|---|---|
| Demand response and grid services | Grid import/export with price signal | Ancillary services placeholders are exposed in schema/UI for future extensions.
| Reliability under grid constraints | Scenario grid derate, generator derate | Dispatch is scenario-specific with shared sizing.
| Demonstrated operational mode | Demo mode in serverless API | Explicitly labeled as simplified small MILP.
| Deployable workflow | Next.js App Router + API routes + local Python solver | Vercel-native with heavy local execution option.

## Assumptions & Non-Implemented Items
- Reactive power / inverter polygon approximation is documented in the formulation but not enforced in demo mode.
- Ancillary services (reg/spin) are not yet activated in objective; schema hooks can be extended.
- Demand charges are not computed in demo mode; heavy solver can be extended for 15-min data.
- Contingency reserve is described in docs but not implemented in the demo API.
