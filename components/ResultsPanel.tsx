"use client";

import Plot from "react-plotly.js";
import type { SolveResponse } from "../lib/schema";
import { buildDispatchSeries, buildParetoSeries } from "../lib/plot";

export function ResultsPanel({ result, selected, onSelect }: { result: SolveResponse; selected: number; onSelect: (index: number) => void }) {
  const pareto = buildParetoSeries(result);
  const dispatch = buildDispatchSeries(result, selected);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Reliability–Cost Pareto Frontier</h3>
        <Plot
          data={[
            {
              x: pareto.map((p) => p.x),
              y: pareto.map((p) => p.y),
              type: "scatter",
              mode: "markers+lines",
              marker: { color: "#4f46e5", size: 9 },
              text: pareto.map((p) => p.text)
            }
          ]}
          layout={{
            autosize: true,
            height: 320,
            margin: { l: 40, r: 20, t: 10, b: 40 },
            xaxis: { title: "Reliability" },
            yaxis: { title: "Cost ($)" }
          }}
          style={{ width: "100%" }}
          onClick={(event) => {
            const pointIndex = event.points?.[0]?.pointIndex;
            if (typeof pointIndex === "number") onSelect(pointIndex);
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Dispatch Detail (Selected)</h3>
        <Plot
          data={[
            { x: dispatch.time, y: dispatch.gridImport, name: "Grid Import", type: "scatter" },
            { x: dispatch.time, y: dispatch.computePower, name: "Compute Power", type: "scatter" },
            { x: dispatch.time, y: dispatch.soc, name: "BESS SOC", type: "scatter" },
            { x: dispatch.time, y: dispatch.queue, name: "Queue", type: "scatter" }
          ]}
          layout={{
            autosize: true,
            height: 320,
            margin: { l: 40, r: 20, t: 10, b: 40 },
            xaxis: { title: "Hour" },
            yaxis: { title: "MW / MWh / Work" }
          }}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
