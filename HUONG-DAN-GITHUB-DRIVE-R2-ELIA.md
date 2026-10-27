# Élia Marier — kết nối GitHub Actions, Google Drive, R2 (28/10/2026)

Đây là bản đã được điền trước **chỉ cấu hình công khai** từ thông tin bạn cung cấp:

- Firebase project `eliamarier`, Realtime Database `https://eliamarier-default-rtdb.firebaseio.com/`
- Web `https://eliamarier.vercel.app/`, Firebase admin UID đã được điền trong `.env.example`
- Bucket video `elia-marier-private-videos`, bucket concept `elia-marier-concept-photos`
- GitHub mục tiêu `tandatges-afk/EliaMarier` (chỉ hoạt động khi repo thực sự đã được tạo)

**CỰC KỲ QUAN TRỌNG:** JSON Firebase Admin đã tải lên chat là credential nhạy cảm. Tạo key mới, cập nhật chỗ cần sử dụng và vô hiệu hóa/xóa key cũ. Bản ZIP này KHÔNG chứa bất kỳ JSON khóa riêng nào. Không dùng lại khóa cũ.

## 1. Push source an toàn lên GitHub

Mở VS Code tại **thư mục có package.json**. Cài Git, Node.js 22+ và GitHub CLI (`https://cli.github.com`).

```powershell
gh auth login
gh repo view tandatges-afk/EliaMarier
```

Nếu repository chưa tồn tại, tạo repository **Private** tại https://github.com/new (chọn đúng owner), không thêm README. Trong thư mục source:

```powershell
git init
git branch -M main
git add .
git status --short
# Kiểm tra: KHÔNG có file JSON Firebase Admin / Drive private key / .env.local trong staged files
git commit -m "Set up Elia Marier Drive to R2"
git remote -v
# Nếu có origin trỏ về Amorri cũ: dừng; không được push.
# Nếu chưa có remote:
git remote add origin https://github.com/tandatges-afk/EliaMarier.git
git push -u origin main
```

Nếu `origin` đã có đúng URL, KHÔNG chạy lại `git remote add`.

## 2. Bật Google Drive API và tạo Drive Reader riêng

1. Vào https://console.cloud.google.com/apis/library/drive.googleapis.com?project=eliamarier, **Enable** Google Drive API.
2. https://console.cloud.google.com/iam-admin/serviceaccounts?project=eliamarier → Create service account. Đặt ID `elia-drive-reader`. Không cần cấp vai trò quản trị Firebase cho tài khoản này (nó chỉ cần quyền tới thư mục Drive được chia sẻ).
3. Mở service account mới → Keys → Add key → JSON. Lưu ngoài repo, ví dụ `C:\EliaSecrets\elia-drive-reader.json`.
4. Trên Google Drive, tạo thư mục video riêng cho Élia Marier. Trong Share, thêm địa chỉ service account mới `elia-drive-reader@eliamarier.iam.gserviceaccount.com` (địa chỉ thực tế hiện trên Google Cloud), cấp **Viewer**. Hạn chế quyền truy cập ở mức thư mục này; không cấp Editor trừ khi thật sự cần.
5. Copy ID thư mục từ URL `https://drive.google.com/drive/folders/FOLDER_ID`. KHÔNG copy URL để làm ID.
6. Upload thử một MP4 **đã xuất sẵn 1920×1080, codec H.264/AAC** vào thư mục. Worker hiện tại KHÔNG tự chuyển video 4K xuống 1080p.

Google Drive API yêu cầu Google Cloud project đã bật API và reader phải được share thư mục. Credentials Drive RIÊNG so với Firebase Admin để hạn chế quyền.

## 3. Cấu hình GitHub Actions tự động bằng PowerShell (không push secret)

Đảm bảo bạn đã có:
- `C:\EliaSecrets\firebase-admin-ROTATED.json` (key mới, không phải bản vừa tải lên chat)
- `C:\EliaSecrets\elia-drive-reader.json`
- Cloudflare Account ID; R2 token có quyền Object Read & Write CHỈ bucket video mới
- `gh auth login` đã thành công; repo mới đã nhận source và chứa `.github/workflows/r2-video-sync.yml`

Trong Terminal VS Code:

```powershell
.\scripts\setup-elia-github-actions.ps1
```

Script sẽ hỏi 2 đường dẫn JSON và R2 Account ID, kiểm tra project Firebase, hỏi R2 access key qua chế độ ẩn, rồi cài **GitHub Secrets + Variables**. Script giữ `AMORRI_ENABLE_AUTO_R2_SYNC=false` để không chạy tự động trước khi thử.

