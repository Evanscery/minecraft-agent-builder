from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

BuildModeLiteral = Literal[
    "survival_friendly",
    "low_cost_survival",
    "creative_showcase",
    "rare_luxury_survival",
]


class RegionRequest(BaseModel):
    """A user-specified region box for a new project."""
    id: str
    box: tuple[int, int, int, int, int, int]
    role: str = ""

    @model_validator(mode="after")
    def validate_box(self) -> "RegionRequest":
        min_x, min_y, min_z, max_x, max_y, max_z = self.box
        if min_x > max_x or min_y > max_y or min_z > max_z:
            raise ValueError("region box min values must be <= max values")
        return self


class CreateProjectRequest(BaseModel):
    """Structured new-project request — no natural language needed."""
    name: str = Field(min_length=1)
    size: tuple[int, int, int] = Field(default=(16, 16, 16))
    origin: tuple[int, int, int] = Field(default=(0, 64, 0))
    theme: str = "custom"
    build_mode: BuildModeLiteral = "survival_friendly"
    version: str = "1.20.1"
    # Optional explicit regions. If omitted, a single region covering the whole box is created.
    regions: list[RegionRequest] = Field(default_factory=list)
    # Optional initial fills: {region_id, from, to, block} to lay a base (e.g. a floor).
    base_fills: list[dict] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_size(self) -> "CreateProjectRequest":
        sx, sy, sz = self.size
        if sx <= 0 or sy <= 0 or sz <= 0:
            raise ValueError("size must be positive")
        return self


class CreateProjectResult(BaseModel):
    project_id: str
    created: bool = True
