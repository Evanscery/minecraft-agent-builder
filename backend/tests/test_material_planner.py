from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.material_planner import MaterialPlanner
from app.services.material_repository import MaterialRepository

client = TestClient(app)
repository = MaterialRepository()
planner = MaterialPlanner()


def test_materials_endpoint_returns_seed_data() -> None:
    response = client.get("/materials")
    assert response.status_code == 200
    payload = response.json()
    ids = {item["id"] for item in payload}
    assert "minecraft:stone_bricks" in ids
    assert "minecraft:command_block" in ids


def test_survival_palette_excludes_unavailable_materials() -> None:
    materials = repository.list_materials()

    palette = planner.build_palette(materials, build_mode="survival_friendly")
    block_ids = palette.all_block_ids()

    assert "minecraft:command_block" not in block_ids
    assert "minecraft:quartz_block" not in block_ids
    assert "minecraft:stone_bricks" in block_ids


def test_creative_palette_can_include_unavailable_materials() -> None:
    materials = repository.list_materials()

    palette = planner.build_palette(materials, build_mode="creative_showcase")
    block_ids = palette.all_block_ids()

    assert "minecraft:command_block" in block_ids
