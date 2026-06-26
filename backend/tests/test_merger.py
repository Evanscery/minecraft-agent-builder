from __future__ import annotations

from app.domain.blueprint import RegionBlueprint
from app.domain.materials import ActivePalette
from app.domain.project import InterfaceConstraint, InterfacePosition, ProjectMeta, ProjectSpec, Region
from app.services.material_planner import MaterialPlanner
from app.services.material_repository import MaterialRepository
from app.services.merger import Merger
from app.services.sample_project import SampleProjectService
from app.services.validator import Validator


repository = MaterialRepository()
planner = MaterialPlanner()
merger = Merger()
validator = Validator()
service = SampleProjectService()


def build_test_spec() -> ProjectSpec:
    materials = repository.list_materials()
    palette = planner.build_palette(materials, build_mode="survival_friendly")
    return ProjectSpec(
        project=ProjectMeta(
            name="test_project",
            size=(6, 4, 6),
            origin=(0, 64, 0),
            theme="medieval_test",
            build_mode="survival_friendly",
        ),
        active_palette=palette,
        regions=[
            Region(id="R1", box=(0, 0, 0, 2, 2, 2), role="left_room"),
            Region(id="R2", box=(3, 0, 0, 5, 2, 2), role="right_room"),
        ],
        interfaces=[
            InterfaceConstraint(
                id="R1_R2_wall_connection",
                between=("R1", "R2"),
                type="wall_connection",
                position=InterfacePosition(x=3, y=(0, 1), z=1),
                rule="Shared wall must stay filled.",
            ),
            InterfaceConstraint(
                id="R1_R2_gate",
                between=("R1", "R2"),
                type="main_gate",
                position=InterfacePosition(x=(2, 3), y=(0, 1), z=2),
                rule="Gate opening must stay clear.",
            ),
        ],
    )


def test_sample_project_merges_blocks() -> None:
    project = service.create_sample_project()
    assert project.preview.blocks
    assert any(block.region == "R1" for block in project.preview.blocks)
    assert any(block.region == "R3" for block in project.preview.blocks)


def test_merger_reports_material_violation() -> None:
    spec = build_test_spec()
    blueprints = [
        RegionBlueprint.model_validate(
            {
                "region_id": "R1",
                "blocks": [[0, 0, 0, "minecraft:quartz_block"]],
            }
        )
    ]

    result = merger.merge(spec, blueprints)

    assert any(issue.type == "material_violation" for issue in result.report.errors)


def test_merger_reports_conflicts() -> None:
    spec = build_test_spec()
    blueprints = [
        RegionBlueprint.model_validate(
            {
                "region_id": "R1",
                "blocks": [[0, 0, 0, "minecraft:stone_bricks"]],
            }
        ),
        RegionBlueprint.model_validate(
            {
                "region_id": "R1",
                "blocks": [[0, 0, 0, "minecraft:cobblestone"]],
            }
        ),
    ]

    result = merger.merge(spec, blueprints)

    assert any(issue.type == "merge_conflict" for issue in result.report.errors)


def test_merger_reports_out_of_region_block() -> None:
    spec = build_test_spec()
    blueprints = [
        RegionBlueprint.model_validate(
            {
                "region_id": "R1",
                "blocks": [[9, 0, 0, "minecraft:stone_bricks"]],
            }
        )
    ]

    result = merger.merge(spec, blueprints)

    assert any(issue.type == "out_of_region" for issue in result.report.errors)
