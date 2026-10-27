# TRIỂN KHAI ÉLIA MARIER – VS CODE / POWERSHELL

Đây là bản sao mã nguồn từ ZIP bạn gửi, **không kèm credentials, .env.local, node_modules hoặc lịch/video cũ**. Tên hiển thị website đã đổi thành **Élia Marier**. Tên biến API `AMORRI_*` được giữ để không gây lỗi tương thích.

## 0. Quan trọng

- Website cũ giữ nguyên. Không dùng chung Firebase Auth/Realtime Database, R2 bucket, access tokens hoặc Vercel project.
- File `apphosting.yaml` chỉ là cấu hình **Firebase App Hosting cũ** và đã được vô hiệu hoá các giá trị Firebase cũ. Bạn đang triển khai **Vercel**, nên KHÔNG dùng file này.
- Mã nguồn gốc có giá trị `currentRelease` trong endpoint health là `amorri-3.2.5-r2-only`, dù `package.json` vẫn ghi `3.1.0-private-r2-delivery`. Nếu website chính đã lên v3.2.6 hoặc hơn, hãy lấy code mới nhất từ GitHub cũ nếu muốn bản sao khớp 100%.
- `lib/server/video-sync-dispatch.ts` được vá **không tự mặc định** gửi lệnh sync tới repository `tandatges-afk/AmorriStudio`; chỉ dispatch khi cấu hình repo mới và token.

## 1. Chuẩn bị và chạy bằng VS Code trên Windows

1. Giải nén ZIP này, ví dụ `C:\WebMoi\Elia_Marier_VSCode_Starter`.
2. VS Code → File → Open Folder → chọn thư mục chứa `package.json`.
3. Mở Terminal → New Terminal (PowerShell), chạy:

```powershell
node -v
npm -v
Copy-Item .env.example .env.local
code .env.local
```

Cần Node.js 22.16.0 trở lên. Điền đầy đủ ENV **của dịch vụ MỚI**, không đưa `FIREBASE_SERVICE_ACCOUNT_JSON`, token R2, token GitHub lên chat/GitHub.

## 2. Firebase MỚI

1. https://console.firebase.google.com → Add project → đặt tên khác.
2. Project settings → Your apps → Add Web app → copy `apiKey`, `authDomain`, `projectId`, `appId` vào `NEXT_PUBLIC_FIREBASE_*`.
3. Build → Realtime Database → Create database → copy **database URL thực tế**, điền giống nhau cho `FIREBASE_DATABASE_URL` và `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.
4. Build → Authentication → Sign-in method → bật **Email/Password** (source đăng nhập bằng email/mật khẩu).
5. Authentication → Users → Add user → tạo tài khoản admin; lấy **UID** mới điền `AMORRI_ADMIN_UIDS`.
6. Project settings → Service accounts → Generate new private key; lấy JSON **thuộc dự án mới**, đưa cả nội dung JSON một dòng vào `FIREBASE_SERVICE_ACCOUNT_JSON` (private_key giữ `\n`). Không lưu JSON bên trong repo.
7. Authentication → Settings → Authorized domains: thêm tên miền Vercel mới nếu thiếu.
8. Thiết lập **Realtime Database Security Rules** chặt chẽ cho dự án mới trước khi dùng dữ liệu thật; repo không chứa rules production đã triển khai ở dự án cũ.

## 3. Cloudflare R2 MỚI

1. https://dash.cloudflare.com → R2 → tạo hai bucket private ví dụ `elia-marier-private-videos` và `elia-marier-concept-photos` (Standard).
2. Lấy Account ID. Nếu dùng cùng Cloudflare account cũ thì Account ID giống nhau là bình thường.
3. Tạo **R2 API token riêng** giới hạn từng bucket: `Object Read` cho video playback từ Vercel, `Object Read & Write` cho upload video trong GitHub Actions, và một token `Object Read & Write` cho bucket ảnh concept.
4. Điền các `R2_*` tương ứng vào `.env.local` rồi sau đó là Vercel Environment Variables.
5. Ở bucket video → Settings → CORS: origin chính xác là `https://elia-marier.vercel.app`, GET/HEAD và Range. Không mở bucket công khai nếu dùng signed URL.
6. Nguồn video vẫn dựa vào **Google Drive**. Cần service account có quyền đọc thư mục video MỚI. Video không tự xuất hiện ở R2; phải đồng bộ MP4 1080p bằng workflow/rclone/ffmpeg.

## 4. Tạo GitHub repository MỚI và push qua terminal VS Code

Trên github.com/new tạo repository private, ví dụ `EliaMarier`, KHÔNG tích chọn README, .gitignore, License.

```powershell
git init
git branch -M main
git status --short
git add .
git status --short
git commit -m "Initial independent Elia Marier website"
git remote add origin https://github.com/TEN_USER_GITHUB/EliaMarier.git
git push -u origin main
```

Nếu `git status` có `.env.local`, `.pem`, service-account key, dừng lại trước khi push; các file đó phải được gitignore. `git push` yêu cầu đăng nhập GitHub (hoặc dùng VS Code Source Control → Publish Branch).

Những lần sửa tiếp theo:
```powershell
git add .
git commit -m "Update website 2"
git push
```

## 5. Triển khai Vercel MỚI

