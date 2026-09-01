from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Vehicle, Driver, CargoItem, Dealership
from backend.schemas import VehicleSchema, DriverSchema, CargoItemSchema

router = APIRouter(prefix="/fleet", tags=["Fleet & Inventory"])

# ── Vehicles ─────────────────────────────────────────────────────────────────
@router.get("/vehicles")
def get_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    return [
        {
            "id": v.id,
            "name": v.name,
            "dimensions": {"length": v.length_cm, "width": v.width_cm, "height": v.height_cm},
            "maxWeight": v.max_weight_kg,
            "vehicle_type": v.vehicle_type
        } for v in vehicles
    ]

@router.put("/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: str, data: VehicleSchema, db: Session = Depends(get_db)):
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v:
        v = Vehicle(id=vehicle_id, name=data.name, length_cm=data.dimensions.length, width_cm=data.dimensions.width, height_cm=data.dimensions.height, max_weight_kg=data.maxWeight)
        db.add(v)
    else:
        v.name = data.name
        v.length_cm = data.dimensions.length
        v.width_cm = data.dimensions.width
        v.height_cm = data.dimensions.height
        v.max_weight_kg = data.maxWeight
    db.commit()
    return {"message": "Vehicle updated", "id": vehicle_id}

# ── Drivers ──────────────────────────────────────────────────────────────────
@router.get("/drivers")
def get_drivers(db: Session = Depends(get_db)):
    drivers = db.query(Driver).all()
    return [
        {
            "id": d.id,
            "username": d.username,
            "name": d.name,
            "phone": d.phone,
            "licenseNumber": d.license_number,
            "truckId": d.truck_id
        } for d in drivers
    ]

@router.post("/drivers")
def create_driver(data: DriverSchema, db: Session = Depends(get_db)):
    d = Driver(
        id=data.id or f"driver-{data.username}",
        username=data.username,
        name=data.name,
        phone=data.phone,
        license_number=data.licenseNumber,
        truck_id=data.truckId
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "username": d.username, "name": d.name}

# ── Cargo Items (Inventory) ──────────────────────────────────────────────────
@router.get("/items")
def get_inventory_items(db: Session = Depends(get_db)):
    items = db.query(CargoItem).all()
    return [
        {
            "id": it.id,
            "name": it.name,
            "quantity": it.quantity,
            "dimensions": {"length": it.length_cm, "width": it.width_cm, "height": it.height_cm},
            "weight": it.weight_kg,
            "color": it.color,
            "isFragile": it.is_fragile,
            "isStackable": it.is_stackable,
            "city": it.city
        } for it in items
    ]

@router.post("/items")
def save_inventory_items(items: List[CargoItemSchema], db: Session = Depends(get_db)):
    # Sync items in DB
    db.query(CargoItem).delete()
    for it in items:
        c = CargoItem(
            id=it.id or f"item-{it.name}",
            name=it.name,
            quantity=it.quantity,
            length_cm=it.dimensions.length,
            width_cm=it.dimensions.width,
            height_cm=it.dimensions.height,
            weight_kg=it.weight,
            color=it.color,
            is_fragile=it.isFragile,
            is_stackable=it.isStackable,
            city=it.city
        )
        db.add(c)
    db.commit()
    return {"message": f"Saved {len(items)} items"}

# ── Dealerships ──────────────────────────────────────────────────────────────
@router.get("/dealerships")
def get_dealerships(db: Session = Depends(get_db)):
    dealerships = db.query(Dealership).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "location": d.location,
            "city": d.city,
            "contactPerson": d.contact_person,
            "phone": d.phone,
            "currentStock": d.current_stock or [],
            "incomingShipments": d.incoming_shipments or 0
        } for d in dealerships
    ]
