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
| `ai-service`   | AI/ML microservice (future)              | 8000  |
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

# 3. Configure server-only environment variables
cp server/.env.example server/.env

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

The API has one configuration boundary: `server/src/config/env.js`. It loads a
single local file (repository `.env` when present, otherwise `server/.env`),
validates it before the application is used, and exposes structured server-only
settings to backend code. Services must read `env` rather than `process.env`
directly.

For local development, the recommended setup is:

```bash
cp server/.env.example server/.env
```

The required server variables are `NODE_ENV`, `PORT`, `MONGODB_URI`,
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, and
`JWT_REFRESH_EXPIRES_IN`. Startup reports every missing or invalid name at once
without printing values.

GitHub, AI, Cloudinary, and email settings are optional until a corresponding
backend client needs them. The current GitHub integration reads public profiles
and intentionally does not attach an optional GitHub token. AI, Cloudinary, and
email clients are not implemented yet; their templates are reserved for a
server-side implementation only.

`DEMO_USER_PASSWORD` is optional for the API itself and required only when
running the server seed script. Use a unique non-production value; the script
does not ship with a default account password.

Browser configuration belongs in `client/.env` and may only use `VITE_` names
that are safe to disclose, such as `VITE_API_BASE_URL` and `VITE_APP_NAME`.
Start from `client/.env.example`. Never place database URIs, JWT secrets,
provider tokens, Cloudinary secrets, or email passwords in a Vite environment
file; Vite exposes these values to browser code.

### Secret handling and rotation

- Keep real `.env` files out of Git. The repository ignores `.env` and `.env.*`
  while retaining `.env.example` templates.
- Use your deployment platform's secret manager for production rather than a
  checked-in file.
- Do not log credentials, cookies, JWTs, or authorization headers. The server
  logger redacts sensitive metadata before output.
- If a credential is ever committed or shared outside approved secret storage,
  revoke/rotate it with the provider, update the deployment secret, and restart
  the affected service.

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
