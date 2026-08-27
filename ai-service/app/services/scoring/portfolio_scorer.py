"""Main Portfolio Evaluation Engine aggregator."""

from datetime import datetime, timezone
from typing import Any, Dict

from app.services.scoring.score_categories import SCORING_VERSION, SCORING_WEIGHTS, get_score_category
from app.services.scoring.project_complexity import score_project_complexity
from app.services.scoring.technology_stack import score_technology_stack
from app.services.scoring.github_activity import score_github_activity
from app.services.scoring.documentation_quality import score_documentation_quality
from app.services.scoring.innovation import score_innovation
from app.services.scoring.code_quality import score_code_quality


def evaluate_portfolio_score(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute complete deterministic evaluation of a verified portfolio payload."""
    complexity_res = score_project_complexity(payload)
    tech_stack_res = score_technology_stack(payload)
    github_res = score_github_activity(payload)
    docs_res = score_documentation_quality(payload)
    innovation_res = score_innovation(payload)
    code_quality_res = score_code_quality(payload)

    w_complexity = SCORING_WEIGHTS["projectComplexity"]  # 0.25
    w_tech = SCORING_WEIGHTS["technologyStack"]          # 0.20
    w_github = SCORING_WEIGHTS["githubActivity"]         # 0.15
    w_docs = SCORING_WEIGHTS["documentationQuality"]     # 0.15
    w_innov = SCORING_WEIGHTS["innovation"]              # 0.15
    w_code = SCORING_WEIGHTS["codeQuality"]              # 0.10

    weighted_complexity = round(complexity_res["score"] * w_complexity, 2)
    weighted_tech = round(tech_stack_res["score"] * w_tech, 2)
    weighted_github = round(github_res["score"] * w_github, 2)
    weighted_docs = round(docs_res["score"] * w_docs, 2)
    weighted_innov = round(innovation_res["score"] * w_innov, 2)
    weighted_code = round(code_quality_res["score"] * w_code, 2)

    raw_total = (
        (complexity_res["score"] * w_complexity)
        + (tech_stack_res["score"] * w_tech)
        + (github_res["score"] * w_github)
        + (docs_res["score"] * w_docs)
        + (innovation_res["score"] * w_innov)
        + (code_quality_res["score"] * w_code)
    )

    final_score = max(0.0, min(100.0, round(raw_total, 2)))
    category = get_score_category(final_score)
    evaluated_at = datetime.now(timezone.utc).isoformat()

    breakdown = {
        "projectComplexity": {
            "score": complexity_res["score"],
            "weight": int(w_complexity * 100),
            "weightedScore": weighted_complexity,
            "evidence": complexity_res["evidence"],
            "explanation": complexity_res["explanation"],
        },
        "technologyStack": {
            "score": tech_stack_res["score"],
            "weight": int(w_tech * 100),
            "weightedScore": weighted_tech,
            "evidence": tech_stack_res["evidence"],
            "explanation": tech_stack_res["explanation"],
        },
        "githubActivity": {
            "score": github_res["score"],
            "weight": int(w_github * 100),
            "weightedScore": weighted_github,
            "evidence": github_res["evidence"],
            "explanation": github_res["explanation"],
        },
        "documentationQuality": {
            "score": docs_res["score"],
            "weight": int(w_docs * 100),
            "weightedScore": weighted_docs,
            "evidence": docs_res["evidence"],
            "explanation": docs_res["explanation"],
        },
        "innovation": {
            "score": innovation_res["score"],
            "weight": int(w_innov * 100),
            "weightedScore": weighted_innov,
            "evidence": innovation_res["evidence"],
            "explanation": innovation_res["explanation"],
        },
        "codeQuality": {
            "score": code_quality_res["score"],
            "weight": int(w_code * 100),
            "weightedScore": weighted_code,
            "evidence": code_quality_res["evidence"],
            "explanation": code_quality_res["explanation"],
        },
    }

    return {
        "portfolioScore": final_score,
        "category": category,
        "breakdown": breakdown,
        "evaluatedAt": evaluated_at,
        "version": SCORING_VERSION,
    }
