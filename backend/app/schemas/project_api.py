from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain.blueprint import PreviewData
from app.domain.frontend import FrontendConfig
from app.domain.materials import MaterialRecord
from app.domain.project import ProjectSpec
from app.domain.validation import ValidationReport
from app.domain.workflow import ExportResult, ManualPatchRequest, ManualPatchResult, RetryRequest, RetryResult


class ProjectSummaryResponse(BaseModel):
    project_id: str
    project: ProjectSpec
    frontend_config: FrontendConfig


class ProjectStateResponse(BaseModel):
    project_id: str
    spec: ProjectSpec
    materials: list[MaterialRecord]
    validation_report: ValidationReport
    frontend_config: FrontendConfig
    retry_history: list[RetryRequest] = Field(default_factory=list)
    manual_patch_history: list[ManualPatchRequest] = Field(default_factory=list)


class PreviewResponse(BaseModel):
    project_id: str
    preview: PreviewData


class ValidationResponse(BaseModel):
    project_id: str
    validation_report: ValidationReport


class RetryResponse(BaseModel):
    result: RetryResult


class ManualPatchResponse(BaseModel):
    result: ManualPatchResult


class ExportResponse(BaseModel):
    result: ExportResult


class ErrorResponse(BaseModel):
    detail: str
