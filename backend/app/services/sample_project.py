from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain.blueprint import PreviewBlock, PreviewData, RegionBlueprint
from app.domain.create_project import CreateProjectRequest
from app.domain.frontend import FrontendConfig
from app.domain.materials import MaterialRecord
from app.domain.project import ProjectMeta, ProjectSpec, Region
from app.domain.validation import ValidationIssue, ValidationReport
from app.domain.workflow import ExportFormat, ExportRequest, ExportResult, ManualPatchRequest, ManualPatchResult, RetryRequest, RetryResult
from app.services.exporter import Exporter
from app.services.geometry import region_containing
from app.services.material_planner import MaterialPlanner
from app.services.material_repository import MaterialRepository
from app.services.merger import Merger, MergeResult
from app.services.project_runtime import ProjectRuntime
from app.services.sample_project_blueprints import build_sample_blueprints
from app.services.sample_project_spec import SAMPLE_PROJECT_ID, build_sample_project_spec
from app.services.validator import Validator


class ProjectState(BaseModel):
    project_id: str
    spec: ProjectSpec
    materials: list[MaterialRecord]
    blueprints: list[RegionBlueprint]
    merge_result: MergeResult
    validation_report: ValidationReport
    preview: PreviewData
    frontend_config: FrontendConfig
    retry_history: list[RetryRequest] = Field(default_factory=list)
    manual_patch_history: list[ManualPatchRequest] = Field(default_factory=list)


