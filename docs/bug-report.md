# Bug Report — Job Copilot Phase 14 Audit

Every issue found during the production audit, in the format required by
the audit process: **Reproduction → Root cause → Fix → Verification**.
Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low · ⚪ Info/Doc.

Issues are numbered sequentially as discovered (not by phase) so links
from other docs stay stable.

| # | Severity | Area | Title | Status |
|---|---|---|---|---|
| 0 | 🟠 High | API / resume upload | Oversized/malformed file upload crashed to a raw 500 instead of a clean 400 | ✅ Fixed & verified |
| 1 | 🟡 Medium | Dependencies | react-router 6.30.4 has open moderate advisories, fix needs a v7 major bump | Documented, not fixed (needs migration + retest) |
| 2 | 🔵 Low | Dependencies | esbuild/vite/vitest dev-tooling chain has 1 critical + 2 moderate advisories (dev-server only) | Documented, not fixed (needs vite@8/vitest@4 bump) |
| 3 | 🟡 Medium | Frontend/backend gap | Three working backend features have no frontend UI at all | Documented, not fixed (product decision needed) |
| 4 | 🟠 High | Dark mode | Primary buttons (`bg-primary text-white`) fail WCAG AA contrast in dark mode | ✅ Fixed & verified (typecheck/lint clean; visual re-check pending Playwright) |
| 5 | 🟡 Medium | Dark mode | Muted/secondary text (`text-slate-500/600/400`, unprefixed) fails WCAG AA in dark mode in ~32 files | Confirmed via contrast math; scoping fix pending visual verification |
| 6 | 🔵 Low | Performance | Dashboard/skill-gap match loops ran sequentially instead of parallel | ✅ Fixed & verified (honest perf note below — see caveat) |
| 7 | 🟠 High | Responsive/Mobile | No navigation exists on mobile viewports at all | Documented, not fixed (needs a real mobile-nav component) |

## #3 — Three backend features are unreachable through the UI

**Reproduction:** Grepped `apps/web/src` for any call to
`PATCH /resumes/:id/corrections`, `POST /auth/change-password`, or
`GET /jobs/hidden` / any "hidden jobs" UI — zero matches for all three,
confirmed against the full list of `apiClient.*` call sites across every
`*.api.ts` file (12 files, ~50 call sites catalogued in
[api-audit.md](api-audit.md)). All three backend endpoints work
correctly when called directly (verified live in Phase 7-8) — this is a
frontend gap, not a backend bug.

**Root cause / impact, per feature:**
- **`POST /auth/change-password`** — the backend fully supports it
  (verified live), but there is no account-settings page exposing it.
  A logged-in user who wants to change their password has no in-app path
  to do so; their only route is logout → "forgot password" → email/dev
  token → reset. Functional workaround exists, but it's not what a user
  looking for "change password" while logged in would expect to find.
- **`PATCH /resumes/:id/corrections`** — the backend supports
  user-corrected resume-extraction data (the master audit brief's Phase
  15 explicitly expects a "user correction" flow to exist and be
  testable), but no resume-review UI calls it. Once AI-based structured
  extraction is wired up (Phase 8+, currently `not_started` by design —
  see README), users will have no way to correct AI-extracted fields.
- **`GET /jobs/hidden`** — `POST /jobs/:id/hide` **is** wired up and
  works (a job card action), but nothing in the UI ever calls
  `GET /jobs/hidden` or exposes an "unhide" action. Traced the backend:
  `DELETE /jobs/:id/save` (`clearSavedStatus`) deletes the `SavedJob`
  record regardless of whether its status is `"saved"` or `"hidden"`, so
  un-hiding is technically possible through the existing endpoint — but
  with no hidden-jobs list in the UI, a user who hides a job by mistake
  has **no discoverable way to undo it**. This is the most user-facing
  of the three: a real UX trap, not just a missing nice-to-have.

