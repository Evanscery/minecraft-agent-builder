from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RendererConfigOverride(BaseModel):
    texture_pack: str | None = None
    show_region_boundary: bool | None = None
    show_interfaces: bool | None = None
    show_errors: bool | None = None
    enable_layer_view: bool | None = None
    enable_xray_view: bool | None = None


class InteractionConfigOverride(BaseModel):
    enable_region_select: bool | None = None
    enable_block_select: bool | None = None
    enable_box_select: bool | None = None
    enable_manual_edit: bool | None = None
    enable_region_retry: bool | None = None


class PreviewConfigOverride(BaseModel):
    default_camera: str | None = None
    default_visibility_mode: str | None = None
    max_render_blocks: int | None = None
    chunk_render_size: int | None = None


class MaterialsConfigOverride(BaseModel):
    show_material_panel: bool | None = None
    allow_material_replace: bool | None = None
    allow_mod_texture: bool | None = None


class ExportConfigOverride(BaseModel):
    default_format: str | None = None
    allow_mcfunction: bool | None = None
    allow_schematic: bool | None = None
    allow_litematic: bool | None = None
    allow_json: bool | None = None


class UserConfig(BaseModel):
    language: Literal["zh", "en"] = "zh"
    default_version: str = "1.20.1"
    default_build_mode: str = "survival_friendly"
    renderer: RendererConfigOverride = Field(default_factory=RendererConfigOverride)
    interaction: InteractionConfigOverride = Field(default_factory=InteractionConfigOverride)
    preview: PreviewConfigOverride = Field(default_factory=PreviewConfigOverride)
    materials: MaterialsConfigOverride = Field(default_factory=MaterialsConfigOverride)
    export: ExportConfigOverride = Field(default_factory=ExportConfigOverride)


class AgentPromptSection(BaseModel):
    """One named prompt template that drives a sub-agent stage."""

    id: str
    name: str
    description: str = ""
    template: str


class AgentPromptStore(BaseModel):
    global_planner: str = ""
    material_planner: str = ""
    region_generator: str = ""
    repair_agent: str = ""
    visual_calibration: str = ""


class ModMaterialRecord(BaseModel):
    """A user-imported mod block added to the material database."""

    id: str
    name: str
    description: str = ""
    category: str = "special"
    availability: int = 3
    visual_style: tuple[str, ...] = Field(default_factory=tuple)
    texture_path: str = ""
    source: str = "mod_import"
    version: str = ""
    texture_url: str | None = None
    hardness: float | None = None
    material: str | None = None
    diggable: bool | None = None
    transparent: bool | None = None
    emit_light: int | None = None
    bounding_box: str | None = None


class SavedProject(BaseModel):
    """A named save-as snapshot of a project's blocks + spec."""

    name: str
    project_id: str
    spec: dict
    blocks: list[dict]
    created_at: str = ""
