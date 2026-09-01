import time
import json
import asyncio
from typing import Optional, Dict, Any, List, Set
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Vehicle

router = APIRouter(prefix="/api/v1/telemetry", tags=["Live Phone Telematics & GPS"])

# In-memory fast live telematics cache (synced to DB)
LATEST_TELEMETRY: Dict[str, Dict[str, Any]] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.active_connections.discard(dc)

telemetry_ws_manager = ConnectionManager()

class PhoneGPSPacket(BaseModel):
    driver_id: str
    driver_name: Optional[str] = "Field Driver"
    vehicle_id: Optional[str] = "tata-1109"
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = 10.0
    speed_kmh: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    altitude: Optional[float] = 0.0
    device_source: Optional[str] = "Smartphone Browser GPS"
    battery_level: Optional[float] = None
    temperature_c: Optional[float] = None

@router.post("/gps")
async def ingest_phone_gps(packet: PhoneGPSPacket, db: Session = Depends(get_db)):
    """Ingests live GPS telematics streamed from a driver's smartphone and broadcasts via WebSocket."""
    payload = {
        "driver_id": packet.driver_id,
        "driver_name": packet.driver_name,
        "vehicle_id": packet.vehicle_id,
        "lat": packet.latitude,
        "lng": packet.longitude,
        "accuracy": packet.accuracy_meters,
        "speed": packet.speed_kmh,
        "heading": packet.heading,
        "source": packet.device_source,
        "timestamp": time.time(),
        "status": "in-transit" if (packet.speed_kmh or 0) > 5 else "idling"
    }
    
    # Store in fast telemetry cache
    LATEST_TELEMETRY[packet.driver_id] = payload
    
    # Broadcast to all live connected Admin & Manager dashboard WebSockets
    await telemetry_ws_manager.broadcast({
        "type": "telemetry_update",
        "telemetry": list(LATEST_TELEMETRY.values()),
        "latest_driver_id": packet.driver_id,
        "latest_packet": payload
    })
    
    # Optionally update vehicle position in database if found
    if packet.vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.id == packet.vehicle_id).first()
        if v:
            v.current_lat = packet.latitude
            v.current_lng = packet.longitude
            v.status = payload["status"]
            db.commit()
            
    return {
        "status": "success",
        "message": "GPS position recorded and broadcasted via WebSocket",
        "recorded_at": payload["timestamp"]
    }

@router.get("/live")
def get_all_live_telemetry():
    """Returns all active live vehicle & driver phone positions for the Command Center."""
    return {
        "active_devices_count": len(LATEST_TELEMETRY),
        "telemetry": list(LATEST_TELEMETRY.values())
    }

@router.websocket("/ws")
async def telemetry_websocket_endpoint(websocket: WebSocket):
    """Real-time bi-directional WebSocket for instant GPS telemetry streaming."""
    await telemetry_ws_manager.connect(websocket)
    try:
        # Send initial state immediately upon connecting
        await websocket.send_json({
            "type": "initial_telemetry",
            "telemetry": list(LATEST_TELEMETRY.values())
        })
        while True:
            # Listen for incoming GPS packets directly over WebSocket
            data = await websocket.receive_text()
            try:
                packet_data = json.loads(data)
                if packet_data.get("type") == "gps_ping":
                    driver_id = packet_data.get("driver_id", "driver-1")
                    payload = {
                        "driver_id": driver_id,
                        "driver_name": packet_data.get("driver_name", "Field Driver"),
                        "vehicle_id": packet_data.get("vehicle_id", "tata-1109"),
                        "lat": float(packet_data.get("lat", 19.0760)),
                        "lng": float(packet_data.get("lng", 72.8777)),
                        "accuracy": float(packet_data.get("accuracy", 10.0)),
                        "speed": float(packet_data.get("speed", 0.0)),
                        "heading": float(packet_data.get("heading", 0.0)),
                        "source": packet_data.get("source", "Driver Smartphone WebSocket"),
                        "timestamp": time.time(),
                        "status": "in-transit" if float(packet_data.get("speed", 0.0)) > 5 else "idling"
                    }
                    LATEST_TELEMETRY[driver_id] = payload
                    await telemetry_ws_manager.broadcast({
                        "type": "telemetry_update",
                        "telemetry": list(LATEST_TELEMETRY.values()),
                        "latest_driver_id": driver_id,
                        "latest_packet": payload
                    })
            except Exception as e:
                pass
    except WebSocketDisconnect:
        telemetry_ws_manager.disconnect(websocket)
    except Exception:
        telemetry_ws_manager.disconnect(websocket)
