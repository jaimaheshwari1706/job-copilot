# QA Audit — Job Copilot Phase 14 (Production Hardening)

Living document. Updated as each verification phase completes. Started
2026-08-05.

## Scope & method

This audit follows the repo's own documented gap: per
[`development-log.md`](development-log.md), Phases 0–13 were built and
verified (typecheck/lint/unit-tests/build only) in a sandbox with **no
Docker daemon, no Mongo/Redis binaries, and no network access to
`api.anthropic.com`**. Everything live-dependent was explicitly marked
untested. This machine has Docker, Docker Compose, Node 22, and a local
`mongod` binary available (no native `redis-server`, so Redis is sourced
via Docker). This audit's job is to close that gap: actually boot the
stack, hit real endpoints, exercise real Mongo/Redis/BullMQ, and verify
the UI in a real browser — not re-assert what the unit tests already
proved.

No `ANTHROPIC_API_KEY` has been supplied. AI-dependent features will be
verified for graceful degradation (clean "not configured" response), not
live model output, unless a key is provided.

## Environment

| Tool | Version / status |
|---|---|
| Node | v22.23.1 |
| npm | 12.0.2 |
| Docker | 29.6.2 |
| Docker Compose | v5.3.1 |
| mongod (local binary) | v8.3.4 |
| redis-server (local binary) | not present — use Docker |

## Phase status

| Phase | Area | Status |
|---|---|---|
| 1 | Repository inspection | ✅ done |
| 2 | Clean install | ✅ done |
| 3 | Environment validation | ✅ done |
| 4 | Build validation | ✅ done |
| 5 | Database validation | ✅ done |
| 6 | Redis & worker | ✅ core verified (see caveat below) |
| 7–8 | API audit & testing | ✅ 60/62 live, 2 blocked on missing AI key |
| 9 | Frontend/backend integration | ✅ done — 1 finding |
| 10 | Authentication | ✅ done |
| 11 | Dark mode | ⏳ |
| 12–14 | Page audit / click-everything / core journey | ⏳ |
| 15–19 | Resume / matching / AI / applications / dashboard | ⏳ |
| 12–14 | Page audit / click-everything / core journey | ✅ via Playwright |
| 20 | Responsive | ⚠️ no overflow at any breakpoint, but 1 high-severity finding (no mobile nav at all) |
| 21 | Accessibility | ✅ spot-checked (see below) |
| 22 | Security | ✅ done — see below |
| 23 | Performance | ✅ done — 1 finding, fixed |
| 24 | Playwright E2E | ✅ 23 tests, all passing |
| 25 | Lighthouse | ⏳ not run (see note) |
| 26 | Release review | ⏳ |

## Phase 1 — Repository inspection (done)

**Architecture** (confirmed against README + dev log, not re-derived):

- Monorepo, npm workspaces: `apps/{web,api,worker}` +
  `packages/{shared,db,queue,domain,ai,jobs,storage,config}`.
- `apps/web`: React + TS + Vite + Tailwind, feature-sliced.
- `apps/api`: Express + TS, HTTP transport only — delegates to
  `packages/domain`.
- `apps/worker`: BullMQ consumers, HTTP-independent, never imports from
  `apps/api`.
