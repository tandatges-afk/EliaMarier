# ÉLIA MARIER — VPS 100% thay cho Firebase / Cloudflare R2 / Vercel

**Status: MIGRATION BETA, NOT PRODUCTION VERIFIED.** This is a source conversion based on
`EliaMarier-main.zip` (2026-10-29). No live server or cloud source data has been accessed.
Do NOT disable/delete the current systems yet. Test on an independent staging domain first.

## Architecture
- Next.js standalone / Node 22+ behind Nginx; no Vercel hosting.
- PostgreSQL 16+ storing the existing RTDB JSON structures and authentication accounts.
- Local per-record transaction and conditional-write compat in `lib/server/vps-database.ts`.
- Sessions: random bearer secret stored only in an HttpOnly Secure SameSite cookie; password scrypt.
- Private 1080p video and concept images in `ELIA_MEDIA_ROOT`, expiring HMAC URLs,
  Nginx `X-Accel-Redirect` + HTTP byte ranges.
- Sync Google Drive sources into local disk via `scripts/sync-drive-to-local.mjs`.
- No runtime or deployed workflows for R2, Firebase, Vercel or GitHub Actions.

**Google Drive remains a source dependency** for linked album listings, photo access,
video authorization metadata and initial/video re-sync. Google Maps, if configured,
also remains external. Migrating Drive is a separate larger project.

## Hardware
Do not use 1 vCPU / 2 GiB / 30 GiB for the combined website+DB+media stack.
Baseline: 4 vCPU / 8 GiB RAM, 80–100 GiB system NVMe **plus a media volume**
with free space >= current media volume + projected growth. 2C/4GiB is a testing or
very low traffic compromise when no transcoding runs on the VPS.
For example: 1 hour of 1080p video at 8 Mb/s is ~3.6 GB (decimal), before overhead and backups.
Nginx serves stored 1080p bytes; no runtime transcode. Outgoing bandwidth
must support concurrent viewers: 10 simultaneous 8 Mb/s streams ~= 80 Mb/s.
Prefer media volume sized to 2–3x the measured current media before adding backup.

## Before migration (source system remains LIVE)
1. Backup the full Firebase RTDB root as JSON from Firebase console > Realtime Database > Data > Export JSON.
2. Export Firebase Auth users as JSON (`firebase auth:export users.json --format=json --project eliamarier`).
   Keep UID and emails. **Passwords are not transferred to this local system**; reset each.
3. Inventory R2 buckets and object counts/bytes. Keep existing bucket names and all versions.
4. Preserve original `AMORRI_DELIVERY_LINK_KEY`, `AMORRI_STAFF_LINK_KEY`,
   `DRIVE_VIDEO_SIGNING_SECRET` and `AMORRI_ARCHIVE_ENCRYPTION_KEY` for historical links/backups.
5. Measure actual video/whole photo storage and peak upload/download traffic.
6. Prepare separate Élia PostgreSQL database, user and media volume. Never reuse GU's DB.

## Prepare fresh VPS / staging (Ubuntu 24.04)
Install PostgreSQL 16+, Nginx, Node.js >=22.16, `rclone`, `ffmpeg`, `certbot`, `flock`.
Ensure `/usr/bin/node` exists (some Node installers use another path; adjust systemd ExecStart).
Create runtime `elia` user, `/srv/elia/app/current`, `/srv/elia/media`,
`/srv/elia/sync-queue`, `/etc/elia/elia.env` (chmod 600, owner root).
To let nginx read files, make media directories group `www-data`, mode 2750,
files mode 0640, and ensure `/srv/elia` and intermediate directories are traversable.
Do not mount the media root in a public Nginx location; use internal alias only.

PostgreSQL:
```
# Create DB/user via privileged psql; give user ownership of this DB only.
psql -v ON_ERROR_STOP=1 -d elia -f vps/schema/001-init.sql
```
Use a strong dedicated password; put `DATABASE_URL` in the protected env file.

Build (on builder, not low-memory VPS):
```
# package-lock from legacy project must be regenerated after removing Firebase deps:
npm install --package-lock-only
npm ci
npm run typecheck
npm run build
# On the builder, assemble a standalone release:
mkdir -p /tmp/elia-release/.next
cp -a .next/standalone/. /tmp/elia-release/
cp -a .next/static /tmp/elia-release/.next/static
cp -a public scripts lib vps /tmp/elia-release/
# Preserve node_modules copied from .next/standalone so standalone API/worker
# imports can resolve. Verify extra worker-only packages are included.
# Upload the release to /srv/elia/app/releases/<release-id>/,
# and atomically point /srv/elia/app/current there, then restart services.
```
`output: 'standalone'` is enabled, but copying static assets and worker scripts is still necessary.
The systemd web unit starts `server.js` at the release root.
Check runtime `pg` and `google-auth-library` resolution from the release root before enabling worker timers.
Build on a machine with enough memory; do not build within the 2 GiB production instance.

