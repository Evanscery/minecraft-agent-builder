from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.sample_project_spec import SAMPLE_PROJECT_ID

client = TestClient(app)


def setup_project() -> None:
    client.post('/projects/sample')


def test_retry_region_endpoint_records_request() -> None:
    setup_project()

    response = client.post(
        f'/projects/{SAMPLE_PROJECT_ID}/retry-region',
        json={
            'target_region': 'R1',
            'user_instruction': 'Raise the tower roof and preserve the gate alignment.',
            'preserve_interfaces': True,
            'preserve_manual_edits': True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['result']['target_region'] == 'R1'
    assert payload['result']['status'] == 'accepted'


def test_manual_patch_endpoint_mutates_block_state() -> None:
    setup_project()

    preview_before = client.get(f'/projects/{SAMPLE_PROJECT_ID}/preview').json()['preview']
    count_before = sum(1 for block in preview_before['blocks'] if block['block'] == 'minecraft:lantern')

    response = client.post(
        f'/projects/{SAMPLE_PROJECT_ID}/manual-patch',
        json={
            'target_region': 'R1',
            'source': 'test_case',
            'ops': [
                {'type': 'set_block', 'x': 0, 'y': 66, 'z': 0, 'block': 'minecraft:lantern'},
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['result']['applied_ops'] == 1
    assert payload['result']['status'] == 'accepted'

    preview_after = client.get(f'/projects/{SAMPLE_PROJECT_ID}/preview').json()['preview']
    count_after = sum(1 for block in preview_after['blocks'] if block['block'] == 'minecraft:lantern')
    assert count_after == count_before + 1


def test_manual_patch_rejects_non_palette_material() -> None:
    setup_project()

    response = client.post(
        f'/projects/{SAMPLE_PROJECT_ID}/manual-patch',
        json={
            'target_region': 'R1',
            'source': 'test_case',
            'ops': [
                {'type': 'set_block', 'x': 0, 'y': 66, 'z': 0, 'block': 'minecraft:command_block'},
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['result']['applied_ops'] == 0

    validation = client.get(f'/projects/{SAMPLE_PROJECT_ID}/validation').json()['validation_report']
    assert any(issue['type'] == 'material_violation' for issue in validation['errors'])


def test_export_endpoint_returns_real_content() -> None:
    setup_project()

    response = client.post(
        f'/projects/{SAMPLE_PROJECT_ID}/export',
        json={'format': 'mcfunction'},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['result']['format'] == 'mcfunction'
    assert payload['result']['file_name'].endswith('.mcfunction')
    assert 'setblock' in payload['result']['content']


def test_project_state_includes_command_history() -> None:
    setup_project()
    client.post(
        f'/projects/{SAMPLE_PROJECT_ID}/retry-region',
        json={
            'target_region': 'R3',
            'user_instruction': 'Add more windows without breaking the wall connection.',
            'preserve_interfaces': True,
            'preserve_manual_edits': True,
        },
    )

    response = client.get(f'/projects/{SAMPLE_PROJECT_ID}')

    assert response.status_code == 200
    payload = response.json()
    assert len(payload['retry_history']) >= 1
