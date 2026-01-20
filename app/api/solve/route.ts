import { NextResponse } from "next/server";
import { ScenarioSchema } from "../../../lib/schema";
import { solveDemoScenario } from "../../../lib/demoSolver";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = ScenarioSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const scenario = parsed.data;
  const warnings: string[] = [];
  if (scenario.mode === "heavy") {
    warnings.push(
      "Heavy mode is not executed in the serverless API. Download the scenario JSON and run `python -m solver.run --scenario <file> --pareto` locally or on a worker."
    );
  }

  try {
    const point = solveDemoScenario(scenario, scenario.reliability.target);
    return NextResponse.json({
      mode: scenario.mode,
      points: [
        {
          reliability: point.reliability,
          cost: point.cost,
          eue: point.eue,
          lole: point.lole,
          objective: point.cost,
          dispatch: point.dispatch
        }
      ],
      warnings
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
