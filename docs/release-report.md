# Job Copilot — Phase 14 Production Audit: Final Release Report

Date: 2026-08-05. Scope: the repository's own documented "Phase 14 —
Production Hardening" (see [`development-log.md`](development-log.md)).
Full working log with exact commands, live output, and reasoning lives in
[`qa-audit.md`](qa-audit.md); the complete endpoint inventory is in
[`api-audit.md`](api-audit.md); every issue found (with
reproduction → root cause → fix → verification) is in
[`bug-report.md`](bug-report.md); the itemized pass/fail gate is in
[`release-checklist.md`](release-checklist.md). This document is the
synthesis.

## 1. Executive Summary

Job Copilot's own development log was unusually candid about what it
hadn't verified: the entire 13-phase build ran in a sandbox with **no
Docker, no Mongo/Redis binaries, and no network access to
`api.anthropic.com`** — every live-dependent claim (183 passing tests,
real database behavior, real BullMQ processing, Docker Compose) was
asserted from unit-test logic alone, never actually exercised. This
audit's job was to close that gap on a machine that actually has the
infrastructure to do so, and to genuinely try to break the application
rather than confirm what it already claimed.

**The result: the engineering underneath is genuinely solid.** All 183
unit tests, once actually run against a live MongoDB for the first time
ever, passed without modification. Every one of 62 API endpoints was
hit with real HTTP requests (not mocked) — 60 passed outright, including
IDOR isolation, rate limiting, signed-URL tamper detection, and
refresh-token rotation, all confirmed live rather than trusted from
source. The security posture (injection, XSS, path traversal, SSRF,
secret redaction, CSRF-immune auth design) had a real, intentional
mitigation in every category checked — this audit found **zero new
security defects**, a genuinely uncommon outcome. The "AI explains,
never determines" design claim was verified, not assumed: with no API
key configured, the app returns real deterministic scores and a clean
`aiCommentary: null` rather than an error or fake output, exactly as
documented.

**What this audit actually found and fixed:** a file-upload crash (500
→ clean 400), a sequential-vs-parallel performance inefficiency in two
services, and — the headline item — the actual root cause of the
"known dark-mode bug" the audit brief flagged in advance: every primary
button in the app failed WCAG AA contrast in dark mode (2.98:1, needs
4.5:1), traced to a single CSS variable serving two incompatible
purposes. Fixed and visually confirmed via real rendered screenshots,
not just computed math.

**What this audit found and did *not* fix, by choice:** a real,
significant mobile-usability gap (no navigation exists at all below
768px — found by actually looking at a mobile screenshot, not just
checking for overflow), three backend features with no frontend UI, a
secondary and more diffuse dark-mode contrast issue across 32 files, and
two dependency-advisory chains that need major-version migrations. None
of these were papered over or silently skipped — each has a full
reproduction and a clear reason it wasn't blindly auto-fixed under audit
scope.

**What this audit could not verify in this environment:** live Docker
Compose / the actual `Dockerfile`s (this machine's Docker Desktop needs
WSL2, which isn't installed — installing it needs a reboot; the user
explicitly chose to substitute a native Redis binary and skip Docker
rather than reboot mid-session), a real live AI provider call (no
`ANTHROPIC_API_KEY` supplied), and a Lighthouse score (not run — see §11).

## 2. Build Status

| Gate | Result |
|---|---|
| `npm ci` (clean install) | ✅ Clean, lockfile consistent |
| `npm run typecheck` | ✅ 10/10 workspaces, 0 errors |
| `npm run lint` | ✅ 0 warnings (`--max-warnings=0`) |
| `npm run build` | ✅ All packages + all 3 apps |
| `npm audit` | ⚠️ 8 advisories (1 critical, 2 high, 5 moderate) at start; fixed the 1 high (`brace-expansion`) that had a non-breaking fix. Remaining 7 all need major-version bumps (react-router v7, vite v8/vitest v4) — documented, not blind-forced. |

Web production bundle: 453KB JS / 130KB gzip, single chunk (no
route-based code splitting) — noted, not fixed.

## 3. Test Results

**183/183 unit tests passing** — api 64, web 6, worker 2, ai 14, domain
57, jobs 10, shared 19, storage 11. The number matches the README's
existing claim exactly, but this is the **first time it's been verified
against a real, live MongoDB** rather than asserted from a sandbox with
none available.

## 4. API Results

**60/62 endpoints verified live** with real HTTP requests against a
running dev stack (two real registered users, one promoted to admin
directly in MongoDB). Full table in [`api-audit.md`](api-audit.md). The
2 unverified endpoints (`PATCH /ai/cover-letter/:id`,
`POST /interview/mock/:sessionId/answer`) both require an AI-created
resource as a precondition and can't be reached without a real
`ANTHROPIC_API_KEY` — their graceful "not configured" paths ARE verified.

