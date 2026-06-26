from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

BuildMode = Literal[
    "survival_friendly",
    "low_cost_survival",
    "creative_showcase",
    "rare_luxury_survival",
]

# Real Minecraft assets are served from PrismarineJS minecraft-assets / minecraft-data.
MINECRAFT_DATA_BASE = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc"
MINECRAFT_ASSETS_BASE = "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data"
# minecraft-data stores 1.20.1 data under the "1.20" folder; assets use "1.20.2".
DEFAULT_DATA_VERSION = "1.20"
DEFAULT_ASSETS_VERSION = "1.20.2"
SUPPORTED_VERSIONS = ["1.20", "1.20.1", "1.20.2", "1.20.3", "1.20.4", "1.21", "1.21.1"]


def data_folder_for(version: str) -> str:
    """minecraft-data maps some versions to a shared folder (e.g. 1.20.1 -> 1.20)."""
    # 1.20.x except 1.20 share the 1.20 blocks folder in minecraft-data.
    if version.startswith("1.20.") and version != "1.20":
        return "1.20"
    return version


def assets_version_for(version: str) -> str:
    """Map a data version to the minecraft-assets folder that carries its textures."""
    if version.startswith("1.20"):
        return "1.20.2"
    if version.startswith("1.21"):
        return "1.21"
    return version


def texture_url_for(block_name: str, assets_version: str = DEFAULT_ASSETS_VERSION) -> str:
    """Return the canonical real-texture URL for a minecraft block name."""
    return f"{MINECRAFT_ASSETS_BASE}/{assets_version}/blocks/{block_name}.png"


def block_name_from_id(block_id: str) -> str:
    """Strip the 'minecraft:' namespace from a block id to get the raw name."""
    return block_id.split(":", 1)[1] if block_id.startswith("minecraft:") else block_id


class MaterialRecord(BaseModel):
    id: str
    name: str
    description: str
    category: str
    availability: int = Field(ge=-1, le=5)
    visual_style: tuple[str, ...] = Field(default_factory=tuple)
    texture_path: str
    source: str
    version: str
    # Real minecraft-data metadata
    block_id_numeric: int | None = None
    hardness: float | None = None
    resistance: float | None = None
    stack_size: int | None = None
    material: str | None = None
    diggable: bool | None = None
    transparent: bool | None = None
    emit_light: int | None = None
    filter_light: int | None = None
    flammable: bool | None = None
    bounding_box: str | None = None
    texture_url: str | None = None

    @field_validator("visual_style", mode="before")
    @classmethod
    def normalize_visual_style(cls, value: object) -> tuple[str, ...]:
        if value is None:
            return ()
        if isinstance(value, str):
            parts = [part.strip() for part in value.split(",") if part.strip()]
            return tuple(parts)
        if isinstance(value, (list, tuple, set)):
            return tuple(str(item).strip() for item in value if str(item).strip())
        raise TypeError("visual_style must be a string or a sequence of strings")


class MaterialConstraints(BaseModel):
    availability_min: int = Field(ge=-1, le=5)
    allow_unavailable: bool = False


class ActivePalette(BaseModel):
    slots: dict[str, list[str]] = Field(default_factory=dict)

    def all_block_ids(self) -> set[str]:
        block_ids: set[str] = set()
        for values in self.slots.values():
            block_ids.update(values)
        return block_ids
