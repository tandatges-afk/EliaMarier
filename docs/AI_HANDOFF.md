# Élia Marier — AI project handoff

_Last updated: 2026-11-02 (Asia/Ho_Chi_Minh). This document captures **conversation evidence**, not a fresh inspection of the user's local Git tree. The next agent must validate all current facts against the working directory._

## Project identity and environment

- **Project:** Élia Marier (wedding studio and operational web platform). **Not** Amorri Studio or GU.
- Source repository identified in prior project work: `tandatges-afk/EliaMarier`. Confirm using `git remote -v` before doing anything that could change GitHub.
- Example user checkout: `C:\Users\Admin\Downloads\Elia_Marier_VSCode_Starter\EliaMarier` (Windows, VS Code, PowerShell).
- Existing stack as last observed: Next.js **16.4.1**, TypeScript, Firebase Authentication + Firebase Realtime Database, private Cloudflare R2 for video/office media; Vercel for current deployment. VPS migration has been discussed but is **not** confirmed complete.
- Operational roles include Admin, Sale, Photo Leader and Makeup Leader; privacy and payroll access boundaries are important.
- Key workflows: create/edit wedding bookings and service packages (Photo/Makeup/Decor/Wardrobe), synced wardrobe reservations, staff roles, private media delivery, video review and photo selection.

## QA evidence and unresolved issue (chronological)

1. **2026-11-02, QA Gate 07 (user's Windows output):** 349/349 Node tests, 6/6 Vitest, static guards and Next.js production build passed. High/Critical dependency audit gate passed; **four Moderate findings** remained via `google-gax -> rimraf -> glob -> minimatch`. Local QA was **conditional**, not security-clear and not production approval.
2. **QA08C (user's Windows output):** Firebase Auth + RTDB Emulators successfully started under `demo-elia-v7-qa08`; fixture users, isolated Next.js, health, authentication, role resolution/boundaries and booking-write checks passed. Parallel wardrobe reservation test failed **404/404** for an item thought to exist.
3. **QA08D (user's Windows output):** patch and preflight ran; isolated Next.js and integration suite verified the dress **exists in RTDB and authenticated catalog**. Parallel wardrobe reservations then both returned **409 `TRANSACTION_RETRY_REQUIRED`**, where success required one `201` and one `409`. **QA08D is NOT an integration pass.** A later standalone `Write-Host ... PASSED` was not a test result.
4. **QA08E-ETagCAS (latest patch delivered, Windows outcome NOT RECEIVED):** changes wardrobe writes to Firebase RTDB REST ETag conditional updates; includes concurrency, missing ETag, retries, network ambiguity tests. On reconstructed source, **360/360 Node tests passed**. The user's Windows **build, Vitest and actual Firebase Emulator integration after applying QA08E remain unverified**. Do **not** mark QA08E passed or even applied without new evidence.

## Current next action

1. Inspect local `git status --short --branch`, `git log -1 --oneline`, `git remote -v`, and the presence of QA08E changes (notably `lib/domain/rtdb-etag-cas.ts` and wardrobe API code). Confirm if QA08E was applied.
2. If QA08E is present, run local tests/build and the **QA08E Emulator integration** (`Run-Elia-V7-QA08E-All.ps1` from its patch ZIP, if available) in an isolated `demo-` Firebase project; share the unedited terminal summary.
3. The critical success criterion for wardrobe collision: **one successful 201 creation and one 409 conflict**, with exactly one stored reservation, no lost updates. Also verify package synchronization, deletes/status updates and role boundaries.
4. If local integration passes, proceed to **separate Firebase staging** with test accounts and isolated R2 resources, then security/release review. Do not use production Firebase credentials, data or storage for mutating tests.
5. Recheck current `npm audit --omit=dev --audit-level=moderate` rather than assuming the four historical Moderate findings remain identical. Evaluate the risks before deployment; do not claim they have been fixed by a QA exception.

## Useful read-only and local commands (PowerShell)

```powershell
Set-Location 'C:\Users\Admin\Downloads\Elia_Marier_VSCode_Starter\EliaMarier'
git status --short --branch
git log -1 --oneline
git remote -v
npm.cmd run test
npm.cmd run test:unit
node scripts/check-static.mjs
npm.cmd run build
npm.cmd audit --omit=dev --audit-level=moderate
```

Run tests in order and stop after a failure; the audit command may exit nonzero on known Moderate advisories and should be **reported**, not silently suppressed. Do not issue Git push or database operations from this handoff.

## Maintenance protocol for future sessions

- Update this file at the **end** of each verified debugging/QA task: date, exact patch/commit, observed tests, pending blockers and what to run next.
- When a step fails, record the failing code/status and follow-up. Do not write `PASS` until the same continuous command/check actually returned success.
- Record whether changes were merely **prepared**, **applied locally**, **committed**, **pushed**, or **deployed**; these are different states.
- Preserve user-authored `CLAUDE.md` verbatim unless the owner asks to edit it. Keep detailed state here instead.
- Do not store secrets, personal customer data, Firebase token values, R2 credentials or log dumps with sensitive data.
