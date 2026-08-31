import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from backend.database import engine, Base, SessionLocal
from backend.models import (
    User, Vehicle, Driver, Dealership, Shipment, CargoItem,
    ModelVersion, NetworkNode, NetworkEdge
)
from backend.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        # ── 1. Seed Users ────────────────────────────────────────────────────
        if not db.query(User).first():
            print("🌱 Seeding Users...")
            users = [
                User(
                    username="admin",
                    email="admin@logiload.in",
                    hashed_password=get_password_hash("logiload2024"),
                    full_name="Operations Administrator",
                    role="admin"
                ),
                User(
                    username="manager",
                    email="manager@logiload.in",
                    hashed_password=get_password_hash("manager2024"),
                    full_name="Hub Logistics Manager",
                    role="manager"
                ),
                User(
                    username="dealer",
                    email="dealer@logiload.in",
                    hashed_password=get_password_hash("dealer2024"),
                    full_name="Mumbai Dealership Partner",
                    role="dealer"
                ),
                User(
                    username="driver1",
                    email="driver1@logiload.in",
                    hashed_password=get_password_hash("driver123"),
                    full_name="Raj Kumar",
                    role="driver"
                ),
                User(
                    username="driver2",
                    email="driver2@logiload.in",
                    hashed_password=get_password_hash("driver123"),
                    full_name="Amit Sharma",
                    role="driver"
                ),
                User(
                    username="driver3",
                    email="driver3@logiload.in",
                    hashed_password=get_password_hash("driver123"),
                    full_name="Suresh Patel",
                    role="driver"
                )
            ]
            db.add_all(users)
            db.commit()
            
        # ── 2. Seed Indian Fleet Vehicles ────────────────────────────────────
        if not db.query(Vehicle).first():
            print("🌱 Seeding Fleet Vehicles...")
            vehicles = [
                Vehicle(id="default-truck-1", name="Tata LPT 1613 Container", length_cm=600, width_cm=240, height_cm=240, max_weight_kg=16000),
                Vehicle(id="tata-1109", name="Tata 1109 Cabin Chassis", length_cm=450, width_cm=220, height_cm=220, max_weight_kg=11000),
                Vehicle(id="eicher-12ft", name="Eicher 12 Ft Single Axle", length_cm=360, width_cm=180, height_cm=180, max_weight_kg=7500),
                Vehicle(id="bharatbenz-1623r", name="BharatBenz 1623R Tipper", length_cm=550, width_cm=230, height_cm=150, max_weight_kg=16000),
                Vehicle(id="ashok-1616", name="Ashok Leyland 1616 HD", length_cm=650, width_cm=240, height_cm=240, max_weight_kg=16000),
                Vehicle(id="mahindra-blazo", name="Mahindra Blazo 25 HP Tipper", length_cm=480, width_cm=210, height_cm=160, max_weight_kg=25000),
                Vehicle(id="tata-407", name="Tata 407 Gold SFC", length_cm=320, width_cm=170, height_cm=170, max_weight_kg=4000),
                Vehicle(id="eicher-pro-2049", name="Eicher Pro 2049", length_cm=580, width_cm=230, height_cm=230, max_weight_kg=20000),
                Vehicle(id="ashok-leyland-dost", name="Ashok Leyland Dost+", length_cm=280, width_cm=160, height_cm=160, max_weight_kg=1900),
                Vehicle(id="mahindra-furio", name="Mahindra Furio 17", length_cm=520, width_cm=220, height_cm=220, max_weight_kg=17000),
                Vehicle(id="tata-signa-4825", name="Tata Signa 4825.TK", length_cm=700, width_cm=250, height_cm=250, max_weight_kg=48000),
            ]
            db.add_all(vehicles)
            db.commit()
            
        # ── 3. Seed Drivers ──────────────────────────────────────────────────
        if not db.query(Driver).first():
            print("🌱 Seeding Drivers...")
            drivers = [
                Driver(id="driver-1", username="driver1", name="Raj Kumar", phone="+91 98765 43210", license_number="DL-2024-001", truck_id="tata-1109"),
                Driver(id="driver-2", username="driver2", name="Amit Sharma", phone="+91 98765 43211", license_number="DL-2024-002", truck_id="eicher-12ft"),
                Driver(id="driver-3", username="driver3", name="Suresh Patel", phone="+91 98765 43212", license_number="DL-2024-003", truck_id="bharatbenz-1623r")
            ]
            db.add_all(drivers)
            db.commit()
            
        # ── 4. Seed Dealerships ──────────────────────────────────────────────
        if not db.query(Dealership).first():
            print("🌱 Seeding Dealerships...")
            dealerships = [
                Dealership(
                    id="dealer-1",
                    name="LogiLoad Mumbai Dealership",
                    location="Nariman Point, Mumbai",
                    city="Mumbai, Maharashtra",
                    contact_person="Rahul Sharma",
                    phone="+91 98765 43210",
                    current_stock=[{"item": "Steel Coils", "qty": 15}, {"item": "Auto Parts Box", "qty": 45}, {"item": "Electronics Crate", "qty": 8}],
                    incoming_shipments=2
                ),
                Dealership(
                    id="dealer-2",
                    name="Pune Elite Motors",
                    location="Hinjawadi Phase 2, Pune",
                    city="Pune, Maharashtra",
                    contact_person="Amit Patel",
                    phone="+91 87654 32109",
                    current_stock=[{"item": "Steel Coils", "qty": 5}, {"item": "Auto Parts Box", "qty": 120}, {"item": "Laptop Box", "qty": 30}],
                    incoming_shipments=1
                ),
                Dealership(
                    id="dealer-3",
                    name="South India Logistics Hub",
                    location="Koramangala 4th Block, Bangalore",
                    city="Bangalore, Karnataka",
                    contact_person="Vikram K.",
                    phone="+91 76543 21098",
                    current_stock=[{"item": "Electronics Crate", "qty": 25}, {"item": "Laptop Box", "qty": 75}],
                    incoming_shipments=0
                )
            ]
            db.add_all(dealerships)
            db.commit()
            
        # ── 5. Seed Deliveries ───────────────────────────────────────────────
        if not db.query(Shipment).first():
            print("🌱 Seeding Deliveries...")
            shipments = [
                Shipment(
                    id="delivery-1",
                    customer_id="customer-1",
                    customer_name="ABC Electronics",
                    customer_phone="+91 98765 00001",
                    pickup_location="Nariman Point, Mumbai, Maharashtra",
                    drop_location="Shivaji Nagar, Pune, Maharashtra",
                    package_weight=150.0,
                    package_dimensions={"length": 60.0, "width": 40.0, "height": 30.0},
                    package_notes="Fragile precision electronics",
                    scheduled_time="2026-09-05T09:00:00",
                    status="assigned",
                    assigned_driver_id="driver-1"
                ),
                Shipment(
                    id="delivery-2",
                    customer_id="customer-2",
                    customer_name="XYZ Furniture",
                    customer_phone="+91 98765 00002",
                    pickup_location="MG Road, Bangalore, Karnataka",
                    drop_location="HITEC City, Hyderabad, Telangana",
                    package_weight=450.0,
                    package_dimensions={"length": 120.0, "width": 80.0, "height": 60.0},
                    package_notes="Large modular furniture",
                    scheduled_time="2026-09-06T14:00:00",
                    status="pending"
                )
            ]
            db.add_all(shipments)
            db.commit()
            
        print("✅ Database seeding completed successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
