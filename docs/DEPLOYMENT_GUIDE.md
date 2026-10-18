# VIDYALINK — Production Deployment Guide

This guide provides end-to-end instructions for deploying the **VIDYALINK** platform to production using **MongoDB Atlas**, **Render**, and **Vercel**.

---

## Architecture Overview

```
[ User Browser ]
       │
       ▼
[ Vercel Edge CDN ] ─── (Vite / React SPA)
       │
       │ (HTTPS /api/v1/* & /uploads/*)
       ▼
[ Render Web Service ] ─ (Node.js / Express REST API)
       │                    │
       │ (Mongoose ODM)     │ (HTTP Fetch / Internal)
       ▼                    ▼
[ MongoDB Atlas ]     [ Render Web Service ]
(Managed Cluster)     (FastAPI AI Analytics Engine)
```

---

## 1. Prerequisites

- A [GitHub](https://github.com/) account with access to the `Final_Year_Project-Vidyalink` repository.
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
- A [Render](https://render.com/) account.
- A [Vercel](https://vercel.com/) account.
- Node.js `20+` and Python `3.12+` installed locally for generating keys or running admin setup.

---

## 2. Step 1: MongoDB Atlas Provisioning

1. **Create Cluster:**
   - Log into MongoDB Atlas and create an **M0 (Free)** or dedicated cluster in your target region.
2. **Configure Database User:**
   - Go to **Security > Database Access > Add New Database User**.
   - Authentication Method: **Password**.
   - Role: **Read and write to any database** (or target database `vidyalink`).
   - Securely save the username and password.
3. **Configure Network Access:**
   - Go to **Security > Network Access > Add IP Access List Entry**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Note: Render outbound IP addresses are dynamic. Restricting IPs requires a paid static outbound IP add-on on Render.*
4. **Copy Connection String:**
   - Click **Connect > Drivers (Node.js)**.
   - Format: `mongodb+srv://<username>:<password>@<cluster-address>/vidyalink?retryWrites=true&w=majority`
   - *Ensure special characters in the password are URL-encoded.*

---

## 3. Step 2: Deploy Backend & AI Service to Render

You can deploy both services automatically using the provided `render.yaml` Blueprint, or create them individually.

### Option A: 1-Click Blueprint Deploy (Recommended)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New + > Blueprint**.
3. Connect your GitHub repository: `Final_Year_Project-Vidyalink`.
4. Render will read `render.yaml` and discover both services:
   - `vidyalink-api` (Node.js Express backend)
   - `vidyalink-ai` (FastAPI AI engine)
5. Fill in the required environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas SRV URI from Step 1.
   - `CLIENT_URL`: `https://<your-project>.vercel.app` (or temporary placeholder if frontend is not yet created).
   - `CORS_ORIGIN`: Same as `CLIENT_URL`.
   - `AI_SERVICE_URL`: URL of the deployed AI service (`https://vidyalink-ai.onrender.com`).
6. Click **Apply**.

### Option B: Manual Service Creation

#### 1. FastAPI AI Service (`ai-service`)
- **Service Type:** Web Service
- **Runtime:** Python 3
- **Root Directory:** `ai-service`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- **Environment Variables:**
  - `PYTHON_VERSION`: `3.12.0`
  - `HOST`: `0.0.0.0`
  - `AI_PROVIDER`: `deterministic`
  - `ALLOWED_ORIGINS`: `*`

#### 2. Express API Service (`server`)
- **Service Type:** Web Service
- **Runtime:** Node
- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/v1/health`
- **Environment Variables:**
  - `NODE_ENV`: `production`
  - `PORT`: `10000`
  - `API_PREFIX`: `/api/v1`
  - `MONGODB_URI`: `<Your MongoDB Atlas SRV>`
  - `JWT_SECRET`: *(At least 32 characters long)*
  - `JWT_REFRESH_SECRET`: *(At least 32 characters long)*
  - `JWT_EXPIRES_IN`: `15m`
  - `JWT_REFRESH_EXPIRES_IN`: `7d`
  - `CLIENT_URL`: `https://<your-vercel-domain>.vercel.app`
  - `CORS_ORIGIN`: `https://<your-vercel-domain>.vercel.app`
  - `COOKIE_SAME_SITE`: `none`
  - `TRUST_PROXY`: `true`
  - `AI_SERVICE_URL`: `https://<your-ai-service>.onrender.com`
  - `AI_SERVICE_TIMEOUT`: `60000`
  - `AI_ORCHESTRATION_TIMEOUT`: `90000`

> **Secret Generation Tip:**
> Generate 32+ byte cryptographic keys using:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 4. Step 3: Provision Administrator Account

In production (`NODE_ENV=production`), synthetic demo seed scripts are permanently blocked. Use the dedicated administrator provisioning script.

> **Security Guard:** Never pass passwords via CLI flags (`--password`) because they are captured in `.bash_history` and process tables (`ps`). The script explicitly forbids `--password`.

```bash
# Method A: Secure interactive prompt (password is hidden while typing)
node src/scripts/create-admin.js --email="admin@vidyalink.com" --name="System Administrator"

# Method B: Secure environment variable for non-interactive automation
ADMIN_EMAIL="admin@vidyalink.com" \
ADMIN_PASSWORD="YourStrongPassword123!" \
npm run create:admin
```

---

## 5. Step 4: Deploy Frontend to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New... > Project** and import the repository.
3. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `client` (Click "Edit" and choose `client`)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Environment Variables:**
   - `VITE_API_BASE_URL`: `https://<your-render-backend-url>/api/v1` (Optional if using the included `vercel.json` rewrite proxy).
5. Deploy the project.
6. Once deployed, copy your production Vercel domain (e.g. `https://vidyalink.vercel.app`) and ensure `CLIENT_URL` and `CORS_ORIGIN` on your Render backend match this exact domain.

---

## 6. Post-Deployment Verification & Smoke Tests

Run these quick checks against your deployed endpoints:

```bash
# 1. Verify AI Service Health:
curl -f https://<ai-service>.onrender.com/health
# Expected: {"status":"ok","service":"vidyalink-ai"}

# 2. Verify Backend API Health:
curl -f https://<backend-api>.onrender.com/api/v1/health
# Expected: {"status":"success","message":"Service is healthy", ...}

# 3. Test Student Registration & Auth:
curl -X POST https://<backend-api>.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Candidate","email":"test.candidate@domain.com","password":"Password123!","role":"student"}'

# 4. Open frontend in browser:
# Navigate to https://<frontend>.vercel.app/login and test user login.
```

---

## 7. Operational FAQ & Troubleshooting

### Why is my first request slow on Render?
Render free-tier instances sleep after 15 minutes of inactivity. When a request arrives, the instance wakes up (taking 30–50 seconds). To accommodate this, `AI_SERVICE_TIMEOUT` is configured to `60000` (60s). Upgrading to a starter paid tier prevents sleeping.

### Silent token refresh / sessions not persisting across refreshes:
Ensure `COOKIE_SAME_SITE` is set to `none` on Render, and `TRUST_PROXY=true` is enabled so HTTPS cookies with `SameSite=None; Secure` are accepted by the browser across domains.

### Uploaded photos/resumes disappear after restart:
Render Web Services have ephemeral local storage. In a subsequent release, integrate persistent cloud storage (AWS S3, Cloudflare R2, or Cloudinary) or mount a Render Persistent Disk at `/opt/render/project/src/server/uploads`.