Notable verified behaviors, not just status codes: refresh-token
rotation (confirmed at the database level — old sessions get
`revokedAt`/`replacedBySessionId`), single-use password-reset tokens,
IDOR returning a flat 404 (never 200/500) across users, the 20-req/15-min
auth rate limiter actually tripping, and a real admin promotion path
(not just the 403 rejection).

## 5. E2E Results

Playwright wasn't previously set up in this repo — installed fresh and
wrote 23 tests across 4 files (auth lifecycle, dark mode + visual
screenshots, full core journey, responsive breakpoints).
**23/23 passing** in the final run. Getting there required fixing 3
test-authoring bugs (none were product bugs — an ambiguous selector, a
missed required field, a filename collision against a shared persistent
test account) and one real architectural adjustment: this app's
(correct, intentional) rotating-refresh-token design is incompatible
with Playwright's standard storageState-reuse pattern, so the suite uses
one persistent page per file instead.

## 6. Bugs Found

8 issues logged (numbered 0–7 in [`bug-report.md`](bug-report.md), each
with full reproduction/root-cause detail):

| # | Severity | Title |
|---|---|---|
| 0 | 🟠 High | Oversized file upload crashed to 500 instead of 400 |
| 1 | 🟡 Medium | react-router advisories, needs v7 migration |
| 2 | 🔵 Low | vite/vitest/esbuild dev-tooling advisories |
| 3 | 🟡 Medium | 3 backend features with no frontend UI |
| 4 | 🟠 High | **Dark mode: primary buttons fail WCAG AA contrast** (the "known bug") |
| 5 | 🟡 Medium | Dark mode: muted text also under-contrasts (broader, lower severity) |
| 6 | 🔵 Low | Dashboard/skill-gap match loops ran sequentially, not parallel |
| 7 | 🟠 High | No mobile navigation exists below 768px |

## 7. Bugs Fixed

**3 of 8, all verified after fixing:**

- **#0** — added Multer-error translation to the global error handler;
  re-tested live, confirmed 400 with a clear message.
- **#4** — introduced a theme-invariant `primary-solid` color token for
  solid button fills (kept the light-mode indigo in both themes, since
  only the white-text-on-top combination needed protecting); replaced
  the literal class combo at all 18 call sites; `typecheck`/`lint`
  clean; **visually confirmed via real rendered screenshots** in both
  themes, not just the contrast math.
- **#6** — parallelized two sequential match-computation loops with
  `Promise.all`, matching a pattern already used correctly elsewhere in
  the same codebase; `typecheck`/`lint`/all 64 api tests stayed clean.
  Includes an honest correction of my own first (invalid, single-sample)
  benchmark claim — see bug-report.md #6 for the full walk-back.

**5 of 8 documented, not fixed**, each with a stated reason (migration
scope, product-decision needed, or diffuse multi-file risk) — #1, #2,
#3, #5, #7.

## 8. Remaining Issues