class SampleProjectService:
    def __init__(self) -> None:
        self.material_repository = MaterialRepository()
        self.material_planner = MaterialPlanner()
        self.merger = Merger()
        self.validator = Validator()
        self.exporter = Exporter()
        self._runtimes: dict[str, ProjectRuntime] = {}
        self._saves: dict[str, ProjectRuntime] = {}

    def create_sample_project(self) -> ProjectRuntime:
        materials = self.material_repository.list_materials()
        palette = self.material_planner.build_palette(materials, build_mode="survival_friendly")
        spec = build_sample_project_spec(palette)
        blueprints = build_sample_blueprints()
        merge_result = self.merger.merge(spec, blueprints)
        report = self.validator.validate(spec, merge_result)
        preview = self._build_preview(spec, merge_result)
        runtime = ProjectRuntime(
            project_id=SAMPLE_PROJECT_ID,
            spec=spec,
            materials=materials,
            blueprints=blueprints,
            frontend_config=FrontendConfig(),
            merge_result=merge_result,
            validation_report=report,
            preview=preview,
        )
        self._runtimes[SAMPLE_PROJECT_ID] = runtime
        return runtime

    def create_project(self, request: CreateProjectRequest) -> ProjectRuntime:
        """Create a new structured project (no natural language).

        Builds a palette for the requested version+build_mode, creates regions
        (one whole-box region if none given), applies optional base fills, and
        produces an empty/started world the user then edits with build/paint.
        """
        repo = MaterialRepository(version=request.version)
        materials = repo.list_materials()
        palette = self.material_planner.build_palette(materials, build_mode=request.build_mode)

        regions = self._regions_from_request(request)
        spec = ProjectSpec(
            project=ProjectMeta(
                name=request.name,
                size=request.size,
                origin=request.origin,
                theme=request.theme,
                build_mode=request.build_mode,
            ),
            active_palette=palette,
            regions=regions,
            interfaces=[],
        )

        blueprints = self._base_fills_to_blueprints(request, regions)
        merge_result = self.merger.merge(spec, blueprints)
        report = self.validator.validate(spec, merge_result)
        preview = self._build_preview(spec, merge_result)

        project_id = self._unique_id(request.name)
        runtime = ProjectRuntime(
            project_id=project_id,
            spec=spec,
            materials=materials,
            blueprints=blueprints,
            frontend_config=FrontendConfig(),
            merge_result=merge_result,
            validation_report=report,
            preview=preview,
        )
        self._runtimes[project_id] = runtime
        return runtime

    def _regions_from_request(self, request: CreateProjectRequest) -> list[Region]:
        if request.regions:
            return [
                Region(id=r.id, box=r.box, role=r.role or r.id)
                for r in request.regions
            ]
        sx, sy, sz = request.size
        return [Region(id="R1", box=(0, 0, 0, sx - 1, sy - 1, sz - 1), role="whole_build")]

    def _base_fills_to_blueprints(self, request: CreateProjectRequest, regions: list[Region]) -> list[RegionBlueprint]:
        region_map = {r.id: r for r in regions}
        by_region: dict[str, list[dict]] = {}
        for fill in request.base_fills:
            rid = fill.get("region_id") or regions[0].id
            by_region.setdefault(rid, []).append(fill)
        blueprints: list[RegionBlueprint] = []
        for rid, fills in by_region.items():
            region = region_map.get(rid)
            if region is None:
                continue
            ops = []
            for f in fills:
                start = tuple(f.get("from", [0, 0, 0]))
                end = tuple(f.get("to", [0, 0, 0]))
                block = f.get("block", "minecraft:air")
                # base fills use region-local coordinates (relative to region origin)
                ops.append({"fill": {"from": list(start), "to": list(end), "block": block}})
            blueprints.append(RegionBlueprint.model_validate({"region_id": rid, "ops": ops}))
        return blueprints

    def _unique_id(self, name: str) -> str:
        slug = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-") or "project"
        base = slug
        idx = 1
        while base in self._runtimes:
            idx += 1
            base = f"{slug}-{idx}"
        return base

    def get_runtime(self, project_id: str) -> ProjectRuntime | None:
        return self._runtimes.get(project_id)

    def delete_project(self, project_id: str) -> bool:
        return self._runtimes.pop(project_id, None) is not None

    def restore_saved_project(self, name: str, saved_spec: dict, saved_blocks: list[dict]) -> ProjectRuntime:
        """Recreate a runtime from a saved-as snapshot so the user can reopen it."""
        from app.domain.project import ProjectSpec
        spec = ProjectSpec.model_validate(saved_spec)
        merge_result = MergeResult()
        for b in saved_blocks:
            coord = (int(b["x"]), int(b["y"]), int(b["z"]))
            merge_result.global_blocks[coord] = b["block"]
            merge_result.block_region_map[coord] = b["region"]
        report = self.validator.validate(spec, merge_result)
        preview = self._build_preview(spec, merge_result)
        materials = self.material_repository.list_materials()
        project_id = self._unique_id(f"{name}-restored")
        runtime = ProjectRuntime(
            project_id=project_id,
            spec=spec,
            materials=materials,
            blueprints=[],
            frontend_config=FrontendConfig(),
            merge_result=merge_result,
            validation_report=report,
            preview=preview,
        )
        self._runtimes[project_id] = runtime
        return runtime

    def get_project(self, project_id: str) -> ProjectState | None:
        runtime = self.get_runtime(project_id)
        if runtime is None:
            return None
        return self._to_state(runtime)

    def submit_retry(self, project_id: str, request: RetryRequest) -> RetryResult:
        runtime = self._require_runtime(project_id)
        runtime.retry_history.append(request)
        return RetryResult(
            project_id=project_id,
            target_region=request.target_region,
            detail=(
                f"Retry request recorded for region {request.target_region}. "
                "Region generation stays a future stage; intent is preserved."
            ),
        )

    def apply_manual_patch(self, project_id: str, request: ManualPatchRequest) -> ManualPatchResult:
        runtime = self._require_runtime(project_id)
        # Snapshot before mutation so Ctrl+Z can roll back the whole patch.
        runtime.undo_stack.append(self._snapshot_merge(runtime))
        runtime.manual_patch_history.append(request)

        allowed_materials = runtime.spec.active_palette.all_block_ids()
        # User-imported mod blocks are also placeable even if not in the active palette.
        # Re-read fresh so mods added after project creation are allowed.
        allowed_materials.update(self.material_repository.list_mod_material_ids())
        allowed_materials.add("minecraft:air")
        applied = 0
        errors: list[ValidationIssue] = []

        for op in request.ops:
            if op.on_face is not None:
                # Build-on-face: place at the neighbor cell, never replace the clicked block.
                from app.domain.workflow import neighbor_on_face
                target = neighbor_on_face(op.x, op.y, op.z, op.on_face)
            else:
                target = (op.x, op.y, op.z)

            region = region_containing(runtime.spec, target)
            if region is None:
                errors.append(
                    ValidationIssue(
                        type="out_of_region",
                        region=request.target_region,
                        detail=f"manual patch target {target} is outside every region",
                    )
                )
                continue

            if op.type == "remove_block":
                runtime.merge_result.global_blocks.pop(target, None)
                runtime.merge_result.block_region_map.pop(target, None)
                applied += 1
                continue

            if op.block is None:
                errors.append(
                    ValidationIssue(
                        type="invalid_patch",
                        region=region.id,
                        detail=f"set_block op at {target} is missing a block id",
                    )
                )
                continue

            if op.block not in allowed_materials:
                errors.append(
                    ValidationIssue(
                        type="material_violation",
                        region=region.id,
                        detail=f"{op.block} is not allowed in the active palette",
                    )
                )
                continue

            existing = runtime.merge_result.global_blocks.get(target)
            if op.on_face is not None and existing not in (None, "minecraft:air"):
                errors.append(
                    ValidationIssue(
                        type="merge_conflict",
                        region=region.id,
                        detail=f"cannot build on face: cell {target} already occupied by {existing}",
                    )
                )
                continue

            runtime.merge_result.global_blocks[target] = op.block
            runtime.merge_result.block_region_map[target] = region.id
            applied += 1

        if errors:
            runtime.merge_result.report.extend(errors)

        self._resnapshot(runtime)
        return ManualPatchResult(
            project_id=project_id,
            target_region=request.target_region,
            applied_ops=applied,
            detail=(
                f"Applied {applied} of {len(request.ops)} patch operations. "
                f"{len(errors)} rejected."
            ),
        )

    def export_project(self, project_id: str, request: ExportRequest) -> ExportResult:
        runtime = self._require_runtime(project_id)
        return self.exporter.export(project_id, request.format, runtime.merge_result, runtime.spec)

    def serialize_for_save(self, project_id: str) -> tuple[dict, list[dict]]:
        runtime = self._require_runtime(project_id)
        spec_dict = runtime.spec.model_dump(mode="json")
        blocks = [
            {"x": x, "y": y, "z": z, "block": b, "region": runtime.merge_result.block_region_map[(x, y, z)]}
            for (x, y, z), b in sorted(runtime.merge_result.global_blocks.items())
        ]
        return spec_dict, blocks

    def undo(self, project_id: str) -> bool:
        runtime = self._require_runtime(project_id)
        if not runtime.undo_stack:
            return False
        snapshot = runtime.undo_stack.pop()
        self._restore_merge(runtime, snapshot)
        self._resnapshot(runtime)
        return True

    def save_project(self, project_id: str) -> str:
        """Persist the current runtime snapshot to the in-memory save store."""
        runtime = self._require_runtime(project_id)
        self._saves[project_id] = runtime.model_copy(deep=True)
        return project_id

    def load_project(self, project_id: str) -> bool:
        snapshot = self._saves.get(project_id)
        runtime = self.get_runtime(project_id)
        if snapshot is None or runtime is None:
            return False
        self._restore_merge(runtime, self._snapshot_merge(snapshot))
        runtime.undo_stack.clear()
        self._resnapshot(runtime)
        return True

    def _snapshot_merge(self, runtime: ProjectRuntime) -> dict:
        return {
            "global_blocks": dict(runtime.merge_result.global_blocks),
            "block_region_map": dict(runtime.merge_result.block_region_map),
        }

    def _restore_merge(self, runtime: ProjectRuntime, snapshot: dict) -> None:
        runtime.merge_result.global_blocks = dict(snapshot["global_blocks"])
        runtime.merge_result.block_region_map = dict(snapshot["block_region_map"])

    def _build_preview(self, spec: ProjectSpec, merge_result: MergeResult) -> PreviewData:
        texture_lookup = {
            material.id: material.texture_path for material in self.material_repository.list_materials()
        }
        return PreviewData(
            blocks=[
                PreviewBlock(
                    x=x,
                    y=y,
                    z=z,
                    block=block_id,
                    region=merge_result.block_region_map[(x, y, z)],
                    texture=texture_lookup.get(block_id),
                )
                for (x, y, z), block_id in sorted(merge_result.global_blocks.items())
            ],
            regions=spec.regions,
            interfaces=spec.interfaces,
            errors=merge_result.report.errors,
        )

    def _resnapshot(self, runtime: ProjectRuntime) -> None:
        runtime.validation_report = self.validator.validate(runtime.spec, runtime.merge_result)
        runtime.preview = self._build_preview(runtime.spec, runtime.merge_result)

    def _require_runtime(self, project_id: str) -> ProjectRuntime:
        runtime = self.get_runtime(project_id)
        if runtime is None:
            raise KeyError(project_id)
        return runtime

    def _to_state(self, runtime: ProjectRuntime) -> ProjectState:
        return ProjectState(
            project_id=runtime.project_id,
            spec=runtime.spec,
            materials=runtime.materials,
            blueprints=runtime.blueprints,
            merge_result=runtime.merge_result,
            validation_report=runtime.validation_report,
            preview=runtime.preview,
            frontend_config=runtime.frontend_config,
            retry_history=list(runtime.retry_history),
            manual_patch_history=list(runtime.manual_patch_history),
        )
