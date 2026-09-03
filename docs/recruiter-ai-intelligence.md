# Recruiter AI intelligence

VidyaLink recruiter discovery consumes persisted AI results. It does not invoke the AI engines, GitHub APIs, or FastAPI from React and it does not calculate a combined hiring score.

## Safe search projection

`GET /api/v1/recruiter/candidates` returns recruiter-safe profile fields plus:

- `portfolioScore`
- `atsScore`
- `githubEvidenceScore`
- `industryReadinessScore`
- `verifiedSkills`
- `skillGaps`
- `topStrengths`

Score values are either a persisted finite value from 0–100 or `null` when no eligible result exists. A missing result is never converted to `0`.

The default sort is `industryReadiness` descending. The only current AI-aware sort keys are `industryReadiness`, `portfolioScore`, `atsScore`, `updatedAt`, and `name`; missing scores sort after available scores. Search supports `minIndustryReadiness`/`maxIndustryReadiness`, `minPortfolioScore`/`maxPortfolioScore`, `minATSScore`/`maxATSScore`, comma-separated `requiredSkills`, and `verifiedOnly=true`.

## Candidate AI summary

`GET /api/v1/recruiter/candidates/:studentId/ai-summary` returns the public, recruiter-safe projection:

```json
{
  "portfolioScore": { "score": 78, "evaluatedAt": "...", "isStale": false },
  "atsScore": { "score": 72, "evaluatedAt": "...", "isStale": false },
  "github": { "repositoryCount": 4, "commitCount": 86 },
  "verifiedSkills": ["React", "Node.js"],
  "skillGaps": { "missingRequiredSkills": [], "missingPreferredSkills": [] },
  "industryReadiness": { "score": 75, "breakdown": {} },
  "strengths": [],
  "recommendations": [],
  "metadata": { "evaluatedAt": "...", "isStale": false, "scoringVersions": ["1.0"] }
}
```

If no public, centrally verified portfolio exists, the endpoint returns `data: null`. If the portfolio is public but no persisted evaluator result exists, the UI shows `Not evaluated yet`. Explainability comes from stored breakdown evidence, strengths, gaps, recommendations, evaluator versions, timestamps, and stale metadata.

## Comparison

`GET /api/v1/recruiter/candidates/compare?ids=id1,id2,id3` accepts two to five student IDs and returns normalized public fields: `name`, `verifiedSkills`, `skillGaps`, `portfolioScore`, `atsScore`, `githubEvidence`, `industryReadiness`, `verifiedProjects`, `experience`, and `education`. The endpoint batches profile, portfolio, project, and persisted AI-result reads and never makes per-candidate model or external API calls.

## Privacy and decision boundary

Only public student profile data, verified public portfolio evidence, and the allowed AI projection are returned. Passwords, access tokens, raw resume text, private GitHub credentials, prompts, and private evaluator payloads are not exposed. AI values are review signals for recruiters, not an automatic hiring decision or opaque combined score. `verifiedOnly` is based on the centralized Verification Service and explicit public portfolio verification; one verified project alone cannot make a portfolio verified.
