from __future__ import annotations

import argparse
import json
from pathlib import Path

from solver.model.milp import solve_pareto
from solver.model.schema import Scenario


def main() -> None:
    parser = argparse.ArgumentParser(description="Run data center + BESS MILP optimizer")
    parser.add_argument("--scenario", required=True, help="Path to scenario JSON")
    parser.add_argument("--pareto", action="store_true", help="Solve Pareto sweep")
    args = parser.parse_args()

    scenario_path = Path(args.scenario)
    scenario = Scenario.model_validate_json(scenario_path.read_text())

    targets = scenario.reliability["sweep"] if args.pareto else [scenario.reliability["target"]]
    results = solve_pareto(scenario, targets)

    output = {
        "mode": "heavy",
        "points": [
            {
                "reliability": result.reliability,
                "cost": result.cost,
                "eue": result.eue,
                "lole": result.lole,
                "objective": result.objective,
                "dispatch": result.dispatch
            }
            for result in results
        ],
        "warnings": []
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
