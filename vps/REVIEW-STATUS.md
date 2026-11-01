# Élia Marier VPS Migration Beta — Validation / Trạng thái

Created 2026-11-01 from user-supplied `EliaMarier-main.zip`.

## Implemented in source
- Standalone Next.js 16 behind Nginx, PostgreSQL JSON-compatible backend, local user/session auth.
- Private videos and concept images on local storage with signed expiring links and `X-Accel-Redirect`.
- Local worker scripts for sync from Google Drive; migration scripts for Firebase JSON/users and R2 buckets.
- Non-destructive import tools and initial VPS systemd / Nginx templates; basic login rate-limit configuration.
- Removed R2-specific GitHub workflows and old unauthorized legacy media endpoint.
- Preserved historical IDs and existing link signing ENV names where compatible; real-data verification is still necessary.

## Checks actually completed
- `node scripts/check-static.mjs` PASS (18 checks after adapting stale admin wording).
- `npm run test:vps-smoke` PASS (2/2; signed media URLs and path traversal).
- `node --check` PASS for core `.mjs` scripts and TypeScript strip-types syntax checks on primary adapters.
- `bash -n vps/migrate-r2-to-vps.sh` PASS.
- `npm test` FAILED: 234 passed / 267 tests, 33 failed. Many tests assert old Firebase/R2 behavior; several require actual bug investigation. Do not waive failures solely as legacy.

## Not verified / production blockers
- `npm ci`, `tsc`, full `next build`, live PostgreSQL schema, and end-to-end flow have NOT been verified in this environment. Some npm packages could not be installed due lack of outbound network.
- The source `package-lock.json` is from the previous package set; regenerate lockfile with `npm install --package-lock-only`, then `npm ci` on a connected builder.
- Real Firebase RTDB/Auth exports, R2 media, Google Drive source, keys, and destination VPS were NOT provided. No real data has been copied or production system changed.
- Must test calendar concurrency, staff privileges, wedding wardrobe, audit/archive, old delivery links, review timeline and 1080p seeking, backups and restore before any DNS cutover.
- Google Drive and optional Maps remain external integrations; this package specifically replaces Firebase, R2, Vercel, not Google Drive.
- PostgreSQL adapter uses a global write advisory lock. Benchmark concurrent workloads; migrate to relational domain tables if necessary.

**Never switch production or delete the cloud originals from this beta alone.**
