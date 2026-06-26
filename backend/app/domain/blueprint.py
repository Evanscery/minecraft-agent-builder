from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.domain.project import Coordinate, InterfaceConstraint, Region
from app.domain.validation import ValidationIssue


class FillOperation(BaseModel):
    from_: Coordinate = Field(alias="from")
    to: Coordinate
    block: str

    @model_validator(mode="after")
    def validate_bounds(self) -> "FillOperation":
        for start, end in zip(self.from_, self.to):
            if start > end:
                raise ValueError("fill operation start must be less than or equal to end")
        return self


class FillOperationWrapper(BaseModel):
    fill: FillOperation


class BlockPlacement(BaseModel):
    x: int
    y: int
    z: int
    block: str

    @classmethod
    def from_sequence(cls, value: tuple[int, int, int, str] | list[object]) -> "BlockPlacement":
        x, y, z, block = value
        return cls(x=int(x), y=int(y), z=int(z), block=str(block))

    def coordinate(self) -> Coordinate:
        return (self.x, self.y, self.z)


class RegionBlueprint(BaseModel):
    region_id: str
    ops: list[FillOperationWrapper] = Field(default_factory=list)
    blocks: list[BlockPlacement] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_blocks(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        raw_blocks = data.get("blocks", [])
        data["blocks"] = [
            BlockPlacement.from_sequence(item) if isinstance(item, (tuple, list)) else item
            for item in raw_blocks
        ]
        return data


class ExpandedBlock(BaseModel):
    region_id: str
    local: Coordinate
    global_coord: Coordinate
    block: str
    source: Literal["op", "block"]


class PreviewBlock(BaseModel):
    x: int
    y: int
    z: int
    block: str
    region: str
    texture: str | None = None


class PreviewData(BaseModel):
    blocks: list[PreviewBlock]
    regions: list[Region]
    interfaces: list[InterfaceConstraint] = Field(default_factory=list)
    errors: list[ValidationIssue] = Field(default_factory=list)
