# Élia Marier — Bản vá giao diện góp ý ảnh (28/10/2026)

## Thay đổi
- Bỏ nút thu gọn / mở rộng “Góp ý ảnh” và icon có `aria-hidden` ở khung góp ý.
- Tên ảnh hiển thị ở góc **dưới bên trái của ảnh** cùng lớp nền chuyển sắc để dễ đọc; không chiếm thêm hàng riêng dưới ảnh.
- Vẫn giữ hai nút **Chọn ảnh** và **Tải ảnh** ở dưới ảnh.
- Khung góp ý luôn có một textarea nhỏ 1 dòng và nút **Gửi** bên phải.
- Textarea tự giãn theo nội dung, tối đa cao 280px rồi cho cuộn để không kéo dài trang vô hạn.
- Góp ý đã gửi nằm sẵn trong ô để chỉnh sửa; khi xoá sạch nội dung, nút chuyển thành **Xóa** và yêu cầu xác nhận trước khi xoá góp ý cũ.
- Không đổi API, Firebase, R2, bình luận video hoặc quyền truy cập.

## Cách cài vào dự án Élia Marier hiện có (Windows / VS Code)

1. Sao lưu hoặc commit các thay đổi chưa push. Đảm bảo `git remote -v` trỏ tới repository **EliaMarier**, KHÔNG phải Amorri cũ.
2. Đứng trong thư mục chứa `package.json`, giải nén ZIP bản vá với lựa chọn ghi đè 4 file `components/` và thêm file `tests/`.
3. Chạy kiểm tra:

   ```powershell
   node --experimental-strip-types --test tests/photo-feedback-compact-elia.test.mjs tests/photo-comment-327.test.mjs
   npm run typecheck
   npm run build
   ```

   Nếu chưa cài dependencies, chạy `npm ci` trước (Node >=22.16).
4. Chỉ stage các file thay đổi:

   ```powershell
   git add components/ClientDelivery.tsx components/PhotoFeedback.tsx components/delivery.css components/photo-feedback.css tests/photo-feedback-compact-elia.test.mjs
   git commit -m "Compact photo title and comment box"
   git push origin main
   ```

5. Kiểm tra deployment mới ở Vercel và tải lại trang bàn giao ảnh (Ctrl+Shift+R).

### Lưu ý
- Đây là bản vá theo source Élia Marier Complete VSCode Starter ngày 28/10/2026. Nếu bạn đã sửa chính các file này sau ngày đó, so sánh diff trước khi ghi đè để tránh mất thay đổi.
- 17 kiểm thử liên quan đến màn hình ảnh / góp ý / booking đã vượt qua trong môi trường kiểm tra. Chưa xác minh build Next.js production vì môi trường thử nghiệm không cài được đủ dependencies.
