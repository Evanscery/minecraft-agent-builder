from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_runtime_added_mod_is_paintable() -> None:
    """A mod added AFTER a project is created must still be paintable (no stale cache)."""
    # Fresh project.
    client.post('/projects/sample')

    # Add a new mod at runtime.
    mod = {
        'id': 'runtime_mod:block',
        'name': 'Runtime Block',
        'category': 'wood',
        'availability': 4,
        'visual_style': ['natural'],
        'texture_path': 'x',
        'source': 'mod_import',
        'version': 'runtime_mod',
        'texture_url': 'https://example.com/block.png',
    }
    add = client.post('/mods', json=mod)
    assert add.status_code == 200

    # It should appear in the materials listing now (fresh read).
    mats = client.get('/materials?version=1.20.1').json()
    assert any(m['id'] == mod['id'] for m in mats)

    # Painting with the freshly-added mod must succeed (not material_violation).
    patch = client.post(
        '/projects/sample-medieval-castle/manual-patch',
        json={
            'target_region': 'R1',
            'source': 't',
            'ops': [{'type': 'set_block', 'x': 2, 'y': 66, 'z': 2, 'block': mod['id']}],
        },
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()['result']['applied_ops'] == 1, patch.text

    # Cleanup.
    client.delete(f'/mods/{mod["id"]}')


def test_mod_ids_fresh_read() -> None:
    from app.services.singletons import sample_project_service as service
    ids = service.material_repository.list_mod_material_ids()
    assert isinstance(ids, set)
