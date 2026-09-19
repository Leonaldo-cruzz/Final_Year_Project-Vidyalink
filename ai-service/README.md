# VIDYALINK AI Service

Independent FastAPI microservice for explainable portfolio scoring, skill analysis, ATS resume analysis, GitHub metric analytics, industry-readiness scoring, and evidence-based recommendations.

The default provider is deterministic. It requires no paid API and never invents student skills, projects, employers, achievements, certifications, or GitHub activity. Optional LLM provider classes are isolated behind `src/services/providers.py`; they are not required for the service to run and cannot replace supplied factual data.

## Architecture

```text
src/
  main.py                 FastAPI app, middleware, routers, errors
  config.py               Environment-backed settings
  models/                 Pydantic request/response contracts
  routes/                 HTTP endpoints
  services/               Deterministic business logic
  utils/                  Shared scoring helpers
tests/                    Offline pytest suite
docs/API_CONTRACT.md      Node.js integration contract
```

Portfolio scores use the official weights:

| Component | Weight |
| --- | ---: |
| Project Complexity | 25% |
| Technology Stack | 20% |
| GitHub Activity | 15% |
| Documentation Quality | 15% |
| Innovation | 15% |
| Code Quality | 10% |

Only projects with `verified: true` or `verification_status: "verified"` contribute to portfolio scoring. Unverified projects are counted and explicitly reported as excluded.

## Windows setup

Open PowerShell in:

```powershell
cd C:\Users\himan\OneDrive\Desktop\VIDYALINK\ai-service
```

Create a virtual environment if needed:

```powershell
python -m venv venv
```

Activate it and install dependencies:

```powershell
.\venv\Scripts\Activate.ps1
python --version
python -m pip install -r requirements.txt
```

Create a local environment file from the template if needed:

```powershell
Copy-Item .env.example .env
```

## Run locally

```powershell
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

The service is available at:

- `http://localhost:8000/`
- `http://localhost:8000/health`
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

Implemented API endpoints:

- `POST /api/v1/portfolio/evaluate`
- `POST /api/v1/portfolio/skills`
- `POST /api/v1/portfolio/readiness`
- `POST /api/v1/skills/extract`
- `POST /api/v1/skills/gap`
- `POST /api/v1/ats/analyze`
- `POST /api/v1/github/analyze`
- `POST /api/v1/recommendations`

## Test

With the virtual environment activated:

```powershell
python -m pytest
```

The tests are deterministic and do not call Gemini, OpenAI, GitHub, or any paid external API.

## Environment variables

Copy `.env.example` to `.env`. The supported values are:

```text
AI_PROVIDER=deterministic
GEMINI_API_KEY=
OPENAI_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173
HOST=0.0.0.0
PORT=8000
```

Comma-separated origins are accepted. Wildcard origins are ignored to avoid insecure credentialed CORS. Secrets are read from environment variables only and are never returned by an endpoint.

## Docker

From `ai-service`:

```powershell
docker build -t vidyalink-ai-service .
docker run --rm -p 8000:8000 vidyalink-ai-service
```

The image does not copy a local virtual environment and starts with:

```text
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## Node.js integration

The Node backend has not been rewritten or modified for this service. It can call the documented HTTP contract in [docs/API_CONTRACT.md](docs/API_CONTRACT.md), using a configurable base URL such as `http://localhost:8000`. Authentication remains the responsibility of the Node backend; this standalone service does not invent an authentication scheme.
