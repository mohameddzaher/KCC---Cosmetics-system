# KCC — Cosmetics System

A full-stack Next.js 16 application (App Router + API routes) backed by MongoDB Atlas, used as the KCC cosmetics management & storefront platform.

---

## Tech stack

- **Framework:** Next.js 16 (React 19, React Compiler enabled)
- **Database:** MongoDB Atlas via Mongoose
- **Auth:** Custom JWT (jose) + bcryptjs
- **Styling:** Tailwind CSS v4
- **State / data:** Zustand, TanStack Query, React Hook Form, Zod
- **Charts:** Recharts
- **Animations:** Framer Motion

---

## Local development

```bash
npm install --legacy-peer-deps
cp .env.example .env.local      # then fill in real values
npm run dev                     # http://localhost:3000
```

Optional seed data:

```bash
npm run seed
```

---

## Environment variables

The full list lives in [`.env.example`](./.env.example). Required:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | JWT signing secret (use `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public site URL |
| `NEXT_PUBLIC_APP_URL` | Public site URL (browser-side) |
| `NEXT_PUBLIC_APP_NAME` | App display name |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO endpoint URL |

Optional:

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | AI assistant |
| `UPLOADS_DIR` | Local uploads dir |
| `SMTP_*` | Outgoing mail |

---

## Deployment

The repo ships ready-to-deploy configs for two platforms.

### 1) Netlify

Config: [`netlify.toml`](./netlify.toml)

1. Netlify → **Add new site → Import from GitHub** → select this repo.
2. Build command and publish dir are auto-read from `netlify.toml`.
3. **Site settings → Environment variables → Import from a .env file** → paste the contents of `.env.netlify` (file lives locally, not in the repo).
4. Trigger a deploy. After it finishes, copy the real `*.netlify.app` URL into `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_SOCKET_URL`, then redeploy.

### 2) Render

Config: [`render.yaml`](./render.yaml)

1. Render → **New → Blueprint** → connect this repo. Render reads `render.yaml` automatically.
2. Open the new Web Service → **Environment** → paste the contents of `.env.render`.
3. After the first successful deploy, replace the `*.onrender.com` URL in `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_SOCKET_URL` with the real one, then redeploy.

> ℹ️ Render's free tier sleeps after 15 min of inactivity — first request after sleep will be slow.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run seed` | Seed MongoDB with sample data |
