from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.sample_project_spec import SAMPLE_PROJECT_ID

client = TestClient(app)


def test_create_sample_project_endpoint_returns_project_summary() -> None:
    response = client.post("/projects/sample")

    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == SAMPLE_PROJECT_ID
    assert payload["project"]["project"]["name"] == "medieval_castle_sample"
    assert payload["frontend_config"]["preview"]["default_camera"] == "isometric"


def test_get_project_endpoint_returns_created_project_state() -> None:
    client.post("/projects/sample")

    response = client.get(f"/projects/{SAMPLE_PROJECT_ID}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == SAMPLE_PROJECT_ID
    assert len(payload["spec"]["regions"]) == 3
    assert payload["materials"]


def test_get_preview_endpoint_returns_preview_blocks() -> None:
    client.post("/projects/sample")

    response = client.get(f"/projects/{SAMPLE_PROJECT_ID}/preview")

    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == SAMPLE_PROJECT_ID
    assert payload["preview"]["blocks"]
    assert payload["preview"]["regions"]


def test_get_validation_endpoint_returns_validation_report() -> None:
    client.post("/projects/sample")

    response = client.get(f"/projects/{SAMPLE_PROJECT_ID}/validation")

    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == SAMPLE_PROJECT_ID
    assert "errors" in payload["validation_report"]


def test_get_missing_project_returns_404() -> None:
    response = client.get("/projects/missing-project")

    assert response.status_code == 404
    assert "was not found" in response.json()["detail"]
