# VidyaLink — AI Service

FastAPI microservice for the existing Industry Readiness evaluation engine. It accepts only the server-built verified snapshot from the Node API and returns a validated, explainable readiness response.

## Run locally

```bash
python -m venv .venv
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Run the service tests with:

```bash
python -m pytest
```

The Node API sends requests to `POST /api/v1/evaluation/industry-readiness`. The service returns the six backend-weighted dimensions, category, strengths, gaps, recommendations, scoring version, and source versions. It does not fetch GitHub or access resume files directly.
