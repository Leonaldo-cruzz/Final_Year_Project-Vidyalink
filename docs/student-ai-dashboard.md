# Student AI Career Dashboard

The student dashboard is available at `/student/ai` and is protected by the existing student route guard. It reads the authenticated student's latest persisted AI results through:

```text
GET /api/v1/student/ai/overview
```

The endpoint derives the student id from the authenticated user. A caller cannot select another student's results. An optional `portfolioId` can narrow the request to a portfolio owned by that same student; ownership is checked server-side.

## Response contract

The response data contains:

```json
{
  "portfolioScore": {},
  "atsScore": {},
  "githubAnalytics": {},
  "skills": [],
  "skillGaps": {},
  "recommendations": [],
  "industryReadiness": {}
}
```

Each unavailable persisted result is `null` (or an empty list where the domain is a list). The client displays `N/A` or an explicit not-evaluated state and never converts a missing score to zero. Evaluation metadata includes the persisted evaluation date, version, and stale flag when available.

## Refresh behavior

Loading the page only reads persisted results. The **Evaluate/Refresh** action is explicit and calls the existing authenticated readiness orchestration:

```text
POST /api/v1/evaluation/industry-readiness/refresh
```

The server builds a verified snapshot from the student's own records, calls the readiness microservice, persists the response, and returns the new evaluation. Raw resume or prompt content is not included in student overview projections.

## Local verification

From the repository root:

```bash
npm run build --workspace @vidyalink/client
npm run test:ai-results --workspace @vidyalink/server
cd ai-service && python -m pytest
```

The readiness service defaults to `http://localhost:8000`; configure `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`, and `AI_SERVICE_TIMEOUT_MS` in the server environment when needed.
