def test_valid_evaluation_request(client):
    """Test standard evaluation request with verified projects and certificates."""
    payload = {
        "studentId": "student_123",
        "portfolioId": "port_456",
        "resumeText": "Experienced Python and Node.js developer with machine learning background.",
        "projects": [
            {
                "id": "proj_1",
                "title": "AI Portfolio Auditor",
                "shortDescription": "Automated verification platform for student credentials",
                "technologies": ["Python", "FastAPI", "React"],
                "githubRepository": "https://github.com/example/ai-auditor",
                "liveDeployment": "https://ai-auditor.example.com",
                "isVerified": True,
            }
        ],
        "certificates": [
            {
                "id": "cert_1",
                "title": "AWS Certified Solutions Architect",
                "issuer": "Amazon Web Services",
                "issueDate": "2026-01-15",
                "skills": ["AWS", "Cloud Architecture"],
                "isVerified": True,
            }
        ],
        "github": {
            "username": "student_dev",
            "bio": "Open source contributor",
            "publicRepos": 15,
            "followers": 30,
            "isVerified": True,
        },
        "skills": ["Docker", "PostgreSQL"],
    }

    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "data" in data

    evaluation = data["data"]
    assert evaluation["status"] == "evaluation_pending"
    assert evaluation["portfolioScore"] is None
    assert evaluation["atsScore"] is None
    assert evaluation["githubScore"] is None
    assert evaluation["industryReadinessScore"] is None
    assert isinstance(evaluation["skills"], list)

    # Verify skills aggregation
    expected_skills = {"Docker", "PostgreSQL", "Python", "FastAPI", "React", "AWS", "Cloud Architecture"}
    assert expected_skills.issubset(set(evaluation["skills"]))


def test_missing_student_id_returns_422(client):
    """Test that missing required studentId field returns HTTP 422 Unprocessable Entity."""
    payload = {
        "portfolioId": "port_456",
        "projects": [],
        "certificates": [],
        "skills": ["React"],
    }
    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422


def test_missing_portfolio_id_returns_422(client):
    """Test that missing required portfolioId field returns HTTP 422 Unprocessable Entity."""
    payload = {
        "studentId": "student_123",
        "projects": [],
        "certificates": [],
        "skills": ["Python"],
    }
    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422


def test_invalid_project_schema_returns_422(client):
    """Test that project with empty title returns HTTP 422."""
    payload = {
        "studentId": "student_123",
        "portfolioId": "port_456",
        "projects": [
            {
                "title": "",  # invalid: min_length is 1
            }
        ],
    }
    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422


def test_extra_forbidden_fields_returns_422(client):
    """Test that unpermitted extra fields are rejected with HTTP 422 by strict schema."""
    payload = {
        "studentId": "student_123",
        "portfolioId": "port_456",
        "unauthorizedSecretField": "malicious_payload",
    }
    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 422


def test_minimal_valid_payload(client):
    """Test minimal valid payload with only required fields."""
    payload = {
        "studentId": "student_999",
        "portfolioId": "port_999",
    }
    response = client.post("/api/v1/evaluation/portfolio", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "evaluation_pending"