**Fix:** Not applied — this is a product/scope decision (build the
missing UI vs. explicitly deferring it), not a one-line code fix. Flagged
here rather than silently building UI the project owner may not want
scoped into this pass.

**Verification:** N/A until a fix is chosen. If addressed, verify by
adding each interaction (settings-page password change, hidden-jobs list
with an unhide button, a resume-correction form) to the Playwright E2E
suite being built in Phase 24.

## #4 — Dark mode: primary buttons fail WCAG AA text contrast

**This is the root cause of the "known dark mode bug" flagged for this
audit.** Not a vague "dark mode looks off" — a specific, measured,
reproducible contrast failure on the app's most important interactive
elements.

**Reproduction:** Every primary call-to-action button in the app (Login,
Register, Reset/Forgot Password, Onboarding Next/Finish, Profile Save,
Apply on a job, Create Alert, Analyze JD, Start Interview/Mock,
Generate Cover Letter, System Health ping — 18 call sites across 14
files) uses the literal class combination `bg-primary text-white`.

**Root cause:** `apps/web/src/styles/index.css` defines `--color-primary`
as `79 70 229` (a saturated indigo) in `:root` but `129 140 248` (a
lighter, more pastel indigo) under `.dark`. The lighter value was chosen
deliberately so `text-primary` (used for links/icons directly on the
dark page background) stays legible — verified that gives 6.23:1 against
the dark surface, a good ratio. But the *same* variable also drives every
solid-fill button background, and white text on that lighter dark-mode
shade computes to **2.98:1** — below WCAG AA's 4.5:1 minimum for normal
text (most of these buttons use `text-sm`/`text-xs`, not "large text",
so the 3:1 large-text exception doesn't apply either). Light mode's
6.29:1 was never at risk — this is a dark-mode-only regression baked
into the theming design, not a typo.

Computed with the standard WCAG relative-luminance formula (not
estimated):
```
Light mode: bg-primary(79,70,229) + text-white  = 6.29:1  (passes AA)
Dark mode:  bg-primary(129,140,248) + text-white = 2.98:1  (fails AA)
```

**Fix:** Added a second CSS variable, `--color-primary-solid`, fixed at
`79 70 229` in **both** themes (a saturated accent color reads fine as a
button fill against a dark page background — it doesn't need to lighten
just because its surroundings did; only the *text-on-primary-background*
combination needed protecting). Exposed it in `tailwind.config.js` as
`primary-solid` alongside the existing `primary` token, then replaced
the literal `bg-primary text-white` → `bg-primary-solid text-white`
at all 18 call sites (verified via grep before and after — 0 remaining
raw occurrences, exactly 18 new ones). `text-primary`, `border-primary`,
`bg-primary/NN` (tinted badges/icons) were deliberately left untouched
since those already pass contrast in both themes — confirmed separately
(badges pair `text-primary` with a *tint* of primary, not a solid fill,
so the relevant contrast is against the near-white/near-black tinted
background, not against primary itself).

**Verification:** `npm run typecheck -w @job-copilot/web` and
`npm run lint -w @job-copilot/web` both clean after the change. Visual
re-verification (real rendered screenshot in dark mode) queued for the
Playwright phase — the math is correct but confirming it renders as
expected in an actual browser is the final check.

## #5 — Dark mode: muted/secondary text also under-contrasts (broader, lower severity)

**Reproduction:** `text-slate-500`/`text-slate-600`/`text-slate-400`
appear **unprefixed** (no accompanying `dark:text-slate-*` override) 157
times across 32 files — used for secondary text, timestamps, empty
states, back-links, and icons. Confirmed via grep that the codebase
*does* know the correct pattern (`dark:text-slate-*` appears correctly
paired 14 times in 10 other files) — this isn't a design gap, it's
inconsistent application of an existing pattern.

**Root cause / measured impact per shade** (WCAG relative luminance,
against this app's actual surface colors — `rgb(255,255,255)` light,
`rgb(17,19,23)` dark):

| Class (unprefixed) | On light surface | On dark surface |
|---|---|---|
| `text-slate-400` | 2.56:1 — **fails**, badly | 7.25:1 — passes |
| `text-slate-500` | 4.76:1 — passes (barely) | 3.91:1 — **fails** |
| `text-slate-600` | 7.58:1 — passes well | 2.45:1 — **fails**, badly |

So depending on which shade a given unprefixed usage picked, it either
under-contrasts in dark mode (the `500`/`600` cases — the large
majority) or, in at least one confirmed spot
(`DashboardPage.tsx:103`), under-contrasts in **light** mode instead
(`text-slate-400` alone, no dark: pairing, badly fails at 2.56:1 against
white).

**Fix:** Not applied in this pass. Unlike #4 (one literal class combo, 18
mechanically-identical call sites), this spans 3 different shades used
for different visual-hierarchy purposes across 32 files — a blind
find/replace risks flattening intentional hierarchy or double-applying
`dark:` overrides where they're already correct. Recommend a scoped
follow-up: standardize on `text-slate-500 dark:text-slate-400` for
standard secondary text and `text-slate-600 dark:text-slate-400` for
slightly more prominent secondary text, file-by-file, verified visually
per page rather than mechanically.

