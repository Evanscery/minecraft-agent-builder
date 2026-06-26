from __future__ import annotations

from pathlib import Path
from typing import Any

import json

from app.core.paths import STORE_DIR


class JsonStore:
    """Tiny JSON-file persistence for config / prompts / mods / saved projects."""

    def __init__(self, relative_path: str) -> None:
        self.path = STORE_DIR / relative_path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def read(self, default: Any) -> Any:
        if not self.path.exists():
            return default
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return default

    def write(self, data: Any) -> None:
        self.path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
