<p align="center">
  <img src="docs/assets/logo-placeholder.png" alt="VidyaLink Logo" width="120" />
</p>

<h1 align="center">VIDYALINK</h1>

<p align="center">
  <strong>Next-Generation SaaS Platform</strong>
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

VIDYALINK is built as a **monorepo** containing four primary workspaces:

| Workspace      | Description                              | Port  |
| -------------- | ---------------------------------------- | ----- |
| `client`       | React 19 SPA — user-facing frontend      | 5173  |
| `server`       | Express REST API — core backend services | 5000  |
| `ai-service`   | FastAPI Industry Readiness engine       | 8000  |
| `docs`         | Project documentation & ADRs             | —     |

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
├── ai-service/              # FastAPI Industry Readiness engine
│   ├── app/
│   ├── tests/
│   └── requirements.txt
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
