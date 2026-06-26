from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ExportFormat = Literal["litematica", "json", "mcfunction"]


class RetryRequest(BaseModel):
    target_region: str
    user_instruction: str = Field(min_length=1)
    preserve_interfaces: bool = True
    preserve_manual_edits: bool = True


class RetryResult(BaseModel):
    project_id: str
    target_region: str
    status: Literal["accepted"] = "accepted"
    detail: str


FaceSide = Literal["top", "bottom", "north", "south", "east", "west"]


class ManualPatchOperation(BaseModel):
    type: Literal["set_block", "remove_block"]
    x: int
    y: int
    z: int
    block: str | None = None
    # When set, a set_block places at the neighbor cell adjacent to (x,y,z) on this face.
    # This mirrors Minecraft: clicking a face places the block on that side, not replacing it.
    on_face: FaceSide | None = None


def neighbor_on_face(x: int, y: int, z: int, face: FaceSide) -> tuple[int, int, int]:
    if face == "top":
        return (x, y + 1, z)
    if face == "bottom":
        return (x, y - 1, z)
    if face == "north":
        return (x, y, z - 1)
    if face == "south":
        return (x, y, z + 1)
    if face == "east":
        return (x + 1, y, z)
    # west
    return (x - 1, y, z)


class ManualPatchRequest(BaseModel):
    target_region: str
    ops: list[ManualPatchOperation] = Field(default_factory=list)
    source: str = "user_manual_edit"


class ManualPatchResult(BaseModel):
    project_id: str
    target_region: str
    applied_ops: int
    status: Literal["accepted"] = "accepted"
    detail: str


class ExportRequest(BaseModel):
    format: ExportFormat


class ExportResult(BaseModel):
    project_id: str
    format: ExportFormat
    file_name: str
    content: str
