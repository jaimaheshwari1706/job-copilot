# Job Copilot — AI-Powered Job Search & Career Copilot

Built phase-by-phase per the project's Phase 0 architecture plan. Currently
through **Phase 3 of 14**.

| Phase | Status | Covers |
|---|---|---|
| 0 | ✅ | Architecture, folder structure, roadmap |
| 1 | ✅ | Monorepo foundation (web/api/worker, Mongo, Redis, BullMQ, Docker) |
| 2 | ✅ | Authentication (sessions, rotating refresh tokens, protected routes) |
| 3 | ✅ | Candidate profile + onboarding |
| 4 | ⏳ next | Resume upload/parsing |
| 5–14 | — | See Phase 0 roadmap |

## Architecture

```
apps/
  web     React + TS + Vite + Tailwind (feature-sliced)
  api     Express + TS — HTTP transport only, no business logic
  worker  BullMQ consumers — HTTP-independent runtime

packages/
  shared   Zod schemas / types shared by every workspace
  db       Mongo connection + models (used by api AND worker)
  queue    Redis connection + typed BullMQ queue contracts (used by api AND worker)
  domain   Business logic (matching engine etc.) — Phase 6+
  ai       LLMProvider / EmbeddingProvider — Phase 8+
  jobs     Job provider adapters, normalization, dedup — Phase 5+
  storage  Signed-URL object storage abstraction — Phase 4+
  config   Shared ESLint/Prettier config
```

**Dependency rule:** `apps/api` and `apps/worker` both depend on `packages/*`.
`apps/worker` never imports from `apps/api`, and vice versa.

## Local setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
```

**Important:** replace `JWT_ACCESS_SECRET` in `apps/api/.env` with a real
random 32+ character value before running anything beyond local dev —
the `.env.example` value is a placeholder, not a secret.

### Option A — Docker Compose (recommended, gives you real Mongo/Redis)

```bash
cd docker
docker compose up --build
```

- web: http://localhost:5173
- api: http://localhost:4000
- Visit http://localhost:5173/system-health to verify the whole chain
  (api → Mongo, api → Redis, api → BullMQ → worker → Mongo) live in the UI.

### Option B — Run natively (requires your own local Mongo + Redis)

```bash
npm run dev:api     # terminal 1
npm run dev:worker  # terminal 2
npm run dev:web     # terminal 3
```

## Verification commands

```bash
npm run typecheck   # all 10 workspaces
npm run lint         # api, web, worker
npm run test         # api, web, worker
npm run build        # packages (dependency order) then apps
```

## Known limitation of this development sandbox

This scaffold was built and verified in a container with **no Docker daemon
and no local Mongo/Redis binaries**, and outbound network is restricted to an
allowlist that doesn't include Mongo/Redis download hosts. So here's exactly
what was and wasn't verified in-sandbox:

| Check | Verified here? | How |
|---|---|---|
| Install, typecheck, lint, test (all workspaces) | ✅ | ran directly, clean state, zero errors |
| Build (`tsc` type-check gate for api/worker, real bundle for web) | ✅ | ran directly |
| `npm run start` (the actual command Docker runs) | ✅ | booted both api and worker; confirmed all workspace packages (`shared`, `db`, `queue`, `domain`) resolve correctly and each process fails only on the real `ECONNREFUSED` from Mongo — not a module error |
| Live Mongo connection | ❌ | no Mongo binary/daemon available in sandbox |
| Live Redis connection | ❌ | no Redis binary/daemon available in sandbox |
| Live BullMQ round trip (api → Redis → worker → Mongo) | ❌ | depends on the above |
| Docker build/compose | ❌ | no Docker daemon in sandbox |

**Design note:** `apps/api` and `apps/worker` run via `tsx` against TypeScript
source in both dev and "production" (`npm run start` / Docker `CMD`), rather
than compiling to `dist` first. Internal workspace packages (`shared`, `db`,
`queue`, `domain`, `ai`, `jobs`, `storage`) are never published — they're
consumed as source by every consumer, so there's no dist/source resolution
mismatch between `tsc --noEmit`, `vitest`, and the actual runtime. `tsc -p`
remains available per-workspace as a pure type-safety gate (e.g. for CI),
it's just not on the runtime path. This is a deliberate simplification for
an internal monorepo of this size; if a workspace ever needs to be published
independently, switch it to a real build + `exports` map at that point.

**To finish verification on your machine:** run `docker compose up --build`
from `docker/` and open `/system-health` in the web app. That page enqueues a
BullMQ job from the browser, and polls until the worker has processed it and
written a document to Mongo — the definitive end-to-end check.

## What Phase 3 implemented

Candidate profile + onboarding: a `profiles` model (name, current role,
experience, location, target roles, preferred locations, work mode,
expected salary, links, skills with `source`/`confirmed` tracking, plus
employment/education/projects/certifications arrays reserved for Phase 4's
resume parsing). A 4-step onboarding wizard covering the Phase 0 §5 field
list, a standalone profile editor, and onboarding-gating on the frontend
(incomplete users are routed to `/onboarding`; completed users can't
re-enter it). "Skip via resume upload" is shown but honestly disabled —
resume upload doesn't exist until Phase 4.

**Verified in this sandbox:** typecheck (10/10 workspaces), lint (0
warnings), build, and 34 passing tests (20 api, 6 web, 2 worker, 6 shared —
including real Zod schema validation tests for onboarding, and route-level
auth-guard tests for every new profile endpoint). As in Phases 1–2, the
DB-backed success paths (actually saving/reading a profile) could not be
tested live here for the same network-allowlist reason.

## What Phase 4 will implement

Resume system: PDF/DOCX upload behind a private object-storage abstraction
(signed URLs only, per Phase 0 amendment #3), a document-text-extraction
stage separated from AI structured-extraction (per amendment #4, so parser
failures and AI misreads are distinguishable), user review/correction of
extracted data, multiple resumes with a primary flag, and resume versions.
This is also when the onboarding wizard's disabled "skip via resume
upload" button gets wired up for real.
