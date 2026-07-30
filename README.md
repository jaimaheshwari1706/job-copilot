# Job Copilot — AI-Powered Job Search & Career Copilot

Built phase-by-phase per the project's Phase 0 architecture plan. Currently
through **Phase 3 of 14**.

| Phase | Status | Covers |
|---|---|---|
| 0 | ✅ | Architecture, folder structure, roadmap |
| 1 | ✅ | Monorepo foundation (web/api/worker, Mongo, Redis, BullMQ, Docker) |
| 2 | ✅ | Authentication (sessions, rotating refresh tokens, protected routes) |
| 3 | ✅ | Candidate profile + onboarding |
| 4 | ✅ | Resume upload/parsing |
| 5 | ✅ | Job system + ingestion |
| 5.5 | ✅ | Skill taxonomy + normalization |
| 6 | ✅ | Matching engine |
| 7 | ✅ | Job recommendations |
| 8 | ⏳ next | AI application tools |
| 9–14 | — | See Phase 0 roadmap |

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
  jobs     Job provider abstraction, demo provider, normalization, dedup
  storage  Local-disk file storage + HMAC-signed download URLs (swappable for S3 later)
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

### Seed demo data

Once Mongo/Redis are up (either option above), populate a demo account
and real ingested jobs so there's something to click through:

```bash
npm run seed -w @job-copilot/api
```

This connects directly to Mongo/Redis — it doesn't need the api/worker
processes running, just the databases. It seeds the canonical skill
dictionary, runs a real ingestion pass against the demo job provider, and
creates a demo account with a deliberately partial (not perfect) skill
match against the seeded jobs, so match scores in the UI show a genuine
spread rather than every job scoring identically. Idempotent — safe to
re-run. Prints login credentials at the end:

```
email:    demo@jobcopilot.dev
password: DemoPassword123!
```

This is demo data only (Phase 0 §55) — the email is obviously fake, and
job ingestion is isolated to `JobSource.type = "demo"`, the same
demo/production separation the architecture requires elsewhere. Never run
this against a production database.

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

## What Phase 4 implemented

Resume system: PDF/DOCX upload (multer, memory storage, MIME + 10MB size
validation) behind a private local-disk storage provider (`packages/storage`)
— files are never served from a public path; downloads go through a
short-lived HMAC-signed URL, the same pattern S3 presigned URLs use, scoped
to one resume's storage key and cross-checked server-side. Text extraction
(`pdf-parse`/`mammoth`) runs as a real BullMQ background job, not inline —
upload returns immediately and the resume list polls until extraction
completes. Per amendment #4, upload/text-extraction/structure-extraction/
confirmation are tracked as **independent** statuses; `structureExtractionStatus`
honestly sits at `not_started` since AI extraction doesn't exist until
Phase 8 — no fake AI results. Multiple resumes with a primary flag,
soft-delete, and download/delete all wired end-to-end in the UI.

Caught and fixed two real bugs during this build: (1) a signed download URL
that also required a Bearer session token — which defeats the point of a
shareable signed link, since `window.open()`/`<a href>` can't send custom
headers; fixed by moving that route ahead of the auth middleware so the
signed token alone is the authorization, matching how presigned URLs work
everywhere else. (2) Docker Compose was never actually passing
`JWT_ACCESS_SECRET`/`SIGNED_URL_SECRET` to the api container — a latent
bug from Phase 2 that would have made the container fail to boot; both are
now required (with a clear error) via `${VAR:?...}` in `docker-compose.yml`.

**Verified in this sandbox:** typecheck (10/10 workspaces), lint (0
warnings), build, and 52 passing tests (27 api, 6 web, 2 worker, 6 shared,
11 storage) — including genuine local file I/O tests for the storage
provider (save/read/delete/path-traversal-guard, no mocking) and signed-token
round-trip/tamper/expiry tests, both fully real since they don't need a
database. As in prior phases, Mongo-backed success paths (actually creating
a resume record, watching the worker update it) couldn't be exercised live
here for the same network-allowlist reason — verify via `docker compose up`.

## What Phase 5 implemented

Job system: canonical `jobs` separated from source-specific `jobListings`
(per amendment #5) — hard dedup only on `{sourceId, sourceJobId}` (the one
globally-unique constraint), fuzzy cross-provider/repost detection via an
**explainable** duplicate-confidence scorer (structured, weighted signals —
company/title/location/applyUrl/posted-date proximity — never an opaque
score), with a coarse fingerprint narrowing candidates before scoring.
`DemoJobProvider` behind a `JobProvider` interface, seeded with 20 realistic
jobs including deliberate near-duplicate/repost cases to actually exercise
the dedup logic. A real BullMQ ingestion pipeline (not a synchronous fake
call) running on a genuine **repeatable schedule** (hourly, via BullMQ's
native repeat option — no client-side timers), recording `ingestionRuns`
for observability. `jobSources` tracks provider metadata. Search (keyword,
location, work mode, experience, skills) with pagination, job details,
save/hide/unsave. First real use of the `role` field from Phase 2: a
`requireAdmin` middleware gates a manual ingestion-trigger route and an
ingestion-runs listing route.

**Verified in this sandbox:** typecheck (10/10 workspaces), lint (0
warnings), build, and 69 passing tests (34 api, 6 web, 2 worker, 10 jobs,
6 shared, 11 storage) — including a full fixture suite for the
duplicate-confidence scorer covering exact matches, different companies,
legitimate reposts, and different roles at the same company. Also
re-verified the compiled runtime path boots cleanly with the new
`DemoJobProvider`/ingestion pipeline wired in. As in prior phases, actually
running an ingestion job against a live Mongo/Redis (watching jobs get
created) couldn't be exercised here — verify via `docker compose up`, then
either wait for the hourly schedule or call
`POST /jobs/admin/ingest` as an admin user.

