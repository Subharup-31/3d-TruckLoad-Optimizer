from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Shipment, Driver, ChatMessage
from backend.schemas import ShipmentCreate, ShipmentUpdate, ShipmentResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/shipments", tags=["Shipments"])

def map_shipment_to_response(s: Shipment) -> dict:
    return {
        "id": s.id,
        "customerId": s.customer_id,
        "customerName": s.customer_name,
        "customerPhone": s.customer_phone,
        "pickupLocation": s.pickup_location,
        "dropLocation": s.drop_location,
        "packageWeight": s.package_weight,
        "packageDimensions": s.package_dimensions,
        "packageNotes": s.package_notes or "",
        "scheduledTime": s.scheduled_time or "",
        "status": s.status,
        "assignedDriverId": s.assigned_driver_id,
        "createdAt": s.created_at.isoformat() if s.created_at else datetime.utcnow().isoformat(),
        "updatedAt": s.updated_at.isoformat() if s.updated_at else datetime.utcnow().isoformat()
    }

@router.get("", response_model=List[ShipmentResponse])
def get_all_shipments(driver_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Shipment)
    if driver_id:
        query = query.filter(Shipment.assigned_driver_id == driver_id)
    shipments = query.order_by(Shipment.created_at.desc()).all()
    return [map_shipment_to_response(s) for s in shipments]

@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(shipment_id: str, db: Session = Depends(get_db)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return map_shipment_to_response(s)

@router.post("", response_model=ShipmentResponse)
def create_shipment(data: ShipmentCreate, db: Session = Depends(get_db)):
    s = Shipment(
        customer_name=data.customerName,
        customer_phone=data.customerPhone,
        pickup_location=data.pickupLocation,
        drop_location=data.dropLocation,
        package_weight=data.packageWeight,
        package_dimensions=data.packageDimensions.dict(),
        package_notes=data.packageNotes,
        scheduled_time=data.scheduledTime,
        status="pending"
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return map_shipment_to_response(s)

@router.put("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(shipment_id: str, data: ShipmentUpdate, db: Session = Depends(get_db)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    if data.customerName is not None: s.customer_name = data.customerName
    if data.customerPhone is not None: s.customer_phone = data.customerPhone
    if data.pickupLocation is not None: s.pickup_location = data.pickupLocation
    if data.dropLocation is not None: s.drop_location = data.dropLocation
    if data.packageWeight is not None: s.package_weight = data.packageWeight
    if data.packageDimensions is not None: s.package_dimensions = data.packageDimensions.dict()
    if data.packageNotes is not None: s.package_notes = data.packageNotes
    if data.scheduledTime is not None: s.scheduled_time = data.scheduledTime
    if data.status is not None: s.status = data.status
    if data.assignedDriverId is not None: s.assigned_driver_id = data.assignedDriverId
    
    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return map_shipment_to_response(s)

@router.delete("/{shipment_id}")
def delete_shipment(shipment_id: str, db: Session = Depends(get_db)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    db.delete(s)
    db.commit()
    return {"message": "Shipment deleted successfully", "id": shipment_id}

@router.put("/{shipment_id}/assign/{driver_id}")
def assign_driver(shipment_id: str, driver_id: str, db: Session = Depends(get_db)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    s.assigned_driver_id = driver_id
    s.status = "assigned"
    s.updated_at = datetime.utcnow()
    db.commit()
    return map_shipment_to_response(s)
