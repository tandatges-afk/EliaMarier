# Élia Marier V5 – Khôi phục Firebase trước khi chuyển VPS

## Mục tiêu và trạng thái

Bản này là **V5 chạy tạm trên Vercel** với Firebase Authentication và **chính Realtime Database cũ** của dự án `eliamarier`. Không tạo tài khoản mới và không thay UID, không chạy migration/import dữ liệu lên PostgreSQL. Các tính năng V5 (Catalog, hình 8 ảnh, lịch Decor/Makeup, lịch trang phục, hồ sơ khách hàng, gói dịch vụ, năm vai trò) vẫn nằm trong code.

**Chưa xác nhận production build hoặc chạy dữ liệu thật.** Cần chạy `npm ci`, `npm run build`, kiểm tra role và các thao tác staging trước khi đẩy production.

## Những phần đã khôi phục

- `lib/firebase/client.ts` dùng Firebase Web SDK, `lib/auth/client.ts` tái xuất các hàm Firebase Auth cho UI V5.
- `lib/server/firebase-admin.ts` khôi phục `verifyIdToken` và `getDatabase`; `localAccountAdmin()` là alias an toàn cho Firebase Admin Auth (V5 quản lý nhân viên mới, khóa/mở tài khoản).
- `officeAccounts` tiếp tục được đọc tại `studioPlanner_v1/officeAccounts/{uid}` trên Realtime Database, giữ quy tắc role cũ `receptionist` => `sale`.
- Ghi lịch và cập nhật bình luận quay về cơ chế ETag Firebase REST có chống ghi đè (`lib/server/booking-cas.ts`, `lib/server/delivery-cas.ts`).
- Video 1080p vẫn dùng private R2 với link ký và worker GitHub Actions. Khách xem như trước; không đưa video qua function Vercel.
- Ảnh Catalog/Makeup V5 tạm dùng bucket ảnh concept R2 (tối đa 8 ảnh). API GET yêu cầu Firebase bearer token, UI fetch xác thực rồi tạo `blob:` URL nội bộ để `<img>` hiển thị. Không dùng filesystem tạm của Vercel.
- Mã VPS/PostgreSQL đã tách thành **tài liệu tham chiếu** trong `vps/migration-reference/`; các API login PostgreSQL không còn chạy trên Vercel.

## ENV trên Vercel (Production và Preview)

Giữ đúng bộ biến môi trường đang chạy tốt **trước khi triển khai V5**. Tối thiểu:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_DATABASE_URL
FIREBASE_PROJECT_ID
FIREBASE_DATABASE_URL
FIREBASE_SERVICE_ACCOUNT_JSON
AMORRI_ADMIN_UIDS
DRIVE_SERVICE_ACCOUNT_JSON
R2_ACCOUNT_ID
R2_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_CONCEPT_BUCKET
R2_CONCEPT_ACCESS_KEY_ID
R2_CONCEPT_SECRET_ACCESS_KEY
```

Ngoài ra giữ nguyên các khóa mã hóa và link bàn giao đã sử dụng (`AMORRI_DELIVERY_LINK_KEY`, `AMORRI_STAFF_LINK_KEY`, `DRIVE_VIDEO_SIGNING_SECRET`, `AMORRI_ARCHIVE_ENCRYPTION_KEY`). **Không tạo lại khóa cũ** nếu còn link/bản mã hóa cần mở. Không copy service account thật vào Git.

`DATABASE_URL`, `ELIA_MEDIA_ROOT`, `ELIA_MEDIA_SIGNING_KEY` **không cần trên Vercel ở bản khôi phục này**. Không dùng chúng để thay Firebase.

## Kiểm tra trong Windows PowerShell

```powershell
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
npm run test:firebase-restore
if ($LASTEXITCODE -ne 0) { throw "Firebase restore tests failed" }
npm run test:elia-v5
if ($LASTEXITCODE -ne 0) { throw "V5 tests failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed – do not push main" }
```

Kiểm tra đăng nhập Admin bằng **đúng tài khoản Firebase cũ**, tài khoản Sale cũ, thêm/sửa lịch, không bị nhân bản lịch, catalog ảnh (tải/xem/xóa 8 ảnh), xem lịch Decor và Makeup, mở video 1080p từ link khách.

## Định hướng chuyển VPS sau

Không xóa tài khoản Firebase, dữ liệu RTDB, các bucket R2 hoặc vô hiệu hóa Vercel trước khi VPS có dữ liệu nhập và kiểm tra lại đầy đủ. Bản VPS migration reference trong ZIP **không phải bản triển khai thực thi độc lập** vì đã tách khỏi các API production. Khi thực hiện migration cần tạo một branch mới, export dữ liệu Firebase, đưa ảnh/video lên VPS, giữ UID và phân quyền, thử nghiệm trên staging trước khi đổi tên miền.

## Rollback

Nếu đăng nhập không hoạt động sau deploy, kiểm tra biến Firebase ENV trên Vercel. Nếu bị lỗi nghiệp vụ, dùng Vercel Instant Rollback về deployment ổn định trước V5, không cần xóa Git branch hay database. Không dùng `git push --force` để rollback.
