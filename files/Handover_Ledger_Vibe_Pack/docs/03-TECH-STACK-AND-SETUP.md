# 03. Tech Stack, Package Management and Setup

## 1. Pinned versions
| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | `.nvmrc` = `20` |
| pnpm | 9.x | `corepack enable && corepack prepare pnpm@9 --activate` |
| Python | 3.11 | `.python-version` = `3.11` |
| uv | latest | Python package manager (`pipx install uv` or `pip install uv`) |
| Docker Desktop | latest | Needed for local Supabase and the API image |
| Supabase CLI | latest | Run with `pnpm dlx supabase@latest` (no global install needed) |
| Git + GitHub CLI | latest | `gh` optional |

Re-check library majors when you install; if a major differs from this table, tell the agent to read that library's current docs instead of relying on memory.

## 2. Libraries

### Web (`apps/web`)
| Purpose | Package |
|---|---|
| Framework | `next@14` `react@18` `react-dom@18` `typescript` |
| Styling | `tailwindcss@3` `postcss` `autoprefixer` `tailwindcss-animate` `class-variance-authority` `clsx` `tailwind-merge` |
| Components | shadcn/ui (copied via CLI), `lucide-react`, `@radix-ui/*` (via shadcn) |
| Motion | `framer-motion` |
| Graph | `@xyflow/react` (React Flow v12) |
| Command palette | `cmdk` |
| Toasts | `sonner` |
| Theme | `next-themes` |
| Forms/validation | `react-hook-form` `zod` `@hookform/resolvers` |
| Data fetching | `@tanstack/react-query@5` `openapi-fetch` (+ dev `openapi-typescript`) |
| Auth | `@supabase/supabase-js` `@supabase/ssr` |
| Fonts | `next/font/google`: Fraunces, Inter, JetBrains Mono |
| Dates | `date-fns` |
| Testing | `vitest` `@testing-library/react` `@testing-library/user-event` `jsdom` `@playwright/test` `@axe-core/playwright` |
| Lint/format | `eslint` `eslint-config-next` `prettier` `prettier-plugin-tailwindcss` |

### API (`apps/api/pyproject.toml`)
| Purpose | Package |
|---|---|
| Web | `fastapi` `uvicorn[standard]` `python-multipart` |
| Config/models | `pydantic>=2` `pydantic-settings` |
| DB | `psycopg[binary,pool]>=3.2` |
| Auth | `pyjwt[crypto]` |
| LLM | `anthropic` |
| Embeddings | `fastembed` |
| HTTP | `httpx` `tenacity` |
| Text | `rapidfuzz` (similarity for dedupe only; never for verification), `markdown-it-py`, `chardet` |
| Crypto | `cryptography` (Ed25519), stdlib `hashlib` |
| Logging | `structlog` |
| Dev | `pytest` `pytest-asyncio` `pytest-cov` `httpx` `ruff` `mypy` `testcontainers` (optional) |

## 3. Bootstrap, from empty folder to running skeleton
```bash
# 0. repo
mkdir handover-ledger && cd handover-ledger && git init
echo "20" > .nvmrc && echo "3.11" > .python-version
corepack enable && corepack prepare pnpm@9 --activate

# 1. workspace
cat > pnpm-workspace.yaml << 'YAML'
packages:
  - "apps/web"
YAML
pnpm init

# 2. web app
mkdir -p apps && cd apps
pnpm dlx create-next-app@14 web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
cd web
pnpm dlx shadcn@latest init            # style: new-york, base color: neutral, CSS variables: yes
pnpm dlx shadcn@latest add button card badge input textarea select dialog sheet tabs tooltip dropdown-menu popover command separator skeleton scroll-area switch checkbox table progress alert sonner
pnpm add framer-motion @xyflow/react cmdk next-themes lucide-react zod react-hook-form @hookform/resolvers \
  @tanstack/react-query openapi-fetch @supabase/supabase-js @supabase/ssr date-fns
pnpm add -D openapi-typescript vitest @testing-library/react @testing-library/user-event jsdom \
  @playwright/test @axe-core/playwright prettier prettier-plugin-tailwindcss
cd ../..

# 3. api
mkdir -p apps/api/app && cd apps/api
uv init --no-workspace --python 3.11 --name handover-api
uv add fastapi "uvicorn[standard]" python-multipart pydantic pydantic-settings "psycopg[binary,pool]" \
  "pyjwt[crypto]" anthropic fastembed httpx tenacity rapidfuzz markdown-it-py chardet cryptography structlog
uv add --dev pytest pytest-asyncio pytest-cov ruff mypy
cd ../..

# 4. supabase
pnpm dlx supabase@latest init           # creates supabase/
pnpm dlx supabase@latest start          # needs Docker; prints local URLs and keys

# 5. root scripts (package.json)
```

