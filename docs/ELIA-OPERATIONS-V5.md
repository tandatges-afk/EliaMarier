# Élia Marier · V5 Operations / Wardrobe Photos (VPS staging)

## Source
Built on `EliaMarier-VPS-Migration-Beta-2026-11-01.zip`, not the old Vercel/Firebase production branch. Do not deploy over production until the VPS migration and data cutover are verified. This upgrade adds database-backed business modules while preserving the wardrobe bookings structure.

## Functional changes and the requested 11 items

1. Wardrobe inventory can store up to eight JPEG/PNG/WebP images per item, max 5 MiB per original file. The browser downscales/compresses when supported; backend verifies magic bytes, blocks traversal, enforces quotas, and stores files under `${ELIA_MEDIA_ROOT}/office-photos/wardrobe/<itemId>/`.
2. Removed the `Phân loại` selector **from the UI**; legacy `kind` remains in old records for compatibility. Folder is the sole visible grouping. The wardrobe photo editor opens immediately after a new code is saved.
3. Operations → `Catalog trang phục`: card gallery, overlay, wraparound previous/next, thumbnails, touch/mouse swipe, folder filter and mini calendar with red `×` on booked dates (inclusive pickup/return; cancelled bookings do not block).
4. Operations → `Lịch Decor`: bride/groom contacts and addresses, party/install/pickup dates, notes, price, deposit and derived balance.
5. Removed Graduation (`Tốt nghiệp`) from new booking choices. Historical records remain unchanged.
6. Renamed the navigational `Lịch váy cưới` label to `Lịch trang phục`.
7. Operations → `Lịch Makeup`: customer, phone, date/time, layout, notes and protected photo attachments after the record is created.
8. Click a customer name in Overview → authenticated modal loads matching past/future studio bookings, packages, wardrobe rentals, decor and makeup across all dates. Matches by normalized phone first; fallback exact booking name is imperfect when contacts lack phone numbers.
9. Roles: Admin, Sale, Leader Makeup, Leader Quay/chụp, Leader Decor. Old receptionist accounts map to Sale automatically to prevent loss of access. Admin rights are granted only through privileged server account configuration; not self-assignable via staff UI.
10. `Kho trang phục` moved to a sub-tab inside `Lịch trang phục`; Sale may add codes, folders and photos.
11. Operations → `Chọn gói`: one shared bride/groom/contact/address record; choose any combination of photo, wardrobe, makeup, decor with separate date/time/end date/place/notes. **Package planning does not yet reserve clothing or auto-create photo bookings.** Confirm in each specialist calendar before promising availability.

## Role matrix

| Role | Operations visibility | Editing |
| --- | --- | --- |
| Admin | Everything including Admin, Payroll and Reports | Full |
| Sale | Overview, photo calendar, clothing calendar, catalog, makeup, decor, packages and delivery | Create / edit bookings, wardrobe, decor, makeup and packages; no staff cost or payroll |
| Leader Makeup | Makeup calendar and its reference images | Date/time only; no create/delete or image uploads |
| Leader Quay/chụp | Photo shoot calendar | Date/time (and two-house times) only |
| Leader Decor | Decor calendar | Party, installation and pickup dates only |

Default auth on legacy office endpoints remains **Admin/Sale**, preventing leader access to unrelated media, costs, and staff APIs. Special endpoints pass their explicit allowed role arrays. This is additional server enforcement, not mere navigation hiding.

## VPS install notes

- Configure `DATABASE_URL`, `ELIA_MEDIA_ROOT`, `ELIA_MEDIA_SIGNING_KEY`, and optional `ELIA_MEDIA_RESERVE_BYTES` (default reserves 8 GiB to protect OS/database). Keep `ELIA_USE_X_ACCEL=true` behind the supplied Nginx internal media location, set false for local development without Nginx.
- Keep `office-photos` within the media volume. Create its parent with suitable ownership/group (`elia:www-data`) so Next.js can write and Nginx can read; internal Nginx location remains private. Nginx `/_elia_internal/` alias serves authorized photos after the Next.js authorization check.
- On a 50 GB VPS, monitor free storage. Images should remain below 5 MiB each even when browser conversion isn't supported. Original Google Drive media stays separate.
- No migration script copies old wardrobe photos because the old wardrobe did not have these new uploads. Imported old items without `photos` safely default to `[]`.
- New records are kept at `studioPlanner_v1/eliaModules/{decor,makeup,packages}` inside PostgreSQL's compatibility `elia_nodes` table, so no manual SQL migration is needed beyond existing `vps/schema/001-init.sql`.
- Never save images in `public/`. Client views are authenticated by session cookie and backend validates membership in the record's image list.

## Verification

Run `node --experimental-strip-types --test tests/elia-v5-features.test.mjs` and `npm test`, then **after installing dependencies** run `npm ci && npm run typecheck && npm run build` on a machine with adequate RAM. Do not compile on a 2C/4 GB production VPS if you can use a separate build machine.

Staging smoke matrix:

- [ ] Admin creates wardrobe folder, item, uploads 8 images; 9th rejects, delete/reupload works; catalog shows previews.
- [ ] Catalog arrow navigation from first to last and last to first works; swipe on mobile; red × date matches actual reservation ranges.
- [ ] Sale creates wardrobe codes and books rentals; conflicts still return 409.
- [ ] Decor price/deposit/remaining and party/install/pickup dates persist after reload.
- [ ] Makeup record/photo persists after reload and authorized users can view it.
- [ ] Package stores distinct dates for each selected service and one contact record.
- [ ] Customer popup shows historical records matched by phone across different months.
- [ ] Leader Makeup and Decor can PATCH allowed date fields only; a forged change to price/notes returns 403/422.
- [ ] Leader Quay/chụp can PATCH dates/times but cannot change price, staff assignments, or delete bookings.
- [ ] Unauthenticated media access returns 401/403, and requests for photo names not listed in their linked record are denied. Admin/Sale retain shared access to inventory images.
- [ ] Client upload storage reserve and Nginx internal photo delivery tested before production cutover.

## Known issues / release status

- This is a **feature integration beta**, not a production release; no real PostgreSQL/database migration or VPS deployment has been performed.
- Production Next.js build/typecheck was **not verified** in this environment because npm dependencies cannot be downloaded (`EAI_AGAIN`). Syntax parsing and feature tests are not equivalent to a production build.
- Legacy tests written for the old receptionist-only UX, old graduation button and old system tab must be rewritten; other failures predate this feature work. See `vps/REVIEW-STATUS.md` for earlier VPS migration limitations.
- Multi-service package plans are not yet synchronized into operational booking ledgers; no double-booking claim should be made for those plans.
- Automatic video deletion 5–7 days after completion remains a separate follow-up and is not included here.
