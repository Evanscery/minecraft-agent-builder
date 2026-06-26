from __future__ import annotations

import base64
import gzip

from fastapi.testclient import TestClient

from app.main import app
from app.services.sample_project_spec import SAMPLE_PROJECT_ID

client = TestClient(app)


def test_litematica_export_produces_valid_gzipped_nbt() -> None:
    client.post('/projects/sample')

    response = client.post(
        f'/projects/{SAMPLE_PROJECT_ID}/export',
        json={'format': 'litematica'},
    )

    assert response.status_code == 200
    payload = response.json()['result']
    assert payload['format'] == 'litematica'
    assert payload['file_name'].endswith('.litematic')

    data = gzip.decompress(base64.b64decode(payload['content']))
    # gzip-decompressed NBT must start with a compound tag (0x0A) and contain
    # the root "Litematica" name.
    assert data[0] == 0x0A
    assert b'Litematica' in data
    assert b'BlockStatePalette' in data
    assert b'BlockStates' in data
    assert b'MinecraftData' in data
