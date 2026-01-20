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
  warnings.push("Demo mode uses a small in-API MILP with simplified constraints. Use heavy mode for full rigor.");

  try {
    const points = scenario.reliability.sweep.map((target) => {
      const solution = solveDemoScenario(scenario, target);
      return {
        reliability: solution.reliability,
        cost: solution.cost,
        eue: solution.eue,
        lole: solution.lole,
        objective: solution.cost,
        dispatch: solution.dispatch
      };
    });

    return NextResponse.json({ mode: scenario.mode, points, warnings });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
