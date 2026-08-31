import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from backend.config import settings

FEATURE_NAMES = [
    "distance_km",
    "cargo_weight_kg",
    "vehicle_max_weight_kg",
    "number_of_stops",
    "fuel_price_inr",
    "traffic_factor"
]

class CostPredictor:
    def __init__(self):
        self.model = None
        self.feature_names = ["distance_km", "cargo_weight_kg", "number_of_stops"]
        self.model_version = "2.1.0-KaggleUSAID"
        self.model_name = "GradientBoostedCostRegressor"
        self.metrics = {}
        
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        X = df[self.feature_names]
        y = df["total_cost_inr"]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.model = HistGradientBoostingRegressor(max_iter=150, learning_rate=0.08, random_state=42)
        self.model.fit(X_train, y_train)
        
        preds = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        
        self.metrics = {
            "mae_inr": round(float(mae), 2),
            "r2_score": round(float(r2), 3),
            "test_samples": len(X_test)
        }
        self.save()
        return self.metrics

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        if self.model is None:
            self.load()
            
        dist = float(features.get("distance_km", 100.0))
        weight = float(features.get("cargo_weight_kg", 500.0))
        max_w = float(features.get("vehicle_max_weight_kg", 16000.0))
        stops = int(features.get("number_of_stops", 1))
        traffic = float(features.get("traffic_factor", 1.0))
        mode = features.get("mode", "truck")
        
        f_names = self.feature_names or ["distance_km", "cargo_weight_kg", "number_of_stops"]
        x_vec = np.array([[float(features.get(f, dist if 'dist' in f else (weight if 'weight' in f else stops))) for f in f_names]])
        
        try:
            predicted_cost = float(self.model.predict(x_vec)[0])
        except Exception:
            predicted_cost = (dist * 25.0) + (weight * 4.5) + (stops * 450.0)
            
        if mode == "air":
            predicted_cost *= 3.5
        elif mode == "sea":
            predicted_cost *= 0.65
            
        fuel_liters = dist * 0.28 * (1.0 + (weight / max_w) * 0.35) * traffic
        if mode == "air":
            fuel_liters = dist * 8.0
        elif mode == "sea":
            fuel_liters = dist * 1.4
            
        co2_emissions_kg = fuel_liters * 2.68
        toll_cost_inr = (dist / 65.0) * 120.0
        driver_allowance_inr = max(500.0, (dist / 45.0) * 80.0)
        base_freight_inr = max(1000.0, predicted_cost - toll_cost_inr - driver_allowance_inr)
        
        return {
            "predicted_cost_inr": round(predicted_cost, 2),
            "predicted_fuel_liters": round(fuel_liters, 1),
            "lower_bound_inr": round(max(0.0, predicted_cost * 0.90), 2),
            "upper_bound_inr": round(predicted_cost * 1.15, 2),
            "cost_drivers": {
                "fuel_expense_inr": round(fuel_liters * float(features.get("fuel_price_inr", 90.0)), 2),
                "highway_tolls_inr": round(toll_cost_inr, 2),
                "driver_operational_wage_inr": round(driver_allowance_inr, 2),
                "vehicle_wear_maintenance_inr": round(base_freight_inr * 0.15, 2)
            },
            "model_name": self.model_name,
            "model_version": self.model_version
        }

    def save(self):
        settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "model": self.model,
            "feature_names": self.feature_names,
            "metrics": self.metrics,
            "version": self.model_version
        }, settings.MODEL_DIR / "cost_model.joblib")

    def load(self):
        path = settings.MODEL_DIR / "cost_model.joblib"
        if path.exists():
            data = joblib.load(path)
            self.model = data.get("model")
            self.feature_names = data.get("feature_names", ["distance_km", "cargo_weight_kg", "number_of_stops"])
            self.metrics = data.get("metrics", {})
            self.model_version = data.get("version", "2.1.0-KaggleUSAID")
        else:
            import ml.train_all_real

cost_predictor = CostPredictor()
