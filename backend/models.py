import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="driver", nullable=False)  # admin, manager, dealer, driver
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    vehicle_type = Column(String(50), default="truck")  # truck, aircraft, vessel
    length_cm = Column(Float, nullable=False)
    width_cm = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    max_weight_kg = Column(Float, nullable=False)
    status = Column(String(50), default="available")
    created_at = Column(DateTime, default=datetime.utcnow)

class Driver(Base):
    __tablename__ = "drivers"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    username = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    license_number = Column(String(100), nullable=False)
    truck_id = Column(String(100), ForeignKey("vehicles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Dealership(Base):
    __tablename__ = "dealerships"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    contact_person = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    current_stock = Column(JSON, default=list)  # list of {item, qty}
    incoming_shipments = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Shipment(Base):
    __tablename__ = "shipments"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    customer_id = Column(String(100), nullable=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    pickup_location = Column(String(255), nullable=False)
    drop_location = Column(String(255), nullable=False)
    package_weight = Column(Float, nullable=False)
    package_dimensions = Column(JSON, nullable=False)  # {length, width, height}
    package_notes = Column(Text, nullable=True)
    scheduled_time = Column(String(100), nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    assigned_driver_id = Column(String(100), ForeignKey("drivers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CargoItem(Base):
    __tablename__ = "cargo_items"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    length_cm = Column(Float, nullable=False)
    width_cm = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, default=50.0)
    color = Column(String(50), default="#3b82f6")
    is_fragile = Column(Boolean, default=False)
    is_stackable = Column(Boolean, default=True)
    city = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DemandForecastRecord(Base):
    __tablename__ = "demand_forecasts"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    dealership_id = Column(String(100), ForeignKey("dealerships.id"), nullable=False)
    item_name = Column(String(255), nullable=False)
    historical_avg = Column(Float, nullable=False)
    predicted_demand = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    forecast_horizon_days = Column(Integer, default=7)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    forecast_series = Column(JSON, nullable=True)  # daily [{date, val, lower, upper}]
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PredictionRecord(Base):
    __tablename__ = "predictions"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    prediction_type = Column(String(50), nullable=False)  # delay, cost, delivery_time
    entity_id = Column(String(100), nullable=True)
    input_features = Column(JSON, nullable=False)
    output_result = Column(JSON, nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)

class AnomalyRecord(Base):
    __tablename__ = "anomalies"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    entity_type = Column(String(50), nullable=False)  # shipment, vehicle, telemetry, route
    entity_id = Column(String(100), nullable=False)
    anomaly_type = Column(String(100), nullable=False)
    anomaly_score = Column(Float, nullable=False)
    severity = Column(String(50), default="medium")  # low, medium, high, critical
    details = Column(JSON, nullable=False)
    explanation = Column(Text, nullable=True)
    status = Column(String(50), default="open")  # open, resolved, acknowledged
    created_at = Column(DateTime, default=datetime.utcnow)

class NetworkNode(Base):
    __tablename__ = "network_nodes"
    
    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    node_type = Column(String(50), default="hub")  # hub, warehouse, port, airport, junction
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    capacity_level = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class NetworkEdge(Base):
    __tablename__ = "network_edges"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    source_node_id = Column(String(100), ForeignKey("network_nodes.id"), nullable=False)
    target_node_id = Column(String(100), ForeignKey("network_nodes.id"), nullable=False)
    distance_km = Column(Float, nullable=False)
    avg_speed_kmh = Column(Float, default=60.0)
    congestion_factor = Column(Float, default=1.0)
    toll_cost_inr = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    delivery_id = Column(String(100), nullable=True)
    sender_id = Column(String(100), nullable=False)
    sender_role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(String(100), primary_key=True, default=generate_uuid)
    model_name = Column(String(100), nullable=False)
    algorithm = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    metrics = Column(JSON, nullable=False)
    dataset_info = Column(String(255), nullable=True)
    artifact_path = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
