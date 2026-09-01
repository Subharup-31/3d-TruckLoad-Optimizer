from fastapi import APIRouter, HTTPException, Body
from backend.schemas import VisionDetectResponse
from ml.models.cargo_vision import cargo_vision

router = APIRouter(prefix="/ai/vision", tags=["AI Computer Vision"])

@router.post("/dimensions", response_model=VisionDetectResponse)
def estimate_cargo_dimensions(
    payload: dict = Body(...)
):
    image_data = payload.get("image", "")
    reference_object = payload.get("reference_object", "A4_Paper")
    
    if not image_data:
        raise HTTPException(status_code=400, detail="Missing base64 image data")
        
    result = cargo_vision.detect_and_estimate_dimensions(
        image_base64=image_data,
        reference_object=reference_object
    )
    return result
