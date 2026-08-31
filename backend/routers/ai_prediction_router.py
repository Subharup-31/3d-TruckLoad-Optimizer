import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import PredictionRecord
from backend.schemas import (
    DelayPredictRequest, DelayPredictResponse,
    CostPredictRequest, CostPredictResponse,
    DemandForecastRequest, DemandForecastResponse
)
from ml.models.delay_model import delay_predictor
from ml.models.cost_model import cost_predictor
from ml.models.demand_lstm import demand_forecaster

router = APIRouter(prefix="/ai", tags=["AI Predictive Analytics"])

@router.post("/delay/predict", response_model=DelayPredictResponse)
def predict_delay(req: DelayPredictRequest, db: Session = Depends(get_db)):
    pred = delay_predictor.predict(req.dict())
    pred_id = f"pred-del-{uuid.uuid4().hex[:8]}"
    
    # Store prediction record in DB
    record = PredictionRecord(
        id=pred_id,
        prediction_type="delay",
        entity_id=req.shipment_id,
        input_features=req.dict(),
        output_result=pred,
        model_name=pred["model_name"],
        model_version=pred["model_version"]
    )
    db.add(record)
    db.commit()
    
    return {
        "prediction_id": pred_id,
        **pred
    }

@router.post("/cost/predict", response_model=CostPredictResponse)
def predict_cost(req: CostPredictRequest, db: Session = Depends(get_db)):
    pred = cost_predictor.predict(req.dict())
    pred_id = f"pred-cost-{uuid.uuid4().hex[:8]}"
    
    record = PredictionRecord(
        id=pred_id,
        prediction_type="cost",
        input_features=req.dict(),
        output_result=pred,
        model_name=pred["model_name"],
        model_version=pred["model_version"]
    )
    db.add(record)
    db.commit()
    
    return {
        "prediction_id": pred_id,
        **pred
    }

@router.post("/delivery-time/predict")
def predict_delivery_time(req: DelayPredictRequest, db: Session = Depends(get_db)):
    # Combines OSRM speed base + XGBoost delay distribution
    delay_res = delay_predictor.predict(req.dict())
    dist = req.distance_km
    speed = 52.0 / max(0.5, req.traffic_level)
    nominal_mins = (dist / speed) * 60.0 + (req.number_of_stops * 25.0)
    
    total_duration_mins = round(nominal_mins + delay_res["predicted_delay_minutes"])
    
    return {
        "distance_km": dist,
        "nominal_duration_mins": round(nominal_mins),
        "predicted_delay_mins": delay_res["predicted_delay_minutes"],
        "total_predicted_duration_mins": total_duration_mins,
        "delay_risk_level": delay_res["risk_level"],
        "confidence_score": 92.5,
        "model_name": delay_res["model_name"],
        "model_version": delay_res["model_version"]
    }

@router.post("/demand/forecast", response_model=DemandForecastResponse)
def forecast_demand(req: DemandForecastRequest, db: Session = Depends(get_db)):
    result = demand_forecaster.forecast(
        dealership_id=req.dealership_id,
        item_name=req.item_name,
        horizon_days=req.horizon_days
    )
    return result
