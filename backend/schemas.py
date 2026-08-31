from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Auth schemas
class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "driver"

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Dimension schema
class DimensionsSchema(BaseModel):
    length: float = Field(..., gt=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)

# Cargo Item schema
class CargoItemSchema(BaseModel):
    id: Optional[str] = None
    name: str
    quantity: int = 1
    dimensions: DimensionsSchema
    weight: float = 50.0
    color: str = "#3b82f6"
    isFragile: bool = False
    isStackable: bool = True
    city: Optional[str] = None

# Vehicle schema
class VehicleSchema(BaseModel):
    id: str
    name: str
    vehicle_type: str = "truck"
    dimensions: DimensionsSchema
    maxWeight: float

# Driver schema
class DriverSchema(BaseModel):
    id: Optional[str] = None
    username: str
    password: Optional[str] = None
    name: str
    phone: str
    licenseNumber: str
    truckId: Optional[str] = None

# Shipment schema
class ShipmentCreate(BaseModel):
    customerName: str
    customerPhone: str
    pickupLocation: str
    dropLocation: str
    packageWeight: float
    packageDimensions: DimensionsSchema
    packageNotes: Optional[str] = ""
    scheduledTime: Optional[str] = ""

class ShipmentUpdate(BaseModel):
    customerName: Optional[str] = None
    customerPhone: Optional[str] = None
    pickupLocation: Optional[str] = None
    dropLocation: Optional[str] = None
    packageWeight: Optional[float] = None
    packageDimensions: Optional[DimensionsSchema] = None
    packageNotes: Optional[str] = None
    scheduledTime: Optional[str] = None
    status: Optional[str] = None
    assignedDriverId: Optional[str] = None

class ShipmentResponse(BaseModel):
    id: str
    customerId: Optional[str] = None
    customerName: str
    customerPhone: str
    pickupLocation: str
    dropLocation: str
    packageWeight: float
    packageDimensions: DimensionsSchema
    packageNotes: Optional[str] = ""
    scheduledTime: Optional[str] = ""
    status: str
    assignedDriverId: Optional[str] = None
    createdAt: str
    updatedAt: str

# AI Prediction Request & Response Schemas
class DelayPredictRequest(BaseModel):
    shipment_id: Optional[str] = None
    distance_km: float = Field(..., gt=0)
    traffic_level: float = Field(1.0, ge=0.5, le=3.0)  # 1.0 = normal, >1.0 = congested
    weather_impact: float = Field(0.0, ge=0.0, le=1.0) # 0 = clear, 1 = severe weather
    number_of_stops: int = Field(1, ge=1)
    cargo_weight_kg: float = Field(100.0, gt=0)
    cargo_volume_cbm: float = Field(1.0, gt=0)
    is_fragile: bool = False
    vehicle_type: str = "tata-1109"
    time_of_day_hour: int = Field(10, ge=0, le=23)
    day_of_week: int = Field(2, ge=0, le=6)

class DelayPredictResponse(BaseModel):
    prediction_id: str
    predicted_delay_minutes: float
    delay_probability: float
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    model_name: str
    model_version: str
    feature_contributions: Dict[str, float]
    recommendation: str

class CostPredictRequest(BaseModel):
    distance_km: float = Field(..., gt=0)
    cargo_weight_kg: float = Field(..., gt=0)
    vehicle_max_weight_kg: float = Field(16000.0, gt=0)
    number_of_stops: int = 1
    fuel_price_inr: float = 90.0
    mode: str = "truck"  # truck, air, sea
    traffic_factor: float = 1.0

class CostPredictResponse(BaseModel):
    prediction_id: str
    predicted_cost_inr: float
    predicted_fuel_liters: float
    lower_bound_inr: float
    upper_bound_inr: float
    cost_drivers: Dict[str, float]
    model_name: str
    model_version: str

class DemandForecastRequest(BaseModel):
    dealership_id: str
    item_name: str
    horizon_days: int = 7  # 7, 14, 30

class DailyForecastPoint(BaseModel):
    date: str
    predicted_qty: float
    lower_bound: float
    upper_bound: float

class DemandForecastResponse(BaseModel):
    dealership_id: str
    item_name: str
    horizon_days: int
    historical_avg_daily: float
    total_forecast_qty: float
    confidence_score: float
    daily_forecast: List[DailyForecastPoint]
    model_name: str
    reasoning: str

class AnomalyDetectRequest(BaseModel):
    entity_type: str  # shipment, vehicle_telemetry, cost
    entity_id: str
    current_delay_minutes: float = 0.0
    current_cost_inr: float = 0.0
    expected_cost_inr: float = 0.0
    temperature_celsius: Optional[float] = None
    humidity_pct: Optional[float] = None
    speed_kmh: Optional[float] = None
    route_deviation_km: Optional[float] = 0.0

class AnomalyDetectResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float  # -1 to 1 or 0 to 1
    severity: str  # NORMAL, LOW, MEDIUM, HIGH, CRITICAL
    anomaly_types: List[str]
    explanation: str

# Route Optimization Schemas
class RouteStopInput(BaseModel):
    id: str
    address: str
    city: str
    lat: float
    lng: float
    demand_weight_kg: Optional[float] = 50.0

class RouteOptimizationRequest(BaseModel):
    origin: RouteStopInput
    stops: List[RouteStopInput]
    vehicle_capacity_kg: float = 16000.0
    algorithm: str = "gnn_ppo"  # baseline_osrm, ppo, gnn_ppo

class RouteOptimizationResponse(BaseModel):
    optimized_stops: List[RouteStopInput]
    total_distance_km: float
    estimated_time_mins: float
    estimated_cost_inr: float
    improvement_vs_baseline_pct: float
    algorithm_used: str
    model_version: str
    baseline_metrics: Dict[str, float]

# 3D Packing Schemas
class PackingOptimizationRequest(BaseModel):
    vehicle: VehicleSchema
    items: List[CargoItemSchema]
    mode: str = "drl"  # baseline_heuristic, drl, gnn_drl

class PlacedItemOutput(BaseModel):
    id: str
    name: str
    position: List[float]  # [x, y, z]
    dimensions: DimensionsSchema
    weight: float
    color: str
    isFragile: bool
    isStackable: bool
    city: Optional[str] = None
    sequenceOrder: int

class PackingOptimizationResponse(BaseModel):
    placed_items: List[PlacedItemOutput]
    unplaced_items: List[CargoItemSchema]
    volume_utilization_pct: float
    weight_utilization_pct: float
    center_of_gravity: Dict[str, float]  # {x, y, z}
    total_weight_kg: float
    algorithm_used: str
    stability_score: float
    comparison_vs_baseline: Dict[str, float]

# Vision Schemas
class VisionDetectResponse(BaseModel):
    detected_objects: List[Dict[str, Any]]
    detected_dimensions_cm: DimensionsSchema
    calibration_status: str
    confidence_pct: float
    analysis_notes: List[str]

# Chat Schemas
class ChatMessageInput(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None

class ChatMessageResponse(BaseModel):
    response: str
    tools_called: List[str]
    grounding_data: Optional[Dict[str, Any]] = None
