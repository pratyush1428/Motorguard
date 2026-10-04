import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.schema import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["system"] == "MotorGuard API"
    assert "7.4V nominal" in response.json()["power_specification"]

def test_settings_get_and_update():
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "temp_warning" in data
    assert "vibration_warning" in data

    # Update threshold
    data["temp_warning"] = 52.0
    post_res = client.post("/api/settings", json=data)
    assert post_res.status_code == 200
    assert post_res.json()["temp_warning"] == 52.0

def test_sensor_data_validation():
    # 1. Invalid temperature (e.g. 500°C) should be rejected
    bad_temp = {
        "device_id": "MOTOR-001",
        "temperature": 500.0,
        "current": 1.2,
        "vibration": 0.5
    }
    res = client.post("/api/sensor-data", json=bad_temp)
    assert res.status_code == 422

    # 2. Negative vibration should be rejected
    bad_vib = {
        "device_id": "MOTOR-001",
        "temperature": 40.0,
        "current": 1.2,
        "vibration": -2.0
    }
    res = client.post("/api/sensor-data", json=bad_vib)
    assert res.status_code == 422

    # 3. Valid reading should be processed and return 201
    valid_payload = {
        "device_id": "MOTOR-001",
        "temperature": 38.5,
        "current": 0.95,
        "vibration": 0.32,
        "motor_status": "RUNNING",
        "relay_status": "ACTIVE",
        "is_simulated": True
    }
    res = client.post("/api/sensor-data", json=valid_payload)
    assert res.status_code == 201
    res_data = res.json()["data"]
    assert res_data["temperature"] == 38.5
    assert "health" in res_data
    assert res_data["health"]["health_score"] >= 90.0

def test_latest_and_history():
    latest_res = client.get("/api/latest")
    assert latest_res.status_code == 200
    assert "temperature" in latest_res.json()

    hist_res = client.get("/api/history?window=1h&limit=10")
    assert hist_res.status_code == 200
    assert isinstance(hist_res.json(), list)

def test_emergency_stop_and_reset_flow():
    # Trigger Emergency Stop
    estop_res = client.post("/api/emergency-stop", json={"reason": "Test E-Stop"})
    assert estop_res.status_code == 200
    assert estop_res.json()["data"]["relay_status"] == "INACTIVE"
    assert estop_res.json()["data"]["emergency_stop_latched"] is True

    # Attempting to turn relay ON directly while latched must fail
    relay_on_res = client.post("/api/relay", json={"command": "ON", "reason": "Test"})
    assert relay_on_res.status_code == 400

    # Reset Emergency Stop
    reset_res = client.post("/api/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["data"]["emergency_stop_latched"] is False
    assert reset_res.json()["data"]["relay_status"] == "ACTIVE"

def test_statistics_and_csv():
    stats_res = client.get("/api/statistics")
    assert stats_res.status_code == 200
    assert "avg_temp" in stats_res.json()

    csv_res = client.get("/api/export-csv")
    assert csv_res.status_code == 200
    assert "Temperature" in csv_res.text
