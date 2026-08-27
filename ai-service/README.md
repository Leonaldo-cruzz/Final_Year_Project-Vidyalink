# VidyaLink AI Service

FastAPI-powered deterministic AI microservice for the **VIDYALINK** student portfolio verification and recruitment platform.

---

## 1. Architecture Overview

```
                          ┌──────────────────────────┐
                          │    Node.js / Express     │
                          │   Backend (Port 5000)    │
                          └─────────────┬────────────┘
                                        │  (Pre-validated & VERIFIED data only)
                                        ▼
                          ┌──────────────────────────┐
                          │   Python FastAPI Core    │
                          │   Service (Port 8000)    │
                          └─────────────┬────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  Portfolio Scorer    │    │  ATS Resume Scorer   │    │  Skill Intelligence  │
│  (6 Dimensions)      │    │  (5 ATS Dimensions)  │    │  - Normalizer        │
│  - Project Compl. 25%│    │  - Keyword Match 30% │    │  - 5-Source Extractor│
│  - Tech Stack    20% │    │  - Tech Skills   25% │    │  - Unified Engine    │
│  - GitHub Act.   15% │    │  - Formatting    20% │    │  - Gap Analyzer      │
│  - Docs Quality  15% │    │  - Experience    15% │    │                      │
│  - Innovation    15% │    │  - Education     10% │    │                      │
│  - Code Quality  10% │    └──────────────────────┘    └──────────────────────┘
└──────────────────────┘
```

---

## 2. Skill Intelligence Engine

### Skill Taxonomy & Categories
The skill taxonomy (`app/services/skills/taxonomy.py`) maps canonical skill identifiers to standard display names and structured categories:

- `programming_language` (Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, Dart, SQL, HTML, CSS, Bash)
- `frontend` (React, Next.js, Vue.js, Angular, Svelte, Tailwind CSS, Bootstrap, Redux, Vite, Webpack, Sass)
- `backend` (Node.js, Express.js, FastAPI, Django, Flask, Spring Boot, NestJS, ASP.NET, Laravel, GraphQL, REST API, gRPC, Microservices, WebSockets)
- `database` (MongoDB, PostgreSQL, MySQL, Redis, SQLite, Elasticsearch, DynamoDB, Cassandra, Supabase, Firebase, Prisma, Mongoose)
- `cloud` (AWS, Azure, Google Cloud Platform)
- `devops` (Docker, Kubernetes, Terraform, CI/CD, GitHub Actions, Jenkins, Linux, Nginx)
- `ai_ml` (Machine Learning, Deep Learning, PyTorch, TensorFlow, Scikit-Learn, NLP, Computer Vision, LLM, LangChain, OpenAI API, Gemini API)
- `data` (Data Analysis, Pandas, NumPy, Apache Spark, Tableau, Power BI)
- `cybersecurity` (OAuth, JWT, RBAC, Cryptography)
- `mobile` (React Native, Flutter, Android, iOS)
- `testing` (Jest, Pytest, Vitest, Cypress, Playwright, Mocha, JUnit)
- `tools` (Git, GitHub, GitLab, Postman, Jira, Figma)
- `other` (Agile, Scrum, System Design)

### Skill Normalization Rules
`app/services/skills/normalizer.py` resolves aliases deterministically:
- `React.js`, `ReactJS`, `react js` → `React` (`canonicalName: "react"`)
- `Node.js`, `nodejs`, `node js`, `node` → `Node.js` (`canonicalName: "node.js"`)
- `Mongo`, `mongodb` → `MongoDB` (`canonicalName: "mongodb"`)
- `Postgres`, `pgsql`, `postgresql` → `PostgreSQL` (`canonicalName: "postgresql"`)
- `JS` → `JavaScript` (`canonicalName: "javascript"`)
- `TS` → `TypeScript` (`canonicalName: "typescript"`)
- `k8s` → `Kubernetes` (`canonicalName: "kubernetes"`)
- `tailwindcss`, `tailwind css` → `Tailwind CSS` (`canonicalName: "tailwind_css"`)

### Evidence Model & 5 Verified Sources
The engine never infers skills blindly. Every extracted skill records explicit citations across:
1. **Resume**: Declared skills in technical profiles and summary sections.
2. **Projects**: Declared technologies, architecture, and project titles.
3. **Certificates**: Verified certificate titles, issuers, and certified skills.
4. **GitHub Analytics**: Public repository languages and observed tech stacks.
5. **Alumni Endorsements**: Verified alumni and mentor endorsements.

