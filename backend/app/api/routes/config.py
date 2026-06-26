from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.domain.user_config import AgentPromptStore, ModMaterialRecord, UserConfig
from app.services.singletons import config_service as service, sample_project_service as project_service

router = APIRouter(tags=["config"])


@router.get("/config")
def get_config() -> UserConfig:
    return service.get_config()


@router.put("/config")
def save_config(config: UserConfig) -> UserConfig:
    return service.save_config(config)


@router.get("/config/prompts")
def list_prompts():
    return service.list_prompt_sections()


@router.put("/config/prompts")
def save_prompts(prompts: AgentPromptStore) -> AgentPromptStore:
    return service.save_prompts(prompts)


@router.get("/mods")
def list_mods():
    return service.list_mods()


@router.post("/mods")
def add_mod(mod: ModMaterialRecord) -> ModMaterialRecord:
    return service.add_mod(mod)


@router.delete("/mods/{mod_id}")
def remove_mod(mod_id: str) -> dict:
    removed = service.remove_mod(mod_id)
    return {"removed": removed}


@router.get("/saved-projects")
def list_saved_projects():
    return service.list_saved_projects()


@router.post("/projects/{project_id}/save-as")
def save_project_as(project_id: str, body: dict) -> dict:
    name = body.get("name", project_id)
    runtime = project_service.get_runtime(project_id)
    if runtime is None:
        raise HTTPException(status_code=404, detail=f"project '{project_id}' was not found")
    spec, blocks = project_service.serialize_for_save(project_id)
    saved = service.save_project_as(name, project_id, spec, blocks)
    return {"saved": True, "name": saved.name, "block_count": len(blocks)}


@router.delete("/saved-projects/{name}")
def delete_saved_project(name: str) -> dict:
    removed = service.delete_saved_project(name)
    return {"removed": removed}


@router.post("/saved-projects/{name}/load")
def load_saved_project(name: str) -> dict:
    saved = service.load_saved_project(name)
    if saved is None:
        raise HTTPException(status_code=404, detail=f"saved project '{name}' was not found")
    runtime = project_service.restore_saved_project(saved.name, saved.spec, saved.blocks)
    return {"project_id": runtime.project_id, "loaded": True}
