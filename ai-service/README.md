# VidyaLink — AI Service Foundation

> AI evaluation and scoring microservice for VidyaLink – An AI-Powered Student Portfolio Verification and Recruitment Platform.

---

## 1. Overview & Architecture

The **VidyaLink AI Service** is an independent Python FastAPI microservice dedicated to portfolio evaluation, ATS scoring, and industry readiness analysis.

### System Architecture

```
[ Frontend / Client ]
        │
        ▼ (HTTP REST)
[ Node / Express Backend (Port 5000) ]
  • Enforces Authentication & RBAC
  • Verifies Student Portfolio Assets (Projects, Certificates, GitHub)
  • Sends ONLY VERIFIED portfolio data to AI Service
        │
        ▼ (HTTP REST / JSON Contract)
[ FastAPI AI Microservice (Port 8000) ]
  • Strict Pydantic Schema Validation (HTTP 422 on malformed input)
  • Standardized Portfolio Evaluation Contract
  • Asynchronous execution pipeline
```

### Directory Structure

```
ai-service/
├── app/
│   ├── main.py                     # FastAPI application setup, CORS, lifespan, routes
│   ├── config.py                   # Pydantic-settings configuration
│   ├── routes/
│   │   ├── __init__.py
│   │   └── evaluation.py           # Evaluation API endpoints
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── evaluation.py           # Strict Pydantic contracts
│   ├── services/
│   │   ├── __init__.py
│   │   └── evaluation_service.py   # Portfolio evaluation logic & normalization
│   ├── clients/
│   │   ├── __init__.py
│   │   └── backend_client.py       # Async HTTP client for Express backend
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # Pytest fixtures & TestClient
│   ├── test_health.py              # Health endpoint tests
│   └── test_evaluation.py          # Contract & validation tests
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment template (no secrets committed)
└── README.md                       # Service documentation
```

---

## 2. Getting Started & Setup

### Prerequisites

- Python 3.10+ (tested on Python 3.13)
- `pip` package manager

### Virtual Environment Setup

From the `ai-service/` root directory:

```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate the virtual environment
# Windows (PowerShell / Command Prompt):
.\venv\Scripts\activate

# Linux / macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## 3. Configuration & Environment Variables

Copy `.env.example` to `.env` (or configure in your deployment environment):

```bash
cp .env.example .env
```

| Variable | Type | Default | Description |
|---|---|---|---|
| `AI_SERVICE_HOST` | `str` | `0.0.0.0` | Server bind host address |
| `AI_SERVICE_PORT` | `int` | `8000` | Server bind port |
| `AI_SERVICE_ENV` | `str` | `development` | Environment mode (`development` / `production`) |
| `BACKEND_BASE_URL` | `str` | `http://localhost:5000/api/v1` | URL of the Express backend API |
| `GEMINI_API_KEY` | `str` | *Optional* | Google Gemini API key for future LLM scoring |
| `OPENAI_API_KEY` | `str` | *Optional* | OpenAI API key for future ATS scoring |
| `CORS_ORIGINS` | `str` | `http://localhost:5173,http://localhost:5000` | Comma-separated allowed origins |
| `REQUEST_TIMEOUT_SECONDS` | `int` | `15` | Default HTTP request timeout |

---

## 4. Running the Service

### Development Mode (with hot-reload)

```bash
# Using uvicorn directly with venv activated:
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Or running the entry module:
python -m app.main
```

### Interactive API Documentation

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 5. API Endpoints & Contract

### 1. Health Check

- **Method**: `GET`
- **Path**: `/health`
- **Response**: `200 OK`

```json
{
  "success": true,
  "service": "vidyalink-ai",
  "status": "healthy"
}
```

---

### 2. Portfolio Evaluation

- **Method**: `POST`
- **Path**: `/api/v1/evaluation/portfolio`
- **Content-Type**: `application/json`

#### Request Body Example

```json
{
  "studentId": "6a82e09cf913116f506cf0d7",
  "portfolioId": "6a82e09ef913116f506cf0e6",
  "resumeText": "Full-Stack Engineer with experience in React, Node.js, and Python.",
  "projects": [
    {
      "id": "proj_1",
      "title": "VidyaLink Platform",
      "shortDescription": "AI-Powered Student Portfolio Verification Platform",
      "detailedDescription": "Centralized faculty verification engine with cryptographic credentials.",
      "category": "Web Development",
      "technologies": ["Node.js", "Express", "MongoDB", "React", "Python"],
      "githubRepository": "https://github.com/example/vidyalink",
      "liveDeployment": "https://vidyalink.example.com",
      "isVerified": true
    }
  ],
  "certificates": [
    {
      "id": "cert_1",
      "title": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "issueDate": "2026-01-15",
      "credentialId": "AWS-123456",
      "credentialUrl": "https://aws.amazon.com/verify",
      "skills": ["AWS", "Cloud Architecture"],
      "isVerified": true
    }
  ],
  "github": {
    "username": "studentdev",
    "bio": "Building open source tools",
    "publicRepos": 18,
    "followers": 42,
    "following": 15,
    "githubProfileUrl": "https://github.com/studentdev",
    "isVerified": true
  },
  "skills": ["JavaScript", "Python", "React", "Node.js", "MongoDB", "Docker"]
}
```

#### Response Example (`200 OK`)

```json
{
  "success": true,
  "data": {
    "portfolioScore": null,
    "atsScore": null,
    "githubScore": null,
    "industryReadinessScore": null,
    "skills": [
      "JavaScript",
      "Python",
      "React",
      "Node.js",
      "MongoDB",
      "Docker",
      "Express",
      "AWS",
      "Cloud Architecture"
    ],
    "recommendations": [],
    "status": "evaluation_pending"
  }
}
```

#### Validation Error (`422 Unprocessable Entity`)

When required fields (like `studentId` or `portfolioId`) are missing or payload structure is malformed:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "studentId"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

---

## 6. Security & Verification Rules

1. **Verified Assets Only**: The Express backend enforces that only faculty-verified portfolio assets (`verificationStatus === 'Verified'`) are submitted to the AI microservice. Submissions with zero verified assets are rejected with `HTTP 400`.
2. **Data Privacy**: Resume PDFs and binary documents are not logged to disk or console. Extracted text is sanitized.
3. **Resilience & Timeout Handling**: All calls between Node and FastAPI include strict timeouts (`AbortSignal.timeout(10000)`), preventing cascading delays. Unreachable service conditions return standardized `HTTP 503 Service Unavailable` with sanitized client errors.

---

## 7. Testing

### Run Python Pytest Suite

```bash
cd ai-service
.\venv\Scripts\pytest
```

### Run Node/Express Integration Suite

```bash
cd server
npm run test:ai
```
