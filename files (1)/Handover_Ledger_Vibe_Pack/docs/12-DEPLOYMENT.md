# 12. Deployment and Operations

Stack: **Supabase** (DB/Auth/Realtime/Storage) + **Render** (FastAPI Docker) + **Vercel** (Next.js). Deploy a thin slice early (end of Phase 7) and redeploy after every phase.

## 1. Supabase (cloud)
1. Create a project; choose the region closest to judges/users (ap-south-1 Mumbai if available). Save the database password.
2. Auth: enable Email (magic link) and Google. Set **Site URL** = Vercel production URL, add `http://localhost:3000` and Vercel preview URL pattern to **Redirect URLs**. For Google: create OAuth credentials in Google Cloud Console, add the Supabase callback URL (`https://<ref>.supabase.co/auth/v1/callback`).
3. Link and push migrations:
```bash
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref <ref>
pnpm dlx supabase@latest db push
```
4. Realtime: confirm `jobs` and `interview_questions` are in the `supabase_realtime` publication (migration 0004 does it).
5. Storage: create a **private** bucket `uploads`.
6. Collect: Project URL, anon key, JWT secret / JWKS URL, DB connection string. Use the **pooler (transaction mode)** string for the API if you hit connection limits; remember `prepare_threshold=None`.
7. Enable daily backups if on a paid plan; otherwise export schema + seed in the repo (the seed script recreates the demo).

## 2. Render (API)
`apps/api/Dockerfile`:
```dockerfile
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_LINK_MODE=copy EMBED_CACHE_DIR=/app/.models
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app ./app
# bake the embedding model into the image so cold starts do not download it
RUN uv run python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5', cache_dir='/app/.models')"
EXPOSE 8000
CMD ["sh","-c","uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```
`render.yaml` (Blueprint):
```yaml
services:
  - type: web
    name: handover-ledger-api
    runtime: docker
    dockerfilePath: apps/api/Dockerfile
    dockerContext: apps/api
    healthCheckPath: /readyz
    autoDeploy: true
    envVars:
      - { key: APP_ENV, value: production }
      - { key: CORS_ORIGINS, sync: false }
      - { key: DATABASE_URL, sync: false }
      - { key: SUPABASE_URL, sync: false }
      - { key: SUPABASE_JWKS_URL, sync: false }
      - { key: SUPABASE_JWT_SECRET, sync: false }
      - { key: SUPABASE_SERVICE_ROLE_KEY, sync: false }
      - { key: ANTHROPIC_API_KEY, sync: false }
      - { key: CLAUDE_MODEL_EXTRACT, value: claude-sonnet-5-5 }
      - { key: CLAUDE_MODEL_FAST, value: claude-haiku-5-5 }
      - { key: RECEIPT_SIGNING_KEY, sync: false }
      - { key: GITHUB_TOKEN, sync: false }
```
Notes:
- Free instances sleep after inactivity; the embedding model plus Python start can take 30-60 s. Use a paid/always-on instance during judging, or add a keep-warm workflow (section 5) and **warm the service 10 minutes before any demo**.
- The pipeline runs as background tasks in the API process. If the instance restarts mid-job, the job stays `running`; on startup mark jobs older than 10 minutes in `running` as `failed` so the UI can retry (resumable).
- Memory: fastembed small model fits 512 MB, but give 1 GB if available.

## 3. Vercel (web)
1. Import the GitHub repo; set **Root Directory** to `apps/web`; framework Next.js; install command `pnpm install` (Vercel detects the pnpm workspace; if needed set "Include source files outside of the Root Directory").
2. Env vars (Production and Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (Render URL), `NEXT_PUBLIC_APP_URL` (Vercel URL).
3. After first deploy: add the Vercel URL to Render `CORS_ORIGINS` and to Supabase redirect URLs. Redeploy API.
4. `next.config.js` security headers:
```js
const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
module.exports = { async headers() { return [{ source: "/(.*)", headers }]; } };
```
Add a CSP once all external hosts are known (Supabase URL, Render API, Google Fonts are not needed if using `next/font`).

## 4. Order of first production deploy
1. Supabase project + migrations pushed.
2. Render API deployed; check `/healthz` and `/readyz`.
3. Vercel web deployed with env vars.
4. Fix CORS + redirect URLs; log in with the demo admin.
5. Run `scripts/seed_demo.py` against production (needs service role + DB URL locally; never commit them).
6. Run `scripts/smoke.sh`.

`scripts/smoke.sh` checks: `/readyz` 200; token for the demo lead via Supabase password sign-in (demo users only, disabled for real users); `GET /projects` returns the demo project; `GET /claims` returns >= 1 item; canary run passes.

## 5. Keep-warm and scheduled tasks (`.github/workflows/keepwarm.yml`)
```yaml
name: keepwarm
on:
  schedule: [{ cron: "*/10 * * * *" }]
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS "${{ secrets.API_URL }}/readyz" > /dev/null
```
Disable it after judging to stay within free minutes.

## 6. CI/CD
- Web: Vercel auto-deploys on push to `main`; preview deploys per PR.
- API: Render auto-deploys on push to `main` after CI passes (use "Deploy hook" triggered from GitHub Actions if you prefer deploy-after-green).
- DB: migrations are applied manually with `supabase db push` before merging code that depends on them. Never edit an applied migration; add a new one.

## 7. Config checklist
| Where | Variable | Notes |
|---|---|---|
| Vercel | `NEXT_PUBLIC_*` (4) | public values only |
| Render | `DATABASE_URL` | pooler string recommended |
| Render | `SUPABASE_JWKS_URL` or `SUPABASE_JWT_SECRET` | match your project's JWT signing setup |
| Render | `ANTHROPIC_API_KEY` | set a spend limit in the Anthropic console |
| Render | `RECEIPT_SIGNING_KEY` | generate with `scripts/gen_key.py`; back it up; rotating invalidates verification of old receipts unless public keys are kept |
| GitHub | `API_URL` secret | for keep-warm and smoke |

## 8. Operations
- **Logs:** Render log stream (structured JSON); search by `request_id`. Supabase logs for auth/DB errors.
- **Monitoring:** `/readyz` from an external pinger (UptimeRobot free tier) if not using GitHub cron.
- **Rollback:** Vercel "Promote previous deployment"; Render "Rollback to this deploy". DB rollbacks require a new forward migration.
- **Cost control:** set Anthropic monthly limit; `PROJECT_TOKEN_BUDGET`; cache extraction by content hash; demo project is small.
- **Data hygiene:** only synthetic data in production demo. Provide `scripts/reset_demo.py` to wipe and reseed.

## 9. Pre-demo checklist (T minus 30 min)
- [ ] API warm (`/readyz` fast), Supabase project not paused.
- [ ] Demo users can log in (three browser profiles: lead, successor core, successor coordinator).
- [ ] Demo project freshly reseeded; canary run green.
- [ ] Anthropic key has credit; replay mode available as fallback (`LLM_MODE=replay`) if the network fails.
- [ ] Screen recording tool tested; browser zoom 110%; notifications off.
