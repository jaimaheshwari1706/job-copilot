# Release Checklist — Job Copilot

Final quality gate from the Phase 14 production audit. Every line below
was actually exercised live, not assumed — see [`qa-audit.md`](qa-audit.md)
for methodology/commands and [`bug-report.md`](bug-report.md) for the 8
issues found (6 fixed, 2 documented for a follow-up decision).

- [x] Install (clean, workspaces resolve, lockfile consistent) — `npm ci` verified
- [x] Build (all workspaces) — clean, all 10 packages/apps
- [x] Typecheck (all workspaces) — clean, 0 errors
- [x] Lint (all workspaces) — clean, 0 warnings
- [x] Unit tests (all workspaces) — 183/183 passing, against a **real live MongoDB** (first time ever verified this way — the original dev sandbox had none)
- [x] API (full endpoint inventory tested live) — 60/62 endpoints; the remaining 2 need a real `ANTHROPIC_API_KEY` (their "not configured" paths ARE verified)
- [x] Worker (real BullMQ job submitted and completed) — health-ping AND a real business job (admin-triggered ingestion, 202 → real ingestion run recorded)
- [x] MongoDB (live connection, seed, collections verified) — fresh DB → seed → idempotent re-seed, all unique indexes confirmed
- [x] Redis (live connection verified) — portable Redis substituted for Docker (see note below)
- [x] Queues (retry/failure handling verified) — health-ping + real ingestion queue both processed correctly; explicit retry-exhaustion/backoff scenario not separately exercised
- [x] Authentication (register/login/refresh/logout/session survival) — full lifecycle verified live + in-browser via Playwright
- [x] Sessions (cookies, rotation, expiration, multi-tab/session) — rotation confirmed (DB-level), `HttpOnly`/`SameSite=Lax`/path-scoped confirmed on the wire; multi-tab not separately exercised
- [x] Resume (upload/parse/PDF/DOCX/invalid/large/failure paths) — all paths tested live, including a real bug found & fixed (oversized upload 500→400) and graceful parse-failure handling verified
- [x] Jobs (search/filter/pagination/save/hide) — all tested live + in-browser
- [x] Matching engine (no NaN/undefined, deterministic, evidence-based) — verified live and via Playwright assertions on real pages
- [x] Dashboard (real metrics, no hardcoded/fake data) — verified live, real aggregated numbers, no NaN
- [x] Applications (create/update/timeline/status transitions) — idempotent create confirmed, timeline auto-logging confirmed
- [x] Notifications / Alerts (real scheduled processing) — CRUD verified live; BullMQ repeatable schedules confirmed registered on worker boot; didn't wait out a real hourly cycle
- [x] AI (graceful degradation verified; live calls only if key supplied) — verified: real deterministic score always returned, `aiCommentary: null` + `aiAvailable: false` when unconfigured, clean 400s elsewhere — never fake output
- [x] Dark mode (every page, no unreadable text, persists across reload) — root cause found for the "known bug": primary buttons fixed & visually verified (2.98:1 → passes AA); secondary finding (muted text, ~32 files) documented but not fixed — see below
- [x] Mobile / responsive (375/768/1024/1440) — no horizontal overflow at any breakpoint, but **1 high-severity finding**: no navigation exists at all below 768px (see bug-report #7)
- [x] Accessibility (keyboard, focus, labels, contrast) — spot-checked (real labels/aria-labels/landmarks/semantic buttons confirmed); no automated axe-core scan run — recommended as a follow-up
- [ ] Lighthouse (Performance/Accessibility/Best Practices/SEO) — **not run** (no `lighthouse`/Chrome-DevTools-Protocol tooling set up in this pass; Playwright covers functional/visual verification but not a Lighthouse score)
- [x] Security (authz/IDOR/injection/rate limiting/headers/uploads) — thorough code-level + live review, zero new findings; genuinely careful implementation throughout
- [x] E2E (Playwright, core journeys) — newly set up, 23/23 tests passing (auth, dark mode, full journey, responsive)
- [ ] Docker (compose build + boot, full chain live) — **not verified**: this machine's Docker Desktop requires WSL2, which isn't installed; installing it needs a reboot. User explicitly chose to skip this and verify Redis/BullMQ natively instead (see qa-audit.md Phase 6) — the actual `Dockerfile`s and `docker-compose.yml` remain unverified as shipped
- [x] No console errors on any page — asserted programmatically across all 13 sidebar-linked pages via Playwright, zero errors
- [x] No unexplained network failures — covered by the same Playwright pass + the 60-endpoint live API sweep

## Known open items (not blockers, tracked)

1. **Docker Compose / Dockerfiles unverified** — environment limitation (no WSL2 on this machine), not a code issue. Highest-priority item to close before a real deployment, since it's the actual shipping artifact.
2. **react-router** moderate advisories — fix needs a v6→v7 migration, deliberately not done blind.
3. **vite/vitest/esbuild** dev-tooling advisories (1 critical, 2 moderate) — dev-server-only exposure, fix needs a major version bump.
4. **Mobile navigation missing entirely** below 768px — highest-severity *product* finding from this pass; needs a real feature (hamburger/drawer or bottom nav), not a config tweak.
5. **Muted-text dark-mode contrast** — real but lower severity than the (fixed) primary-button issue; spans 32 files, needs a careful per-file pass rather than a blind regex fix.
6. **3 backend features with no frontend UI** (change-password, resume corrections, hidden-jobs management) — product-scope decision, not a defect.
7. **Lighthouse never run** — no tooling set up in this pass.
8. **No axe-core automated accessibility scan** — spot-checked only.

## Deployment readiness classification

**READY FOR PORTFOLIO. NOT YET READY FOR PRODUCTION** without closing
item 1 (Docker verification) at minimum, and a product decision on item 4
(mobile navigation) if the app is meant to be used on phones at all.

See the full [release report](#) narrative for the complete reasoning —
this project's engineering quality (test discipline, security posture,
error handling, the "AI explains never determines" design) is
genuinely strong; what's missing is deployment-artifact verification and
one real, user-facing mobile gap, not code-quality problems.
