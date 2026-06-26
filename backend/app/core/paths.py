from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STORE_DIR = BASE_DIR / "store"
BLOCKS_JSON_PATH = DATA_DIR / "blocks.json"
BLOCKS_CACHE_DIR = DATA_DIR / "blocks_cache"
