from __future__ import annotations

from collections import defaultdict

from app.domain.materials import ActivePalette, BuildMode, MaterialConstraints, MaterialRecord

DEFAULT_THEME_KEYWORDS = ("medieval", "stone", "wood", "natural")
STYLE_FILTERED_CATEGORIES = {"stone", "wood", "glass"}
BUILD_MODE_CONSTRAINTS: dict[BuildMode, MaterialConstraints] = {
    "survival_friendly": MaterialConstraints(availability_min=3, allow_unavailable=False),
    "low_cost_survival": MaterialConstraints(availability_min=4, allow_unavailable=False),
    "creative_showcase": MaterialConstraints(availability_min=-1, allow_unavailable=True),
    "rare_luxury_survival": MaterialConstraints(availability_min=1, allow_unavailable=False),
}

CATEGORY_SLOT_MAP: dict[str, str] = {
    "stone": "wall",
    "wood": "roof",
    "glass": "glass",
    "light": "light",
    "special": "air",
}


class MaterialPlanner:
    def build_palette(
        self,
        materials: list[MaterialRecord],
        build_mode: BuildMode,
        theme_keywords: tuple[str, ...] = DEFAULT_THEME_KEYWORDS,
    ) -> ActivePalette:
        constraints = BUILD_MODE_CONSTRAINTS[build_mode]
        palette: dict[str, list[str]] = defaultdict(list)

        for material in materials:
            if not self._meets_constraints(material, constraints):
                continue
            slot = self._slot_for_material(material, theme_keywords)
            if slot is None:
                continue
            palette[slot].append(material.id)

        roof_materials = palette.get("roof", [])
        palette.setdefault("floor", [material_id for material_id in roof_materials if material_id.endswith("planks")])
        palette.setdefault("air", ["minecraft:air"])
        return ActivePalette(slots=dict(palette))

    def _meets_constraints(self, material: MaterialRecord, constraints: MaterialConstraints) -> bool:
        if not constraints.allow_unavailable and material.availability == -1:
            return False
        return material.availability >= constraints.availability_min

    def _slot_for_material(
        self,
        material: MaterialRecord,
        theme_keywords: tuple[str, ...],
    ) -> str | None:
        slot = CATEGORY_SLOT_MAP.get(material.category)
        if slot is None:
            return None

        if material.id == "minecraft:air":
            return "air"

        if material.category in STYLE_FILTERED_CATEGORIES and not any(
            keyword in material.visual_style for keyword in theme_keywords
        ):
            return None

        return slot
