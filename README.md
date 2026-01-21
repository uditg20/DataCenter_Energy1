# Data Center + BESS + Grid-Interactive Optimizer

A Vercel-ready Next.js application and a reusable Python MILP solver to size and dispatch a grid-interactive data center with BESS, generator support, and reliability-based Pareto frontiers.

## Architecture
- **Frontend**: Next.js App Router + TypeScript + Tailwind + Plotly.
- **API**: Next.js Route Handlers (`/app/api/solve`, `/app/api/solve_pareto`).
- **Solver**: Python MILP core (PuLP) for heavy mode.
- **Deployment**: One-click Vercel compatible.

## Quick Start (Demo Mode)
```bash
npm install
npm run dev
```
Open `http://localhost:3000` and run the Demo scenario.

## Heavy Solve Mode (Local/Worker)
The Python MILP solver supports full rigor and longer horizons.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r solver/requirements.txt
python -m solver.run --scenario solver/data/demo_scenario.json --pareto
```

The CLI prints a JSON results bundle compatible with the UI import.

## Export/Import Workflow
- **Export Scenario JSON** from the UI for heavy solves.
- Run `python -m solver.run --scenario <file> --pareto`.
- Copy the output JSON and re-import in the UI.

## Tests
### Node/Frontend
```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

### Python Solver
```bash
pip install -r solver/requirements.txt
pytest solver/tests
```

## Documentation
- `solver/docs/MILP_formulation.md` – full MILP equations and variables.
- `solver/docs/Papers_to_Model_Map.md` – mapping to referenced papers.

## Demo vs Heavy Mode
- **Demo**: small MILP in the serverless API for quick visualization.
- **Heavy**: Python MILP with full constraints, recommended for production-scale runs.

## Vercel Deployment
This repo is compatible with Vercel without additional configuration. Set the root to the repo root and deploy.
