"use client";

import { useState } from "react";
import { Panel } from "../components/Panel";
import { ScenarioForm, defaultScenario } from "../components/ScenarioForm";
import type { Scenario, SolveResponse } from "../lib/schema";
import { SolveResponseSchema } from "../lib/schema";
import { ResultsPanel } from "../components/ResultsPanel";

export default function HomePage() {
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSolve = async (input: Scenario) => {
    setScenario(input);
    setStatus("Solving...");
    const endpoint = input.mode === "demo" ? "/api/solve_pareto" : "/api/solve";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const json = await response.json();
    const parsed = SolveResponseSchema.safeParse(json);
    if (!parsed.success) {
      setStatus(`Error: ${parsed.error.message}`);
      return;
    }
    setResult(parsed.data);
    setSelectedIndex(0);
    setStatus(null);
  };

  const handleExportScenario = () => {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scenario.json";
    link.click();
  };

  const handleExportResults = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "results.json";
    link.click();
  };

  const handleImportScenario = (imported: Scenario) => {
    setScenario(imported);
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Data Center + BESS + Grid-Interactive Optimizer</h1>
        <p className="text-slate-600 text-base">
          Expert-grade MILP sizing and dispatch optimizer with reliability–cost Pareto frontier. Demo mode runs a small in-API
          MILP; heavy mode exports a bundle for the Python solver.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Panel title="Scenario & Execution">
          <ScenarioForm onSolve={handleSolve} onImport={handleImportScenario} />
          <div className="mt-4 flex gap-3 flex-wrap">
            <button className="px-4 py-2 rounded-lg border text-sm" onClick={handleExportScenario} type="button">
              Export Scenario JSON
            </button>
            <button className="px-4 py-2 rounded-lg border text-sm" onClick={handleExportResults} type="button">
              Export Results JSON
            </button>
          </div>
          {status && <p className="text-sm text-slate-600 mt-3">{status}</p>}
        </Panel>
        <Panel title="Model Highlights">
          <ul className="text-sm text-slate-600 space-y-2">
            <li>Deadline-aware workload buckets with soft/hard SLA penalties.</li>
            <li>Piecewise compute power curve with DVFS convex combination.</li>
            <li>Scenario-based reliability with EUE and LOLE constraints.</li>
            <li>BESS sizing, degradation cost, and non-simultaneous charge/discharge.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Results">
        {result ? (
          <ResultsPanel result={result} selected={selectedIndex} onSelect={setSelectedIndex} />
        ) : (
          <p className="text-sm text-slate-600">Run the demo scenario to view Pareto and dispatch outputs.</p>
        )}
      </Panel>
    </main>
  );
}
