import solver from "javascript-lp-solver";
import type { Scenario } from "./schema";

export type DemoSolution = {
  cost: number;
  reliability: number;
  eue: number;
  lole: number;
  dispatch: {
    time: number[];
    gridImport: number[];
    gridExport: number[];
    computePower: number[];
    baseLoad: number[];
    soc: number[];
    queue: number[];
    unserved: number[];
  };
};

export function solveDemoScenario(input: Scenario, reliabilityTarget?: number): DemoSolution {
  const T = input.baseLoadMW.length;
  const dt = input.timeStepHours;
  const points = input.workload.piecewise;

  const model: solver.Model = {
    optimize: "cost",
    opType: "min",
    constraints: {},
    variables: {},
    ints: {}
  };

  for (let t = 0; t < T; t += 1) {
    model.constraints[`balance_${t}`] = { equal: input.baseLoadMW[t] };
    model.constraints[`import_cap_${t}`] = { max: input.grid.importMaxMW };
    model.constraints[`export_cap_${t}`] = { max: input.grid.exportMaxMW };
    model.constraints[`compute_min_${t}`] = { min: input.workload.minComputeMW };
    model.constraints[`unserved_${t}`] = { min: 0 };
    model.constraints[`compute_link_${t}`] = { equal: 0 };
    model.constraints[`lambda_sum_${t}`] = { equal: 1 };

    points.forEach((_, k) => {
      model.constraints[`lambda_${t}_${k}`] = { min: 0 };
    });

    const impVar = `imp_${t}`;
    const expVar = `exp_${t}`;
    const computeVar = `compute_${t}`;
    const unservedVar = `unserved_${t}`;

    model.variables[impVar] = {
      cost: input.price[t] * dt,
      [`balance_${t}`]: 1,
      [`import_cap_${t}`]: 1
    };
    model.variables[expVar] = {
      cost: -input.price[t] * dt,
      [`balance_${t}`]: -1,
      [`export_cap_${t}`]: 1
    };
    model.variables[computeVar] = {
      cost: 0,
      [`balance_${t}`]: -1,
      [`compute_min_${t}`]: 1,
      [`compute_link_${t}`]: 1
    };
    model.variables[unservedVar] = {
      cost: 1000,
      [`balance_${t}`]: 1,
      [`unserved_${t}`]: 1
    };

    points.forEach((point, k) => {
      const lambdaVar = `lambda_${t}_${k}`;
      model.variables[lambdaVar] = {
        cost: 0,
        [`lambda_${t}_${k}`]: 1,
        [`lambda_sum_${t}`]: 1,
        [`compute_link_${t}`]: -point.powerMW
      };
    });
  }

  if (reliabilityTarget !== undefined) {
    const totalDemand = input.baseLoadMW.reduce((a, b) => a + b, 0) * dt;
    model.constraints["eue_target"] = { max: (1 - reliabilityTarget) * totalDemand };
    for (let t = 0; t < T; t += 1) {
      model.variables[`unserved_${t}`]["eue_target"] = dt;
    }
  }

  const result = solver.Solve(model);
  if (result.feasible === false) {
    throw new Error("Demo MILP infeasible for requested reliability target.");
  }

  const gridImport: number[] = [];
  const gridExport: number[] = [];
  const computePower: number[] = [];
  const baseLoad: number[] = [];
  const soc: number[] = [];
  const queue: number[] = [];
  const unserved: number[] = [];

  for (let t = 0; t < T; t += 1) {
    gridImport.push(result[`imp_${t}`] ?? 0);
    gridExport.push(result[`exp_${t}`] ?? 0);
    computePower.push(result[`compute_${t}`] ?? 0);
    baseLoad.push(input.baseLoadMW[t]);
    soc.push(0);
    queue.push(0);
    unserved.push(result[`unserved_${t}`] ?? 0);
  }

  const eue = unserved.reduce((sum, value) => sum + value * dt, 0);
  const totalDemand = input.baseLoadMW.reduce((sum, value) => sum + value * dt, 0);
  const reliability = totalDemand > 0 ? 1 - eue / totalDemand : 1;

  return {
    cost: result.result ?? 0,
    reliability,
    eue,
    lole: unserved.filter((value) => value > 1e-3).length,
    dispatch: {
      time: Array.from({ length: T }, (_, i) => i),
      gridImport,
      gridExport,
      computePower,
      baseLoad,
      soc,
      queue,
      unserved
    }
  };
}
