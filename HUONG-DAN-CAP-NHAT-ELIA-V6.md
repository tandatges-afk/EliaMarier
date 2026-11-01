# Élia Marier V6 – Điều hành, lịch dịch vụ và gói liên kết

## Trạng thái triển khai

Bản này **dành cho Preview / staging** và tiếp tục dùng Firebase Authentication, Realtime Database, Google Drive, R2 và Vercel ở giai đoạn chuyển tiếp. Không yêu cầu chuyển tài khoản sang PostgreSQL. Không thay đổi biến môi trường đang dùng, không xóa Firebase/R2.

## Thay đổi

1. Ô tiền Decor và Chọn gói sử dụng chung `VndInput`, không còn bị trình duyệt từ chối vì `step=1000`.
2. Decor và Makeup có lịch tháng; nhấn ngày để lọc lịch.
3. Thứ tự menu: Tổng quan, Catalog, Chọn gói, Lịch quay chụp, Lịch Decor, Lịch trang phục, Lịch Makeup, Bàn giao sản phẩm.
4. Chọn gói: nhiều timeline quay/chụp (đủ chi tiết Rước dâu), nhu cầu 4 nhóm thợ, nhiều trang phục với ngày lấy/trả và kiểm tra trùng, nhiều lịch Makeup và nhiều tiệc Decor.
5. Decor: Dạm ngõ, Đám nối, Vu quy, Thành hôn; mỗi tiệc có ngày thi công/tháo dỡ, không có ngày tiệc chung.
6. Có tổng chi phí, cọc, còn lại tại gói. Lịch con từ gói không cộng tiền lần nữa.
7. Lưu gói tạo/đồng bộ lịch chuyên môn; Leader quay/chụp chỉ sửa ngày, giờ và phân công thợ; các lịch chưa đủ thợ được cảnh báo màu. Leader Decor/Makeup sửa thời gian trong lịch chuyên môn.
8. Chỉ còn trạng thái Đã chốt, Hoàn thành, Đã hủy cho lịch mới; trạng thái cũ `pending` hiển thị như Đã chốt và có công cụ chuyển dữ liệu riêng.
9. Hồ sơ khách hàng hiển thị nhiều lịch dịch vụ của gói V6.

## Triển khai bằng terminal Windows PowerShell

Giải nén gói Hotfix V6 vào Downloads, tại terminal PowerShell:

```powershell
cd "C:\Users\Admin\Downloads\Elia_Marier_VSCode_Starter\EliaMarier"
$patch = "$env:USERPROFILE\Downloads\EliaMarier-V6-Operations-Hotfix.zip"
$unzip = Join-Path $env:TEMP "elia-v6-update"
Expand-Archive -LiteralPath $patch -DestinationPath $unzip -Force
& "$unzip\EliaMarier-V6-Update\Apply-Elia-V6.ps1" -Repo (Get-Location).Path
```

Script từ chối ghi đè khi Git chưa sạch, sao lưu file bị thay thế bên ngoài repository, không thay `.env.local`, `.git`, `package-lock.json`.

Tiếp theo:

```powershell
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
npm run test:elia-v6
if ($LASTEXITCODE -ne 0) { throw 'V6 tests failed' }
npm run test:elia-v5
if ($LASTEXITCODE -ne 0) { throw 'V5 tests failed' }
npm run test:firebase-restore
if ($LASTEXITCODE -ne 0) { throw 'Firebase restore tests failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed. Do not push main.' }
```

Kiểm tra các luồng trên Preview bằng tài khoản Admin, Sale, Leader trước khi cân nhắc đưa lên production. Khi thấy file `.env.local`, khóa riêng tư hoặc file credentials xuất hiện trong `git status`, **không được `git add -A`**.

## Giới hạn và dữ liệu cũ

- Cần sao lưu toàn bộ Firebase Realtime Database trước khi thử tạo, sửa, hủy gói trên staging.
- Gói V5 cũ có cấu trúc ngày/giờ phẳng: vẫn đọc được trong hồ sơ nhưng không tự đổi sang V6; khi sửa sẽ nhận cảnh báo thay vì ghi đè.
- Firebase RTDB không có transaction đa nhánh toàn phần. Dù đã thêm chống trùng và bù trừ, vẫn cần thử thực tế các trường hợp 2 Sale cùng giữ trang phục, Leader sửa lịch và mạng bị gián đoạn.
- Không thực hiện migration `pending` trực tiếp: `scripts/elia-v6-migrate-pending.mjs` mặc định dry-run; chỉ dùng `--apply` với backup và xác nhận chủ động.
- Chưa xác nhận `npm run build` trên máy khách và chưa có E2E Firebase production. Bản này **không được gọi là VERIFIED production**.

Tài liệu kỹ thuật mở rộng: `docs/ELIA-V6-OPERATIONS-REVIEW.md`.