### Root `package.json` scripts
```json
{
  "name": "handover-ledger",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "concurrently -n web,api -c cyan,magenta \"pnpm --filter web dev\" \"pnpm dev:api\"",
    "dev:api": "cd apps/api && uv run uvicorn app.main:app --reload --port 8000",
    "gen:api-types": "openapi-typescript http://localhost:8000/openapi.json -o apps/web/src/lib/api/schema.d.ts",
    "db:reset": "pnpm dlx supabase@latest db reset",
    "db:push": "pnpm dlx supabase@latest db push",
    "test": "pnpm --filter web test && cd apps/api && uv run pytest -q",
    "lint": "pnpm --filter web lint && cd apps/api && uv run ruff check .",
    "typecheck": "pnpm --filter web typecheck && cd apps/api && uv run mypy app"
  },
  "devDependencies": { "concurrently": "^9.0.0" }
}
```
Run `pnpm add -D -w concurrently` at the root. Add `"typecheck": "tsc --noEmit"` and `"test": "vitest run"` to `apps/web/package.json`.

## 4. Environment variables

### `apps/web/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Only the anon key and public URLs go in `NEXT_PUBLIC_*`.

### `apps/api/.env`
```
APP_ENV=local
CORS_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_JWT_SECRET=<legacy HS256 secret, if your project uses it>
SUPABASE_JWKS_URL=http://127.0.0.1:54321/auth/v1/.well-known/jwks.json
SUPABASE_SERVICE_ROLE_KEY=<only for Storage signed URLs>
ANTHROPIC_API_KEY=<secret>
CLAUDE_MODEL_EXTRACT=claude-sonnet-5-5
CLAUDE_MODEL_FAST=claude-haiku-5-5
EMBED_MODEL=BAAI/bge-small-en-v1.5
EMBED_CACHE_DIR=.models
GITHUB_TOKEN=<optional, raises rate limit>
RECEIPT_SIGNING_KEY=<base64 Ed25519 private key; generate with scripts/gen_key.py>
MAX_UPLOAD_MB=20
PROJECT_TOKEN_BUDGET=2000000
```
Verify the model identifiers against the current Anthropic docs before the first run.

Commit `.env.example` files with the same keys and empty values. Add to `.gitignore`: `.env*` (except `.env.example`), `.models/`, `node_modules/`, `.venv/`, `.next/`, `__pycache__/`.

## 5. Running locally
```
pnpm dlx supabase@latest start        # Postgres, Auth, Studio at http://127.0.0.1:54323
pnpm dlx supabase@latest db reset     # applies migrations + seed
pnpm dev                              # web :3000 and api :8000
pnpm gen:api-types                    # after any API schema change
```
Use Supabase Studio's Auth tab to create users, or the seed script (docs/13) which creates the demo cast: admin, lead, leaver, two successors.

## 6. Code style and tooling files
- `apps/api/ruff.toml`: `line-length = 100`, rules `E,F,I,B,UP,ASYNC,S`.
- `apps/api/mypy.ini`: `strict = True` for `app/`, ignore missing imports for `fastembed`.
- `.prettierrc`: `{ "semi": true, "singleQuote": false, "plugins": ["prettier-plugin-tailwindcss"] }`.
- `.editorconfig`, `.gitattributes` (`* text=auto`).
- Husky is optional; CI enforces lint/test (docs/11).

## 7. Makefile (optional convenience)
```
setup:   pnpm install && cd apps/api && uv sync
up:      pnpm dlx supabase@latest start && pnpm dev
reset:   pnpm db:reset
check:   pnpm lint && pnpm typecheck && pnpm test
```
