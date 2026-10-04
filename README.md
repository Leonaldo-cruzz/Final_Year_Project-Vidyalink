<p align="center">
  <img src="docs/assets/logo-placeholder.png" alt="VidyaLink Logo" width="120" />
</p>

<h1 align="center">VIDYALINK</h1>

<p align="center">
  <strong>AI-Powered Student Portfolio Verification and Recruitment Platform</strong>
</p>

<p align="center">
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#scripts">Scripts</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Architecture

VIDYALINK is built as a **monorepo** containing three primary application services and comprehensive documentation:

| Service        | Description                                                          | Port  |
| -------------- | -------------------------------------------------------------------- | ----- |
| `client`       | React 19 SPA — role-based student, faculty, recruiter, alumni, admin | 5173  |
| `server`       | Express REST API — authentication, verification, notifications       | 5000  |
| `ai-service`   | FastAPI AI microservice — ATS scoring, portfolio evaluation, readiness| 8000  |
| `docs`         | Architecture specifications, test matrices, and API contracts       | —     |

## Approved VIDYALINK Workflow

```
Student Registration
  ↳ Profile Setup & Evidence Upload (Resume, Projects, Certificates, GitHub)
    ↳ Faculty Verification (Approval / Rejection / Changes Requested)
      ↳ Live Deployment Verification (Active reachability probing)
        ↳ AI Portfolio Evaluation (Canonical 6-dimension deterministic scoring)
          ↳ Verified Skill Profile & ATS Ingestion / Resume Generation
            ↳ Industry Readiness Analysis
              ↳ Alumni Mentorship & Campus Referrals
                ↳ Recruiter Search & Filters
                  ↳ Candidate Dossier Review
                    ↳ Shortlisting & Interview Scheduling
                      ↳ Candidate Selection / Hiring (Status: Selected, Notifications)
                        ↳ Admin Analytics & University Oversight
```

## Canonical Portfolio Scoring Model

The single canonical portfolio scoring formula is:

$$\text{Portfolio Score} = 0.25 \times \text{Project Complexity} + 0.20 \times \text{Technology Stack} + 0.15 \times \text{GitHub Activity} + 0.15 \times \text{Documentation Quality} + 0.15 \times \text{Innovation} + 0.10 \times \text{Code Quality}$$

| Component Dimension | Weight | Description |
| ------------------- | :----: | ----------- |
| Project Complexity | 25% | Architecture depth, backend logic, microservice/distributed patterns |
| Technology Stack | 20% | Language/framework breadth, full-stack integration, tooling diversity |
| GitHub Activity | 15% | Factual repository metrics, commits, and activity evidence |
| Documentation Quality | 15% | README completeness, API references, architecture documentation |
| Innovation | 15% | Novelty indicators, problem-solving impact, unique features |
| Code Quality | 10% | Measurable code-quality signals, test automation, linting |

> **Note on Permissions**: In accordance with the approved platform specification, recruiters possess candidate search, dossier review, shortlisting, interview scheduling, and selection capabilities. Recruiters **do not** possess permissions to create, edit, or delete student projects. Candidate selection marks applications as `Selected` and notifies the student without auto-provisioning legacy marketplace workspaces.

## Tech Stack

### Frontend (`client/`)

| Category       | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | React 19                            |
| Build Tool     | Vite                                |
| Styling        | TailwindCSS                         |
| Routing        | React Router                        |
| HTTP Client    | Axios                               |
| Server State   | React Query (TanStack Query)        |
| Forms          | React Hook Form                     |
| Validation     | Zod                                 |

### Backend (`server/`)

| Category       | Technology                          |
| -------------- | ----------------------------------- |
| Runtime        | Node.js                             |
| Framework      | Express                             |
| Database       | MongoDB                             |
| ODM            | Mongoose                            |

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **MongoDB** ≥ 7.x (local or Atlas)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/vidyalink.git
cd vidyalink

# 2. Install all dependencies (root + workspaces)
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Start development servers
npm run dev
```

### Running Individual Workspaces

```bash
# Frontend only
npm run dev:client

# Backend only
npm run dev:server
```

## Project Structure

```
VIDYALINK/
├── client/                  # React 19 + Vite frontend
│   ├── src/
│   │   ├── assets/          # Static assets (images, fonts, icons)
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layouts/         # Page layout wrappers
│   │   ├── pages/           # Route-level page components
│   │   ├── routes/          # Route definitions & guards
│   │   ├── services/        # API service layer (Axios instances)
│   │   └── utils/           # Shared utility functions
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                  # Express + MongoDB backend
│   ├── src/
│   │   ├── config/          # App & DB configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/       # Express middleware
│   │   ├── models/          # Mongoose schemas & models
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # Shared utility functions
│   │   └── validators/      # Zod / Joi validation schemas
│   ├── uploads/             # File upload directory
│   └── package.json
│
├── ai-service/              # AI/ML microservice (future)
│   └── README.md
│
├── docs/                    # Documentation & ADRs
│   └── README.md
│
├── .env.example             # Environment variable template
├── .gitignore
├── package.json             # Root workspace config
└── README.md
```

## Scripts

All scripts can be run from the **root** directory:

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start all dev servers concurrently       |
| `npm run dev:client` | Start frontend dev server                |
| `npm run dev:server` | Start backend dev server                 |
| `npm run build`      | Build all workspaces for production      |
| `npm run lint`       | Lint all workspaces                      |
| `npm run format`     | Format code with Prettier                |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Refer to `.env.example` for all required and optional variables.

## Contributing

1. Create a feature branch from `main`
2. Follow the existing code style and conventions
3. Write meaningful commit messages ([Conventional Commits](https://www.conventionalcommits.org/))
4. Open a Pull Request with a clear description

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

---

<p align="center">
  Built with ❤️ by the <strong>VidyaLink</strong> team
</p>
