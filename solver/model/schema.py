from __future__ import annotations

from pydantic import BaseModel, Field


class PiecewisePoint(BaseModel):
    powerMW: float
    workUnits: float


class GeneratorInput(BaseModel):
    name: str
    pMax: float
    marginalCost: float
    available: bool = True


class ScenarioInput(BaseModel):
    name: str
    probability: float
    gridImportCap: float
    generatorDerate: float


class WorkloadInput(BaseModel):
    arrivals: list[float]
    deadlineHours: int
    softSla: bool
    penaltyDeadline: float
    curtailmentCap: float
    piecewise: list[PiecewisePoint]
    minComputeMW: float


class Scenario(BaseModel):
    name: str
    mode: str
    timeStepHours: float
    baseLoadMW: list[float]
    price: list[float]
    iso: str
    applications: dict
    grid: dict
    bess: dict
    generators: list[GeneratorInput]
    workload: WorkloadInput
    reliability: dict
    scenarios: list[ScenarioInput]

    def horizon(self) -> int:
        return len(self.baseLoadMW)

    def validate_lengths(self) -> None:
        if len(self.baseLoadMW) != len(self.price):
            raise ValueError("baseLoadMW and price length mismatch")
        if len(self.baseLoadMW) != len(self.workload.arrivals):
            raise ValueError("baseLoadMW and arrivals length mismatch")
