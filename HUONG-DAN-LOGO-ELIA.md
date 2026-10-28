# Élia Marier — logo chính thức nền trong suốt

File `logo.png` ở **thư mục gốc repository GitHub** (đúng yêu cầu), cùng một bản `public/logo.png` để Next.js truy cập bằng `/logo.png` và `public/logo-mark.png` là biểu tượng dùng khi không đủ chỗ hiển thị cả chữ.

## Cài đặt an toàn không ghi đè Dashboard của bạn

1. Mở VS Code tại dự án `EliaMarier` có `package.json`. Sao lưu/commit thay đổi hiện có.
2. Giải nén ZIP này **vào thư mục dự án gốc** (đừng tạo thêm một thư mục lồng nhau).
3. Chạy `node scripts/apply-elia-logo.mjs`.
4. Chạy `npm run typecheck`, `npm run build`.
5. Chỉ push khi build đạt: `git add logo.png public/logo.png public/logo-mark.png components/elia-logo.css components/Dashboard.tsx app/layout.tsx scripts/apply-elia-logo.mjs HUONG-DAN-LOGO-ELIA.md` rồi `git commit -m "Add official Elia Marier logo and gentle branding effects"` và `git push origin main`.

## Vị trí thay đổi

- Trang đăng nhập: logo đầy đủ màu trắng trên nền tối.
- Sidebar: ký hiệu lấy từ logo trên nền ngà để đọc rõ ở kích thước nhỏ.
- Màn hình khởi động: logo đầy đủ, hiệu ứng xuất hiện + đổ bóng nhẹ.
- Banner Tổng quan và topbar mobile: ký hiệu từ logo.
- Tab trình duyệt: favicon từ ký hiệu logo.

Hiệu ứng nhẹ và tôn trọng `prefers-reduced-motion`. Không cần thêm API key. Không thay Firebase/R2/Drive. Để Next.js dùng `public/logo.png`, chỉ lưu `logo.png` ở root GitHub là chưa đủ.

### Nếu hình cũ còn hiện

Chạy hard refresh Ctrl+F5 và xác nhận trong Vercel Deployments rằng commit mới đã được triển khai; kiểm tra `/logo.png` và `/logo-mark.png` trả 200.
