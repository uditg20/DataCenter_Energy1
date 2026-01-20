/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { POST as solve } from "../app/api/solve/route";
import { POST as solvePareto } from "../app/api/solve_pareto/route";
import { defaultScenario } from "../components/ScenarioForm";

async function callRoute(handler: (request: Request) => Promise<Response>, body = defaultScenario) {
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return handler(request);
}

describe("API routes", () => {
  it("solves single target", async () => {
    const response = await callRoute(solve);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.points.length).toBe(1);
    expect(json.points[0]).toHaveProperty("cost");
  });

  it("solves pareto sweep", async () => {
    const response = await callRoute(solvePareto);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.points.length).toBeGreaterThan(1);
    expect(json.points[0]).toHaveProperty("dispatch");
  });

  it("handles infeasible reliability", async () => {
    const response = await callRoute(solve, {
      ...defaultScenario,
      grid: { importMaxMW: 0, exportMaxMW: 0 },
      reliability: { ...defaultScenario.reliability, target: 1.0 }
    });
    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json).toHaveProperty("error");
  });
});