- Data: MongoDB (via `packages/db`), Redis + BullMQ (via `packages/queue`).
- AI: optional `ANTHROPIC_API_KEY` via `packages/ai`'s `LLMProvider`
  interface — every AI feature runs real deterministic logic first, AI
  only adds prose on top; absent key → clean "not configured", never a
  fake result (per README's stated design).
- Storage: local-disk with HMAC-signed download URLs (S3-swappable later).
- No native job-board integration — one demo provider (`packages/jobs`),
  by design, to keep ingestion/dedup logic real and testable without a
  third party.

**Known issues already declared by the repo itself** (not discovered by
this audit — logged here so they're tracked, not re-litigated):

- `auth.service.ts` — password-reset flow logs the reset token instead of
  emailing it (no email provider integrated). Tracked TODO.
- `esbuild`/`vite` — moderate advisory, fix needs a breaking `vite@8` bump.
- `react-router` — moderate open-redirect/SSR-hydration advisories; `npm
  audit fix` doesn't actually move the resolved version in this workspace
  setup.
- No `LICENSE` file — `UNLICENSED`, all rights reserved by default.
- Recommendations endpoint computes-or-caches a match for every active
  job (capped 200) per request — documented scale trade-off, not a bug.

**No Playwright, no Lighthouse config present yet** — Phase 24/25 will add
Playwright from scratch. CI (`.github/workflows/ci.yml`) currently runs
Mongo+Redis services and does install/typecheck/lint/test/build only — no
Docker build verification, no E2E, no live-boot check.

---

## Phase 2 — Clean install (done)

`npm ci` (from a state where `node_modules` already existed) completed
cleanly: 581 packages, lockfile fully consistent, no peer-dependency
resolution errors, all 11 workspaces resolve.

`npm audit` found **8 vulnerabilities (1 critical, 2 high, 5 moderate)** —
more than the README's summary of "esbuild/vite (moderate) + react-router
(moderate)". Ran `npm audit fix` (non-force, safe): fixed `brace-expansion`
(high, transitive). Confirmed the remaining ones genuinely can't be fixed
non-breaking:

- `react-router`/`react-router-dom` 6.30.4 — vulnerable range is
  6.0.0–7.17.0; the installed `^6.26.1` semver range in `apps/web`'s
  `package.json` can never resolve to a fixed version without a manual
  major-version bump to v7 (confirmed: `npm view react-router versions`
  shows the fix starts at 7.18.0). This matches the README's own claim
  exactly — verified, not just trusted.
- `esbuild`/`vite`/`vitest`/`@vitest/mocker`/`vite-node` (1 critical, 2
  moderate) — dev-only tooling (Vite dev server, Vitest), fix requires a
  breaking `vite@8`/`vitest@4` bump. Real risk is low (dev-server-only
  advisory, not shipped to production bundles) but should be scheduled.

See [bug-report.md #1](bug-report.md) and #2.

## Phase 3 — Environment validation (done)

Both `apps/api/src/config/env.ts` and `apps/worker/src/config/env.ts` use
Zod schemas with `safeParse` + `process.exit(1)` fail-fast on invalid
config — verified by literally triggering it (ran tests with no `.env`
present; got a clean, readable "Invalid environment configuration" error
listing exactly which vars were missing, not a stack trace or silent
misbehavior).

- `.env.example` for api/web/worker matches the Zod schemas field-for-field.
- Production-mode guard verified by reading the code: `NODE_ENV=production`
  + `COOKIE_SECURE!=true` → refuses to boot. Not exercised live (would
  require standing up a real HTTPS origin), but the logic is a direct,
  unconditional `process.exit(1)`, low risk of being wrong.
- `docker-compose.yml` passes all four required-at-runtime secrets
  (`JWT_ACCESS_SECRET`, `SIGNED_URL_SECRET`, plus Mongo/Redis URIs) via
  `${VAR:?error if unset}` — confirms the Phase-4-era Docker passthrough
  bug mentioned in the dev log stays fixed.
- Frontend (`apps/web`) only ever reads `import.meta.env.VITE_API_URL` —
  grepped the entire `apps/web/src` tree for `import.meta.env`, one call
  site, no secrets exposed client-side.
- `auth.service.ts`'s password-reset flow: verified by reading the code
  path — in production it logs server-side and returns `{}` to the
  client (never leaks the token), and always returns `{}` for
  non-existent emails too (no user-enumeration via response shape). The
  known TODO (no email provider) is real but not a security hole as
  currently written.

## Phase 4 — Build validation (done)

Ran all four gates from a clean state:

```
npm run typecheck   → 10/10 workspaces clean, zero errors
npm run lint         → api/web/worker, 0 warnings (--max-warnings=0)
npm run test          → 183/183 tests passing (see below — first time
                         ever run against a real live MongoDB, not just
                         asserted)
npm run build         → all packages + all 3 apps build clean
```

Test breakdown (matches README's claimed table exactly, now genuinely
verified against live data instead of the original no-Mongo sandbox):
api 64, web 6, worker 2, ai 14, domain 57, jobs 10, shared 19, storage 11
= **183/183**.

`apps/web`'s production build emits a single 453 KB JS chunk (130 KB
gzip) — no route-based code splitting. Not a bug, flagged for the
performance phase (23).

## Phase 5 — Database validation (done)

**Environment note:** this machine has a local `mongod` binary
(v8.3.4) but no Docker engine available (see Phase 6 note) — so this was
verified against a real native MongoDB instance, not a container, which
is an equally valid live-Mongo test of the app's actual Mongoose models
and queries.

Verified the full documented cycle: **fresh (freshly-initialized,
zero-collection) MongoDB → seed script → app boots → data loads**:

1. Confirmed a brand-new `mongod --dbpath <empty dir>` had zero documents
   in every collection except `skills` (40 docs) — which is itself
   correct, expected app behavior: both `api` and `worker` idempotently
   seed the canonical skill dictionary on startup (per Phase 5.5's
   documented design), not test pollution.
2. Ran `npm run seed -w @job-copilot/api` against that fresh DB:
   `fetched=20 created=20 updated=0 duplicates=0 failed=0`, demo user
   genuinely created (not "already exists"). Confirms the ingestion
   pipeline creates real records with zero false-positive dedup on a
   clean run.
3. Re-ran the seed script a second time: `created=0 updated=20`, "user
   already exists, reusing" — confirms the README's idempotency claim is
   literally true, not just asserted.
4. Verified indexes exist **and are correctly marked `unique`** at the
   MongoDB level (not just enforced in application code) for every
   constraint the architecture depends on: `users.email`,
   `joblistings.{sourceId,sourceJobId}` (the hard-dedup guarantee),
   `savedjobs.{userId,jobId}`, `jobmatches.{userId,jobId}`,
   `jobsources.name`. A text index exists on `jobs` for search
   (`title`+`company`+`description`).

No issues found in this phase.

## Phase 6 — Redis & worker (core verified; Docker Compose itself unverified)

**Environment blocker, resolved with user input:** Docker Desktop on this
machine requires WSL2, which is not installed. Installing WSL2 requires
admin rights and a reboot — asked the user how to proceed; they chose to
skip Docker entirely for now and verify Redis/BullMQ live via a
Windows-native Redis-compatible server instead, explicitly accepting that
**Docker Compose / the actual `Dockerfile`s themselves remain unverified
in this environment**. That is logged here as an open item, not silently
skipped — see the release checklist.

Installed a portable, installer-free `redis-server.exe` (tporadowski
build, Redis 5.0.14.1 — a winget-installed alternative, Memurai
Developer, failed with an unrelated MSI installer error 1603 and wasn't
worth debugging for a fallback path). BullMQ logs a soft warning
recommending Redis ≥6.2.0 but every operation tested worked correctly on
5.0.14.1.

Verified live, for real:

- `GET /health/ready` → `{"mongo":"ok","redis":"ok"}` — both real
  connections, not mocked.
- `POST /health/ping-worker` → enqueues a real BullMQ job → worker
  picked it up, processed it, wrote a `SystemHealthCheck` document to
  Mongo → `GET /health/ping-worker/:id` confirmed receipt. Full
  **API → Redis → BullMQ → Worker → Mongo** chain, live, ~20ms round
  trip. This is the exact end-to-end check the dev log said was never
  done in the original build sandbox.
- Worker boot log confirms three real repeatable BullMQ schedules
  registered on startup: job ingestion (hourly), alerts check (hourly),
  daily brief (daily) — matches Phase 5/12's documented design.

**Not yet done in this phase:** submitting a real *business* queue job
(e.g. actually triggering job ingestion via
`POST /jobs/admin/ingest`, or a real resume upload exercising the
resume-parse queue) rather than just the infrastructure health-ping.
Queued for the API testing phase below, since those are real endpoints
being tested anyway.

**Session hygiene note (not a product bug):** earlier work in this same
conversation (from before a context summarization) had left multiple
duplicate `dev:api`/`dev:worker`/`dev:web` Node processes running in the
background, plus a stale MongoDB data directory with several days' worth
of leftover test/dev data. This initially produced a false alarm — a
seed run against what looked like a "fresh" DB reported existing data.
Traced it to process/data leftovers, not an application defect; cleaned
up all stray processes and re-verified Phase 5 against a provably empty
database (see above) before trusting any result. Mentioned here in the
interest of the "never guess, always verify" rule this audit holds the
app to.

---

## Phase 7–8 — API audit & testing (done)

Full inventory (62 endpoints across 13 modules) read directly from route
source, then tested live with real HTTP requests against the running dev
API — not mocked, not inferred from reading the code. See
[api-audit.md](api-audit.md) for the complete endpoint-by-endpoint table.
Summary: **60/62 verified working live**, 2 blocked purely by the absence
of a real `ANTHROPIC_API_KEY` (both require an AI-created resource as a
precondition — their "not configured" degrade path IS verified).

Highlights beyond basic 200/401/404 checks:
- Full auth lifecycle: register → login → refresh (rotates token) →
  logout (revokes) → refresh-after-logout correctly 401s.
- Full password-reset lifecycle: forgot-password → reset with token →
  login with new password works → login with old password 401s → reusing
  the same reset token a second time correctly 400s (single-use enforced).
- Signed resume-download URLs: valid token streams the file with no
  session required (by design); a tampered token correctly 401s.
- IDOR: a second registered user gets a flat 404 (never 200, never 500)
  trying to read or delete the first user's applications/resumes.
- Admin routes: verified both the 403 (normal user) and the real success
  path (promoted a user to `role: "admin"` directly in Mongo, then hit
  `POST /jobs/admin/ingest` → 202, confirmed a real ingestion run
  recorded) — not just the rejection path.
- Rate limiting: the 20-requests/15-minute auth limiter genuinely trips
  (confirmed at attempt 18, consistent with prior auth calls from the
  same test run sharing the window).
- AI "explains, never determines" claim verified, not just read: with no
  API key configured, `POST /ai/analyze-job-description` still returns a
  real deterministic match score (`aiAvailable: false`, `aiCommentary:
  null`) rather than failing — exactly as documented.
- Resume parser failure handling verified end-to-end: a file with a valid
  `application/pdf` MIME type but corrupt content uploads successfully
  (parsing is async), and the worker's real BullMQ job then fails
  gracefully — `textExtractionStatus: "failed"` with a genuine
  `parseError` message, not stuck pending, not an unhandled crash.

**One bug found and fixed in this phase:** oversized/malformed file
uploads crashed to a raw 500 instead of a clean 400 (Multer's own error
class wasn't recognized by the global error handler). Fixed in
`apps/api/src/lib/errors.ts`, re-verified live. Full
reproduction/root-cause/fix/verification in
[bug-report.md #0](bug-report.md).

## Phase 9 — Frontend/backend integration (done)

Read every `apps/web/src/features/*/*.api.ts` file (12 files, all
`apiClient` call sites) and cross-referenced against the live-verified
62-endpoint backend inventory. The frontend uses a single centralized
`apiClient` (`apps/web/src/lib/api-client.ts`) rather than ad-hoc
`fetch()` calls scattered through components — every request goes
through one function that attaches the in-memory access token, retries
once on a 401 via silent refresh (with a correct `isRetry` guard against
infinite loops), and unwraps the shared `ApiResponse<T>` envelope from
`@job-copilot/shared`. Genuinely good architecture: one place to get
auth/error handling right instead of 50.

**Access token storage:** confirmed by reading the code — kept in a
module-level JS variable, never `localStorage`/`sessionStorage`/a
persisted store. Only the refresh token touches persistent storage, and
only as an `HttpOnly` cookie the JS layer can't read. This is the correct
mitigation against XSS-based token theft.

**Finding:** 3 of 62 backend endpoints have no frontend consumer at all
(`POST /auth/change-password`, `PATCH /resumes/:id/corrections`,
`GET /jobs/hidden`) — see [bug-report.md #3](bug-report.md). Most
notable: hiding a job works from the UI but there's no way to see or
undo it afterward.

No mismatches found in the other direction (frontend calling a path/verb
that doesn't exist on the backend) — every one of the ~50 frontend call
sites matches a real, live-verified route exactly.

## Phase 10 — Authentication (done)

Beyond the endpoint-level checks in Phase 7-8 (register → login →
refresh → logout → refresh-after-logout 401s; password reset lifecycle;
IDOR isolation), specifically verified the session/cookie mechanics:

- Real `Set-Cookie` header on a live login: `HttpOnly; SameSite=Lax;
  Path=/auth` (no `Secure` in this http://localhost dev environment,
  which is correct — `COOKIE_SECURE=false` here, and Phase 3 already
  confirmed the app refuses to boot in `NODE_ENV=production` without
  `COOKIE_SECURE=true`).
- `requireAuth` (`apps/api/src/middleware/require-auth.ts`) reads
  **only** the `Authorization: Bearer` header — never a cookie. Combined
  with the refresh cookie being `Path=/auth`-scoped and `SameSite=Lax`
  (which blocks cross-site non-GET requests from attaching the cookie at
  all), this means every state-changing business route is structurally
  immune to CSRF without needing a separate CSRF token: a forged
  cross-site request can't produce a valid `Authorization` header, and
  can't even get the refresh cookie attached to reach `/auth/refresh`.
  This is correct, deliberate design, confirmed by reading the code that
  enforces it — not just asserted.
- Refresh-token rotation confirmed live: each `/auth/refresh` call
  returns a new token and the old session record gets
  `revokedAt`/`replacedBySessionId` set (observed directly in the
  `sessions` collection during Phase 5/6 DB inspection).

Not exercised: real multi-tab/multi-device session behavior in an actual
browser (would need Playwright — queued for Phase 24), and the
`COOKIE_SECURE=true` production boot path against a real HTTPS origin
(would need a real TLS-terminated deployment to test end-to-end; the
fail-fast guard itself was verified by reading the code in Phase 3).

## Phase 22 — Security (done)

Read the actual implementation (not just trusted the README's claims)
for every OWASP-adjacent category in scope:

- **Authentication/authorization:** `requireAuth` reads only the Bearer
  header (never a cookie) — verified this makes business routes
  structurally CSRF-immune (Phase 10). `requireAdmin` does a fresh DB
  role lookup per request, not a JWT claim (can't be forged by an old
  token surviving a demotion). Verified live: 403 for non-admin, 202 for
  a real promoted admin.
- **IDOR:** verified live in Phase 7-8 — a second user gets 404 (never
  200/500) on another user's applications/resumes.
- **Injection:** grepped the entire `apps/api/src` tree for `eval(`,
  `new Function`, `child_process`, `exec(` — zero matches. Mongo
  `$where` (a real NoSQL-injection vector) — zero matches. Every
  POST/PATCH route validates its body with Zod
  (`validateBody`/`safeParse`) before it reaches a query — 30
  occurrences across 8 modules — so a non-string `email`/`id` etc.
  can't reach a Mongoose filter unvalidated.
- **XSS:** grepped `apps/web/src` for `dangerouslySetInnerHTML` and raw
  `innerHTML` — zero matches. React's default JSX escaping is never
  bypassed anywhere in this codebase.
- **Path traversal:** `LocalStorageProvider.resolvePath()` normalizes
  and strips leading `../` sequences before joining to the base
  directory — traced the logic by hand against nested traversal
  attempts (`foo/../../etc/passwd`, `../../../../etc/passwd`) and
  confirmed neither escapes the base dir. Defense-in-depth only, since
  storage keys are always server-generated (UUIDs), never user input.
- **Signed URLs:** HMAC-SHA256, and the signature comparison uses
  `timingSafeEqual` (not `===`) — prevents a timing side-channel on
  signature verification. Verified live: a tampered token 401s.
- **SSRF:** grepped `packages/ai` and `packages/jobs` for outbound
  `fetch`/`http`/`https` calls — the Anthropic API target is a hardcoded
  constant (`https://api.anthropic.com/v1/messages`), never
  user-influenced. The job provider is fully synthetic (hardcoded demo
  data, `demo-jobs.example.com` placeholder URLs) — no live outbound
  fetch to any user- or job-board-controlled URL exists in this
  codebase at all, confirming the README's "one demo provider, no live
  integration" claim directly rather than trusting it.
- **Rate limiting:** verified live — 20 req/15min on
  register/login/forgot-password genuinely trips (confirmed twice,
  including once by accident when it blocked my own Playwright run).
- **Secrets in logs:** `pino` config explicitly redacts
  `req.headers.authorization` and `req.headers.cookie` — verified live
  in actual log output (`"authorization":"[Redacted]"`). Request bodies
  (which would include passwords) are never logged at all —
  `pino-http`'s default request serializer doesn't include the body,
  and nothing in this codebase adds a custom serializer that would.
- **Security headers:** `helmet()` is mounted first in the middleware
  chain — confirmed live via curl: CSP, `X-Content-Type-Options`,
  `X-Frame-Options`, HSTS, etc. all present on every response.
- **CORS:** single configured origin (`env.CORS_ORIGIN`) with
  `credentials: true` — not a wildcard.

No security findings in this phase beyond the dark-mode/UI items already
logged. This is a genuinely careful implementation — every category
checked had a real, intentional mitigation in place, not an accidental
gap that happened not to matter yet.

## Phase 23 — Performance (done)

- **Sequential match-computation loops:** found and fixed — see
  [bug-report.md #6](bug-report.md). Includes an honest correction of my
  own first (invalid, single-sample) benchmark comparison.
- **Web bundle size:** noted in Phase 4 — single 453KB/130KB-gzip chunk,
  no route-based code splitting. Not fixed (would need `React.lazy` +
  route-level `Suspense` boundaries across ~25 route components — a
  real but larger change, not a one-line fix). Flagged for a future pass.
- **N+1 query patterns elsewhere:** spot-checked `jobs.service.ts`
  (search, recommendations) and `applications` — both batch their
  per-item enrichment with `Promise.all` already (confirmed by reading,
  e.g. `jobs.service.ts:96` `Promise.all(docs.map(...))`). No further
  sequential-loop patterns found outside the two already fixed.
- **Duplicate AI calls:** not applicable to verify live (no AI key in
  this environment), but read `jd-analyzer.service.ts`/
  `cover-letter.service.ts` — both call the LLM provider exactly once
  per request, no retry loops beyond the documented single repair-retry
  in `AnthropicProvider` itself (tested with a fake fetch in the `ai`
  package's own unit tests).

## Phase 24 — Playwright E2E (done)

Playwright wasn't previously set up — installed fresh
(`@playwright/test` + Chromium) and wrote 23 tests across 4 spec files:
`auth.spec.ts` (redirect-when-logged-out, login/logout/refresh lifecycle,
wrong-password handling, register→onboarding), `dark-mode.spec.ts`
(toggle + persistence + no-flash + light/dark screenshots of 3 key
pages), `journey.spec.ts` (every sidebar page loads with zero console
errors, job search→detail→save→saved-list, applications, dashboard,
skills, resume upload, AI graceful-degradation), `responsive.spec.ts`
(375/768/1024/1440px, no horizontal overflow, mobile nav check).

**All 23 passing** after fixing (a) three test-authoring bugs (an
ambiguous selector that matched the sidebar instead of a job card, a
missing required-field fill, a filename collision against the shared
persistent demo account across repeated runs — none were product bugs),
and (b) a real architectural mismatch between Playwright's
storageState-reuse pattern and this app's (correct, intentional)
rotating-refresh-token design — switched to one shared page per spec
file via `test.describe.serial` instead, which is also gentler on the
auth rate limiter. Two genuine one-off browser-process flakes
("spawn UNKNOWN", "Target page... has been closed") occurred across
~6 full runs in this Windows environment — both non-reproducing on
retry, treated as environment flakiness rather than product or test
defects.

**Self-caught config issue:** adding Playwright initially made
`npm run test` (Vitest) pick up the new `apps/web/e2e/*.spec.ts` files
too, since they match Vitest's default `*.spec.ts` glob — they use a
different test API (`@playwright/test`) and failed immediately when
Vitest tried to run them. Caught during this audit's own final full
validation pass (the same "always re-verify" discipline applied to the
app applies to work added during the audit itself). Fixed with an
`exclude: ["**/e2e/**"]` in `apps/web/vitest.config.ts`; re-ran
`npm run test` clean at 183/183 afterward.

Visually confirmed the dark-mode primary-button fix (bug-report.md #4)
by inspecting the actual rendered screenshots: buttons now render as a
solid, clearly-readable indigo with white text in dark mode. Also
visually confirmed finding #5 (muted text) is real but not severe —
labels like "Jobs discovered"/"Saved"/timestamps are legible in the
screenshots, just visibly dimmer than the surrounding white/bright text,
consistent with the 3.91:1-not-4.5:1 math rather than a catastrophic
failure.

## Phase 20 — Responsive (done — 1 high-severity finding)

Tested 375/768/1024/1440px via the Playwright responsive suite. No
horizontal overflow at any breakpoint (`document.documentElement.scrollWidth
<= clientWidth`, asserted programmatically, not eyeballed). But looking
at the actual mobile screenshot (not just the overflow check) surfaced a
much more significant issue: **there is no navigation UI of any kind
below the 768px `md` breakpoint** — the sidebar (the app's only nav
surface, all 12 primary sections) is simply `hidden` with nothing to
replace it. See [bug-report.md #7](bug-report.md) for the full
reproduction and impact — this is the kind of gap that a pure
"does it overflow" check misses entirely, which is exactly why this
audit looked at the rendered screenshots rather than trusting the
overflow assertion alone.

## Phase 21 — Accessibility (spot-checked, not exhaustive)

No dedicated axe-core scan was run (would need adding `@axe-core/playwright`
— not currently a dependency). Spot-checked via code reading + the
Playwright runs' semantic-tree snapshots (Playwright's `page snapshot`
output, an accessibility-tree dump, appeared automatically in every test
failure's error-context — useful signal even without a dedicated a11y
test):

- Every form input uses a real `<label htmlFor>` (`FormField.tsx`) with
  `aria-invalid` and `aria-describedby` wired to the error message —
  confirmed by reading the component, and confirmed it actually works
  by using `page.getByLabel(...)` successfully throughout the Playwright
  suite (that locator strategy only works with real label association).
- Icon-only buttons (theme toggle, logout, notification bell) all have
  explicit `aria-label`s — confirmed by reading `Topbar.tsx`/
  `ThemeToggle.tsx`, and confirmed live by successfully targeting them
  with `getByRole('button', { name: ... })` in tests.
  ▸ formatting.
- Landmark structure: `<nav>` (sidebar) and `<main>` (page content) are
  real semantic elements, not divs — confirmed by reading
  `AppLayout.tsx`, and this was load-bearing for the Playwright job-card
  test (`main a[href^='/jobs/']` had to specifically exclude the `<nav>`
  sidebar's own `/jobs/*` links).
- Keyboard: not exhaustively tested (no dedicated tab-order test
  written), but every interactive element observed throughout this audit
  was a real `<button>`/`<a>`/`<input>` — never a `<div onClick>` — which
  is the single biggest keyboard-accessibility risk in a React app, and
  it doesn't appear here.
- Contrast: covered thoroughly under dark mode (Phase 11) — the one
  genuinely broken case (primary buttons) is fixed; the one
  under-threshold-but-legible case (muted text) is documented, not
  fixed.

**Recommend as a follow-up, not done here:** add
`@axe-core/playwright` and run it against each page for a systematic
automated scan (ARIA misuse, missing alt text, heading order) — the
spot-check above covers the highest-risk categories but isn't
exhaustive.

---

*(Subsequent phases append below as they complete, each with: what was
tested, exact commands run, results, and links to bug-report.md entries
for anything found.)*
