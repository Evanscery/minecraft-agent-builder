from __future__ import annotations

from app.domain.blueprint import ExpandedBlock, RegionBlueprint
from app.domain.project import ProjectSpec
from app.domain.validation import ValidationIssue
from app.services.geometry import is_within_local_box, local_to_global


def expand_blueprint(
    spec: ProjectSpec,
    blueprint: RegionBlueprint,
) -> tuple[list[ExpandedBlock], list[ValidationIssue]]:
    region = spec.region_map()[blueprint.region_id]
    expanded: list[ExpandedBlock] = []
    issues: list[ValidationIssue] = []

    for op_wrapper in blueprint.ops:
        op = op_wrapper.fill
        for x in range(op.from_[0], op.to[0] + 1):
            for y in range(op.from_[1], op.to[1] + 1):
                for z in range(op.from_[2], op.to[2] + 1):
                    local = (x, y, z)
                    if not is_within_local_box(local, region):
                        issues.append(
                            ValidationIssue(
                                type="out_of_region",
                                region=region.id,
                                detail=f"fill op produced out-of-region block at local {local}",
                            )
                        )
                        continue
                    expanded.append(
                        ExpandedBlock(
                            region_id=region.id,
                            local=local,
                            global_coord=local_to_global(local, region, spec.project.origin),
                            block=op.block,
                            source="op",
                        )
                    )

    for placement in blueprint.blocks:
        local = placement.coordinate()
        if not is_within_local_box(local, region):
            issues.append(
                ValidationIssue(
                    type="out_of_region",
                    region=region.id,
                    detail=f"block placement is outside region bounds at local {local}",
                )
            )
            continue
        expanded.append(
            ExpandedBlock(
                region_id=region.id,
                local=local,
                global_coord=local_to_global(local, region, spec.project.origin),
                block=placement.block,
                source="block",
            )
        )

    return expanded, issues
