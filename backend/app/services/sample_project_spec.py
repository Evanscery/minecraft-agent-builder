from __future__ import annotations

from app.domain.materials import ActivePalette
from app.domain.project import InterfaceConstraint, InterfacePosition, ProjectMeta, ProjectSpec, Region

SAMPLE_PROJECT_ID = "sample-medieval-castle"

# All region boxes are relative to the project origin (0, 64, 0).
# Block global coords = project_origin + region_origin + local_coord.
R1_BOX = (0, 0, 0, 5, 7, 5)
R2_BOX = (6, 0, 0, 11, 7, 5)
R3_BOX = (0, 0, 6, 11, 7, 11)


def build_sample_project_spec(palette: ActivePalette) -> ProjectSpec:
    return ProjectSpec(
        project=ProjectMeta(
            name="medieval_castle_sample",
            size=(12, 8, 12),
            origin=(0, 64, 0),
            theme="medieval_castle",
            build_mode="survival_friendly",
        ),
        active_palette=palette,
        regions=[
            Region(id="R1", box=R1_BOX, role="northwest_tower"),
            Region(id="R2", box=R2_BOX, role="north_gate_wall"),
            Region(id="R3", box=R3_BOX, role="courtyard_and_south_wall"),
        ],
        interfaces=[
            # Shared wall at global x=6 (R2's left edge, local x=0).
            InterfaceConstraint(
                id="R1_R2_wall_connection",
                between=("R1", "R2"),
                type="wall_connection",
                position=InterfacePosition(x=6, y=(0, 3), z=2),
                rule="Walls must connect without gaps.",
            ),
            # Gate opening at global z=6 (R3's near edge, local z=0), above the floor.
            InterfaceConstraint(
                id="R2_R3_main_gate",
                between=("R2", "R3"),
                type="main_gate",
                position=InterfacePosition(x=(8, 9), y=(1, 3), z=6),
                rule="Gate opening must stay clear above the floor.",
            ),
        ],
    )
