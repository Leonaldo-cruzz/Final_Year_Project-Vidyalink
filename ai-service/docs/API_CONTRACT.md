# VIDYALINK AI API contract

Base URL for local development: `http://localhost:8000`

The service accepts JSON and returns JSON. All `/api/v1` routes validate request bodies with Pydantic. Validation failures return HTTP `422`; unknown routes return `404`; unexpected failures return `500` with a generic message. No endpoint returns API keys. The Node backend should authenticate its own users and forward only the verified portfolio or factual metrics it is authorized to share.

## `GET /health`

Response `200`:

```json
{
  "status": "ok",
  "service": "vidyalink-ai"
}
```

## `POST /api/v1/portfolio/evaluate`

Request:

```json
{
  "student_id": "student-123",
  "name": "Student",
  "skills": ["Python", "FastAPI"],
  "projects": [
    {
      "title": "Verified API",
      "description": "A documented API with testing and a PostgreSQL database.",
      "technologies": ["Python", "FastAPI", "PostgreSQL"],
      "github_url": "https://github.com/example/api",
      "documentation": "Installation, architecture, usage, testing",
      "complexity_indicators": ["database"],
      "innovation_indicators": ["automation"],
      "code_quality_indicators": ["tests", "CI"],
      "verified": true
    }
  ],
  "github": {
    "repository_count": 3,
    "commit_count": 42,
    "recent_activity": true
  }
}
```

Response `200` includes `overall_score`, `category`, `component_scores`, `weighted_breakdown`, per-component `evidence`, `strengths`, `improvements`, `data_completeness`, eligible/excluded project counts, and `evidence_status`. Component scores are 0–100 and the weighted breakdown sums to the total. Unverified projects are excluded, not silently treated as verified.

## `POST /api/v1/portfolio/skills`

Request: the same portfolio shape as the evaluation request. Skills are extracted only from the controlled vocabulary (including Python, JavaScript, React, FastAPI, Docker, Git, GitHub, AWS, TensorFlow, PyTorch, Machine Learning, NLP, and SQL).

Response:

```json
{
  "detected_skills": ["FastAPI", "Python"],
  "skill_sources": {
    "FastAPI": ["project:Verified API.description"],
    "Python": ["profile.skills", "project:Verified API.technologies"]
  },
  "confidence": {"FastAPI": 0.8, "Python": 1.0}
}
```

## `POST /api/v1/skills/extract`

Request: the same portfolio shape as the portfolio evaluation request. The response contains only controlled-vocabulary skills supported by supplied profile, project, or resume text, together with `skill_sources`.

## `POST /api/v1/skills/gap`

Request:

```json
{
  "current_skills": ["Python", "Git"],
  "required_skills": ["Python", "SQL", "Git"]
}
```

`required_skills` is preferred when the Node backend has an authoritative role definition. Response fields are `matched_skills`, `missing_skills`, `coverage_percentage`, and `recommendations`. The legacy aliases `student_skills` and `recommended_learning_areas` remain accepted for compatibility.

## `POST /api/v1/portfolio/readiness`

Request:

```json
{
  "portfolio_score": 78,
  "ats_score": 72,
  "skills_coverage": 65,
  "github_activity_score": 60,
  "verification_completeness": 80
}
```

Each score is optional and 0–100. Missing components remain `null` in `component_scores`; they are not converted to zero. With fewer than three supplied components the response says `partial_evidence`; with none it says `insufficient_evidence` and `level` is `Insufficient Evidence`.

## `POST /api/v1/ats/analyze`

Request:

```json
{
  "resume_text": "SUMMARY\nPython developer\n\nSKILLS\nPython, FastAPI, SQL\n\nEDUCATION\nBachelor of Technology",
  "target_job_description": "Python FastAPI SQL developer"
}
```

Response includes `ats_score`, keyword/skills/education/experience/formatting scores, `section_completeness`, detected skills, missing keywords, and suggestions. It analyzes text signals only and does not add resume content.

## `POST /api/v1/github/analyze`

Request:

```json
{
  "repository_count": 4,
  "commit_count": 80,
  "commit_frequency": 5,
  "languages": {"Python": 60, "JavaScript": 40},
  "contribution_activity": 70,
  "recent_activity": true,
  "repository_visibility": {"public": 3, "private": 1},
  "project_activity": 75
}
```

Response separates supplied `factual_metrics` from `derived_activity_score`, `observations`, `derived_score`, and limitations. The service does not authenticate with or fetch GitHub.

## `POST /api/v1/recommendations`

Request may include technical skills, project domain, technologies, career interests, target skills, portfolio score, and authoritative arrays of `available_alumni_mentors` and `available_job_opportunities`. Each candidate must have an `id` and `name`; optional skills/domains are used for similarity ranking.

Response contains ranked `alumni_mentors`, ranked `recruiter_opportunities`, `skills_to_develop`, and notes. Empty candidate arrays return empty recommendations with an explanatory note. The service never creates a person, employer, or opportunity that was not supplied.

## CORS and authentication

`ALLOWED_ORIGINS` explicitly allows the development frontend origin `http://localhost:5173` by default. Credentials are disabled and wildcard origins are not enabled. Authentication integration is intentionally left to the Node backend; this service is an internal HTTP dependency and does not claim user identity on its own.
