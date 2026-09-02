import requests

BASE_URL = "http://localhost:8000"

def test_health_endpoint():
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200, f"Status: {response.status_code}"
    data = response.json()
    assert data["status"] == "healthy"
    assert data["ai_models_loaded"]["delay_model"] == "active"
    assert data["ai_models_loaded"]["demand_lstm"] == "active"

def test_auth_login():
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "username": "admin",
        "password": "logiload2024"
    })
    assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_fleet_endpoints():
    response = requests.get(f"{BASE_URL}/api/v1/fleet/vehicles")
    assert response.status_code == 200
    vehicles = response.json()
    assert len(vehicles) >= 10
    
    dealers_resp = requests.get(f"{BASE_URL}/api/v1/fleet/dealerships")
    assert dealers_resp.status_code == 200
    dealers = dealers_resp.json()
    assert len(dealers) >= 3

def test_ai_delay_prediction():
    payload = {
        "distance_km": 350.0,
        "traffic_level": 1.4,
        "weather_impact": 0.2,
        "number_of_stops": 3,
        "cargo_weight_kg": 4500.0,
        "is_fragile": True
    }
    response = requests.post(f"{BASE_URL}/api/v1/ai/delay/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_delay_minutes"] >= 0
    assert 0.0 <= data["delay_probability"] <= 1.0
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "feature_contributions" in data
    assert "traffic_congestion" in data["feature_contributions"]

def test_ai_cost_prediction():
    payload = {
        "distance_km": 420.0,
        "cargo_weight_kg": 5000.0,
        "number_of_stops": 2,
        "fuel_price_inr": 90.0,
        "mode": "truck"
    }
    response = requests.post(f"{BASE_URL}/api/v1/ai/cost/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_cost_inr"] > 1000.0
    assert data["lower_bound_inr"] <= data["predicted_cost_inr"] <= data["upper_bound_inr"]
    assert "fuel_expense_inr" in data["cost_drivers"]

def test_ai_demand_forecasting():
    payload = {
        "dealership_id": "dealer-1",
        "item_name": "Auto Parts Box",
        "horizon_days": 7
    }
    response = requests.post(f"{BASE_URL}/api/v1/ai/demand/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["daily_forecast"]) == 7
    assert data["total_forecast_qty"] > 0
    assert data["confidence_score"] > 80.0

def test_ai_anomaly_detection():
    payload = {
        "entity_type": "shipment",
        "entity_id": "del-test-1",
        "current_delay_minutes": 120.0,
        "current_cost_inr": 18000.0,
        "expected_cost_inr": 11000.0,
        "temperature_celsius": 38.0,
        "humidity_pct": 85.0,
        "speed_kmh": 20.0,
        "route_deviation_km": 12.0
    }
    response = requests.post(f"{BASE_URL}/api/v1/ai/anomaly/detect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_anomaly"] is True
    assert data["severity"] in ["HIGH", "CRITICAL"]
    assert len(data["anomaly_types"]) > 0

def test_ai_route_optimization_gnn():
    payload = {
        "origin": {"id": "orig", "address": "Mumbai Port", "city": "Mumbai", "lat": 19.0760, "lng": 72.8777},
        "stops": [
            {"id": "s1", "address": "Pune Hub", "city": "Pune", "lat": 18.5204, "lng": 73.8567},
            {"id": "s2", "address": "Bangalore Hub", "city": "Bangalore", "lat": 12.9716, "lng": 77.5946}
        ],
        "algorithm": "gnn_ppo"
    }
    response = requests.post(f"{BASE_URL}/api/v1/ai/optimization/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["optimized_stops"]) == 2
    assert data["total_distance_km"] > 0

def test_ai_packing_drl():
    payload = {
        "vehicle": {
            "id": "tata-1109",
            "name": "Tata 1109",
            "dimensions": {"length": 450, "width": 220, "height": 220},
            "maxWeight": 11000
        },
        "items": [
            {
                "id": "it1", "name": "Heavy Machine Parts", "quantity": 2,
                "dimensions": {"length": 100, "width": 80, "height": 60},
                "weight": 500, "color": "#ef4444", "isFragile": False, "isStackable": True
            },
            {
                "id": "it2", "name": "Fragile Glass Crate", "quantity": 1,
                "dimensions": {"length": 60, "width": 40, "height": 40},
                "weight": 80, "color": "#3b82f6", "isFragile": True, "isStackable": False
            }
        ],
        "mode": "drl"
    }
    response = requests.post(f"{BASE_URL}/api/v1/ai/optimization/packing", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["placed_items"]) == 3
    assert data["volume_utilization_pct"] > 0
    assert "center_of_gravity" in data

def test_ai_chat_assistant():
    response = requests.post(f"{BASE_URL}/api/v1/ai/chat/message", json={
        "message": "What is the status of active shipments in Mumbai?"
    })
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0

if __name__ == "__main__":
    tests = [
        ('Health Check', test_health_endpoint),
        ('Auth Login (JWT)', test_auth_login),
        ('Fleet & Dealerships', test_fleet_endpoints),
        ('GBDT Delay Prediction & SHAP', test_ai_delay_prediction),
        ('GBDT Cost Regressor', test_ai_cost_prediction),
        ('PyTorch LSTM Demand Forecasting', test_ai_demand_forecasting),
        ('Isolation Forest Anomaly Detection', test_ai_anomaly_detection),
        ('GNN + PPO Route Optimization', test_ai_route_optimization_gnn),
        ('DRL 3D Cargo Packing', test_ai_packing_drl),
        ('Grounded Assistant Chatbot', test_ai_chat_assistant)
    ]

    passed = 0
    for name, t in tests:
        try:
            t()
            print(f'✅ {name}: PASSED')
            passed += 1
        except Exception as e:
            print(f'❌ {name}: FAILED ({e})')

    print(f'\n🎉 Total Test Suite Results: {passed}/{len(tests)} Tests Passed Successfully!')
