from __future__ import annotations

import json
import logging
import urllib.request
from functools import cached_property
from pathlib import Path

from app.core.paths import BLOCKS_JSON_PATH, BLOCKS_CACHE_DIR
from app.domain.materials import (
    SUPPORTED_VERSIONS,
    assets_version_for,
    block_name_from_id,
    data_folder_for,
    texture_url_for,
)
from app.domain.materials import MaterialRecord

logger = logging.getLogger(__name__)

# Material -> category bucket used by the planner.
MATERIAL_CATEGORY_MAP: dict[str, str] = {
    "default": "special",
    "wood": "wood",
    "mineable/pickaxe": "stone",
    "mineable/axe": "wood",
    "mineable/shovel": "soil",
    "glass": "glass",
    "plant": "plant",
    "organic": "plant",
    "metal": "metal",
    "ice": "stone",
    "water": "liquid",
    "lava": "liquid",
}

STYLE_BY_CATEGORY: dict[str, list[str]] = {
    "stone": ["medieval", "durable", "gray"],
    "wood": ["wood", "medieval"],
    "glass": ["clean", "transparent", "medieval"],
    "light": ["warm", "utility"],
    "plant": ["natural", "green"],
    "special": ["utility"],
    "soil": ["natural"],
    "metal": ["metal", "durable"],
    "liquid": ["liquid"],
}

BLOCK_DESCRIPTIONS: dict[str, str] = {
    "minecraft:air": "empty space, used for openings and carved interiors",
    "minecraft:stone": "smooth gray stone, common building base",
    "minecraft:cobblestone": "rough stone from broken stone, cheap survival material",
    "minecraft:stone_bricks": "worked stone bricks, ideal for castle walls",
    "minecraft:mossy_cobblestone": "weathered stone, gives older structures character",
    "minecraft:spruce_planks": "dark wood planks for roofs and floors",
    "minecraft:spruce_stairs": "dark wood stairs for sloped roofs",
    "minecraft:oak_planks": "warm wood planks for floors and framing",
    "minecraft:glass_pane": "thin transparent window block",
    "minecraft:torch": "cheap early light source",
    "minecraft:lantern": "decorative metal light for detailed builds",
    "minecraft:quartz_block": "clean white block, costly in survival",
    "minecraft:command_block": "technical block, not obtainable in normal survival",
    "minecraft:grass_block": "surface grass, the natural ground block",
    "minecraft:dirt": "common soil block",
}


def _availability_from(real: dict, category: str = "") -> int:
    """Derive a -1..5 survival-availability score from real minecraft-data fields."""
    name = real.get("name", "")
    if name in {"command_block", "structure_block", "jigsaw", "barrier", "spawner"}:
        return -1
    if name == "air":
        return 5
    if real.get("diggable") is False:
        return -1
    hardness = real.get("hardness")
    if hardness is None:
        hardness = 1.0
    material = real.get("material", "default")
    if category == "light":
        return 5
    if material == "wood":
        return 5
    if material in {"glass", "default"}:
        return 4
    if material == "mineable/pickaxe" and hardness is not None and hardness < 1.0:
        return 2  # rare-ish, e.g. quartz
    if material == "mineable/pickaxe":
        return 4
    if material in {"plant", "organic", "mineable/shovel"}:
        return 5
    return 3


def fetch_version_blocks(version: str) -> list[dict] | None:
    """Download the full blocks.json for a version from minecraft-data, caching to disk."""
    folder = data_folder_for(version)
    cache_path = BLOCKS_CACHE_DIR / f"{version}.json"
    BLOCKS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    url = f"https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/{folder}/blocks.json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "mcAgentBuilder"})
        with urllib.request.urlopen(req, timeout=20) as response:  # noqa: S310 - public data URL
            data = response.read()
        parsed = json.loads(data)
        cache_path.write_bytes(data)
        logger.info("fetched %d blocks for %s", len(parsed), version)
        return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("failed to fetch blocks for %s: %s", version, exc)
        if cache_path.exists():
            return json.loads(cache_path.read_text(encoding="utf-8"))
        return None


