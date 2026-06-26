from __future__ import annotations

from datetime import datetime, timezone

from app.domain.user_config import (
    AgentPromptSection,
    AgentPromptStore,
    ModMaterialRecord,
    SavedProject,
    UserConfig,
)
from app.services.persistence import JsonStore

DEFAULT_PROMPTS = AgentPromptStore(
    global_planner=(
        "You are the Global Planner. Given a user's natural-language build request, "
        "output a project spec: total size, region split, region roles, the active palette, "
        "and interface constraints between regions. Never emit raw blocks."
    ),
    material_planner=(
        "You are the Material Planner. Choose an active palette from the material database "
        "that matches the build_mode and theme. Output slots: wall, roof, floor, glass, light, air."
    ),
    region_generator=(
        "You are a Region Generator Agent. Given one region's box, role, active palette, "
        "and interfaces, emit a region blueprint using fill ops + sparse blocks in LOCAL coordinates."
    ),
    repair_agent=(
        "You are the Repair Agent. Given a validation report for one region, emit a patch "
        "that fixes only the reported issues while preserving interfaces and manual edits."
    ),
    visual_calibration=(
        "You are the Visual Calibration critic. Given multi-view screenshots, output structured "
        "critiques per region with concrete suggestions. Do not emit blocks."
    ),
)


class ConfigService:
    def __init__(self) -> None:
        self.config_store = JsonStore("config.json")
        self.prompt_store = JsonStore("agent_prompts.json")
        self.mod_store = JsonStore("mods.json")
        self.saves_store = JsonStore("saved_projects.json")

    # --- user config ---
    def get_config(self) -> UserConfig:
        data = self.config_store.read({})
        return UserConfig.model_validate(data) if data else UserConfig()

    def save_config(self, config: UserConfig) -> UserConfig:
        self.config_store.write(config.model_dump(mode="json"))
        return config

    # --- agent prompts ---
    def get_prompts(self) -> AgentPromptStore:
        data = self.prompt_store.read({})
        if not data:
            return DEFAULT_PROMPTS
        return AgentPromptStore.model_validate({**DEFAULT_PROMPTS.model_dump(), **data})

    def save_prompts(self, prompts: AgentPromptStore) -> AgentPromptStore:
        self.prompt_store.write(prompts.model_dump(mode="json"))
        return prompts

    def list_prompt_sections(self) -> list[AgentPromptSection]:
        prompts = self.get_prompts()
        meta = {
            "global_planner": ("Global Planner", "全局规划：区域拆分与接口约束"),
            "material_planner": ("Material Planner", "材料规划：active palette"),
            "region_generator": ("Region Generator", "局部区域蓝图生成"),
            "repair_agent": ("Repair Agent", "根据校验报告修复局部"),
            "visual_calibration": ("Visual Calibration", "多视图视觉校准批判"),
        }
        result = []
        for field_id in ("global_planner", "material_planner", "region_generator", "repair_agent", "visual_calibration"):
            name, desc = meta[field_id]
            result.append(AgentPromptSection(id=field_id, name=name, description=desc, template=getattr(prompts, field_id)))
        return result

    # --- mods ---
    def list_mods(self) -> list[ModMaterialRecord]:
        data = self.mod_store.read([])
        return [ModMaterialRecord.model_validate(item) for item in data]

    def add_mod(self, mod: ModMaterialRecord) -> ModMaterialRecord:
        mods = self.list_mods()
        mods = [m for m in mods if m.id != mod.id]
        mods.append(mod)
        self.mod_store.write([m.model_dump(mode="json") for m in mods])
        return mod

    def remove_mod(self, mod_id: str) -> bool:
        mods = self.list_mods()
        remaining = [m for m in mods if m.id != mod_id]
        self.mod_store.write([m.model_dump(mode="json") for m in remaining])
        return len(remaining) < len(mods)

    # --- save-as ---
    def list_saved_projects(self) -> list[SavedProject]:
        data = self.saves_store.read([])
        return [SavedProject.model_validate(item) for item in data]

    def save_project_as(self, name: str, project_id: str, spec: dict, blocks: list[dict]) -> SavedProject:
        saved = SavedProject(
            name=name,
            project_id=project_id,
            spec=spec,
            blocks=blocks,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        all_saves = self.list_saved_projects()
        all_saves = [s for s in all_saves if s.name != name]
        all_saves.append(saved)
        self.saves_store.write([s.model_dump(mode="json") for s in all_saves])
        return saved

    def load_saved_project(self, name: str) -> SavedProject | None:
        for s in self.list_saved_projects():
            if s.name == name:
                return s
        return None

    def delete_saved_project(self, name: str) -> bool:
        all_saves = self.list_saved_projects()
        remaining = [s for s in all_saves if s.name != name]
        self.saves_store.write([s.model_dump(mode="json") for s in remaining])
        return len(remaining) < len(all_saves)
