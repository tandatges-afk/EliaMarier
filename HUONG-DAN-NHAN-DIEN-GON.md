# Élia Marier — Logo tinh chỉnh & Tổng quan gọn hơn

## Thay đổi
- Thay chữ E placeholder trong avatar sidebar và topbar bằng biểu tượng É, kèm **ÉLIA MARIER phía dưới**, hiển thị rõ cả khi kích thước nhỏ.
- Đầu sidebar dùng monogram + wordmark đặt dọc, giữ link điều hướng và phần tên tài khoản.
- Loại bỏ **hai** khối thừa chỉ trên tab **Tổng quan**: thẻ Tài khoản lễ tân và banner lớn “Tinh tế trong từng lịch hẹn”. Quản lý Lễ tân vẫn có trong menu “Tài khoản nhân viên” và URL /admin/nhan-vien.
- Loại nút shortcut quản lý nhân viên trùng ở góc header; chỉ giữ menu quản trị chính.
- Hiệu ứng logo chuyển thành fade-in nhẹ (không phóng to, hít thở, glow liên tục); hỗ trợ prefers-reduced-motion.
- `public/logo-mark.png` được cắt lại sạch, tránh phần nét thừa. `public/logo.png` nguyên bản không thay đổi.

## Cách cài, không ghi đè Dashboard trực tiếp
1. Sao lưu hoặc commit thay đổi chưa lưu.
2. Giải nén file ZIP vào **đúng thư mục có package.json**, ghi đè các file mới của bản vá.
3. Mở terminal tại thư mục đó:

```powershell
node .\scripts\apply-elia-brand-refine.mjs
node .\scripts\check-elia-brand-refine.mjs
npm run typecheck
npm run build
```

Script đọc và chỉnh `components/Dashboard.tsx` theo từng đoạn đã xác nhận. Trước khi ghi, nó lưu bản gốc trong `Downloads/EliaMarier-Brand-Backups` (bên ngoài repo), có thể chạy lại mà không tạo thay đổi thừa. Nếu source khác cấu trúc, script sẽ dừng lại thay vì xóa nhầm một khối khác.

4. **Chỉ sau khi typecheck và build thành công**, push:

```powershell
git status --short
git add -- components/EliaBrandMini.tsx components/elia-brand-refine.css components/Dashboard.tsx public/logo-mark.png scripts/apply-elia-brand-refine.mjs scripts/check-elia-brand-refine.mjs HUONG-DAN-NHAN-DIEN-GON.md
git diff --cached --name-only
git commit -m "Refine Elia branding and simplify overview"
git push origin main
```

Đừng commit `.env.local`, JSON Service Account hay token.

## Kiểm tra sau deploy
- Trang Tổng quan mở thẳng phần hoạt động, KPI và lịch, không có hai banner cũ.
- Logo ở đầu sidebar / footer tài khoản / góc header có chữ ÉLIA MARIER rõ phía dưới; không còn vòng tròn ký tự E.
- Trên điện thoại, menu và nút Đăng xuất vẫn hoạt động.
- Tab Tài khoản nhân viên và Hệ thống / Kho trang phục vẫn mở được.

**Ghi chú:** Bản vá này dành cho source đã áp dụng logo chính thức ngày 29/10. Không thay đổi backend, Firebase, R2 hay lịch trang phục. Kiểm tra cú pháp TSX của bản vá đã đạt; build production toàn repo cần chạy bằng Node/npm trên máy bạn.
