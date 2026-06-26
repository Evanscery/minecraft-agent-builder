from __future__ import annotations

from app.domain.project import InterfaceConstraint, ProjectSpec
from app.domain.validation import ValidationIssue, ValidationReport
from app.services.geometry import expand_axis
from app.services.merger import MergeResult


def _issue_list(
    issue_type: str,
    interface: InterfaceConstraint,
    detail: str,
) -> list[ValidationIssue]:
    return [
        ValidationIssue(
            type=issue_type,
            regions=list(interface.between),
            interface=interface.id,
            detail=detail,
        )
    ]


class Validator:
    def validate(self, spec: ProjectSpec, merge_result: MergeResult) -> ValidationReport:
        report = ValidationReport(errors=list(merge_result.report.errors))

        for interface in spec.interfaces:
            report.extend(
                self._validate_interface(
                    spec=spec,
                    interface=interface,
                    global_blocks=merge_result.global_blocks,
                )
            )

        return report

    def _validate_interface(
        self,
        spec: ProjectSpec,
        interface: InterfaceConstraint,
        global_blocks: dict[tuple[int, int, int], str],
    ) -> list[ValidationIssue]:
        positions = self._interface_positions(spec, interface)

        if interface.type == "main_gate":
            blocked = [coord for coord in positions if global_blocks.get(coord) not in {None, "minecraft:air"}]
            if blocked:
                return _issue_list(
                    issue_type="missing_gate",
                    interface=interface,
                    detail=f"Expected gate opening is blocked at {blocked[:3]}",
                )
            return []

        if interface.type == "wall_connection":
            missing = [coord for coord in positions if global_blocks.get(coord) in {None, "minecraft:air"}]
            if missing:
                return _issue_list(
                    issue_type="wall_gap",
                    interface=interface,
                    detail=f"Expected wall connection has missing blocks at {missing[:3]}",
                )
            return []

        return []

    def _interface_positions(
        self,
        spec: ProjectSpec,
        interface: InterfaceConstraint,
    ) -> list[tuple[int, int, int]]:
        origin_x, origin_y, origin_z = spec.project.origin
        return [
            (origin_x + x, origin_y + y, origin_z + z)
            for x in expand_axis(interface.position.x)
            for y in expand_axis(interface.position.y)
            for z in expand_axis(interface.position.z)
        ]
