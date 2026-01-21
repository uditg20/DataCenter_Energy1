"use client";

import { useMemo, useState } from "react";
import { ScenarioSchema, type Scenario } from "../lib/schema";

const demoScenario: Scenario = {
  name: "Demo",
  mode: "demo",
  timeStepHours: 1,
  baseLoadMW: [8, 7, 6, 6, 7, 9, 10, 11],
  price: [40, 42, 38, 35, 44, 50, 55, 48],
  iso: "ERCOT",
  applications: { pun: true, btm: false, ftm: false },
  grid: { importMaxMW: 20, exportMaxMW: 5 },
  bess: {
    powerMaxMW: 5,
    energyMaxMWh: 10,
    optimizeSizing: false,
    capexPower: 120000,
    capexEnergy: 80000,
    efficiencyCharge: 0.95,
    efficiencyDischarge: 0.95,
    degradationCost: 3
  },
  generators: [{ name: "Gas Turbine", pMax: 5, marginalCost: 70, available: true }],
  workload: {
    arrivals: [6, 6, 6, 7, 8, 9, 10, 8],
    deadlineHours: 4,
    softSla: true,
    penaltyDeadline: 150,
    curtailmentCap: 0.1,
    piecewise: [
      { powerMW: 2, workUnits: 4 },
      { powerMW: 4, workUnits: 7 },
      { powerMW: 6, workUnits: 10 }
    ],
    minComputeMW: 1
  },
  reliability: {
    metric: "EnergyReliability",
    target: 0.98,
    sweep: [0.9, 0.95, 0.98]
  },
  scenarios: [
    { name: "Base", probability: 0.8, gridImportCap: 20, generatorDerate: 1 },
    { name: "Contingency", probability: 0.2, gridImportCap: 10, generatorDerate: 0.5 }
  ]
};

export function ScenarioForm({
  onSolve,
  onImport
}: {
  onSolve: (scenario: Scenario) => void;
  onImport: (scenario: Scenario) => void;
}) {
  const [mode, setMode] = useState<"demo" | "heavy">("demo");
  const [error, setError] = useState<string | null>(null);

  const prepared = useMemo(() => ({ ...demoScenario, mode }), [mode]);

  const handleSolve = () => {
    const parse = ScenarioSchema.safeParse(prepared);
    if (!parse.success) {
      setError(parse.error.message);
      return;
    }
    setError(null);
    onSolve(parse.data);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as Scenario;
        const parse = ScenarioSchema.safeParse(json);
        if (!parse.success) {
          setError(parse.error.message);
          return;
        }
        setError(null);
        onImport(parse.data);
      } catch (err) {
        setError(`Invalid JSON: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Execution Mode</label>
        <button
          className={`px-3 py-1 rounded-full border ${mode === "demo" ? "bg-slate-900 text-white" : "bg-white"}`}
          onClick={() => setMode("demo")}
          type="button"
        >
          Demo (serverless)
        </button>
        <button
          className={`px-3 py-1 rounded-full border ${mode === "heavy" ? "bg-slate-900 text-white" : "bg-white"}`}
          onClick={() => setMode("heavy")}
          type="button"
        >
          Heavy (local/worker)
        </button>
      </div>
      <div className="text-sm text-slate-600">
        {mode === "demo" ? (
          <p>
            Demo mode runs a tiny MILP in the serverless API with a short horizon. Heavy mode exports a bundle for local/worker
            execution with the full Python solver.
          </p>
        ) : (
          <p>
            Heavy mode uses the Python MILP solver. Export the scenario bundle and run <code>python -m solver.run</code> locally
            or point to an external worker endpoint.
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
          onClick={handleSolve}
          type="button"
        >
          Run Demo Scenario
        </button>
        <label className="px-4 py-2 rounded-lg border text-sm cursor-pointer">
          Import Scenario JSON
          <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
        </label>
      </div>
    </div>
  );
}

export const defaultScenario = demoScenario;
