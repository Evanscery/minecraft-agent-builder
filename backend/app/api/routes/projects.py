from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.domain.create_project import CreateProjectRequest
from app.domain.workflow import ExportRequest, ManualPatchRequest, RetryRequest
from app.schemas.project_api import (
    ExportResponse,
    ManualPatchResponse,
    PreviewResponse,
    ProjectStateResponse,
    ProjectSummaryResponse,
    RetryResponse,
    ValidationResponse,
)
from app.services.singletons import sample_project_service as service

router = APIRouter(prefix="/projects", tags=["projects"])


def require_runtime(project_id: str):
    runtime = service.get_runtime(project_id)
    if runtime is None:
        raise HTTPException(status_code=404, detail=f"project '{project_id}' was not found")
    return runtime


@router.post("/create", response_model=ProjectSummaryResponse)
def create_project(request: CreateProjectRequest) -> ProjectSummaryResponse:
    runtime = service.create_project(request)
    return ProjectSummaryResponse(
        project_id=runtime.project_id,
        project=runtime.spec,
        frontend_config=runtime.frontend_config,
    )


@router.post("/sample", response_model=ProjectSummaryResponse)
def create_sample_project() -> ProjectSummaryResponse:
    runtime = service.create_sample_project()
    return ProjectSummaryResponse(
        project_id=runtime.project_id,
        project=runtime.spec,
        frontend_config=runtime.frontend_config,
    )


@router.get("/{project_id}", response_model=ProjectStateResponse)
def get_project(project_id: str) -> ProjectStateResponse:
    state = service.get_project(project_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"project '{project_id}' was not found")
    return ProjectStateResponse(
        project_id=state.project_id,
        spec=state.spec,
        materials=state.materials,
        validation_report=state.validation_report,
        frontend_config=state.frontend_config,
        retry_history=state.retry_history,
        manual_patch_history=state.manual_patch_history,
    )


@router.delete("/{project_id}")
def delete_project(project_id: str) -> dict:
    removed = service.delete_project(project_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"project '{project_id}' was not found")
    return {"removed": True}


@router.get("/{project_id}/preview", response_model=PreviewResponse)
def get_project_preview(project_id: str) -> PreviewResponse:
    runtime = require_runtime(project_id)
    return PreviewResponse(project_id=runtime.project_id, preview=runtime.preview)


@router.get("/{project_id}/validation", response_model=ValidationResponse)
def get_project_validation(project_id: str) -> ValidationResponse:
    runtime = require_runtime(project_id)
    return ValidationResponse(project_id=runtime.project_id, validation_report=runtime.validation_report)


@router.post("/{project_id}/retry-region", response_model=RetryResponse)
def retry_region(project_id: str, request: RetryRequest) -> RetryResponse:
    require_runtime(project_id)
    return RetryResponse(result=service.submit_retry(project_id, request))


@router.post("/{project_id}/manual-patch", response_model=ManualPatchResponse)
def manual_patch(project_id: str, request: ManualPatchRequest) -> ManualPatchResponse:
    require_runtime(project_id)
    return ManualPatchResponse(result=service.apply_manual_patch(project_id, request))


@router.post("/{project_id}/export", response_model=ExportResponse)
def export_project(project_id: str, request: ExportRequest) -> ExportResponse:
    require_runtime(project_id)
    return ExportResponse(result=service.export_project(project_id, request))


@router.post("/{project_id}/undo")
def undo_project(project_id: str) -> dict:
    require_runtime(project_id)
    undone = service.undo(project_id)
    return {"project_id": project_id, "undone": undone}


@router.post("/{project_id}/save")
def save_project(project_id: str) -> dict:
    require_runtime(project_id)
    saved = service.save_project(project_id)
    return {"project_id": saved, "saved": True}


@router.post("/{project_id}/load")
def load_project(project_id: str) -> dict:
    require_runtime(project_id)
    loaded = service.load_project(project_id)
    return {"project_id": project_id, "loaded": loaded}
