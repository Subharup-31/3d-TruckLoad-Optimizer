from fastapi import APIRouter
from backend.schemas import (
    RouteOptimizationRequest, RouteOptimizationResponse,
    PackingOptimizationRequest, PackingOptimizationResponse
)
from ml.models.rl_routing import rl_route_optimizer
from ml.models.drl_packing import drl_packer

router = APIRouter(prefix="/ai/optimization", tags=["AI Dynamic Optimization"])

@router.post("/route", response_model=RouteOptimizationResponse)
def optimize_route_rl(req: RouteOptimizationRequest):
    result = rl_route_optimizer.optimize_stops(
        origin=req.origin.dict(),
        stops=[s.dict() for s in req.stops],
        algorithm=req.algorithm
    )
    return {
        "optimized_stops": result["ordered_stops"],
        "total_distance_km": result["total_distance_km"],
        "estimated_time_mins": result["estimated_time_mins"],
        "estimated_cost_inr": result["estimated_cost_inr"],
        "improvement_vs_baseline_pct": result["improvement_vs_baseline_pct"],
        "algorithm_used": result["algorithm_used"],
        "model_version": result["model_version"],
        "baseline_metrics": result["baseline_metrics"]
    }

@router.post("/packing", response_model=PackingOptimizationResponse)
def optimize_packing_drl(req: PackingOptimizationRequest):
    result = drl_packer.pack(
        vehicle=req.vehicle.dict(),
        items=[it.dict() for it in req.items],
        mode=req.mode
    )
    return result
