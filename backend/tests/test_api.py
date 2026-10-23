"""Integration Tests for FastAPI Endpoints"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import tempfile
import os

from app.main import app
from app.database.db import init_db


@pytest.fixture(scope="module")
def client():
    # Use temporary test database for API tests
    with tempfile.TemporaryDirectory() as tmp_dir:
        test_db = Path(tmp_dir) / "test_api.db"
        init_db(test_db)
        with TestClient(app) as c:
            yield c


def test_health_check_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "QuantumGuard AI API"
    assert data["database_connected"] is True


def test_scenarios_endpoint(client):
    response = client.get("/api/simulator/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) == 10
    scenario_ids = [s["id"] for s in scenarios]
    assert "ideal_normal" in scenario_ids
    assert "full_eve" in scenario_ids


def test_simulation_run_endpoint(client):
    payload = {
        "scenario_id": "normal_background_noise",
        "scenario_name": "API Test Normal",
        "num_pulses": 1000,
        "noise_prob": 0.015,
        "loss_prob": 0.10,
        "eve_prob": 0.0,
        "test_bit_fraction": 0.5,
        "random_seed": 777
    }
    response = client.post("/api/simulator/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "run" in data
    assert "features" in data
    assert "detection" in data
    assert data["run"]["metrics"]["qber"] is not None
    assert data["run"]["metrics"]["transmitted_pulses"] == 1000


def test_simulation_run_attack_alert_generation(client):
    payload = {
        "scenario_id": "full_eve",
        "scenario_name": "API Test Full Eve",
        "num_pulses": 1500,
        "noise_prob": 0.005,
        "loss_prob": 0.10,
        "eve_prob": 1.0,
        "test_bit_fraction": 0.5,
        "random_seed": 888
    }
    response = client.post("/api/simulator/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detection"]["is_anomaly"] is True
    assert data["alert"] is not None
    assert data["alert"]["status"] in ["ANOMALY SUSPECTED", "INVESTIGATION REQUIRED"]


def test_baseline_calibrate_endpoint(client):
    payload = {
        "name": "API Test Baseline",
        "version": "1.0.0",
        "num_runs": 4,
        "num_pulses_per_run": 800,
        "noise_prob": 0.015,
        "loss_prob": 0.10,
        "sensitivity": "medium"
    }
    response = client.post("/api/baseline/calibrate", json=payload)
    assert response.status_code == 200
    baseline = response.json()
    assert baseline["num_runs"] == 4
    assert baseline["mean_qber"] > 0.0


def test_channel_trends_endpoint(client):
    response = client.get("/api/history/channel-trends?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "data" in data
    assert isinstance(data["data"], list)


def test_invalid_simulation_input_rejection(client):
    """Verify input validation rejects invalid probabilities or negative pulses."""
    bad_payload = {
        "num_pulses": -50,  # Invalid
        "noise_prob": 1.5,   # Invalid probability > 1.0
    }
    response = client.post("/api/simulator/run", json=bad_payload)
    assert response.status_code == 422  # Unprocessable Entity
