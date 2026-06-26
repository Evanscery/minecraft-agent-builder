"""Minimal big-endian NBT writer.

Writes the subset of NBT tags needed for Litematica schematics:
byte, short, int, long, float, double, byte_array, string, list, compound,
int_array, long_array.

Output is gzip-compressed, matching Minecraft's on-disk format.
"""
from __future__ import annotations

import gzip
import io
import struct
from typing import Any

TAG_END = 0
TAG_BYTE = 1
TAG_SHORT = 2
TAG_INT = 3
TAG_LONG = 4
TAG_FLOAT = 5
TAG_DOUBLE = 6
TAG_BYTE_ARRAY = 7
TAG_STRING = 8
TAG_LIST = 9
TAG_COMPOUND = 10
TAG_INT_ARRAY = 11
TAG_LONG_ARRAY = 12


class NBTWriter:
    def __init__(self) -> None:
        self._buf = io.BytesIO()

    def bytes(self) -> bytes:
        return self._buf.getvalue()

    # primitives
    def write_byte(self, value: int) -> None:
        self._buf.write(struct.pack(">b", value))

    def write_ubyte(self, value: int) -> None:
        self._buf.write(struct.pack(">B", value))

    def write_short(self, value: int) -> None:
        self._buf.write(struct.pack(">h", value))

    def write_ushort(self, value: int) -> None:
        self._buf.write(struct.pack(">H", value))

    def write_int(self, value: int) -> None:
        self._buf.write(struct.pack(">i", value))

    def write_long(self, value: int) -> None:
        # NBT longs are signed 64-bit; reinterpret unsigned values as two's complement.
        if value >= (1 << 63):
            value -= (1 << 64)
        self._buf.write(struct.pack(">q", value))

    def write_float(self, value: float) -> None:
        self._buf.write(struct.pack(">f", value))

    def write_double(self, value: float) -> None:
        self._buf.write(struct.pack(">d", value))

    def write_string(self, value: str) -> None:
        encoded = value.encode("utf-8")
        self.write_ushort(len(encoded))
        self._buf.write(encoded)

    # named tags
    def write_named(self, tag_type: int, name: str, value: Any) -> None:
        self.write_byte(tag_type)
        self.write_string(name)
        self.write_payload(tag_type, value)

    def write_payload(self, tag_type: int, value: Any) -> None:
        if tag_type == TAG_BYTE:
            self.write_byte(int(value))
        elif tag_type == TAG_SHORT:
            self.write_short(int(value))
        elif tag_type == TAG_INT:
            self.write_int(int(value))
        elif tag_type == TAG_LONG:
            self.write_long(int(value))
        elif tag_type == TAG_FLOAT:
            self.write_float(float(value))
        elif tag_type == TAG_DOUBLE:
            self.write_double(float(value))
        elif tag_type == TAG_BYTE_ARRAY:
            self.write_int(len(value))
            self._buf.write(bytes(value))
        elif tag_type == TAG_STRING:
            self.write_string(str(value))
        elif tag_type == TAG_LIST:
            self._write_list(value)
        elif tag_type == TAG_COMPOUND:
            self._write_compound(value)
        elif tag_type == TAG_INT_ARRAY:
            self.write_int(len(value))
            for item in value:
                self.write_int(int(item))
        elif tag_type == TAG_LONG_ARRAY:
            self.write_int(len(value))
            for item in value:
                self.write_long(int(item))
        else:
            raise ValueError(f"unsupported tag type {tag_type}")

    def _write_list(self, items: list[tuple[int, Any]]) -> None:
        if not items:
            self.write_byte(TAG_END)
            self.write_int(0)
            return
        element_type = items[0][0]
        self.write_byte(element_type)
        self.write_int(len(items))
        for tag_type, value in items:
            self.write_payload(tag_type, value)

    def _write_compound(self, entries: list[tuple[int, str, Any]]) -> None:
        for tag_type, name, value in entries:
            self.write_named(tag_type, name, value)
        self.write_byte(TAG_END)


def gzip_nbt(nbt_bytes: bytes) -> bytes:
    return gzip.compress(nbt_bytes)
