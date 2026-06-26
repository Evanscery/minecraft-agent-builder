from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain.blueprint import ExpandedBlock, RegionBlueprint
from app.domain.project import ProjectSpec
from app.domain.validation import ValidationIssue, ValidationReport
from app.services.blueprint_expander import expand_blueprint


class MergeResult(BaseModel):
    global_blocks: dict[tuple[int, int, int], str] = Field(default_factory=dict)
    block_region_map: dict[tuple[int, int, int], str] = Field(default_factory=dict)
    expanded_blocks: list[ExpandedBlock] = Field(default_factory=list)
    report: ValidationReport = Field(default_factory=ValidationReport)


class Merger:
    def merge(self, spec: ProjectSpec, blueprints: list[RegionBlueprint]) -> MergeResult:
        result = MergeResult()
        allowed_materials = spec.active_palette.all_block_ids()

        for blueprint in blueprints:
            expanded_blocks, issues = expand_blueprint(spec, blueprint)
            result.report.extend(issues)

            for block in expanded_blocks:
                result.expanded_blocks.append(block)
                if block.block not in allowed_materials:
                    result.report.add(
                        ValidationIssue(
                            type="material_violation",
                            region=block.region_id,
                            detail=f"{block.block} is not allowed in the active palette",
                        )
                    )
                    continue

                current = result.global_blocks.get(block.global_coord)
                if current is None:
                    result.global_blocks[block.global_coord] = block.block
                    result.block_region_map[block.global_coord] = block.region_id
                    continue

                # Air carves out existing blocks, but only within the same region
                # (a region may not delete another region's blocks).
                if block.block == "minecraft:air":
                    owner = result.block_region_map.get(block.global_coord)
                    if owner == block.region_id:
                        del result.global_blocks[block.global_coord]
                        del result.block_region_map[block.global_coord]
                    else:
                        result.report.add(
                            ValidationIssue(
                                type="merge_conflict",
                                region=block.region_id,
                                detail=(
                                    f"coordinate {block.global_coord} belongs to region {owner}, "
                                    f"cannot carve with air from {block.region_id}"
                                ),
                            )
                        )
                    continue

                if current != block.block:
                    result.report.add(
                        ValidationIssue(
                            type="merge_conflict",
                            region=block.region_id,
                            detail=(
                                f"coordinate {block.global_coord} already contains {current}, "
                                f"cannot also place {block.block}"
                            ),
                        )
                    )
                    continue

        return result
