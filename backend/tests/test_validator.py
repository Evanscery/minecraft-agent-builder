from __future__ import annotations

from app.domain.blueprint import RegionBlueprint
from app.services.merger import Merger
from app.services.sample_project import SampleProjectService
from app.services.validator import Validator

from test_merger import build_test_spec


service = SampleProjectService()
merger = Merger()
validator = Validator()


def test_sample_project_validation_is_structured() -> None:
    project = service.create_sample_project()
    assert isinstance(project.validation_report.errors, list)
    for issue in project.validation_report.errors:
        assert issue.type
        assert issue.detail


def test_validator_reports_missing_gate() -> None:
    spec = build_test_spec()
    blueprints = [
        RegionBlueprint.model_validate(
            {
                "region_id": "R1",
                "blocks": [
                    [2, 0, 2, "minecraft:stone_bricks"],
                    [2, 1, 2, "minecraft:stone_bricks"],
                ],
            }
        ),
        RegionBlueprint.model_validate(
            {
                "region_id": "R2",
                "blocks": [
                    [0, 0, 2, "minecraft:stone_bricks"],
                    [0, 1, 2, "minecraft:stone_bricks"],
                ],
            }
        ),
    ]

    merge_result = merger.merge(spec, blueprints)
    report = validator.validate(spec, merge_result)

    assert any(issue.type == "missing_gate" for issue in report.errors)


def test_validator_reports_wall_gap() -> None:
    spec = build_test_spec()
    blueprints = [
        RegionBlueprint.model_validate(
            {
                "region_id": "R1",
                "blocks": [[2, 0, 1, "minecraft:stone_bricks"]],
            }
        )
    ]

    merge_result = merger.merge(spec, blueprints)
    report = validator.validate(spec, merge_result)

    assert any(issue.type == "wall_gap" for issue in report.errors)
