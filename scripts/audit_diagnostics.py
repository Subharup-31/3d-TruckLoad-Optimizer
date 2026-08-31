import sys
import os
import time
import json
import base64
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

def run_diagnostics():
    report = {}
    
    # ── 1. Python Environment & Library Audit ────────────────────────────────
    packages = [
        ("fastapi", "FastAPI"),
        ("pydantic", "Pydantic"),
        ("sqlalchemy", "SQLAlchemy"),
        ("torch", "PyTorch"),
        ("torchvision", "TorchVision"),
        ("sklearn", "Scikit-Learn"),
        ("numpy", "NumPy"),
        ("pandas", "Pandas"),
        ("cv2", "OpenCV"),
        ("jose", "Python-Jose"),
        ("bcrypt", "Bcrypt"),
        ("requests", "Requests"),
        ("uvicorn", "Uvicorn")
    ]
    
    pkg_status = {}
    for mod_name, disp_name in packages:
        try:
            mod = __import__(mod_name)
            ver = getattr(mod, "__version__", "Installed")
            pkg_status[disp_name] = {"version": ver, "status": "INSTALLED"}
        except ImportError:
            pkg_status[disp_name] = {"version": "None", "status": "NOT_INSTALLED"}
            
    report["packages"] = pkg_status
    
    # ── 2. GPU / Hardware Acceleration ───────────────────────────────────────
    import torch
    device_info = {
        "python_version": sys.version.split()[0],
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "mps_available (Apple Silicon)": torch.backends.mps.is_available() if hasattr(torch.backends, "mps") else False,
        "device": "mps" if (hasattr(torch.backends, "mps") and torch.backends.mps.is_available()) else "cpu"
    }
    report["hardware"] = device_info
    
    # ── 3. Database Schema & Tables ──────────────────────────────────────────
    from backend.database import engine
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    table_details = {}
    for t in tables:
        cols = [c["name"] for c in inspector.get_columns(t)]
        fks = [fk["constrained_columns"] for fk in inspector.get_foreign_keys(t)]
        table_details[t] = {"column_count": len(cols), "columns": cols, "foreign_keys": fks}
        
    report["database"] = {
        "engine": str(engine.url),
        "table_count": len(tables),
        "tables": table_details
    }
    
    # ── 4. Model Artifacts & Latency ─────────────────────────────────────────
    from ml.models.delay_model import delay_predictor
    from ml.models.cost_model import cost_predictor
    from ml.models.demand_lstm import demand_forecaster
    from ml.models.anomaly_detector import anomaly_detector
    from ml.models.transport_gnn import network_gnn
    from ml.models.rl_routing import rl_route_optimizer
    from ml.models.drl_packing import drl_packer
    from ml.models.cargo_vision import cargo_vision
    
    model_benchmarks = {}
    
    # Delay
    t0 = time.time()
    d_res = delay_predictor.predict({"distance_km": 300, "traffic_level": 1.2, "weather_impact": 0.1, "number_of_stops": 2, "cargo_weight_kg": 2000})
    model_benchmarks["delay_model"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "sample_output": d_res["risk_level"]}
    
    # Cost
    t0 = time.time()
    c_res = cost_predictor.predict({"distance_km": 300, "cargo_weight_kg": 2000, "number_of_stops": 2})
    model_benchmarks["cost_model"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "sample_output": c_res["predicted_cost_inr"]}
    
    # Demand LSTM
    t0 = time.time()
    dem_res = demand_forecaster.forecast("dealer-1", "Auto Parts Box", 7)
    model_benchmarks["demand_lstm"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "sample_output": dem_res["total_forecast_qty"]}
    
    # Anomaly
    t0 = time.time()
    anom_res = anomaly_detector.detect({"current_delay_minutes": 100, "current_cost_inr": 15000, "expected_cost_inr": 10000})
    model_benchmarks["anomaly_detector"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "is_anomaly": anom_res["is_anomaly"]}
    
    # GNN
    t0 = time.time()
    gnn_res = network_gnn.get_corridor_similarity("Mumbai", "Pune")
    model_benchmarks["transport_gnn"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "corridor_similarity": round(gnn_res, 3)}
    
    # RL Route
    t0 = time.time()
    rl_res = rl_route_optimizer.optimize_stops(
        {"id": "orig", "lat": 19.0760, "lng": 72.8777, "city": "Mumbai"},
        [{"id": "s1", "lat": 18.5204, "lng": 73.8567, "city": "Pune"}, {"id": "s2", "lat": 12.9716, "lng": 77.5946, "city": "Bangalore"}]
    )
    model_benchmarks["rl_route_optimizer"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "distance_km": rl_res["total_distance_km"]}
    
    # DRL Packing
    t0 = time.time()
    pack_res = drl_packer.pack(
        {"dimensions": {"length": 600, "width": 240, "height": 240}, "maxWeight": 16000},
        [{"name": "Box 1", "quantity": 4, "dimensions": {"length": 80, "width": 60, "height": 50}, "weight": 100, "color": "#ef4444", "isFragile": False, "isStackable": True}]
    )
    model_benchmarks["drl_packer"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "vol_util": pack_res["volume_utilization_pct"]}
    
    # Vision
    dummy_img = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x02\x00\x00\x00\x90\x91h6\x00\x00\x00\x0cIDATx\x9cc`\x18\x05\xa3`\x14\x00\x00\x00\xff\xff\x03\x00\x01\r\x00\x05\xbf\x95\x8b\x00\x00\x00\x00IEND\xaeB`\x82')
    b64_dummy = base64.b64encode(dummy_img).decode("utf-8")
    t0 = time.time()
    vis_res = cargo_vision.detect_and_estimate_dimensions(b64_dummy)
    model_benchmarks["cargo_vision"] = {"latency_ms": round((time.time() - t0) * 1000, 2), "dims": vis_res["detected_dimensions_cm"]}
    
    report["model_benchmarks"] = model_benchmarks
    
    # ── 5. External APIs Check ────────────────────────────────────────────────
    import urllib.request
    apis = [
        ("OSRM Road Engine", "https://router.project-osrm.org/route/v1/driving/72.8777,19.0760;73.8567,18.5204?overview=false"),
        ("Open-Meteo Weather API", "https://api.open-meteo.com/v1/forecast?latitude=19.0760&longitude=72.8777&current=temperature_2m,wind_speed_10m"),
        ("Nominatim Reverse Geocoding", "https://nominatim.openstreetmap.org/reverse?format=json&lat=19.0760&lon=72.8777")
    ]
    api_status = {}
    for name, url in apis:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LogiLoadAudit/2.0"})
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=5) as r:
                api_status[name] = {"status_code": r.status, "latency_ms": round((time.time() - t0) * 1000, 2), "reachability": "ONLINE"}
        except Exception as e:
            api_status[name] = {"reachability": "ERROR", "error": str(e)}
            
    report["external_apis"] = api_status
    
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    run_diagnostics()
