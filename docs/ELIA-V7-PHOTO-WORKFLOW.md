# ÉLIA V7 — Quy tắc quay chụp & phân công thợ (beta)

## Phạm vi

Áp dụng cho **Chọn gói** và **Lịch quay chụp**. Giữ nguyên Firebase Authentication, Firebase Realtime Database và phát video/ảnh qua R2 trên phiên bản Vercel hiện tại; **không chuyển VPS trong bản vá này**.

- Thay 4 trường nhập số lượng thợ luôn hiện bằng nút **Thêm thợ**. Trong Chọn gói, chọn loại thợ nhiều lần để tăng số lượng, xem và giảm số lượng trên chip. Khi Leader phân công, bấm **Thêm thợ** để chọn người cụ thể; có thể đổi công việc từng người và bỏ người đã chọn.
- **Chụp cổng, Concept:** chỉ thợ chụp. **Dạm ngõ, Xuất giá, Pre-wedding:** thợ chụp, thợ quay. **Đám nối, Vu quy, Rước dâu, Vu quy + Đám nối:** 4 loại (chụp/quay thường, chụp/quay phóng sự).
- Chỉ **Chụp cổng, Concept, Pre-wedding** cần nhập điểm chụp riêng. Các dịch vụ một nhà mặc định nhà dâu; **Rước dâu**, **Vu quy + Đám nối** nhận cả nhà trai và nhà gái. Với **Vu quy + Đám nối**, từng thợ được phân phải chọn rõ nhà; không ngầm mặc định về nhà dâu hoặc nhà trai.
- Nhập tên, số điện thoại, địa chỉ chú rể khi dịch vụ cần nhà trai; ngoài ra thông tin chú rể là tùy chọn. Thêm nhà hàng nhà trai và nhà hàng nhà gái cho lịch thợ xem. Không còn trường **SĐT liên hệ** bổ sung trong Chọn gói. Tạo gói mặc định **Đã chốt**, không hiện lựa chọn trạng thái khi đang tạo; có thể cập nhật trạng thái sau đó.
- Loại các đoạn hint hướng dẫn lặp lại khỏi biểu mẫu tạo gói và phân công; không thay đổi các thông báo lỗi và cảnh báo xung đột cần thiết.

## Cài đặt

Áp dụng sau **V6 Operations + Hotfix 04**. `Apply-Elia-V7.ps1` kiểm tra SHA-256 file nguồn và file đích trước khi ghi, sao lưu bên ngoài repo và dừng khi có thay đổi riêng. Không thay đổi `.git`, `.env.local` hay khóa API.

Chạy trên máy Windows đã có npm dependencies:

```powershell
npm ci
npm run test:elia-v7
npm run test:elia-v6
npm run test:elia-v5
npm run test:firebase-restore
npm run build
```

Sau đó kiểm thử thủ công trên Vercel Preview/Firebase staging: tạo mới từng loại gói, đổi lịch, Leader phân công 2 nhà, xem thông tin nhà hàng ở cổng nhân viên, sửa/hủy lịch liên kết, đặt trang phục đồng thời. Chỉ đưa lên `main` sau khi qua build, kiểm tra chức năng và xác nhận cấu hình production.

## Tình trạng kiểm thử

- `test:elia-v7` + V6/V5/Firebase: **37/37 đạt** khi chạy Node test trong môi trường đóng gói.
- Kiểm tra TypeScript riêng cho các module domain chính: đạt.
- Kiểm tra cú pháp TypeScript/TSX: đạt.
- **Chưa xác nhận được `npm run build` production đầy đủ** do môi trường này thiếu gói npm. Build phải được xác nhận trên máy triển khai.
- Việc sửa/hủy gói sau phân công và xử lý nhiều nhân viên đồng thời cần E2E bằng dữ liệu staging trước khi lên `main`.
