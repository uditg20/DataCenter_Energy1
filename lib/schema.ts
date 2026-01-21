import { z } from "zod";

export const PiecewisePoint = z.object({
  powerMW: z.number().nonnegative(),
  workUnits: z.number().nonnegative()
});

export const GeneratorInput = z.object({
  name: z.string(),
  pMax: z.number().nonnegative(),
  marginalCost: z.number().nonnegative(),
  available: z.boolean().default(true)
});

export const ScenarioInput = z.object({
  name: z.string(),
  probability: z.number().min(0).max(1),
  gridImportCap: z.number().nonnegative(),
  generatorDerate: z.number().min(0).max(1)
});

export const WorkloadInput = z.object({
  arrivals: z.array(z.number().nonnegative()),
  deadlineHours: z.number().int().positive(),
  softSla: z.boolean(),
  penaltyDeadline: z.number().nonnegative(),
  curtailmentCap: z.number().min(0).max(1),
  piecewise: z.array(PiecewisePoint).min(2),
  minComputeMW: z.number().nonnegative()
});

export const ScenarioSchema = z.object({
  name: z.string(),
  mode: z.enum(["demo", "heavy"]),
  timeStepHours: z.number().positive(),
  baseLoadMW: z.array(z.number().nonnegative()),
  price: z.array(z.number()),
  iso: z.enum(["ERCOT", "PJM", "MISO", "SPP"]),
  applications: z.object({
    pun: z.boolean(),
    btm: z.boolean(),
    ftm: z.boolean()
  }),
  grid: z.object({
    importMaxMW: z.number().nonnegative(),
    exportMaxMW: z.number().nonnegative()
  }),
  bess: z.object({
    powerMaxMW: z.number().nonnegative(),
    energyMaxMWh: z.number().nonnegative(),
    optimizeSizing: z.boolean(),
    capexPower: z.number().nonnegative(),
    capexEnergy: z.number().nonnegative(),
    efficiencyCharge: z.number().min(0).max(1),
    efficiencyDischarge: z.number().min(0).max(1),
    degradationCost: z.number().nonnegative()
  }),
  generators: z.array(GeneratorInput),
  workload: WorkloadInput,
  reliability: z.object({
    metric: z.enum(["EUE", "LOLE", "EnergyReliability"]),
    target: z.number().min(0).max(1),
    sweep: z.array(z.number().min(0).max(1))
  }),
  scenarios: z.array(ScenarioInput)
});

export type Scenario = z.infer<typeof ScenarioSchema>;

export const ParetoPointSchema = z.object({
  reliability: z.number(),
  cost: z.number(),
  eue: z.number(),
  lole: z.number(),
  objective: z.number(),
  dispatch: z.object({
    time: z.array(z.number()),
    gridImport: z.array(z.number()),
    gridExport: z.array(z.number()),
    computePower: z.array(z.number()),
    baseLoad: z.array(z.number()),
    soc: z.array(z.number()),
    queue: z.array(z.number()),
    unserved: z.array(z.number())
  })
});

export const SolveResponseSchema = z.object({
  mode: z.enum(["demo", "heavy"]),
  points: z.array(ParetoPointSchema),
  warnings: z.array(z.string()).default([])
});

export type SolveResponse = z.infer<typeof SolveResponseSchema>;