1. https://vercel.com/new → Import `EliaMarier` vừa tạo.
2. Framework Next.js; Root Directory = root có `package.json`; Build Command mặc định `npm run build`.
3. Vercel Project Settings → Environment Variables → điền **toàn bộ** ENV liên quan của web mới từ `.env.local`, chọn **Production** (và Preview/Development khi dùng). Đừng dùng giá trị dự án cũ.
4. Deploy / Redeploy sau khi cập nhật ENV. Lấy hostname mới rồi thêm vào Firebase Authorized domains, R2 CORS; nếu đổi CORS/hostname cần test playback lại.
5. Thử đăng nhập admin mới; tạo lịch thử; tải concept ảnh thử; đồng bộ video thử và phát trên trang bàn giao.

## 6. GitHub Actions đồng bộ Drive → R2

Repo mới → Settings → Secrets and variables → Actions:

**Secrets**:
- `AMORRI_DRIVE_SERVICE_ACCOUNT_JSON` = credentials Drive có quyền thư mục mới.
- `AMORRI_FIREBASE_SERVICE_ACCOUNT_JSON` = service-account Firebase MỚI.
- `AMORRI_FIREBASE_DATABASE_URL` = URL RTDB MỚI.
- `AMORRI_R2_UPLOAD_ACCESS_KEY_ID` / `AMORRI_R2_UPLOAD_SECRET_ACCESS_KEY` = token upload R2 video MỚI.

**Variables**:
- `AMORRI_R2_ACCOUNT_ID`, `AMORRI_R2_BUCKET` = R2 MỚI.
- `AMORRI_ENABLE_AUTO_R2_SYNC=false` ban đầu; chỉ bật true sau khi chạy thủ công bằng dry_run và test upload.

Để API web có thể gửi workflow chạy tức thì, tạo **fine-grained PAT** giới hạn repo mới và Actions Write, điền trên **Vercel** `AMORRI_GITHUB_ACTIONS_REPOSITORY=TEN_USER_GITHUB/EliaMarier` và `AMORRI_GITHUB_ACTIONS_DISPATCH_TOKEN=...`. Có thể để trống cả hai nếu chỉ dùng lịch Actions định kỳ.

## 7. Xác nhận / chạy website

```powershell
node --env-file=.env.local scripts/check-web2-config.mjs
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Truy cập http://localhost:3000. `check-web2-config` chỉ kiểm tra tính nhất quán ENV, KHÔNG thử kết nối thật tới Firebase/R2.

**Tình trạng test gốc:** Khi kiểm thử starter bằng Node 22.16.0, `npm test` chạy 269 test, 259 PASS / 10 FAIL. Các test lỗi đang kiểm tra hành vi Drive-only/legacy UI hoặc định dạng ô tiền từ phiên bản cũ, trong khi code hiện tại đã sang R2-only và thay đổi UI. Đây là bất nhất có sẵn trong bộ source ZIP, không phải xác nhận hệ thống đã ổn định. Chưa thể khẳng định `npm run build` đạt cho đến khi cài dependency và kiểm tra build đầy đủ; khuyến nghị đối chiếu source repo production mới nhất trước khi đưa khách thật vào dùng.

**Lưu ý:** Source hiện hành ghi `r2-only`, do đó video Drive chưa đồng bộ lên bucket mới **sẽ không phát**, không tự fallback qua Drive. Không copy bucket R2 cũ sang khi mục đích là cô lập dữ liệu.

## 8. Sinh khóa bảo mật mới bằng PowerShell

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Dùng khóa riêng cho `DRIVE_VIDEO_SIGNING_SECRET`, `AMORRI_DELIVERY_LINK_KEY`, `AMORRI_STAFF_LINK_KEY`, `AMORRI_ARCHIVE_ENCRYPTION_KEY`.

## 9. Ghi nhớ

- Chỉ tách URL frontend hoặc bucket R2 là chưa đủ. Website mới phải đổi **cả client & server Firebase env**, admin UID, GitHub workflow secrets, GitHub dispatch repo, Drive nguồn và Vercel.
- Khi website thứ hai hoạt động, bạn có thể đổi tên thương hiệu, logo, domain, bảng màu ở lượt chỉnh sửa riêng.
- Không xóa/sửa dự án Amorri cũ và không dùng Git remote cũ để push bản thứ hai.

## 10. Tên riêng Élia Marier

- Tên hiển thị (bao gồm dấu): **Élia Marier**; mã NPM: `elia-marier-studio`.
- GitHub repository đề xuất: `tandatges-afk/EliaMarier`; Vercel project: `elia-marier`.
- Firebase Project Display Name: `Élia Marier`; Project ID đề xuất: `elia-marier-xxxxx` do Firebase Project ID là duy nhất toàn hệ thống.
- Cloudflare R2 bucket video: `elia-marier-private-videos`; ảnh concept: `elia-marier-concept-photos`.
- Thêm `NEXT_PUBLIC_GITHUB_REPOSITORY=tandatges-afk/EliaMarier` sau khi đã tạo repo để nút dọn R2 không trỏ nhầm repository cũ.
- Không đổi những biến `AMORRI_*` và path lưu trữ `amorri*` trong database nếu chưa thực hiện một migration dữ liệu đầy đủ; website mới an toàn nhờ dùng Firebase project và R2 tách biệt.
- Nếu Vercel chọn subdomain khác do tên đã được đăng ký, sử dụng **subdomain thực tế** trong Firebase Authorized domains và R2 CORS.
- Đây là bản đổi tên source theo bản ZIP nhận được, không phải bản phát hành production được kiểm chứng.
