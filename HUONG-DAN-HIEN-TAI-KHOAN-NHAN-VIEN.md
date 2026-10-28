# Élia Marier — Hiển thị nút thêm tài khoản nhân viên

Bản vá chỉ thêm đường dẫn `/admin/nhan-vien` và nút truy cập rõ ràng trên Dashboard Admin. Không thêm/mở rộng quyền. API `/api/office-accounts` vẫn xác thực `authenticatedAdmin` phía server.

## Cài đặt bằng VS Code / PowerShell

1. Sao lưu/commit các thay đổi hiện tại. Kiểm tra đang ở repo `tandatges-afk/EliaMarier`, thư mục có `package.json`.
2. Giải nén ZIP này trực tiếp vào thư mục dự án, ghi đè `components/Dashboard.tsx` sau khi so sánh nếu bạn đã chỉnh file này.
3. Kiểm tra:

```powershell
Test-Path '.\app\admin\nhan-vien\page.tsx'
Test-Path '.\components\OfficeAccountsManager.tsx'
Test-Path '.\app\api\office-accounts\route.ts'
npm run typecheck
npm run build
```

Cả ba Test-Path phải True. Nếu thiếu file 2 hoặc 3, bạn phải cài bản vá Sale/Lễ tân trước.

4. Push sau khi build thành công và kiểm tra đã không đưa `.env.local`/JSON bí mật vào commit:

```powershell
git add -- 'components/Dashboard.tsx' 'app/admin/nhan-vien/page.tsx'
git commit -m 'Make employee account management easy to find'
git push origin main
```

5. Kiểm tra Vercel Production deployment Ready. Truy cập `https://eliamarier.vercel.app/admin/nhan-vien`. Đăng nhập Admin ở trang chủ trước.

## Nếu trang hiển thị không có quyền

Ở `/admin/nhan-vien`, trạng thái `denied` sẽ hiện vai trò thực tế từ `/api/access/me`. Đảm bảo `AMORRI_ADMIN_UIDS` trên Vercel Production có UID Admin thật, không được gán UID sale vào biến này. Lưu biến rồi Redeploy.

## Bảo mật

Chưa đưa nhân viên vào vận hành với dữ liệu thật khi chưa kiểm tra Firebase Realtime Database Rules, vì client legacy có thể đọc/ghi trực tiếp vào `studioPlanner_v1`. Khóa Firebase Admin trước từng chia sẻ phải được thu hồi và thay bằng khóa mới.