## What Phase 5.5 implemented

Skill taxonomy + normalization: a curated canonical skill dictionary
(~40 entries with aliases — `React.js`/`ReactJS` → `React`, `Node`/`NodeJS`
→ `Node.js`, `JS` → `JavaScript`, etc.) seeded idempotently into Mongo from
both `api` and `worker` startup. Applied to **both** sides that matching
will need clean data from: job requirements are normalized during
ingestion (`packages/jobs` provider output → `SkillNormalizer` →
persisted `Job.skills`), and candidate skills are normalized on every
write path — the standalone profile editor, the onboarding wizard's
merge-by-name logic, and skill confirmation. Unrecognized skills are
never dropped, only title-cased and passed through, since the dictionary
is intentionally incomplete and silently discarding real candidate/job
data would be worse than an unnormalized string.

**Scoping decision:** kept skills embedded on `Profile`/`Job` (normalizing
the `name` field in place) rather than introducing the separate
`candidateSkills` join collection with `skillId` references that Phase 0's
model list mentions — that would have meant reworking Phase 3's data
model. A relational version can be introduced later if Phase 10's
skill-demand analytics need stronger integrity than string matching gives.

**Verified in this sandbox:** typecheck (10/10 workspaces), lint (0
warnings), build, and 77 passing tests (34 api, 6 web, 2 worker, 8 domain,
10 jobs, 6 shared, 11 storage) — including a full fixture suite for the
normalizer (alias resolution, case/whitespace handling, unknown-skill
passthrough, de-duplication within a list, order preservation). Runtime
boot confirmed for both api and worker with the seeding/normalization
code wired into startup — actually seeding into a live Mongo and watching
ingestion produce normalized skills end-to-end is untested here for the
same network-allowlist reason as every prior phase.

## What Phase 6 implemented

The matching engine: six independently deterministic, unit-tested scorers
(skills, experience, role, preferences, projects, education) feeding a
weighted pipeline, with explicit constraint penalties applied *before* the
weighted average so severe mismatches (e.g. 8 years required vs. 1 year
actual) can't be masked by an otherwise-strong skills match — verified
with a dedicated regression test. Required skills are weighted above
preferred ones (amendment #7 — `Job.requiredSkills`/`preferredSkills`
derived at ingestion via skill-dictionary matching against requirement
text, documented as a heuristic, not full NLP extraction). A confidence
score reflects real evidence availability rather than implying false
precision — projects/education scorers honestly return "no evidence"
right now since those Profile arrays don't get populated until Phase 8's
structured resume extraction, and semantic similarity (needs embeddings)
has its 15% weight proportionally redistributed rather than faked as a
permanent 0. Every scorer returns structured, inspectable evidence
(`{type, requirement, status, strength}`) — never an opaque number. Results
are cached per `scoringVersion` in `jobMatches`, computed on-demand via
`GET /matches/:jobId`, and surfaced in the UI as a match badge on job
cards and a full breakdown (score, confidence, per-category bars, why it
scored lower, matched/missing skills) on the job detail page.

**Deferred to Phase 8, deliberately:** the paste-a-JD analyzer (§15) pairs
naturally with AI-generated prose explanation, so building it now would
mean either half-implementing it or duplicating work later.

**Verified in this sandbox:** typecheck (10/10 workspaces), lint (0
warnings), build, and 94 passing tests (35 api, 6 web, 2 worker, 25
domain, 10 jobs, 6 shared, 11 storage). The 17 matching-pipeline tests are
fixture-based and cover exactly the scenarios Phase 0 §52 calls out: exact
match, missing required skill, related-but-not-identical skill (JavaScript
correctly does NOT satisfy a TypeScript requirement), under/overqualified
experience, remote-vs-onsite conflict, location mismatch, low-information
job descriptions, sparse candidate profiles, and score-bounds — all fully
testable without a database, unlike most of this project's backend logic.
Runtime boot confirmed for both api and worker with the full pipeline
wired in. Actually computing and caching a match against a live Mongo
record is untested here — same network-allowlist reason as every prior
phase.

## What Phase 7 implemented

Recommended jobs: ranks all active, non-hidden jobs by match score (Phase
6), with recency as a tiebreaker, and threshold filters (80%+, 90%+,
remote, recently posted). Reuses `getOrComputeMatch`'s cache-or-compute
function directly rather than duplicating scoring logic — computing
recommendations is purely a ranking/filtering layer on top of Phase 6.

**Documented scale tradeoff:** this computes-or-fetches-cached a match for
every active job (capped at 200) on each request. That's the right choice
at this project's scale — it reuses Phase 6's cache with zero new
infrastructure — but real job-board volume would need this to move to a
background-precomputed batch (the "matching" queue Phase 0 lists), which
I didn't build speculatively without a concrete trigger design. Noted
explicitly rather than silently degrading under load.

**Verified in this sandbox:** typecheck (10/10 workspaces), lint (0
warnings), build, and 96 passing tests. As in every prior phase, actually
computing recommendations against live data is untested here — same
network-allowlist constraint throughout this build.

## What Phase 8 will implement

AI application tools — the first phase requiring a real AI provider. This
is a bigger jump than prior phases: it needs API credentials, a
provider abstraction (`LLMProvider`/`EmbeddingProvider` per amendment
#16), structured-output validation, prompt-injection defenses treating
resume/JD text as data never instructions, and `aiRuns` cost/usage
tracking — all before the first feature (JD analysis, resume tailoring,
cover letters) can honestly ship. I'll flag clearly if/when this phase
needs something from you (an API key) that isn't available in this
sandboxed build environment.
