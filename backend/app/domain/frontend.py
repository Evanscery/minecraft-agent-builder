from __future__ import annotations

from pydantic import BaseModel


class FrontendRendererConfig(BaseModel):
    texture_pack: str = "vanilla_default"
    show_region_boundary: bool = True
    show_interfaces: bool = True
    show_errors: bool = True
    enable_layer_view: bool = True
    enable_xray_view: bool = False


class FrontendInteractionConfig(BaseModel):
    enable_region_select: bool = True
    enable_block_select: bool = True
    enable_box_select: bool = False
    enable_manual_edit: bool = False
    enable_region_retry: bool = False


class FrontendPreviewConfig(BaseModel):
    default_camera: str = "isometric"
    default_visibility_mode: str = "full"
    max_render_blocks: int = 5000
    chunk_render_size: int = 16


class FrontendMaterialsConfig(BaseModel):
    show_material_panel: bool = True
    allow_material_replace: bool = False
    allow_mod_texture: bool = False


class FrontendExportConfig(BaseModel):
    default_format: str = "litematica"
    allow_mcfunction: bool = True
    allow_schematic: bool = False
    allow_litematic: bool = True
    allow_json: bool = True


class FrontendConfig(BaseModel):
    renderer: FrontendRendererConfig = FrontendRendererConfig()
    interaction: FrontendInteractionConfig = FrontendInteractionConfig()
    preview: FrontendPreviewConfig = FrontendPreviewConfig()
    materials: FrontendMaterialsConfig = FrontendMaterialsConfig()
    export: FrontendExportConfig = FrontendExportConfig()
