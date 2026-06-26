from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_config_get_and_save_roundtrip() -> None:
    # Save a config, then read it back.
    response = client.put('/config', json={'language': 'en', 'default_version': '1.20.1', 'default_build_mode': 'creative_showcase'})
    assert response.status_code == 200
    got = client.get('/config')
    assert got.status_code == 200
    assert got.json()['language'] == 'en'
    # restore default to keep other tests deterministic
    client.put('/config', json={'language': 'zh', 'default_version': '1.20.1', 'default_build_mode': 'survival_friendly'})


def test_prompts_list_and_save() -> None:
    response = client.get('/config/prompts')
    assert response.status_code == 200
    sections = response.json()
    ids = [s['id'] for s in sections]
    assert 'global_planner' in ids
    assert all(s['template'] for s in sections)

    save = client.put('/config/prompts', json={
        'global_planner': 'custom',
        'material_planner': 'custom-mp',
        'region_generator': 'custom-rg',
        'repair_agent': 'custom-rp',
        'visual_calibration': 'custom-vc',
    })
    assert save.status_code == 200
    assert save.json()['global_planner'] == 'custom'

    # restore defaults so later tests still see non-empty prompts
    from app.services.config_service import DEFAULT_PROMPTS
    client.put('/config/prompts', json=DEFAULT_PROMPTS.model_dump(mode="json"))


def test_mods_add_and_remove() -> None:
    mod = {
        'id': 'biomesoplenty:willow_planks',
        'name': 'Willow Planks',
        'description': 'modded wood',
        'category': 'wood',
        'availability': 3,
        'visual_style': ['natural', 'fantasy'],
        'texture_path': 'mods/biomesoplenty/textures/block/willow_planks.png',
        'source': 'mod_import',
        'version': 'biomesoplenty',
        'texture_url': 'https://example.com/willow_planks.png',
    }
    add = client.post('/mods', json=mod)
    assert add.status_code == 200
    assert add.json()['id'] == mod['id']

    listed = client.get('/mods')
    assert any(m['id'] == mod['id'] for m in listed.json())

    # The mod should be visible through the materials listing.
    mats = client.get('/materials?version=1.20.1')
    assert any(m['id'] == mod['id'] for m in mats.json())

    removed = client.delete(f'/mods/{mod["id"]}')
    assert removed.status_code == 200
    assert removed.json()['removed'] is True


def test_save_as_and_list_saved_projects() -> None:
    client.post('/projects/sample')
    body = {'name': 'acceptance-save'}
    resp = client.post('/projects/sample-medieval-castle/save-as', json=body)
    assert resp.status_code == 200
    assert resp.json()['block_count'] > 0

    listed = client.get('/saved-projects')
    assert any(s['name'] == 'acceptance-save' for s in listed.json())

    deleted = client.delete('/saved-projects/acceptance-save')
    assert deleted.status_code == 200
    assert deleted.json()['removed'] is True
