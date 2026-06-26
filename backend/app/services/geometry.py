from __future__ import annotations

from app.domain.project import Box, Coordinate, ProjectSpec, Region


def is_within_local_box(coordinate: Coordinate, region: Region) -> bool:
    x, y, z = coordinate
    width, height, depth = region.size
    return 0 <= x < width and 0 <= y < height and 0 <= z < depth


def local_to_global(coordinate: Coordinate, region: Region, project_origin: Coordinate) -> Coordinate:
    local_x, local_y, local_z = coordinate
    region_x, region_y, region_z = region.origin
    project_x, project_y, project_z = project_origin
    return (
        project_x + region_x + local_x,
        project_y + region_y + local_y,
        project_z + region_z + local_z,
    )


def expand_axis(value: int | tuple[int, int]) -> range:
    if isinstance(value, int):
        return range(value, value + 1)
    start, end = value
    return range(start, end + 1)


def global_within_region(spec: ProjectSpec, region: Region, coordinate: Coordinate) -> bool:
    """Return True when a global coordinate falls inside the region's world-space box."""
    gx, gy, gz = coordinate
    origin_x, origin_y, origin_z = spec.project.origin
    min_x, min_y, min_z, max_x, max_y, max_z = region.box
    return (
        origin_x + min_x <= gx <= origin_x + max_x
        and origin_y + min_y <= gy <= origin_y + max_y
        and origin_z + min_z <= gz <= origin_z + max_z
    )


def region_containing(spec: ProjectSpec, coordinate: Coordinate) -> Region | None:
    for region in spec.regions:
        if global_within_region(spec, region, coordinate):
            return region
    return None