### Explainable Confidence Scoring
Confidence is based on evidence breadth and multi-source confirmation:
- **Base Confidences**: Project (0.55), Certificate (0.55), GitHub (0.50), Endorsement (0.50), Resume (0.45).
- **Multi-Source Boosters**: 1 source (0.00), 2 sources (+0.20), 3 sources (+0.32), 4 sources (+0.40), 5 sources (+0.45).
- Confidence capped at 0.98.

### Skill Gap Analysis
`app/services/skills/gap_analyzer.py` compares unified student skills against a target role:
- Normalizes job description skills using the canonical taxonomy.
- Categorizes skills into:
  - `matchedSkills`: Skills present in the student's unified profile.
  - `missingRequiredSkills`: Must-have skills absent from the profile.
  - `missingPreferredSkills`: Nice-to-have skills absent from the profile.
  - `weakEvidenceSkills`: Matched skills with confidence `< 0.60` (low evidence breadth).
  - `matchPercentage`: Percentage of required skills matched.

---

## 3. API Endpoints

### `POST /api/v1/evaluation/skills/extract`
Extracts and unifies verified skills across all 5 portfolio sources.

**Request:**
```json
{
  "studentId": "student-123",
  "portfolioId": "portfolio-456",
  "verificationStatus": "VERIFIED",
  "resume": { "text": "React, Node.js, MongoDB, TypeScript, Docker" },
  "projects": [
    {
      "title": "VidyaLink Platform",
      "description": "Full stack platform in React and Node.js with MongoDB",
      "technologies": ["React", "Node.js", "MongoDB", "FastAPI"]
    }
  ],
  "certificates": [
    {
      "title": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "skills": ["AWS"]
    }
  ],
  "github": { "languages": ["JavaScript", "Python", "TypeScript"] },
  "endorsements": [
    { "endorserName": "Dr. Sharma", "skills": ["React", "Node.js"] }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "studentId": "student-123",
    "skills": [
      {
        "name": "React",
        "canonicalName": "react",
        "category": "frontend",
        "sources": ["resume", "project", "endorsement"],
        "evidence": [
          "Resume: Technical Skills & Profile",
          "Project: VidyaLink Platform",
          "Endorsement: Dr. Sharma"
        ],
        "evidenceCount": 3,
        "confidence": 0.91
      },
      {
        "name": "Node.js",
        "canonicalName": "node.js",
        "category": "backend",
        "sources": ["resume", "project", "endorsement"],
        "evidence": [
          "Resume: Technical Skills & Profile",
          "Project: VidyaLink Platform",
          "Endorsement: Dr. Sharma"
        ],
        "evidenceCount": 3,
        "confidence": 0.91
      }
    ],
    "totalSkillsCount": 7,
    "generatedAt": "2026-08-27T13:00:00.000Z",
    "version": "1.0"
  }
}
```

### `POST /api/v1/evaluation/skills/gap-analysis`
Compares student skills against target role requirements.

**Request:**
```json
{
  "studentId": "student-123",
  "skills": [
    { "name": "React", "canonicalName": "react", "category": "frontend", "confidence": 0.91, "sources": ["resume", "project"] },
    { "name": "Node.js", "canonicalName": "node.js", "category": "backend", "confidence": 0.85, "sources": ["resume", "project"] }
  ],
  "targetRole": {
    "title": "Full Stack Developer",
    "requiredSkills": ["React", "Node.js", "MongoDB"],
    "preferredSkills": ["Docker", "AWS"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "targetRole": "Full Stack Developer",
    "matchedSkills": [
      { "name": "React", "canonicalName": "react", "category": "frontend", "confidence": 0.91, "sources": ["resume", "project"], "isRequired": true },
      { "name": "Node.js", "canonicalName": "node.js", "category": "backend", "confidence": 0.85, "sources": ["resume", "project"], "isRequired": true }
    ],
    "missingRequiredSkills": ["MongoDB"],
    "missingPreferredSkills": ["Docker", "AWS"],
    "weakEvidenceSkills": [],
    "matchPercentage": 66.7,
    "analysisVersion": "1.0",
    "analyzedAt": "2026-08-27T13:00:00.000Z"
  }
}
```

---

## 4. Limitations & Integrity Rules

- **No Unsupported Authorship / Experience Claims**: Skills extracted from GitHub or resumes are recorded as observed technical evidence, never as unverified claims of "expert proficiency" or professional employment.
- **Verification Pre-condition**: Unverified data (`verificationStatus != "VERIFIED"`) is strictly rejected with HTTP 400/422.
- **Explainability**: Every skill score, confidence rating, and matched requirement links directly to concrete citations in the evidence array.
