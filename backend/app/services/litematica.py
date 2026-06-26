"""Litematica (.litematic) schematic writer.

Encodes a merged block map into the Litematica NBT layout:
- MinecraftData: version, schematic, regions
- Region: Position, Size, TileEntities, Entities, BlockStatePalette, BlockStates (long[])
- BlockStates packs palette indices at bitsPerBlock = max(2, ceil(log2(paletteSize)))
  with linear index order  y*sizeX*sizeZ + z*sizeX + x.
"""
from __future__ import annotations

import math
from typing import Iterable

from app.domain.materials import block_name_from_id
from app.services.merger import MergeResult
from app.services.nbt_writer import (
    NBTWriter,
    TAG_BYTE,
    TAG_COMPOUND,
    TAG_INT,
    TAG_INT_ARRAY,
    TAG_LIST,
    TAG_LONG,
    TAG_LONG_ARRAY,
    TAG_STRING,
    gzip_nbt,
)

# Litematica-compatible metadata constants.
LITEMATIC_VERSION = 5
MINECRAFT_DATA_VERSION = 3465  # 1.20.x-ish data version; harmless for readers.
LITEMATIC_TIME_CREATED = 0
LITEMATIC_TIME_MODIFIED = 0
TOTAL_BLOCKS_PLACEHOLDER = -1
TOTAL_VOLUME_PLACEHOLDER = -1


def _bits_per_block(palette_size: int) -> int:
    if palette_size <= 1:
        return 2
    return max(2, math.ceil(math.log2(palette_size)))


def _pack_block_states(
    palette_indices: list[int],
    bits_per_block: int,
) -> list[int]:
    """Pack palette indices into a long[] using `bits_per_block` bits each, Minecraft style."""
    longs: list[int] = []
    bit_mask = (1 << bits_per_block) - 1
    bits_per_long = 64
    elements_per_long = bits_per_long // bits_per_block

    for chunk_start in range(0, len(palette_indices), elements_per_long):
        value = 0
        for i in range(elements_per_long):
            idx = chunk_start + i
            if idx >= len(palette_indices):
                break
            value |= (palette_indices[idx] & bit_mask) << (i * bits_per_block)
        # Mask to 64 bits; writer reinterprets as signed two's complement.
        longs.append(value & ((1 << 64) - 1))
    return longs


def _build_palette(blocks: list[tuple[int, int, int, str]]) -> tuple[list[dict], list[int]]:
    """Build a unique BlockStatePalette and per-block indices."""
    palette: list[dict] = []
    index_of: dict[str, int] = {}
    indices: list[int] = []
    for _x, _y, _z, block_id in blocks:
        if block_id not in index_of:
            index_of[block_id] = len(palette)
            palette.append({"Name": f"minecraft:{block_name_from_id(block_id)}"})
        indices.append(index_of[block_id])
    return palette, indices


def write_litematic(
    project_name: str,
    merge_result: MergeResult,
    size: tuple[int, int, int],
    origin: tuple[int, int, int],
) -> bytes:
    """Serialize the full merged block map into gzip-compressed litematic NBT bytes."""
    writer = NBTWriter()

    # Gather all blocks sorted by y-z-x so they fit one region for the whole build.
    sorted_blocks = sorted(
        ((x, y, z, block_id) for (x, y, z), block_id in merge_result.global_blocks.items()),
        key=lambda b: (b[1], b[2], b[0]),
    )

    palette, indices = _build_palette(sorted_blocks)
    bits = _bits_per_block(max(len(palette), 1))
    longs = _pack_block_states(indices, bits)

    root_entries = [
        (TAG_COMPOUND, "MinecraftData", [
            (TAG_INT, "DataVersion", MINECRAFT_DATA_VERSION),
            (TAG_COMPOUND, "Schematic", [
                (TAG_STRING, "Name", project_name),
                (TAG_STRING, "Generator", "mcAgentBuilder"),
                (TAG_LONG, "TimeCreated", LITEMATIC_TIME_CREATED),
                (TAG_LONG, "TimeModified", LITEMATIC_TIME_MODIFIED),
                (TAG_INT, "TotalBlocks", len(sorted_blocks)),
                (TAG_INT, "TotalVolume", size[0] * size[1] * size[2]),
                (TAG_COMPOUND, "MinecraftRegion", [
                    (TAG_COMPOUND, "Position", [
                        (TAG_INT, "x", 0),
                        (TAG_INT, "y", 0),
                        (TAG_INT, "z", 0),
                    ]),
                    (TAG_COMPOUND, "Size", [
                        (TAG_INT, "x", size[0]),
                        (TAG_INT, "y", size[1]),
                        (TAG_INT, "z", size[2]),
                    ]),
                    (TAG_LIST, "TileEntities", []),
                    (TAG_LIST, "Entities", []),
                    (TAG_COMPOUND, "BlockStatePalette", [
                        (TAG_COMPOUND, "", [(TAG_STRING, "Name", entry["Name"])])
                        for entry in palette
                    ]),
                    (TAG_LONG_ARRAY, "BlockStates", longs),
                ]),
            ]),
        ]),
        (TAG_COMPOUND, "Region", [
            (TAG_STRING, "Name", project_name),
            (TAG_COMPOUND, "Position", [
                (TAG_INT, "x", origin[0]),
                (TAG_INT, "y", origin[1]),
                (TAG_INT, "z", origin[2]),
            ]),
            (TAG_COMPOUND, "Size", [
                (TAG_INT, "x", size[0]),
                (TAG_INT, "y", size[1]),
                (TAG_INT, "z", size[2]),
            ]),
            (TAG_LIST, "TileEntities", []),
            (TAG_LIST, "Entities", []),
            (TAG_COMPOUND, "BlockStatePalette", [
                (TAG_COMPOUND, "", [(TAG_STRING, "Name", entry["Name"])])
                for entry in palette
            ]),
            (TAG_LONG_ARRAY, "BlockStates", longs),
        ]),
        (TAG_STRING, "Metadata", "mcAgentBuilder litematic export"),
    ]

    writer.write_named(TAG_COMPOUND, "Litematica", root_entries)
    return gzip_nbt(writer.bytes())


__all__ = ["write_litematic", "_build_palette", "_pack_block_states"]
