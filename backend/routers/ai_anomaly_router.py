import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import AnomalyRecord
from backend.schemas import AnomalyDetectRequest, AnomalyDetectResponse
from ml.models.anomaly_detector import anomaly_detector

router = APIRouter(prefix="/ai/anomaly", tags=["AI Anomaly Detection"])

@router.post("/detect", response_model=AnomalyDetectResponse)
def detect_anomaly(req: AnomalyDetectRequest, db: Session = Depends(get_db)):
    res = anomaly_detector.detect(req.dict())
    
    if res["is_anomaly"]:
        anom_id = f"anom-{uuid.uuid4().hex[:8]}"
        record = AnomalyRecord(
            id=anom_id,
            entity_type=req.entity_type,
            entity_id=req.entity_id,
            anomaly_type=",".join(res["anomaly_types"]),
            anomaly_score=res["anomaly_score"],
            severity=res["severity"],
            details=req.dict(),
            explanation=res["explanation"],
            status="open"
        )
        db.add(record)
        db.commit()
        
    return res

@router.get("/active")
def get_active_anomalies(db: Session = Depends(get_db)):
    anomalies = db.query(AnomalyRecord).filter(AnomalyRecord.status == "open").order_by(AnomalyRecord.created_at.desc()).limit(20).all()
    return [
        {
            "id": a.id,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "anomaly_type": a.anomaly_type,
            "anomaly_score": a.anomaly_score,
            "severity": a.severity,
            "explanation": a.explanation,
            "created_at": a.created_at.isoformat() if a.created_at else ""
        } for a in anomalies
    ]
