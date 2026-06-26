from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_project_structured() -> None:
    response = client.post(
        '/projects/create',
        json={
            'name': 'My Castle',
            'size': [8, 8, 8],
            'origin': [0, 64, 0],
            'theme': 'custom',
            'build_mode': 'survival_friendly',
            'version': '1.20.1',
            'regions': [],
            'base_fills': [
                {'region_id': 'R1', 'from': [0, 0, 0], 'to': [7, 0, 7], 'block': 'minecraft:stone_bricks'},
            ],
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload['project_id'] == 'my-castle'
    assert payload['project']['project']['name'] == 'My Castle'
    assert payload['project']['project']['size'] == [8, 8, 8]
    assert len(payload['project']['regions']) == 1

    # The created project should be retrievable and have a preview with the floor.
    state = client.get('/projects/my-castle')
    assert state.status_code == 200
    preview = client.get('/projects/my-castle/preview').json()['preview']
    assert any(b['block'] == 'minecraft:stone_bricks' for b in preview['blocks'])


def test_create_project_rejects_bad_size() -> None:
    response = client.post('/projects/create', json={'name': 'bad', 'size': [0, 8, 8]})
    assert response.status_code == 422
