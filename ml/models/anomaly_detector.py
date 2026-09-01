import os
import joblib
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest
from backend.config import settings

class LogisticsAnomalyDetector:
    def __init__(self):
        self.model = None
        self.feature_names = ['temperature_c', 'current_cost_inr', 'current_delay_minutes', 'ratio_metric']
        self.model_version = "2.1.0-NABRealTelemetry"
        self.model_name = "IsolationForestAnomalyDetector"
        self.metrics = {}
        
    def train(self, n_samples: int = 1500):
        np.random.seed(42)
        # Normal operations feature distributions:
        # [delay_mins, cost_ratio, temp_celsius, humidity_pct, speed_kmh, deviation_km]
        delays = np.random.exponential(15, size=n_samples)
        cost_ratios = np.random.normal(1.0, 0.08, size=n_samples)
        temperatures = np.random.normal(22.0, 3.0, size=n_samples) # cold chain / ambient
        humidity = np.random.normal(55.0, 8.0, size=n_samples)
        speeds = np.random.normal(55.0, 10.0, size=n_samples)
        deviations = np.random.exponential(0.5, size=n_samples)
        
        # Inject 3% synthetic anomalies
        n_anom = int(n_samples * 0.03)
        delays[:n_anom] += np.random.uniform(90, 240, size=n_anom)
        cost_ratios[:n_anom] += np.random.uniform(0.4, 1.2, size=n_anom)
        temperatures[:n_anom] += np.random.choice([-15, 20], size=n_anom)
        
        X = np.column_stack([delays, cost_ratios, temperatures, humidity, speeds, deviations])
        
        self.model = IsolationForest(contamination=0.04, random_state=42, n_estimators=100)
        self.model.fit(X)
        
        self.metrics = {
            "trained_samples": n_samples,
            "contamination_threshold": 0.04
        }
        self.save()
        return self.metrics

    def detect(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if self.model is None:
            self.load()
            
        delay = float(payload.get("current_delay_minutes", 0.0) or 0.0)
        cost = float(payload.get("current_cost_inr", 0.0) or 0.0)
        expected_cost = float(payload.get("expected_cost_inr", cost if cost > 0 else 1.0) or 1.0)
        cost_ratio = cost / expected_cost if expected_cost > 0 else 1.0
        temp = float(payload.get("temperature_celsius", 22.0) or 22.0)
        humidity = float(payload.get("humidity_pct", 55.0) or 55.0)
        speed = float(payload.get("speed_kmh", 55.0) or 55.0)
        deviation = float(payload.get("route_deviation_km", 0.0) or 0.0)
        
        # Build vector matching fitted feature length
        n_features = getattr(self.model, 'n_features_in_', 4)
        if n_features == 4:
            x_vec = np.array([[temp, cost, delay, delay / (temp + 1e-5)]])
        else:
            x_vec = np.array([[delay, cost_ratio, temp, humidity, speed, deviation]])
        
        try:
            pred = self.model.predict(x_vec)[0]
            raw_score = float(self.model.decision_function(x_vec)[0])
            norm_score = round(float(np.clip(0.5 - raw_score, 0.0, 1.0)), 3)
        except Exception:
            pred = 1
            norm_score = 0.15
            
        is_anomaly = bool(pred == -1 or norm_score > 0.55 or delay > 75 or cost_ratio > 1.35 or temp > 35 or deviation > 5.0)
        
        detected_types: List[str] = []
        if delay > 60:
            detected_types.append("TRANSIT_DELAY_SPIKE")
        if cost_ratio > 1.25 or cost > 50000:
            detected_types.append("COST_OVERRUN")
        if temp < 10 or temp > 32:
            detected_types.append("TEMPERATURE_BREACH")
        if deviation > 3.0:
            detected_types.append("ROUTE_DEVIATION")
        
        severity = "LOW"
        explanation = "All telemetry parameters within normal historical bounds."
        if is_anomaly:
            if len(detected_types) >= 2 or temp > 40 or delay > 120:
                severity = "CRITICAL"
                explanation = f"Critical risk detected: {', '.join(detected_types)}."
            elif len(detected_types) == 1:
                severity = "HIGH"
                explanation = f"Operational alert: {detected_types[0]} detected."
            else:
                severity = "MEDIUM"
                explanation = "Statistical multivariate outlier detected."
                
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": norm_score,
            "severity": severity,
            "anomaly_types": detected_types if is_anomaly else [],
            "explanation": explanation,
            "mitigation_plan": "Dispatch field check and notify operations control center." if is_anomaly else "Operations nominal.",
            "model_name": self.model_name,
            "model_version": self.model_version
        }

    def save(self):
        settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "model": self.model,
            "metrics": self.metrics,
            "version": self.model_version
        }, settings.MODEL_DIR / "anomaly_detector.joblib")

    def load(self):
        path = settings.MODEL_DIR / "anomaly_detector.joblib"
        if path.exists():
            data = joblib.load(path)
            self.model = data["model"]
            self.metrics = data.get("metrics", {})
        else:
            self.train()

anomaly_detector = LogisticsAnomalyDetector()
