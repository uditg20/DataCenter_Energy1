import type { SolveResponse } from "./schema";

export function buildParetoSeries(result: SolveResponse) {
  return result.points.map((point) => ({
    x: point.reliability,
    y: point.cost,
    text: `EUE ${point.eue.toFixed(3)}`
  }));
}

export function buildDispatchSeries(result: SolveResponse, index: number) {
  const point = result.points[index];
  return {
    time: point.dispatch.time,
    gridImport: point.dispatch.gridImport,
    gridExport: point.dispatch.gridExport,
    computePower: point.dispatch.computePower,
    baseLoad: point.dispatch.baseLoad,
    soc: point.dispatch.soc,
    queue: point.dispatch.queue,
    unserved: point.dispatch.unserved
  };
}
