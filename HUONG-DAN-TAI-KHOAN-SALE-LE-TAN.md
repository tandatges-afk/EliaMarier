# Élia Marier — Tài khoản Sale/Lễ tân (bản bổ sung, 28/10/2026)

## Chức năng

- Admin (`AMORRI_ADMIN_UIDS` hoặc custom claim `admin=true`) thấy tab **Tài khoản nhân viên**; tạo tài khoản Firebase Authentication bằng email, mật khẩu ban đầu, họ tên và vị trí Sale/Lễ tân; sửa họ tên/email/vị trí/mật khẩu; khóa/mở lại và vô hiệu hóa tài khoản. "Xóa" là **khóa đăng nhập mềm** để giữ nhật ký; có thể mở lại.
- Sale/Lễ tân đăng nhập ngay trang chủ `/`, xem lịch và thời gian làm việc của thợ, tạo và cập nhật lịch, giá hợp đồng/tiền cọc, ảnh concept, link sản phẩm, bàn giao và góp ý của khách.
- Sale/Lễ tân **không** được sửa `assignments`, nhập hoặc đọc `assignments[].cost`, không có API lương `/api/payroll*`, không thấy báo cáo chi phí / phân tích, không được quản lý tài khoản hoặc xóa lịch. Admin giữ các quyền này.
- Tài khoản sale/lễ tân được lưu ở `studioPlanner_v1/officeAccounts/<uid>`; tách biệt danh sách thợ `studioPlanner_v1/staff`. Không thêm UID sale/lễ tân vào `AMORRI_ADMIN_UIDS`.

## Cập nhật bằng Visual Studio Code

**Sao lưu trước:** `git status` sạch và đã push source hiện tại. Giải nén bản vá trực tiếp vào thư mục có `package.json` (đừng tạo thư mục con thứ hai), chọn ghi đè file tương ứng. Trước khi push, kiểm tra `git diff` để tránh đè các thay đổi chưa được chia sẻ ở phiên bản đang chạy.

```powershell
git remote -v
npm ci
npm run typecheck
npm run build
npm test

git add app/api/access/me/route.ts app/api/dashboard/route.ts app/api/office-accounts app/api/events app/api/delivery app/api/places/route.ts app/api/scheduling/availability/route.ts lib/server/office-auth.ts lib/server/delivery-http.ts lib/server/staff-scheduling.ts components/Dashboard.tsx components/OfficeAccountsManager.tsx components/NewBookingDialog.tsx components/EventEditor.tsx components/BookingDetailPanel.tsx HUONG-DAN-TAI-KHOAN-SALE-LE-TAN.md tests/elia-office-role-contract.test.mjs
git status --short
git commit -m "Add Elia sale reception role access"
git push origin main
```

Sau khi Vercel deploy thành công, đăng nhập bằng admin hiện tại, chọn **Tài khoản nhân viên**, thêm một nhân viên thử nghiệm. Đăng xuất, đăng nhập bằng tài khoản nhân viên thử nghiệm và thử tạo lịch, sửa tiền cọc, thêm sản phẩm Drive và phát link bàn giao. Đăng nhập lại bằng admin và thử phân công thợ và nhập chi phí.

Không cần thêm biến môi trường mới nếu Firebase Admin đã hoạt động và `AMORRI_ADMIN_UIDS` đúng UID Admin. Dùng **Firebase Admin service account mới**, không dùng JSON key đã từng chia sẻ công khai.

## Kiểm tra phân quyền bắt buộc trước khi dùng thật

1. **Chặn đọc/ghi trực tiếp vào RTDB bằng client SDK.** Bản cũ có các luồng Firebase legacy (góp ý ảnh, thợ); không thể áp đặt một bộ Rules chung chưa kiểm thử mà không gây lỗi. Xuất Rules hiện tại ở Firebase Console → Realtime Database → Rules và kiểm tra quyền của `studioPlanner_v1` và mọi cấp cha. Nếu parent `.read` cho phép nhân viên đọc toàn nhánh, nhân viên có thể lấy được `assignments[].cost` qua SDK dù API đã ẩn. Nếu `.write` cho phép ghi lên `officeAccounts`, nhân viên có thể tự nâng vai trò. Cần chuyển các luồng nhạy cảm sang API hoặc thiết kế lại cây dữ liệu/Rules trước khi xác nhận an toàn. **Không deploy Rules đóng toàn bộ mù quáng** vì có thể hỏng luồng góp ý và cổng thợ.
2. Với token nhân viên, `GET /api/payroll?month=YYYY-MM` và `GET /api/office-accounts` phải 403; `GET /api/dashboard` không chứa chi phí `assignments[].cost`, payroll hoặc audit. `PATCH /api/events/:id` với `changes.assignments` và `POST /api/events` có assignments phải 403.
3. Sau khi khóa nhân viên, refresh hoặc gọi API mới phải 403; không chờ logout ở frontend. Firebase Admin xác thực với `verifyIdToken(..., true)` và kiểm tra record active mỗi request.
4. Kiểm tra UI mobile và quy trình ảnh concept, video, bàn giao. Giữ nguyên workflow R2 và Github Actions đã chạy.
5. **Chưa xác nhận build production** trong môi trường tạo bản vá vì dependency npm chưa cài đầy đủ. Chỉ deploy sau khi `npm ci`, `npm run typecheck`, `npm run build` trên máy bạn và staging đều thành công.

## Ma trận quyền

| Tác vụ | Admin | Sale / lễ tân |
|---|---|---|
| Tạo/chỉnh sửa lịch, ngày giờ, khách, giá hợp đồng, tiền cọc | Có | Có |
| Xem thời gian thợ, danh sách phân công | Có | Có (không có chi phí thợ) |
| Gán/sửa thợ và chi phí nhân sự | Có | Không |
| Sản phẩm bàn giao, link Drive, ảnh concept, góp ý | Có | Có |
| Báo cáo phân tích, lương, dữ liệu hệ thống, xóa lịch | Có | Không |
| Thêm/sửa/khóa/mở nhân viên Sale/Lễ tân | Có | Không |

**Lưu ý:** `studioPlanner_v1/staff` là **danh sách thợ** và hiện vẫn do Admin quản lý. "Tài khoản nhân viên" là danh sách tài khoản vận hành khác, không làm thay đổi portal của thợ.
