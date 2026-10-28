# Élia Marier – Mã trang phục & cảnh báo lịch thuê trước/sau 2 ngày

## Cải tiến
- Đổi giao diện "Hình ảnh trang phục / Concept" cũ thành mã váy cưới, ngày lấy, ngày trả; không có nút upload ảnh mới. Ảnh concept cũ vẫn lưu tại Firebase/R2 và có thể đọc qua API GET cũ.
- Áp dụng tại **Tạo lịch quay/chụp**, **Chỉnh sửa lịch**, **Lịch váy cưới**. Nếu một màn hình cũ còn dùng `ConceptPhotoGallery`, màn hình đó cũng hiển thị bộ chọn mã váy từ API lịch.
- Nhập một phần mã hoặc tên trang phục để lọc danh mục; lựa chọn mã không tạo mã mới. Admin thêm/sửa mã tại Hệ thống → Kho trang phục.
- Khi chọn ngày lấy/trả, kiểm tra **hai ngày trước** ngày lấy và **hai ngày sau** ngày trả cho cùng mã. Hiện tên khách, ngày thuê, số liên hệ (nếu có), và khoảng cách 1–2 ngày.
- Trùng bất kỳ ngày thuê nào (bao gồm ngày nhận và ngày trả): **không cho đặt**.
- Lịch không trùng nhưng sát 1–2 ngày: **cảnh báo**, nhân viên cần tích xác nhận đã xem/tư vấn thời hạn trả trước khi lưu.
- Kiểm tra thêm tại API Firebase, bằng transaction. Nếu trong lúc người dùng thao tác xuất hiện lịch sát ngày mới chưa được họ xác nhận, máy chủ trả `NEARBY_ACK_REQUIRED` để buộc tải lại và xem tên khách mới.
- Ngày lấy/trả trang phục **độc lập** với ngày thực hiện lịch quay/chụp. Một lịch quay ngày 22 có thể lấy váy ngày 20 và trả ngày 23.

## Ví dụ
Mã VC-001 định đặt 20–22/11:
- Khách A: 18–19/11 → cảnh báo **trước 1 ngày**, yêu cầu xác nhận thời gian khách A trả và thời gian vệ sinh.
- Khách B: 23–24/11 → cảnh báo **sau 1 ngày**, nhắc khách hiện tại trả đúng hạn hoặc thỏa thuận trả sớm.
- Khách C: 22–23/11 → **trùng ngày trả 22/11, từ chối đặt**.
- Khách D: 25–26/11 → không cảnh báo; đã cách 3 ngày từ ngày trả 22/11.

**Quan trọng:** Quy tắc ±2 ngày chỉ cảnh báo rủi ro vận hành, **không tự động khóa ngày đệm**. Nó không dự đoán chính xác khách sẽ trả trễ. Nếu cửa hàng cần giữ thêm ngày vệ sinh như ngày cấm thuê, phải thiết kế quy tắc khóa ngày đệm riêng.

## Cài đặt trên Windows + VS Code
1. Mở đúng dự án `EliaMarier` có `package.json`. Chạy `git status --short`, sao lưu hoặc commit thay đổi chưa đưa lên Git trước.
2. Giải nén file ZIP bản vá này **vào thư mục gốc chứa package.json**. Chọn ghi đè đúng các file bản vá. Không giải nén thêm một cấp thư mục con.
3. Kiểm tra:
   ```powershell
   node .\scripts\check-elia-wardrobe-prediction.mjs
   npm run typecheck
   npm run build
   node --experimental-strip-types --test tests/wedding-advisory.test.mjs tests/wedding-advisory-integration.test.mjs tests/wedding-wardrobe.test.mjs tests/wedding-catalog-integration.test.mjs
   ```
4. Nếu typecheck, build và tests đạt:
   ```powershell
   git status --short
   git add -- components/ConceptPhotos.tsx components/NewBookingDialog.tsx components/WardrobeEventCodes.tsx components/WardrobeRiskNotice.tsx components/WeddingWardrobe.tsx components/wedding-wardrobe.css lib/domain/wedding-advisory.ts lib/domain/wedding-rental.ts lib/server/wedding-wardrobe.ts app/api/wedding-wardrobe/availability/route.ts app/api/wedding-wardrobe/bookings/route.ts 'app/api/events/[id]/concept-photos/route.ts' scripts/check-elia-wardrobe-prediction.mjs tests/wedding-advisory.test.mjs tests/wedding-advisory-integration.test.mjs HUONG-DAN-DU-BAO-LICH-TRANG-PHUC.md
   git diff --cached --name-only
   git commit -m "Wardrobe codes and 2-day rental risk alerts"
   git push origin main
   ```
5. Đảm bảo Vercel deploy từ cùng GitHub repository/nhánh main và đã đạt Ready.

## Kiểm tra thực tế
- Admin → Hệ thống → Kho trang phục: có mã `VC-001`.
- Lễ tân → Lịch váy cưới: giữ VC-001 từ 23–24/11/2026 cho khách B.
- Tạo lịch khác, gõ `VC-001`, lấy 20/11/2026, trả 22/11/2026: hiện khách B, khoảng ngày, cảnh báo **sau 1 ngày**. Chỉ lưu khi lễ tân xác nhận đã xem cảnh báo.
- Thử lịch lấy 22/11, trả 23/11: trùng ngày 23 → không được lưu.
- Mở lại lịch đã có mã: vẫn hiển thị cảnh báo khi có lịch sát ngày.
- Kiểm tra ảnh concept cũ vẫn không bị xóa khỏi Firebase/R2.

## Các lưu ý
- Chỉ dùng chung Firebase/R2 đã cấu hình cho Élia Marier; không thêm khóa mới.
- API `POST /api/events/[id]/concept-photos` trả 410 vì thay thế bằng lựa chọn mã; GET/DELETE ảnh cũ vẫn hoạt động.
- Chỉ các tài khoản Admin/Lễ tân đã đăng nhập được xem tên khách và lịch. Kiểm tra lại **Firebase RTDB Rules** để ngăn truy cập trực tiếp trái phép.
- Nếu máy bạn còn lỗi build từ các file khác, hãy gửi đầy đủ log. Không push khi `npm run build` chưa thành công.