Nếu PowerShell chặn script, dùng **chỉ trong terminal hiện tại**:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-elia-github-actions.ps1
```

Không đưa JSON vào thư mục GitHub source và không chụp ảnh chứa key/token.

## 4. Chạy thử thư mục Google Drive an toàn

Mở GitHub → repo `EliaMarier` → Actions → **Élia Marier Private R2 Video Sync** → Run workflow:
- `drive_folder_id`: FOLDER_ID ở bước 2
- `drive_file_id`: để trống
- `dry_run`: `true` (MẶC ĐỊNH)

Hoặc:

```powershell
gh workflow run r2-video-sync.yml --repo tandatges-afk/EliaMarier --ref main -f drive_folder_id=THAY_FOLDER_ID -f dry_run=true
gh run list --repo tandatges-afk/EliaMarier --limit 5
```

Trên GitHub → Actions mở run và kiểm tra log `WOULD SYNC`. Ở chế độ dry run **không upload video**. Nếu log báo 403, kiểm tra bật Google Drive API và chia sẻ folder cho email Drive reader, không phải email Firebase Admin. Nếu `NEEDS_1080p`, cần file H.264/AAC 1080p.

Khi dry run đạt, chạy thủ công với `dry_run=false` rồi vào R2 để xác nhận file đã lên bucket video và trang bàn giao phát được.

## 5. Bật tự động đồng bộ sau khi kiểm tra xong

Trong Settings → Secrets and variables → Actions → Variables, sửa `AMORRI_ENABLE_AUTO_R2_SYNC=true`, hoặc:

```powershell
gh variable set AMORRI_ENABLE_AUTO_R2_SYNC --body true --repo tandatges-afk/EliaMarier
```

Source chạy workflow lịch `17 * * * *` (mỗi giờ tại phút 17 theo UTC), tối đa hai video mới mỗi lượt. Lịch có thể bị GitHub trì hoãn; không phải thời gian cố định. Việc tự quét cần **link video/folder Drive được lưu trong sản phẩm của lịch tại Firebase**: `studioPlanner_v1/events` trong khung thời gian worker tìm kiếm. Nếu không có lịch/sản phẩm, log sẽ báo 0 nguồn.

**Đồng bộ tức thì khi cập nhật lịch**: tạo GitHub fine-grained PAT giới hạn repo Élia Marier, quyền Repository permissions → Actions **Read and write**, rồi đặt trên Vercel **chỉ phía server**:

```dotenv
AMORRI_GITHUB_ACTIONS_REPOSITORY=tandatges-afk/EliaMarier
AMORRI_GITHUB_ACTIONS_DISPATCH_TOKEN=<PAT tạo riêng, không gửi qua chat>
```

GitHub token không bắt buộc nếu chấp nhận worker chạy định kỳ. Không commit PAT vào repo.

## 6. Vercel Environment Variables

Ở https://vercel.com/dashboard, chọn project `eliamarier` (tên project thực tế có thể khác) → Settings → Environment Variables → Production. Các biến đã biết nằm trong `.env.example`. **Mọi biến còn để trống phải tự điền:**

- `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON Firebase Admin MỚI, dạng một dòng
- `DRIVE_SERVICE_ACCOUNT_JSON` = JSON Drive reader MỚI, dạng một dòng
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` = token video playback (Object Read)
- `R2_CONCEPT_ACCESS_KEY_ID`, `R2_CONCEPT_SECRET_ACCESS_KEY` = token concept photo (Read & Write)
- `DRIVE_VIDEO_SIGNING_SECRET`, `AMORRI_DELIVERY_LINK_KEY`, `AMORRI_STAFF_LINK_KEY`, `AMORRI_ARCHIVE_ENCRYPTION_KEY` = bốn khóa sinh ngẫu nhiên độc lập (`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` bốn lần)
- `AMORRI_GITHUB_ACTIONS_DISPATCH_TOKEN` nếu muốn sync tức thì

Vercel cần service account mới và cả hai biến `NEXT_PUBLIC_FIREBASE_DATABASE_URL` / `FIREBASE_DATABASE_URL` = `https://eliamarier-default-rtdb.firebaseio.com/`. Sau khi thay ENV phải Redeploy. Firebase Auth → Authorized domains phải có `eliamarier.vercel.app`. CORS bucket video phải có **origin đúng** `https://eliamarier.vercel.app`.

LƯU Ý: `.env.example` có sẵn những thông tin Firebase Web SDK phía client (chúng là public client configuration); không chứa private key.

## 7. Kiểm tra cấu hình và build

```powershell
Copy-Item .env.example .env.local
# Điền những biến còn trống bằng VS Code; không commit .env.local
code .env.local
node --env-file=.env.local scripts/check-web2-config.mjs
npm ci
npm run typecheck
npm run build
```

`check-web2-config` chỉ xác nhận giá trị ENV có vẻ nhất quán; không kiểm tra quyền API thật. Source starter cũ trước đó có 10/269 bài test fail; không được coi là đã production-ready cho đến khi typecheck/build, luật bảo mật Firebase và upload/playback end-to-end đạt.

**Không cần upload Firebase Admin JSON hoặc khóa R2 lên ChatGPT nữa.**
