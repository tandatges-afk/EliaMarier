# Élia Marier — bản vá quản lý Sale / Lễ tân đầy đủ

Bản vá hợp nhất từ các cập nhật trước để sửa lỗi build `Module not found: Can't resolve './OfficeAccountsManager'`. Bao gồm component, API, phân quyền, trang `/admin/nhan-vien` và bản sửa TS2352. Chép vào **thư mục gốc chứa package.json**, không tạo thêm thư mục lồng nhau.

## Cài trong PowerShell (ở thư mục dự án)

```powershell
# Xem các thay đổi hiện tại trước khi ghi đè
git status --short
# Nên commit hoặc sao lưu những thay đổi chưa lưu trước khi giải nén
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\EliaMarier_Fix_QuanLyNhanVien_DayDu_20261028.zip" -DestinationPath (Get-Location).Path -Force

# Xác nhận các file bắt buộc
Test-Path '.\components\OfficeAccountsManager.tsx'
Test-Path '.\app\api\office-accounts\route.ts'
Test-Path -LiteralPath '.\app\api\office-accounts\[uid]\route.ts'
Test-Path '.\app\admin\nhan-vien\page.tsx'

npm run typecheck
npm run build
```

Chỉ khi tất cả kiểm tra thành công và bạn đã rà soát danh sách file nhạy cảm, push:

```powershell
git add app components lib tests
git diff --cached --name-only
git commit -m "Fix employee accounts manager and admin page"
git push origin main
```

Truy cập https://eliamarier.vercel.app/admin/nhan-vien sau khi Vercel Ready.

**Quan trọng:** Bản vá này ghi đè các file TS/TSX có trong ZIP. Nếu đã sửa các file trùng tên, hãy so sánh trước khi giải nén. Không chứa `.env.local` hay khóa bí mật. Việc kiểm toán Firebase Realtime Database Rules vẫn là bước bắt buộc trước khi cấp tài khoản Sale/Lễ tân có dữ liệu thật. Kiểm thử tĩnh không thay thế kiểm thử Production.
