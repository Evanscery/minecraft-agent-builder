from __future__ import annotations

from app.domain.blueprint import RegionBlueprint

BlockTuple = tuple[int, int, int, str]
FillTuple = tuple[tuple[int, int, int], tuple[int, int, int], str]

STONE = "minecraft:stone_bricks"
SPRUCE = "minecraft:spruce_planks"
OAK = "minecraft:oak_planks"
GLASS = "minecraft:glass_pane"
LANTERN = "minecraft:lantern"
TORCH = "minecraft:torch"
AIR = "minecraft:air"


def _blueprint(region_id: str, fills: list[FillTuple], blocks: list[BlockTuple]) -> RegionBlueprint:
    return RegionBlueprint.model_validate(
        {
            "region_id": region_id,
            "ops": [
                {"fill": {"from": list(start), "to": list(end), "block": block}}
                for start, end, block in fills
            ],
            "blocks": [list(block) for block in blocks],
        }
    )


# R1: northwest tower (local box 0..5 x, 0..7 y, 0..5 z)
# Floor + 4 corner/wall pillars forming a hollow tower.
def _r1() -> RegionBlueprint:
    fills = [
        # ground floor
        ((0, 0, 0), (5, 0, 5), STONE),
        # perimeter walls (full height), hollow inside
        ((0, 1, 0), (5, 5, 0), STONE),   # south wall
        ((0, 1, 5), (5, 5, 5), STONE),   # north wall
        ((0, 1, 0), (0, 5, 5), STONE),   # west wall
        ((5, 1, 0), (5, 5, 5), STONE),   # east wall
        # battlement top
        ((0, 6, 0), (5, 6, 5), STONE),
    ]
    # interior floor detail + light (torch on the inner wall)
    blocks = [
        (2, 1, 1, SPRUCE),
        (3, 1, 1, SPRUCE),
        (1, 3, 1, LANTERN),
    ]
    return _blueprint("R1", fills, blocks)


# R2: north gate wall (local box 0..5 x, 0..7 y, 0..5 z)
# Solid wall with a gate opening on its south side facing R3 (global z=6).
def _r2() -> RegionBlueprint:
    fills = [
        ((0, 0, 0), (5, 0, 5), STONE),    # floor
        ((0, 1, 0), (5, 6, 0), STONE),    # south face wall
        ((0, 1, 5), (5, 6, 5), STONE),    # north face wall
        ((0, 1, 0), (0, 6, 5), STONE),    # west wall
        ((5, 1, 0), (5, 6, 5), STONE),    # east wall
        ((0, 7, 0), (5, 7, 5), STONE),    # roof/battlement
    ]
    # Gate opening: global x=8-9 (local x=2-3), y=1-3, z=6 (local z=0).
    # The south face wall (z=0) would fill those; carve them out as air.
    blocks = [
        (2, 1, 0, AIR), (3, 1, 0, AIR),
        (2, 2, 0, AIR), (3, 2, 0, AIR),
        (2, 3, 0, AIR), (3, 3, 0, AIR),
        # lanterns mounted inside the gatehouse, beside the opening (interior air cells)
        (1, 3, 1, LANTERN),
        (4, 3, 1, LANTERN),
        # a window in the north wall: carve the hole, then glaze it
        (2, 4, 5, AIR), (3, 4, 5, AIR),
        (2, 4, 5, GLASS), (3, 4, 5, GLASS),
    ]
    return _blueprint("R2", fills, blocks)


# R3: courtyard + south wall (local box 0..11 x, 0..7 y, 0..5 z)
# Open courtyard floor with a perimeter wall on the far (local z=5) side.
def _r3() -> RegionBlueprint:
    fills = [
        ((0, 0, 0), (11, 0, 5), STONE),       # courtyard floor
        ((0, 1, 5), (11, 5, 5), STONE),       # far perimeter wall
        ((0, 1, 0), (0, 5, 5), STONE),        # west wing wall
        ((11, 1, 0), (11, 5, 5), STONE),      # east wing wall
        ((0, 6, 5), (11, 6, 5), STONE),       # wall top
    ]
    blocks = [
        # courtyard path + scattered detail
        (5, 1, 1, OAK), (6, 1, 1, OAK),
        (5, 1, 2, OAK), (6, 1, 2, OAK),
        # windows in the far wall: carve holes, then glaze
        (3, 2, 5, AIR), (8, 2, 5, AIR),
        (3, 2, 5, GLASS), (8, 2, 5, GLASS),
    ]
    return _blueprint("R3", fills, blocks)


def build_sample_blueprints() -> list[RegionBlueprint]:
    return [_r1(), _r2(), _r3()]
