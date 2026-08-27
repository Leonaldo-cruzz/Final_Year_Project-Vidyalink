# VidyaLink — AI Service

The internal FastAPI service currently provides the deterministic Recommendation
Engine. It uses no LLM, embedding model, or trained model. Express builds a
trusted MongoDB snapshot and calls this service; browsers must never call it.

## Run locally

```bash
py -m venv venv
venv\Scripts\pip install -r requirements.txt
venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Set the same optional `AI_SERVICE_API_KEY` in the Express and AI-service
environments when the service runs outside a private network. The service checks
the `X-AI-Service-Key` header when that variable is configured.

Run the engine tests with:

```bash
py -m pytest tests/test_recommendation_engine.py -q
```
