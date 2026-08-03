# Development Log

Full phase-by-phase build log for [Job Copilot](../README.md), preserved in
detail here rather than trimmed from the main README. Built per the
project's Phase 0 architecture plan — currently through **Phase 13 of 14**
(Phase 14, production hardening, is the only phase not yet started).

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
| 8 | ✅ | AI application tools (JD analyzer, cover letters) |
| 9 | ✅ | Application tracker |
| 10 | ✅ | Skill intelligence (gap analysis) |
| 11 | ✅ | Interview preparation + AI mock interview |
| 12 | ✅ | Alerts + daily AI job brief |
| 13 | ✅ | Career dashboard |
| 14 | ⏳ next | Production hardening (final phase) |

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

**AI features (optional):** set `ANTHROPIC_API_KEY` in `apps/api/.env` to
enable the JD Analyzer's AI commentary and cover letter generation. Leave
it unset to run without them — the app works fully otherwise, those two
features just show a clear "not configured" state instead. For Docker
Compose, export it in your shell first: `export ANTHROPIC_API_KEY=sk-...`.

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

## What Phase 8 implemented

The first phase needing a real external AI dependency. This sandbox has
no `ANTHROPIC_API_KEY` (confirmed by checking) and I didn't fabricate or
borrow one — so here's exactly what's real vs. what's honestly untested:

**Real, production code:** `packages/ai`'s `LLMProvider` interface and a
full `AnthropicProvider` implementation — structured output via forced
tool-calling (converting Zod schemas to Anthropic's tool format), one
repair-retry that feeds the actual validation errors back to the model,
and a hard failure (never a fake/partial result) if the second attempt
still doesn't validate. Two features built on it, both following
"AI explains, never determines": the **JD Analyzer** (§15, deferred here
from Phase 6) runs the real Phase 6 matching pipeline against pasted text
first, with AI only adding prose commentary on top — and when AI isn't
configured, it still returns the genuinely useful deterministic score
rather than nothing; and the **Cover Letter Generator** (§17) uses strict
anti-fabrication prompting and — a deliberate design decision — always
creates a new document on regeneration rather than upserting, so a user's
edits can never be silently overwritten (amendment #12).

**Genuinely tested without a live key:** 14 tests for `AnthropicProvider`
using an injected fake `fetch` — including one that verifies the
repair-retry sends a real second HTTP request with the actual validation
errors embedded, and one confirming it throws rather than ever returning
invalid data. Route-level tests sign real JWTs to get past auth and hit
the actual service logic, confirming the "AI not configured" path returns
a clean 400 in this environment — not a mock, the real code path, since
this sandbox genuinely has no key.

**Honestly untested:** an actual live call to `api.anthropic.com` succeeding
end-to-end. I cannot verify that without your key. Set `ANTHROPIC_API_KEY`
in `apps/api/.env` (or pass it to `docker compose` — see below) to enable
AI features; the app runs completely normally without it, just with AI-only
features (JD commentary, cover letters) showing a clear "not configured"
state instead of being fake or crashing.

**Verified in this sandbox:** typecheck (11/11 workspaces — added
`@job-copilot/ai`), lint (0 warnings), build, and 122 passing tests.

## What Phase 9 implemented

Application tracker: `applications`/`applicationEvents`/`applicationNotes`
as separate collections (amendment #19 — no unbounded notes array), with
`jobId` optional and a server-resolved `jobSnapshot` so application
history survives the original job later changing or expiring (amendment
#13). Status changes automatically log a timeline event; the create
endpoint is idempotent per (user, job) so clicking "Apply" twice doesn't
duplicate a row. Kanban board (native HTML5 drag-and-drop, no extra
dependency) and table view, both persisting status changes to the
backend — not local-only UI state. "Apply" on the job detail page now
actually creates a tracked application before opening the external link,
closing the loop between job discovery and tracking.

**Verified in this sandbox:** typecheck (11/11 workspaces), lint (0
warnings), build, and 134 passing tests — including schema tests for the
jobId-or-jobSnapshot validation refinement and route-level auth-guard
tests for every new endpoint. As throughout this build, actually creating
an application against a live Mongo record (and watching the Kanban board
update via drag-and-drop) is untested here for the same network-allowlist
reason.

## What Phase 10 implemented

Skill intelligence: every demand percentage is counted directly from real
`Job.requiredSkills`/`preferredSkills` data — never AI-estimated, per
Phase 0 §21's explicit requirement. "Relevant jobs" reuses Phase 6/7's
match computation (score ≥ 30) rather than a second relevance definition,
so a candidate's skill gaps are calculated against jobs they're actually
plausible fits for, not the entire job pool indiscriminately. The
headline feature — "best skills to learn next" — counts `jobsUnlocked`
per missing skill: jobs where that skill is the *only* required skill
still missing, so learning it alone would make the candidate fully
qualified on required skills for those specific roles. This is a genuinely
non-trivial calculation (distinct from simple demand-percentage ranking)
and is the most thoroughly tested logic in the project relative to its
size.

**Verified in this sandbox:** typecheck (11/11 workspaces), lint (0
warnings), build, and 147 passing tests — including 12 fixture-based tests
for the gap-analysis algorithm covering exact percentage counts (not
estimates), required-vs-preferred demand tracking, case-insensitive skill
matching, and the jobsUnlocked sole-missing-skill logic specifically
(verified it does NOT count a job as unlocked when multiple required
skills are still missing). This phase has zero AI dependency, so unlike
Phase 8, there's nothing here that's untestable in principle — only the
usual live-Mongo-data caveat that applies throughout this build.

## What Phase 11 implemented

Interview preparation (batch question generation across categories) and
an interactive AI mock interview — one question at a time, rubric-based
evaluation (correctness, completeness, clarity, depth, relevance), capped
at 5 rounds with auto-completion. This reused Phase 8's `LLMProvider`
infrastructure for a second and third feature rather than building new AI
plumbing — same structured-output validation, same honest "not configured"
degrade (genuinely exercised in this sandbox, which has no API key).

The requirement I paid closest attention to: §23 explicitly says never
show fake precision on inherently subjective judgment. `confidence` is a
**required** field on every evaluation (not optional, not defaulted to
"high") — enforced at the schema level and verified with a dedicated test
confirming an evaluation missing it is rejected outright, not silently
accepted with an implied confident score. The UI surfaces this label
prominently next to the score rather than burying it.

**Verified in this sandbox:** typecheck (11/11 workspaces), lint (0
warnings), build, and 162 passing tests — including schema tests for the
required-confidence constraint and the generated-questions category/count
bounds, plus route tests confirming both prep and mock session creation
return a clean 400 (not fake questions) when AI isn't configured. Runtime
boot confirmed for the api process with the full interview module wired
in. As throughout this build, an actual live mock-interview conversation
against a real Mongo record and a real AI call is untested here.

## What Phase 12 implemented

Alerts and the daily AI job brief — "AI" in the feature name per Phase 0's
naming, but this phase has **zero LLM calls**: both counts and rankings
come entirely from the deterministic matching pipeline (Phase 6) and real
database queries, exactly per §26's requirement that every number be
counted, never estimated. Alerts are processed by a genuine BullMQ
repeatable job (hourly check, each alert respecting its own daily/weekly
frequency) — not a frontend timer, and the check keeps running whether or
not anyone has the app open.

**A necessary refactor first:** extracted `toCandidateInput`/`toJobInput`/
`computeOrCacheMatch` out of `apps/api` and into `packages/domain`, since
the worker needed match-scoring for alert filtering and the daily brief
but — per the Phase 0 dependency rule — can never import from `apps/api`.
Verified this didn't regress anything (same 100 api+domain tests passed
before and after).

Both the alert-matching predicate and the daily-brief summary builder are
pure functions, tested with 12 and 4 fixture tests respectively — genuinely
testable without a database, unlike most of this backend. One test bug
(a wrong assertion, not the code) was caught and fixed along the way.

**Verified in this sandbox:** typecheck (11/11 workspaces), lint (0
warnings), build, and 182 passing tests. Runtime boot confirmed for both
`api` and `worker` with the alerts/daily-brief pipeline wired in. As
throughout this build, actually running the scheduled jobs against live
data and watching notifications appear is untested here — same
network-allowlist constraint as every prior phase.

## What Phase 13 implemented

The career dashboard — deliberately almost no new business logic, since
that was the point: aggregate what the previous 12 phases already
compute. Job/match stats reuse the same scoring-loop pattern as
recommendations (Phase 7); top recommended jobs and skill gaps delegate
directly to `jobsService.getRecommendedJobs` and
`skillsService.getSkillGapAnalysis` rather than re-deriving them;
application funnel and recent activity aggregate straight from
`Application`/`ApplicationEvent`. The one new piece — an optional AI
insight paragraph — follows the same pattern as every AI feature in this
build: real calculated numbers are handed to the model as data it must
not contradict or supplement with invented figures, and it's `null`,
never faked, when no key is configured.

**Verified in this sandbox:** typecheck (11/11 workspaces), lint (0
warnings), build, and 183 passing tests. Runtime boot confirmed for the
api process with the dashboard module wired in. As throughout this
build, seeing real aggregated numbers against live data is untested
here — same network-allowlist constraint as every prior phase.

## What Phase 14 will implement — the final phase

Production hardening: a security review pass (the items in Phase 0 §43
not already covered incidentally by earlier phases' design decisions),
a performance pass, Docker/CI-readiness verification, accessibility and
responsive-design review, dark-mode validation across every page built
across these 13 phases, and closing documentation (`docs/architecture.md`,
`docs/api.md`, `docs/ai-system.md`, `docs/matching-engine.md`) — no new
features, just making everything built so far demonstrably solid.