def _record_from_raw(raw: dict, version: str, assets_version: str) -> MaterialRecord:
    block_id = f"minecraft:{raw['name']}"
    emit_light = raw.get("emitLight", 0) or 0
    material = raw.get("material", "default")
    if emit_light and emit_light > 0:
        category = "light"
    else:
        category = MATERIAL_CATEGORY_MAP.get(material, "special")
    availability = _availability_from(raw, category)
    visual_style = tuple(STYLE_BY_CATEGORY.get(category, ["utility"]))
    texture_name = block_name_from_id(block_id)
    return MaterialRecord(
        id=block_id,
        name=raw.get("displayName", raw.get("name", block_id)),
        description=BLOCK_DESCRIPTIONS.get(block_id, raw.get("displayName", block_id)),
        category=category,
        availability=availability,
        visual_style=visual_style,
        texture_path=f"textures/block/{texture_name}.png",
        source="PrismarineJS/minecraft-data",
        version=version,
        block_id_numeric=raw.get("id"),
        hardness=raw.get("hardness"),
        resistance=raw.get("resistance"),
        stack_size=raw.get("stackSize"),
        material=material,
        diggable=raw.get("diggable"),
        transparent=raw.get("transparent"),
        emit_light=raw.get("emitLight"),
        filter_light=raw.get("filterLight"),
        flammable=raw.get("flammable"),
        bounding_box=raw.get("boundingBox"),
        texture_url=texture_url_for(texture_name, assets_version),
    )


class MaterialRepository:
    """Versioned, refreshable Minecraft block database.

    Loads the full blocks.json for a version from minecraft-data (cached on disk),
    falling back to the curated local blocks.json when offline.
    """

    def __init__(self, version: str = "1.20.1", blocks_path: Path = BLOCKS_JSON_PATH) -> None:
        if version not in SUPPORTED_VERSIONS:
            raise ValueError(f"unsupported version {version}; supported: {SUPPORTED_VERSIONS}")
        self.version = version
        self.assets_version = assets_version_for(version)
        self.blocks_path = blocks_path

    def refresh(self, version: str | None = None) -> int:
        """Re-download the blocks database for the given version (or current). Returns count."""
        target = version or self.version
        if version and version not in SUPPORTED_VERSIONS:
            raise ValueError(f"unsupported version {version}")
        data = fetch_version_blocks(target)
        if data is None:
            raise RuntimeError(f"could not fetch or find blocks for {target}")
        if version:
            self.version = version
            self.assets_version = assets_version_for(version)
        # invalidate cached materials
        self.__dict__.pop("_materials", None)
        return len(data)

    @cached_property
    def _materials(self) -> tuple[MaterialRecord, ...]:
        data = fetch_version_blocks(self.version)
        if data is None:
            # offline fallback: curated local blocks.json
            with self.blocks_path.open("r", encoding="utf-8") as file:
                payload = json.load(file)
            data = payload["blocks"]
            version = payload.get("version", self.version)
        else:
            version = self.version
        records = [_record_from_raw(raw, version, self.assets_version) for raw in data]
        return tuple(records)

    def list_materials(self, include_mods: bool = True) -> list[MaterialRecord]:
        materials = list(self._materials)
        if include_mods:
            for mod in self._mods:
                materials.append(self._mod_to_record(mod))
        return materials

    def material_map(self) -> dict[str, MaterialRecord]:
        return {material.id: material for material in self.list_materials()}

    def supported_versions(self) -> list[str]:
        return list(SUPPORTED_VERSIONS)

    def list_mod_material_ids(self) -> set[str]:
        """Return the ids of currently-imported mod blocks (read fresh)."""
        return {mod.id for mod in self._mods}

    @property
    def _mods(self) -> list:
        # Read fresh each call so runtime-added mods (ConfigService.add_mod) are
        # immediately visible. Mods are a small list, so this is cheap.
        # Late import to avoid a config<->materials cycle.
        from app.services.config_service import ConfigService
        try:
            return ConfigService().list_mods()
        except Exception:  # noqa: BLE001 - never break material listing over mods
            return []

    def _mod_to_record(self, mod) -> MaterialRecord:
        return MaterialRecord(
            id=mod.id,
            name=mod.name,
            description=mod.description or mod.name,
            category=mod.category,
            availability=mod.availability,
            visual_style=mod.visual_style,
            texture_path=mod.texture_path,
            source=mod.source,
            version=mod.version or "mod",
            hardness=mod.hardness,
            material=mod.material,
            diggable=mod.diggable,
            transparent=mod.transparent,
            emit_light=mod.emit_light,
            bounding_box=mod.bounding_box,
            texture_url=mod.texture_url,
        )