See "Known open items" in [`release-checklist.md`](release-checklist.md)
for the full list with priority framing. Highest priority: Docker
Compose verification (environment-blocked, not code-blocked) and the
mobile-navigation gap (#7, a real product decision).

## 9. Security Findings

**Zero new findings.** Every OWASP-adjacent category was checked against
the actual implementation (not the README's claims): injection (Zod
validation at every mutating route boundary, no `$where`/`eval`/`exec`
anywhere), XSS (no `dangerouslySetInnerHTML`/`innerHTML` in the entire
frontend), CSRF (business routes are Bearer-header-only, structurally
immune; the one cookie-based route is `SameSite=Lax` + path-scoped),
IDOR (verified live, flat 404s), path traversal (traced the guard logic
against nested traversal payloads by hand), SSRF (zero user-influenced
outbound fetch targets exist in the codebase), secrets (Authorization/
cookie headers explicitly redacted from logs, verified live; request
bodies never logged), rate limiting (verified live, twice), security
headers (`helmet()` confirmed on the wire), signed URLs (HMAC-SHA256
with `timingSafeEqual`, not `===`). Full detail in qa-audit.md Phase 22.

## 10. Performance Findings

One real issue found and fixed (#6 above). Web bundle has no route-based
code splitting (noted, not fixed — a larger change). No N+1 patterns
found elsewhere after spot-checking the other services doing similar
per-item enrichment (they already use `Promise.all` correctly).

## 11. Lighthouse Scores

**Not run.** No Lighthouse/Chrome DevTools Protocol tooling was set up
in this pass — Playwright covered functional, visual, and console-error
verification across every page instead, which is a different (and for
this audit, higher-priority) kind of coverage, but it is not a
substitute for a Lighthouse score. Flagged honestly as not done rather
than fabricated or estimated.

## 12. Dark Mode Root Cause

The audit brief flagged dark mode as "a known bug" in advance. Root
cause, found and fixed (not just described): `--color-primary` was
deliberately lightened in `.dark` mode (`rgb(79 70 229)` →
`rgb(129 140 248)`) so it would read well as *text/icon color* against
the dark page background (confirmed: 6.23:1, a good ratio) — but the
same variable also drove every solid-fill button's background, and white
text on that lighter shade computed to 2.98:1, below WCAG AA's 4.5:1
minimum. Not a typo — a genuine design tension between two different
uses of one color token. Fixed with a second, theme-invariant token for
solid fills specifically; light-mode contrast (6.29:1) was never at
risk. A secondary, lower-severity, broader contrast gap (unprefixed
muted text across 32 files) was also found and documented but not
blind-fixed given its scope. Full detail: bug-report.md #4 and #5.

## 13. Deployment Readiness

**READY FOR PORTFOLIO. NOT YET READY FOR PRODUCTION.**

Blocking items for production specifically:
1. Docker Compose / the actual shipped `Dockerfile`s have never been
   verified to build and boot — this environment couldn't (WSL2
   unavailable), and that's the actual deployment artifact, so this is
   the single highest-priority item before a real production release.
2. No mobile navigation (#7) — if any real user is expected to use this
   on a phone, this blocks them completely, not just cosmetically.
3. Two dependency-advisory chains need deliberate major-version
   migrations (react-router v7, vite v8/vitest v4) before shipping
   publicly with a clean `npm audit`.

None of these are code-quality problems — the engineering underneath
(test discipline, security posture, error handling, the deterministic-
matching-plus-optional-AI architecture) is genuinely strong and holds up
under real, live, adversarial testing, not just unit tests. What's
missing is deployment-artifact verification and one real product gap,
not a shaky foundation.

## 14. Files Changed

**Fixes:**
- `apps/api/src/lib/errors.ts` — Multer error translation (#0)
- `apps/api/src/modules/dashboard/dashboard.service.ts` — parallelized match loop (#6)
- `apps/api/src/modules/skills/skills.service.ts` — parallelized match loop (#6)
- `apps/web/src/styles/index.css` — `--color-primary-solid` token (#4)
- `apps/web/tailwind.config.js` — `primary-solid` color exposed (#4)
- 14 `.tsx` files (every primary-button call site) — `bg-primary-solid` (#4): `CoverLetterSection.tsx`, `JdAnalyzerPage.tsx`, `AlertsPage.tsx`, `ApplicationDetailPage.tsx`, `ForgotPasswordPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`, `InterviewHomePage.tsx`, `InterviewSessionPage.tsx`, `JobDetailPage.tsx`, `OnboardingWizard.tsx`, `ProfilePage.tsx`, `SystemHealthPage.tsx`
- `.gitignore` — excluded new Playwright artifacts
- `apps/web/vitest.config.ts` — excluded `e2e/` so Vitest stops trying to run Playwright specs (self-caught during this audit's own final validation pass)
- `package-lock.json` — `npm audit fix` (brace-expansion) + Playwright devDependency

**New:**
- `docs/qa-audit.md`, `docs/api-audit.md`, `docs/bug-report.md`, `docs/release-checklist.md`, `docs/release-report.md` (this file)
- `apps/web/playwright.config.ts`, `apps/web/e2e/*.spec.ts` (4 spec files, 23 tests)
- `apps/web/package.json` — `@playwright/test` devDependency

Local-only (gitignored, not part of the diff): `apps/api/.env`,
`apps/worker/.env`, `apps/web/.env` — created from the existing
`.env.example` files with freshly generated random secrets, needed to
run anything live in this environment.

## 15. Commands to Build & Deploy

```bash
# Install & verify
npm ci
npm run typecheck && npm run lint && npm run test && npm run build

# Local dev (native, this audit's verified path)
cp apps/api/.env.example apps/api/.env      # then set real 32+ char secrets
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
npm run dev:api      # terminal 1
npm run dev:worker   # terminal 2
npm run dev:web      # terminal 3
npm run seed -w @job-copilot/api   # demo data

# Docker Compose (documented path — NOT verified in this audit, see §13)
cd docker && docker compose up --build

# E2E
cd apps/web
npx playwright install chromium
npx playwright test
```

---

## Final Classification

# READY FOR PORTFOLIO ONLY

Not "READY FOR PRODUCTION" — Docker/deployment-artifact verification and
the mobile-navigation gap are real, unclosed items, not process
formalities. Not "NEEDS MORE WORK" either, in the sense that would imply
shaky foundations — every category actually tested (unit tests against
live data, 60 live API endpoints, security review, 23 E2E tests) held up
cleanly, and the 3 bugs found were fixed and verified, not just noted.
This is a well-engineered project that genuinely earns portfolio-quality
confidence; production readiness specifically needs the Docker
verification this environment couldn't provide, plus a product decision
on mobile navigation.
