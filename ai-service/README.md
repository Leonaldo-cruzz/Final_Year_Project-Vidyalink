# VIDYALINK AI Service

Independent Python FastAPI microservice providing explainable, evidence-backed AI evaluation for the VIDYALINK platform.

The service performs deterministic portfolio scoring, ATS resume analysis, skill extraction, skill-gap analysis, GitHub analytics, career readiness evaluation, and alumni/recruiter recommendations.

---

## 1. Purpose

The VIDYALINK AI Service acts as the specialized intelligence engine for the platform.
It strictly adheres to:
- **Evidence-Based Scoring:** Evaluates only verified projects. Unverified or incomplete projects are explicitly excluded and flagged.
- **Canonical Formula Invariant:** Strictly uses the 6-dimension weighted portfolio scoring formula without random deviations or artificial modifiers.
- **Zero Synthetic Output:** Never hallucinates skills, fake scores, synthetic credentials, or phantom repositories.
- **Explainability:** Returns detailed component breakdowns, evidence snippets, strengths, and actionable improvement suggestions.

---

## 2. Architecture

```text
ai-service/
├── app/                        # Normalized application package
│   ├── __init__.py             # Package declaration (v1.0.0)
│   ├── main.py                 # FastAPI application entrypoint (app = FastAPI(...))
│   ├── config.py               # Settings proxy
│   ├── api/                    # Route endpoints (health, portfolio, ats, github, recommendations, skills)
│   ├── models/                 # Pydantic schemas (portfolio, scoring, ats, github)
│   ├── services/               # Deterministic AI algorithms & analytics
│   └── utils/                  # Scoring & math helpers
├── src/                        # Original source package (maintained for 100% backward compatibility)
│   ├── main.py
│   ├── config.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── tests/                      # Pytest test suite (51 passing unit & integration gate tests)
├── requirements.txt            # Minimal, exact dependencies
├── .env.example                # Environment variables template
├── Dockerfile                  # Production container definition
└── README.md                   # This documentation
```

### Canonical Portfolio Scoring Formula

$$\text{Portfolio Score} = 0.25 \times \text{Complexity} + 0.20 \times \text{Tech Stack} + 0.15 \times \text{GitHub} + 0.15 \times \text{Documentation} + 0.15 \times \text{Innovation} + 0.10 \times \text{Code Quality}$$

| Dimension | Weight | Description |
|---|:---:|---|
| **Project Complexity** | 25% | Architecture depth, backend services, concurrency, scalable data layers |
| **Technology Stack** | 20% | Depth and breadth of frameworks, libraries, and language ecosystems |
| **GitHub Activity** | 15% | Factual commit volume, repository counts, recency, pull requests |
| **Documentation Quality** | 15% | Completeness of README, architecture blueprints, API references |
| **Innovation** | 15% | Novel problem-solving approaches, unique features, optimization |
| **Code Quality** | 10% | Automated test coverage, CI/CD signals, lint compliance, type safety |

---

## 3. Setup & Virtual Environment

From the `ai-service` directory:

### Windows (PowerShell)
```powershell
cd C:\Users\himan\OneDrive\Desktop\VIDYALINK\ai-service

# 1. Create Python virtual environment (Python 3.12+ recommended)
python -m venv venv

# 2. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 3. Verify Python & pip versions
python --version
pip --version

# 4. Install dependencies
python -m pip install -r requirements.txt

# 5. Create local environment configuration
Copy-Item .env.example .env
```

---

## 4. Startup Command

Start the FastAPI microservice on `127.0.0.1:8000`:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

*(Note: `uvicorn src.main:app --reload --host 127.0.0.1 --port 8000` is also supported for full backward compatibility).*

---

## 5. Endpoints & Swagger Documentation

Once started, the service is accessible at:

| Resource | URL | Description |
|---|---|---|
| **Health Probe** | `http://127.0.0.1:8000/health` | Fast, unauthenticated liveness probe |
| **Swagger UI** | `http://127.0.0.1:8000/docs` | Interactive OpenAPI documentation |
| **ReDoc UI** | `http://127.0.0.1:8000/redoc` | Alternative OpenAPI reference |
| **Service Root** | `http://127.0.0.1:8000/` | Basic service metadata |

### API Endpoints Overview:
- `GET  /health` — Returns `{"status": "ok", "service": "vidyalink-ai"}`
- `POST /api/v1/portfolio/evaluate` — Evaluates verified projects using canonical weights
- `POST /api/v1/portfolio/verify-deployment` — Probes live URL availability
- `POST /api/v1/portfolio/skills` — Extracts canonical skills from portfolio evidence
- `POST /api/v1/portfolio/readiness` — Multi-factor industry readiness score calculation
- `POST /api/v1/ats/analyze` — ATS resume keyword matching, completeness, formatting
- `POST /api/v1/skills/extract` — Text-based skill extraction and normalization
- `POST /api/v1/skills/gap` — Candidate skill vs target role gap analysis
- `POST /api/v1/github/analyze` — Factual GitHub activity and repository analytics
- `POST /api/v1/recommendations` — Evidence-based matching of alumni mentors and opportunities

---

## 6. Environment Variables

Configure `.env` in `ai-service/`:

```env
AI_PROVIDER=deterministic
GEMINI_API_KEY=
OPENAI_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
HOST=127.0.0.1
PORT=8000
```

- `AI_PROVIDER`: Default is `deterministic` (runs offline, 100% reproducible, zero external cost).
- `ALLOWED_ORIGINS`: Strict CORS whitelist. Wildcard `*` is explicitly filtered out for safety.
- `GEMINI_API_KEY` / `OPENAI_API_KEY`: Optional; used only if configured for LLM providers.

---

## 7. Testing

Run the test suite with pytest:

```powershell
python -m pytest -q
```

All 51 test suites pass with 100% success rate, validating:
- Health probe availability
- Canonical 6-dimension weights and boundaries
- Strict 10-trial determinism
- Unverified-data gating
- ATS resume scoring and keyword extraction
- Skill extraction and canonical synonym normalization
- Skill gap analysis and coverage percentage
- GitHub analytics metrics
- Industry readiness scoring
- Alumni and opportunity recommendation ranking
- Malformed payload rejection (HTTP 422)
- Graceful handling of missing/empty downstream data

---

## 8. Relationship with Node.js Backend

The Node/Express backend communicates with this service via REST:

```
[React Frontend] (Port 5173)
        │
        ▼ HTTP (JWT Auth)
[Node.js / Express] (Port 5000)
        │
        ▼ HTTP REST (AI_SERVICE_URL=http://127.0.0.1:8000)
[FastAPI AI Service] (Port 8000)
        │
        ▼ Result JSON
[Node.js / Express]
        │
        ▼ Persist in MongoDB Atlas / Local
[MongoDB Collections] (ai_evaluations, ai_analyses)
```

1. **Gating:** Node passes only student portfolios with faculty-verified deliverables.
2. **Resilience:** If the AI service is unreachable, Node catches the network error, sets `pipelineStatus: 'FAILED'` or `'UNAVAILABLE'`, and never fabricates fallback scores.
3. **Caching:** Evaluations are fingerprinted with SHA-256 content hashes to avoid redundant reprocessing.