**Verification:** N/A — not fixed. The contrast math above is itself the
verification that this is real, not a guess; a visual pass (Playwright
screenshots, Phase 24) can help prioritize which of the 32 files are
worst in practice before committing to the full fix.

## #6 — Dashboard / skill-gap match loops ran sequentially, not in parallel

**Reproduction:** `dashboard.service.ts`'s `computeJobMatchStats` and
`skills.service.ts`'s `getSkillGapAnalysis` both looped over up to 200
candidate jobs with `for (const job of jobs) { await
computeOrCacheMatch(...) }` — one sequential round trip at a time.
`jobs.service.ts`'s `getRecommendedJobs`, doing the *identical*
compute-or-cache call over the *identical* candidate-job list, already
used `Promise.all` — confirmed by reading it side-by-side, so this was
an inconsistency within the same codebase, not a uniform design choice.

**Root cause:** Plain oversight — two of three call sites of the same
pattern never got the parallelized treatment the third one has.

**Fix:** Changed both loops to `Promise.all` (matching
`jobs.service.ts`'s existing pattern exactly, including its
unlimited/uncapped concurrency — consistent with established convention
in this codebase, not a new risk profile). `npm run typecheck`,
`npm run lint`, and the full `api` test suite (64/64) all stayed clean.

**Verification — and an honest correction of my own first measurement:**
My first pass measured a single before/after data point (481ms
sequential → 668ms parallel) and initially over-read that as a
regression. That comparison wasn't valid — different runs, different
freshly-registered users, JIT/connection-pool warmup noise. Re-measured
properly with 5 repeated trials of the fixed version:
`410, 394, 313, 309, 307ms` — trending down to a ~310ms steady state
(warmup effects in the first two trials), against a single unrepeated
481ms sequential baseline. **Honest conclusion:** on this machine —
localhost MongoDB, sub-millisecond network latency — the sequential vs.
parallel difference is not dramatically visible in black-box timing,
because round-trip latency (the thing parallelizing actually saves)
is nearly zero locally. The change is still correct to make: it's the
right pattern for independent I/O-bound operations, it will matter more
under real network latency to a remote/managed database (which this
environment can't simulate), and it brings all three call sites of this
exact pattern into consistency. Flagging the self-correction here
because overclaiming a benchmark result would violate this audit's own
"never guess, verify" standard.

## #0 — Multer upload errors (oversized file) crashed to a 500 instead of a clean 400

**Reproduction:** `POST /resumes` with a valid Bearer session, multipart
file field named `file`, where the file is 11MB (the app's own documented
limit is 10MB, `MAX_RESUME_SIZE_BYTES` in `packages/shared/src/resume.ts`).
Verified live against the running dev API:

```
$ curl -F "file=@huge.pdf" -H "Authorization: Bearer <token>" http://localhost:4000/resumes
-> 500 {"success":false,"error":{"code":"INTERNAL_ERROR","message":"Unexpected error"}}
```

**Root cause:** `apps/api/src/modules/resume/resume.routes.ts` configures
`multer({ storage: multer.memoryStorage(), limits: { fileSize:
MAX_RESUME_SIZE_BYTES } })`. When the limit is exceeded, multer throws a
`MulterError` (`code: "LIMIT_FILE_SIZE"`) *inside* its own middleware,
before the route handler / `asyncHandler` wrapper ever runs. The global
`errorHandler` in `apps/api/src/lib/errors.ts` only special-cased `err
instanceof ApiError` — anything else (including `MulterError`) fell
through to `ApiError.internal("Unexpected error")`, a bare 500 with a
generic message and, in production, `details` stripped — the user sees
nothing actionable, and it reads as a server fault rather than "your file
is too big." Confirmed via the api dev server's own log: `"name":
"MulterError", "code": "LIMIT_FILE_SIZE"` reaching the generic handler.

**Fix:** Added a `multerErrorToApiError()` translator in
`apps/api/src/lib/errors.ts` that recognizes `MulterError` by name (no
hard dependency on the `multer` package from the shared error-handling
module) and maps `LIMIT_FILE_SIZE` → a clean `400 BAD_REQUEST` ("File is
too large."), with other multer error codes also mapped to 400 with
their own message rather than any of them reaching the generic 500 path.
Also tightened the error-level logging so translated client errors log
at the appropriate level instead of being logged as "Unhandled error."

**Verification:** Re-ran the same 11MB upload after the fix (server
hot-reloaded via `tsx watch`):

```
11MB upload -> 400 {"code":"BAD_REQUEST","message":"File is too large."}
```

Also exercised the adjacent resume-upload edge cases while in this area,
all correct:
- Wrong MIME type (`text/plain`) → `400 "Only PDF and DOCX files are
  supported."` (existing validation in `resume.service.ts`, unaffected —
  confirmed still working).
