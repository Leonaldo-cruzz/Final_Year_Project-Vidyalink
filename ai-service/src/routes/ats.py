from fastapi import APIRouter

from src.models.ats import ATSRequest, ATSResponse
from src.services.ats_analyzer import analyze_resume

router = APIRouter(prefix="/api/v1/ats", tags=["ats"])


@router.post("/analyze", response_model=ATSResponse)
def analyze_ats(payload: ATSRequest) -> ATSResponse:
    return analyze_resume(payload)

