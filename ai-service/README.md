# VidyaLink AI Service

The AI service exposes a deterministic Industry Readiness Score Engine. It combines evaluation results that were already generated and verified by backend services. It does not ask an LLM to make a hiring decision and does not treat the score as a hiring guarantee.

## Industry Readiness endpoint

`POST /api/v1/evaluation/industry-readiness`

Only the Node backend should call this endpoint. The backend authenticates the student, loads the verified portfolio and stored evaluation records, and constructs the request. Browser-provided scores are never forwarded.

The request is strict (`extra="forbid"`) and requires `verificationStatus="VERIFIED"`:

```json
{
  "studentId": "student-id",
  "portfolioId": "portfolio-id",
  "verificationStatus": "VERIFIED",
  "portfolioEvaluation": {"portfolioScore": 85, "breakdown": {}, "scoringVersion": "1.0"},
  "atsEvaluation": {"atsScore": 80, "breakdown": {}, "scoringVersion": "1.0"},
  "githubAnalytics": {
    "repositoryCount": 8,
    "activeRepositoryCount": 6,
    "commitCount": 240,
    "recentCommitCount": 18,
    "readmeCoverage": 90,
    "documentationCoverage": 80,
    "languages": ["JavaScript", "Python"]
  },
  "skillProfile": {
    "version": "1.0",
    "skills": [{"name": "React", "confidence": 0.95, "sources": ["project", "github", "resume"], "verifiedProjectUsage": true, "githubEvidence": true}]
  },
  "skillGapAnalysis": {
    "targetRole": "Full Stack Developer",
    "matchedSkills": [{"name": "React", "isRequired": true}],
    "missingRequiredSkills": [],
    "missingPreferredSkills": ["AWS"],
    "weakEvidenceSkills": [],
    "portfolioDomain": "Web Development",
    "projectTitle": "Student Portal",
    "projectTechnologies": ["React", "Node.js"]
  },
  "verifiedAchievements": [],
  "recommendations": []
}
```

## Formula and weights

The scoring version is `1.0`. Each component is normalized to 0–100, multiplied by its percentage weight, and summed. The result is clamped to 0–100 and rounded to two decimal places.

```text
Industry Readiness Score =
  Portfolio Quality       × 0.30
  + Technical Skill Profile × 0.20
  + GitHub Evidence       × 0.15
  + ATS Readiness         × 0.15
  + Verified Achievements × 0.10
  + Career Alignment      × 0.10
```

| Component | Weight | Evidence used |
| --- | ---: | --- |
| Portfolio Quality | 30% | Stored portfolio evaluator score; it is not recomputed here. |
| Technical Skill Profile | 20% | Per-skill confidence, independent source breadth, verified project usage, GitHub evidence, certificate evidence, and alumni endorsements. Skill count is only a modest coverage factor. |
| GitHub Evidence | 15% | Repository activity, recent commits, total commits, language breadth, README coverage, and documentation coverage. Stars and forks are intentionally excluded. |
| ATS Resume Readiness | 15% | Stored ATS evaluator score; ATS analysis is not recomputed here. |
| Verified Achievements | 10% | Verified portfolio/projects, verified certificates, verified GitHub association, and verified endorsements. Unverified records receive no points. |
| Career Alignment | 10% | Target role presence, required/preferred skill coverage, and project/domain relevance. |

GitHub subweights are repository activity 25%, recent activity 25%, commit evidence 25%, language usage 10%, and documentation 15%. Skill evidence subweights are confidence 40%, independent sources 20%, project usage 15%, GitHub evidence 10%, certificate evidence 7.5%, and alumni endorsements 7.5%.

## Categories

| Score | Category |
| ---: | --- |
| 90–100 | Highly Industry Ready |
| 80–89.99 | Industry Ready |
| 70–79.99 | Progressing |
| 60–69.99 | Developing |
| Below 60 | Needs Development |

Category ranges are versioned with the scoring version and should not be changed retroactively.

## Response

The response is wrapped as `{ "success": true, "data": ... }`. `data` contains the final score, category, all six weighted breakdown entries, evidence text, strengths, evidence-backed gaps, the highest-priority existing recommendations, `scoringVersion`, `generatedAt`, and the individual source versions where available.

```json
{
  "success": true,
  "data": {
    "industryReadinessScore": 84.25,
    "category": "Industry Ready",
    "breakdown": {
      "portfolioQuality": {
        "score": 85,
        "weight": 30,
        "weightedScore": 25.5,
        "evidence": ["Stored portfolio evaluation score: 85/100."],
        "explanation": "Uses the stored portfolio evaluator score without recomputing portfolio quality."
      }
    },
    "strengths": ["High ATS compatibility (80/100)."],
    "gaps": ["Missing preferred skills: AWS."],
    "topRecommendations": [],
    "scoringVersion": "1.0",
    "generatedAt": "2026-08-27T00:00:00Z",
    "sourceVersions": {
      "portfolioEvaluationVersion": "1.0",
      "atsEvaluationVersion": "1.0",
      "githubAnalyticsVersion": "1.0",
      "skillProfileVersion": "1.0",
      "skillGapAnalysisVersion": "1.0"
    }
  }
}
```

## Persistence and refresh policy

Node persists every generated result as `IndustryReadinessEvaluation`, including the source versions and timestamps. Existing records are never overwritten, so historical scores remain auditable across scoring versions.

The authenticated Node API exposes:

- `GET /api/v1/portfolio/readiness` — returns a fresh stored result when no source has changed; otherwise calculates and persists one.
- `POST /api/v1/portfolio/readiness/refresh` — explicit recalculation.
- `POST /api/v1/evaluation/industry-readiness/refresh` — explicit recalculation alias.

The flow loads the verified portfolio, stored portfolio and ATS evaluations, GitHub analytics, skill profile, skill-gap analysis, and existing recommendations. The frontend never constructs the AI request and cannot override any score.

## Limitations and data integrity

The score is an assessment signal based on available verified evidence. It does not infer employment, professional proficiency, certification validity, authorship, or hiring probability. Missing components contribute zero for that component. Strengths and gaps are emitted only from observed source signals; recommendations are reused from the existing Recommendation Engine rather than generated by a second algorithm. API keys, JWTs, raw resume contents, and private credentials are not included in the request or response.

## Development

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest
```