- A file with a valid `application/pdf` MIME type but corrupted/garbage
  content → upload itself still succeeds (`201`, `textExtractionStatus:
  "pending"`), since content parsing happens asynchronously in the
  worker. Confirmed the worker's real BullMQ resume-parse job then fails
  **gracefully**: caught the `pdf-parse` exception, logged it with the
  resume ID, and persisted `textExtractionStatus: "failed"` with a real
  `parseError` message ("Invalid PDF structure" / "bad XRef entry") on
  the resume document — not stuck at "pending" forever, not an unhandled
  worker crash, not a fake success. This is exactly the graceful-failure
  behavior the resume system is supposed to have.

## #1 — react-router moderate advisories, can't resolve within current semver range

**Reproduction:** `npm audit` in a clean install reports
`react-router`/`react-router-dom` 6.30.4 vulnerable
(GHSA-wrjc-x8rr-h8h6 open-redirect via backslash in `<Link>`/`useNavigate`;
GHSA-337j-9hxr-rhxg arbitrary constructor injection via SSR hydration
error deserialization — the latter doesn't apply here since this app has
no SSR, but the package-level advisory still flags). `npm audit fix`
(non-force) claims a fix is available but doesn't move the installed
version.

**Root cause:** `apps/web/package.json` pins `"react-router-dom": "^6.26.1"`.
The fixed version is 7.18.0+ (confirmed via `npm view react-router
versions`) — outside that semver range, since it's a major version bump.
npm will never resolve a `^6.x` range to a `7.x` version.

**Fix:** Requires deliberately upgrading to React Router v7 (API changes:
data router patterns, some hook signatures) and re-testing every route
component and the 5 web route-guard tests. Not done in this pass — a
real migration, not a dependency bump, and risks regressing routing
behavior without dedicated test coverage for the migration itself.
Recommend scheduling as its own task.