Environment: copy `.env.vps.example`, fill dedicated credentials, then load as
`/etc/elia/elia.env`. Never place sensitive secrets in `NEXT_PUBLIC_*` vars.
Generate signing key by `openssl rand -hex 32`.
Use `ELIA_USE_X_ACCEL=false` ONLY for local dev without nginx.
For TLS production, first install `vps/nginx/00-elia-login-limit.conf` under `/etc/nginx/conf.d/`, then add the Nginx site, run `nginx -t`, and obtain a certificate with `certbot --nginx`;
production cookies have `Secure`, and login needs HTTPS.

## Data import (STAGING database ONLY)
```
node vps/import-firebase-json.mjs /secure/elia-rtdb.json
node vps/import-firebase-users.mjs /secure/users.json
# dry-run counts before --apply
node vps/import-firebase-json.mjs /secure/elia-rtdb.json --apply
node vps/import-firebase-users.mjs /secure/users.json --apply
node vps/reset-password.mjs admin@yourdomain.example
```
All scripts need DATABASE_URL. They reject imports onto nonempty target tables.
Passwords must be reset securely for every imported user. Preserve original UID,
including staff `authUid` and office account mappings.

## Import all existing R2 media without deletion
Configure `rclone config` with a read-only old R2 remote named `r2`.
```
# preview only:
./vps/migrate-r2-to-vps.sh
# copy only after storage capacity confirmed:
./vps/migrate-r2-to-vps.sh --apply
```
The copier leaves R2 unchanged. Confirm object counts, sizes, and sample videos.
`rclone check --size-only` is NOT cryptographic integrity proof; use `--download`
when full content verification is required, understanding extra data transfer.

## Video sync on VPS
Configure a Drive rclone remote (`drive`) and `DRIVE_SERVICE_ACCOUNT_JSON`.
Keep the `ELIA_MEDIA_STAGING_DIR` on the media volume: a single download may be several GB; do not use system `/tmp`.
Test one file: `node scripts/sync-drive-to-local.mjs --id DRIVE_ID --copy-1080 --dry-run`
and then without `--dry-run`. This verifies H.264/AAC and 1080p, no re-encode.
Set systemd queue and scan timers. Keep original Drive source available for existing
photo/video authorization logic until a separate Drive-offline port is completed.

## Cutover safety (mandatory)
1. Freeze edits in OLD website; export a FINAL RTDB snapshot and Auth list.
2. Import the final source into a newly EMPTY staging DB (or fresh production DB).
3. Verify per-module record counts, ID/UID uniqueness and archive secrets.
4. Confirm all operations: admin/receptionist login, calendar CRUD and concurrency,
   wardrobe overlap, staff scheduling/payroll, shared staff links, image selection,
   video timeline comments, download, 1080p play/pause/seeking and byte ranges.
5. Review old and newly generated public delivery links (encrypted keys must match).
6. Test 2–5 concurrent viewers, failed media sync, server restart, backups/restore.
7. Only then switch DNS and monitor. Maintain the OLD services read-only for rollback.
8. Do not delete Firebase/R2 until an independently verified restore is complete.

## Open verification gaps
- No production data, credentials, or SSH access provided: actual migration NOT executed.
- `npm ci`, Next production build and end-to-end tests could not be completed
  in this environment due missing installed dependencies/network. Not verified deployable.
- Legacy test suites were written against Firebase/R2 and require adaptation.
- PG `elia_nodes` JSON-compat adapter serializes writes with one advisory lock:
  test contention/performance before using it for large workloads.
- Legacy UI/code routes may still contain old names such as `r2` internally;
  these are not external service dependencies.
- Google Drive dependency is intentionally NOT removed in this migration.
- External backup is still required; one VPS disk is a single point of failure.

## V5 Élia operations preparation
See [`docs/ELIA-OPERATIONS-V5.md`](../docs/ELIA-OPERATIONS-V5.md) for wardrobe photo storage, module data paths, new role matrix, and staging tests. Configure `ELIA_MEDIA_RESERVE_BYTES` for available disk space. The new operations package is staged-only until verified.
