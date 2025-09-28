# The Hive AI Platform — Unified Repo

> Lovable frontend at **root** (Vite). Next.js backend in **/backend**. Shared code in **/shared**. Supabase config in **/supabase**.

## Structure

├─ src/ # Frontend (Lovable)
├─ public/ # Frontend public assets
├─ index.html
├─ vite.config.ts
├─ tailwind.config.ts
├─ backend/ # Next.js backend (VS Code)
│ ├─ src/app/api/... # API routes (e.g., /api/healthz, /api/supa-ping)
│ ├─ next.config.mjs
│ ├─ package.json
│ └─ tsconfig.json
├─ shared/ # Shared types/utils
│ ├─ types/hive.ts
│ └─ utils/math.ts
├─ supabase/ # Supabase project (config.toml, functions/, migrations/)
├─ .env # Local dev env (Vite reads VITE_* vars)
├─ .env.local # Optional backend env
└─ .github/workflows/ci-typecheck.yml

## Local Dev (Windows)
- Frontend (Vite): **http://localhost:8080**
- Backend (Next.js): **http://localhost:3000**

### One-time
- Node **20.x**, npm
- In **.env** (root): `VITE_API_BASE_URL=http://localhost:3000`

### Start both (VS Code)
- **Terminal → Run Task → “Dev: Frontend + Backend”**
- Or run manually:
```powershell
# Frontend
npm run dev -- --port 8080 --host 0.0.0.0

# Backend
cd backend
npm run dev -- -p 3000
Quick health checks

Browser: 

GET http://localhost:3000/api/healthz
GET http://localhost:3000/api/supa-ping

Frontend console should show:

frontend->backend OK: …

supa OK: …

Type Safety
npm run typecheck:frontend
npm run typecheck:backend

Path Aliases

Frontend: @shared/* → shared/*

Backend: @shared/* → ../shared/*

CORS (dev)

Backend allows origin http://localhost:8080.

Notes

Keep secrets out of git; use .env / .env.local.

Lovable syncs at repo root; backend lives in /backend.