**Verification:** N/A — not fixed yet. Re-run `npm audit` after migration
to confirm both advisories clear.

## #2 — Dev-tooling chain (esbuild/vite/vitest) has 1 critical + 2 moderate advisories

**Reproduction:** `npm audit` reports `vitest` as critical (transitively
via `@vitest/mocker`/`vite-node`/`vite`/`esbuild`'s dev-server
request-forwarding advisory, GHSA-67mh-4wv8-2f99 — "esbuild enables any
website to send any requests to the development server and read the
response").

**Root cause:** `apps/web` depends on `vite@^5`, which pulls a
pre-fix `esbuild`. The advisory only affects the **dev server** (an
attacker-controlled webpage making requests to a developer's locally
running `vite dev`/`vitest` process) — it does not affect the production
build output or the deployed app. Real-world exposure is limited to
local development.

**Fix:** `npm audit fix --force` would install `vite@8.2.0`/`vitest@4.1.10`
— both semver-major bumps with their own breaking-change surface
(Vite 5→8 config/plugin API changes). Not applied in this pass to avoid
destabilizing the build without dedicated regression testing of the Vite
config, Tailwind/PostCSS pipeline, and the Vitest config across every
workspace.

**Verification:** N/A — not fixed yet. Re-run `npm audit` after the
major-version bump and full `npm run build && npm run test` to confirm.

## #7 — No navigation exists on mobile viewports at all

**Reproduction:** Set viewport to 375×812 (iPhone-class width), log in,
land on `/dashboard`. Screenshot
(`apps/web/e2e/screenshots/dashboard-mobile.png`, captured by the
Playwright responsive suite) shows: no sidebar, no hamburger/menu icon,
no bottom tab bar — nothing. The topbar has only a (visually overflowing)
search box, notification bell, theme toggle, avatar, and logout button.

**Root cause:** `Sidebar.tsx` (`apps/web/src/components/Sidebar.tsx:64`)
is the *only* navigation surface in the entire app (Dashboard, Discover
Jobs, Recommended, Saved Jobs, Analyze a JD, Alerts, Resume, Skill
Analysis, Interview Prep, Tracker, Profile, Settings — all 12
destinations live only here), and its class list is `hidden md:flex` —
`display: none` below Tailwind's `md` breakpoint (768px), with **no
alternate mobile nav ever rendered**. Confirmed by reading
`AppLayout.tsx` and `Topbar.tsx` in full: neither contains a menu-toggle
`useState`, a hamburger icon import, a drawer/sheet component, or any
conditional mobile-nav markup at all. This isn't a bug in existing
mobile-nav code — there is no mobile-nav code.

**Impact:** A user on a phone can view whatever page they land on
(e.g., a shared job link, or the post-login dashboard) and follow
in-page links (job cards, "View all →", etc.), but has **no way to
navigate to any of the 12 primary sections of the app** — Jobs search,
Resume, Applications tracker, Skills, Interview prep, Alerts, Profile,
Settings are all completely unreachable on mobile once you're not
already on a page that happens to link to them. This is more severe than
a typical "responsive polish" gap — it's a full navigation dead-end,
found precisely because this audit's Playwright responsive tests
actually captured and looked at a real mobile screenshot rather than
only checking for horizontal-overflow absence (which this page correctly
passes — the layout doesn't overflow, it's just unusable).

**Fix:** Not applied — implementing a proper mobile nav (hamburger menu
+ slide-in drawer, or a bottom tab bar for the most-used sections) is a
real feature addition, not a one-line fix, and involves a UX decision
(which pattern, which items make the cut for a bottom bar vs. an
overflow menu) that should be the project owner's call, not something to
improvise silently under audit scope.

**Verification:** N/A — not fixed. Once a mobile nav exists, extend
`apps/web/e2e/responsive.spec.ts`'s existing (currently informational)
`mobile: sidebar is hidden by default` test into a real assertion that
every one of the 12 primary routes is reachable from a fresh mobile
session.
