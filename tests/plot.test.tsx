import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsPanel } from "../components/ResultsPanel";

const mockResult = {
  mode: "demo" as const,
  warnings: [],
  points: [
    {
      reliability: 0.95,
      cost: 100,
      eue: 0.2,
      lole: 0,
      objective: 100,
      dispatch: {
        time: [0, 1],
        gridImport: [5, 5],
        gridExport: [0, 0],
        computePower: [2, 2],
        baseLoad: [3, 3],
        soc: [0, 0],
        queue: [0, 0],
        unserved: [0, 0]
      }
    }
  ]
};

describe("ResultsPanel", () => {
  it("renders pareto chart", () => {
    const { container } = render(<ResultsPanel result={mockResult} selected={0} onSelect={() => {}} />);
    expect(container.querySelector(".js-plotly-plot")).toBeTruthy();
  });
});
