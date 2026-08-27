"""Portfolio evaluation, ATS Resume Analysis, and GitHub analytics API routes."""

from fastapi import APIRouter, HTTPException, status
from app.schemas.evaluation import (
    PortfolioEvaluationRequest,
    PortfolioEvaluationResponse,
    PortfolioScoreResponse,
    ATSResumeEvaluationRequest,
    ATSScoreResponse,
    GitHubAnalysisRequest,
    GitHubAnalysisResponse,
    GitHubAnalysisResultData,
)
from app.services.evaluation_service import (
    validate_evaluation_request,
    queue_evaluation,
)
from app.services.scoring import evaluate_portfolio_score
from app.services.ats import evaluate_resume_ats

router = APIRouter(prefix="/api/v1/evaluation", tags=["Evaluation"])


@router.post(
    "/portfolio",
    response_model=PortfolioEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate verified portfolio data (job queue placeholder)",
    description="Accepts verified student portfolio data and queues it for AI evaluation.",
)
async def evaluate_portfolio(
    payload: PortfolioEvaluationRequest,
) -> PortfolioEvaluationResponse:
    """Handle verified portfolio evaluation queue requests."""
    if not validate_evaluation_request(payload):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio data is invalid or not in VERIFIED status",
        )

    result_data = queue_evaluation(payload)
    return PortfolioEvaluationResponse(success=True, data=result_data)


@router.post(
    "/portfolio/score",
    response_model=PortfolioScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate deterministic portfolio score with dimensional breakdown",
    description="Evaluates verified student portfolio metadata across 6 weighted dimensions.",
)
async def score_portfolio(
    payload: PortfolioEvaluationRequest,
) -> PortfolioScoreResponse:
    """Execute complete deterministic evaluation of a verified student portfolio."""
    if not validate_evaluation_request(payload):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio data is invalid or not in VERIFIED status",
        )

    score_result = evaluate_portfolio_score(payload.model_dump())
    return PortfolioScoreResponse(success=True, data=score_result)


@router.post(
    "/resume/ats",
    response_model=ATSScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze verified student resume for ATS compatibility",
    description="Extracts and evaluates resume across Keyword Matching, Formatting, Technical Skills, Experience, and Education.",
)
async def score_resume_ats(
    payload: ATSResumeEvaluationRequest,
) -> ATSScoreResponse:
    """Execute deterministic ATS evaluation of verified student resume."""
    if payload.verificationStatus != "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume is not in VERIFIED status and cannot be evaluated",
        )

    ats_result = evaluate_resume_ats(payload.model_dump())
    return ATSScoreResponse(success=True, data=ats_result)


@router.post(
    "/github/analyze",
    response_model=GitHubAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate normalized GitHub analytics observations",
    description="Produces factual measurements and activity observations from synchronized GitHub metadata.",
)
async def analyze_github_activity(
    payload: GitHubAnalysisRequest,
) -> GitHubAnalysisResponse:
    """Normalize GitHub activity signals and generate explainable factual observations."""
    gh = payload.github
    observations = []

    # 1. Repository Volume & Recent Activity
    if gh.repositoryCount > 0:
        observations.append(f"Recorded {gh.repositoryCount} public repositories ({gh.activeRepositoryCount} active within the last 90 days).")
    else:
        observations.append("No public repositories recorded.")

    # 2. Community Engagement
    if gh.totalStars > 0 or gh.totalForks > 0:
        observations.append(f"Community engagement detected ({gh.totalStars} stargazers, {gh.totalForks} forks).")
    else:
        observations.append("Baseline community interaction metrics recorded.")

    # 3. Programming Languages
    if gh.languages:
        lang_str = ", ".join(gh.languages[:5])
        observations.append(f"Polyglot technical distribution across {len(gh.languages)} language(s): {lang_str}.")
    else:
        observations.append("No primary repository programming languages detected.")

    # 4. Documentation & Hygiene
    if gh.readmeCoverage >= 80.0:
        observations.append(f"High README documentation coverage ({gh.readmeCoverage:.0f}% of repositories contain README).")
    elif gh.readmeCoverage >= 50.0:
        observations.append(f"Moderate README documentation coverage ({gh.readmeCoverage:.0f}%).")
    else:
        observations.append(f"Low README documentation coverage ({gh.readmeCoverage:.0f}%).")

    return GitHubAnalysisResponse(
        success=True,
        data=GitHubAnalysisResultData(
            status="analyzed",
            analyticsVersion="1.0",
            metrics=gh.model_dump(),
            observations=observations,
        ),
    )
