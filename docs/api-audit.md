# API Audit — Job Copilot

Complete endpoint inventory, read directly from `apps/api/src/modules/*/*.routes.ts`
(not guessed), then verified live against a running stack (native Mongo
27018 + portable Redis 6379 + `npm run dev:api`/`dev:worker`, two real
registered users for IDOR checks, one promoted to `role: "admin"` in the
database for the admin-route checks).

Status legend: ✅ verified working live · ⏳ blocked (needs a real
`ANTHROPIC_API_KEY`, not testable in this environment) · ❌ broken.

| Method | Path | Auth | Notes | Status |
|---|---|---|---|---|
| GET | `/health` | none | liveness | ✅ |
| GET | `/health/ready` | none | Mongo+Redis deep check | ✅ |
| POST | `/health/ping-worker` | none | enqueues BullMQ health-ping | ✅ |
| GET | `/health/ping-worker/:pingId` | none | poll result | ✅ |
| POST | `/auth/register` | rate-limited | 201; duplicate email → 400; invalid email/short password → 400 | ✅ |
| POST | `/auth/login` | rate-limited | wrong password → 401; rate limiter trips at attempt 18/20 within window | ✅ |
| POST | `/auth/refresh` | refresh cookie | rotates token; revoked-after-logout → 401 | ✅ |
| POST | `/auth/logout` | refresh cookie | revokes session so refresh then 401s | ✅ |
| GET | `/auth/me` | session | | ✅ |
| POST | `/auth/change-password` | session | wrong current password → 400 | ✅ |
| POST | `/auth/forgot-password` | rate-limited | dev returns token; prod withholds (code-read); no user-enumeration (same 200 for nonexistent email) | ✅ |
| POST | `/auth/reset-password` | rate-limited | valid token resets password, new password works, old fails, token is single-use (reuse → 400) | ✅ |
| GET | `/profile` | session | | ✅ |
| PATCH | `/profile` | session | | ✅ |
| POST | `/profile/skills/confirm` | session | | ✅ |
| PATCH | `/profile/onboarding` | session | partial save confirmed — leaves `onboardingCompletedAt` null | ✅ |
| POST | `/profile/onboarding/complete` | session | sets `onboardingCompletedAt` | ✅ |
| GET | `/resumes/:id/download` | **signed token only** (mounted before `requireAuth`) | valid token → file streams; tampered token → 401 | ✅ |
| POST | `/resumes` | session | multer upload; oversized (11MB) → 400 (bug found & fixed, see bug-report #0); wrong MIME → 400; corrupted-but-valid-MIME → 201, async parse fails gracefully | ✅ |
| GET | `/resumes` | session | | ✅ |
| GET | `/resumes/:id` | session | soft-deleted → 404 | ✅ |
| DELETE | `/resumes/:id` | session | soft-delete confirmed | ✅ |
| POST | `/resumes/:id/set-primary` | session | | ✅ |
| PATCH | `/resumes/:id/corrections` | session | | ✅ |
| GET | `/resumes/:id/download-url` | session | issues signed URL, verified end-to-end | ✅ |
| GET | `/jobs` | session | search returns real 20 seeded jobs | ✅ |
| GET | `/jobs/saved` | session | | ✅ |
| GET | `/jobs/hidden` | session | | ✅ |
| GET | `/jobs/recommended` | session | | ✅ |
| GET | `/jobs/:id` | session | bad id → 404 | ✅ |
| POST | `/jobs/:id/save` | session | | ✅ |
| POST | `/jobs/:id/hide` | session | | ✅ |
| DELETE | `/jobs/:id/save` | session | | ✅ |
| POST | `/jobs/admin/ingest` | session + admin | non-admin → 403; real admin → 202, real ingestion run recorded (business BullMQ queue, not just health-ping) | ✅ |
| GET | `/jobs/admin/ingestion-runs` | session + admin | | ✅ |
| GET | `/matches/:jobId` | session | real score (47, 55 across two jobs), confidence present, no NaN/undefined | ✅ |
| GET | `/ai/status` | session | `configured: false` (no key in this env) | ✅ |
| POST | `/ai/analyze-job-description` | session | **no AI key**: still returns 200 with a real deterministic `overallScore`, `aiAvailable: false`, `aiCommentary: null` — exactly the "AI explains, never determines" design | ✅ |
| POST | `/ai/cover-letter` | session | no AI key → clean 400 "AI features are not configured" | ✅ |
| GET | `/ai/cover-letter/:jobId` | session | none exists → 200, `data: null` | ✅ |
| PATCH | `/ai/cover-letter/:id` | session | requires an existing AI-generated cover letter to test the update path | ⏳ needs AI key |
| GET | `/applications` | session | | ✅ |
| POST | `/applications` | session | idempotent per (user,job) confirmed (same id on 2nd call); missing jobId+jobSnapshot → 400 | ✅ |
| GET | `/applications/:id` | session | | ✅ |
| PATCH | `/applications/:id` | session | status change auto-logs a `status_change` timeline event (confirmed via events list) | ✅ |
| DELETE | `/applications/:id` | session | | ✅ |
| GET | `/applications/:id/events` | session | | ✅ |
| GET | `/applications/:id/notes` | session | | ✅ |
| POST | `/applications/:id/notes` | session | | ✅ |
| GET | `/skills/gap-analysis` | session | real counted percentages from seeded job data | ✅ |
| GET | `/interview` | session | | ✅ |
| POST | `/interview/prep` | session | no AI key → clean 400 | ✅ |
| POST | `/interview/mock/start` | session | no AI key → clean 400 | ✅ |
| POST | `/interview/mock/:sessionId/answer` | session | requires an existing AI-created mock session to test | ⏳ needs AI key |
| GET | `/interview/session/:id` | session | bad id → 404 | ✅ |
| GET | `/alerts` | session | | ✅ |
| POST | `/alerts` | session | | ✅ |
| PATCH | `/alerts/:id` | session | | ✅ |
| DELETE | `/alerts/:id` | session | | ✅ |
| GET | `/notifications` | session | | ✅ |
| GET | `/notifications/unread-count` | session | | ✅ |
| PATCH | `/notifications/:id/read` | session | bad id → 404 | ✅ |
| GET | `/dashboard` | session | real aggregated numbers, no NaN, funnel/recent-activity present | ✅ |

**62 endpoints total: 60 verified live, 2 blocked only by the absence of
a real `ANTHROPIC_API_KEY`** (both require a successfully AI-created
resource — a mock interview session or a generated cover letter — as a
precondition; their "not configured" degradation paths ARE verified).

## IDOR / cross-user isolation (verified)

Registered a second user and confirmed it cannot read or act on the
first user's private resources:
- `GET /applications/:id` (user A's) as user B → **404**, not 200 or 500.
- `DELETE /applications/:id` (user A's) as user B → **404**.
- `GET /resumes/:id` (user A's) as user B → **404**.

All return 404 (not 403) — consistent with the "don't reveal existence"
pattern already used elsewhere (password reset), and correct: an
attacker enumerating IDs learns nothing about which ones are real vs.
belong to someone else.

## Auth model (confirmed, not just read)

Every module router except `health` and the necessarily-public parts of
`auth` mounts `router.use(requireAuth)` once at the top rather than
per-route checks — verified this holds by hitting a representative route
in every module with no token and getting 401 across the board.
`requireAdmin` layers on top of `requireAuth` and does a fresh DB lookup
of `role` per request (not a JWT claim) — confirmed both the 403 (normal
user) and 202 (real promoted admin) paths.

## Bugs found in this phase

See [bug-report.md #0](bug-report.md) — oversized/malformed file upload
crashed to a raw 500 instead of a clean 400. **Fixed and re-verified live**
during this phase.
