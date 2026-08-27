"""ATS Resume Analysis service package."""

from app.services.ats.ats_scorer import evaluate_resume_ats

__all__ = ["evaluate_resume_ats"]
