from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain.blueprint import PreviewData, RegionBlueprint
from app.domain.frontend import FrontendConfig
from app.domain.materials import MaterialRecord
from app.domain.project import ProjectSpec
from app.domain.validation import ValidationIssue, ValidationReport
from app.domain.workflow import ManualPatchRequest, RetryRequest
from app.services.merger import MergeResult


class ProjectRuntime(BaseModel):
    project_id: str
    spec: ProjectSpec
    materials: list[MaterialRecord]
    blueprints: list[RegionBlueprint]
    frontend_config: FrontendConfig
    merge_result: MergeResult
    validation_report: ValidationReport = Field(default_factory=ValidationReport)
    preview: PreviewData = Field(default_factory=PreviewData)
    retry_history: list[RetryRequest] = Field(default_factory=list)
    manual_patch_history: list[ManualPatchRequest] = Field(default_factory=list)
    # undo: snapshots of (global_blocks, block_region_map) before each manual patch.
    undo_stack: list[dict] = Field(default_factory=list)

    def texture_lookup(self) -> dict[str, str]:
        return {material.id: material.texture_path for material in self.materials}

    def has_block(self, coordinate: tuple[int, int, int]) -> bool:
        return coordinate in self.merge_result.global_blocks

    def block_at(self, coordinate: tuple[int, int, int]) -> str | None:
        return self.merge_result.global_blocks.get(coordinate)
