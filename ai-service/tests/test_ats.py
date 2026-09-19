from fastapi.testclient import TestClient

from src.main import app
from src.services.ats_analyzer import analyze_resume
from src.models.ats import ATSRequest


client = TestClient(app)


def test_ats_analyzer_returns_structured_scores() -> None:
    result = analyze_resume(
        ATSRequest(
            resume_text="""SUMMARY\nPython developer\n\nSKILLS\nPython, FastAPI, SQL\n\nEDUCATION\nBachelor of Technology\n\nEXPERIENCE\n- Built APIs\n\nPROJECTS\n- Portfolio API""",
            target_job_description="Python FastAPI SQL developer",
        )
    )
    assert 0 <= result.ats_score <= 100
    assert result.detected_skills == ["FastAPI", "Python", "SQL"]
    assert isinstance(result.section_completeness, dict)
    assert "missing_keywords" in result.model_dump()


def test_invalid_ats_payload_returns_422() -> None:
    response = client.post("/api/v1/ats/analyze", json={"resume_text": ""})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"

