from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.domain.materials import ActivePalette, BuildMode

Coordinate = tuple[int, int, int]
Box = tuple[int, int, int, int, int, int]
InterfaceType = Literal["wall_connection", "main_gate", "passage", "closure"]


class Region(BaseModel):
    id: str
    box: Box
    role: str
    constraints: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_box(self) -> "Region":
        min_x, min_y, min_z, max_x, max_y, max_z = self.box
        if min_x > max_x or min_y > max_y or min_z > max_z:
            raise ValueError("region box min values must be less than or equal to max values")
        return self

    @property
    def origin(self) -> Coordinate:
        min_x, min_y, min_z, _, _, _ = self.box
        return (min_x, min_y, min_z)

    @property
    def size(self) -> Coordinate:
        min_x, min_y, min_z, max_x, max_y, max_z = self.box
        return (
            max_x - min_x + 1,
            max_y - min_y + 1,
            max_z - min_z + 1,
        )


class InterfacePosition(BaseModel):
    x: int | tuple[int, int]
    y: int | tuple[int, int]
    z: int | tuple[int, int]


class InterfaceConstraint(BaseModel):
    id: str
    between: tuple[str, str]
    type: InterfaceType
    position: InterfacePosition
    rule: str


class ProjectMeta(BaseModel):
    name: str
    size: Coordinate
    origin: Coordinate
    theme: str
    build_mode: BuildMode


class ProjectSpec(BaseModel):
    project: ProjectMeta
    active_palette: ActivePalette
    regions: list[Region]
    interfaces: list[InterfaceConstraint] = Field(default_factory=list)

    def region_map(self) -> dict[str, Region]:
        return {region.id: region for region in self.regions}
