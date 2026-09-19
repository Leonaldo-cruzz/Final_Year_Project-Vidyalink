from fastapi import APIRouter

from src.models.portfolio import PortfolioSubmission, SkillExtractionResponse, SkillGapRequest, SkillGapResponse
from src.services.skill_analysis import extract_skills, skill_gap

router = APIRouter(prefix="/api/v1/skills", tags=["skills"])


@router.post("/extract", response_model=SkillExtractionResponse)
def extract_skills_route(payload: PortfolioSubmission) -> SkillExtractionResponse:
    return SkillExtractionResponse(**extract_skills(payload))


@router.post("/gap", response_model=SkillGapResponse)
def skill_gap_route(payload: SkillGapRequest) -> SkillGapResponse:
    return skill_gap(payload.current_skills, payload.target_role, payload.required_skills)
