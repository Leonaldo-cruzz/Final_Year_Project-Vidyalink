from fastapi import APIRouter

from src.middleware.internal_auth import require_internal_key
from src.models.ats import ATSRequest, ATSResponse
from src.services.ats_analyzer import analyze_resume

router = APIRouter(prefix="/api/v1/ats", tags=["ats"])


@router.post("/analyze", response_model=ATSResponse, dependencies=[require_internal_key])
def analyze_ats(payload: ATSRequest) -> ATSResponse:
    return analyze_resume(payload)

