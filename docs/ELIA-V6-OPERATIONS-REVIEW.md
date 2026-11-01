# Élia V6 – nâng cấp điều hành trước VPS

## Kiến trúc đang hoạt động

**Firebase Authentication + Firebase Realtime Database + Cloudflare R2 + Vercel** ở thời điểm chuẩn bị. Chưa chuyển dữ liệu sản xuất sang VPS. ZIP này dựa trên bản Firebase Restore Full 03, **không** dựa trên nhánh VPS Beta thuần.

## V6

- Sửa ô tiền Decor/Chọn gói bằng `VndInput`: cho phép số VNĐ bất kỳ, không còn HTML `step=1000` gây validation error.
- Điều hành: Tổng quan → Catalog → Chọn gói → Lịch quay chụp → Lịch Decor → Lịch trang phục → Lịch Makeup → Bàn giao sản phẩm; các tab quản trị khác ở phía sau.
- Decor và Makeup có lịch tháng chọn ngày để lọc. Decor có nhiều tiệc, mỗi tiệc một loại và hai mốc **thi công / tháo dỡ**, không dùng ngày tiệc.
- Chọn gói có nhiều timeline quay chụp, nhiều mã trang phục với ngày nhận/trả khác nhau, nhiều lịch Makeup và nhiều tiệc Decor. Rước dâu có giờ/địa chỉ hai nhà. Nhập số lượng dự kiến cho bốn công việc cưới; **chưa phân công thợ** ở bước Sale tạo gói.
- Hồ sơ khách trong Tổng quan đọc đầy đủ các timeline V6 và tiền/cọc, vẫn hỗ trợ hiển thị gói V5 cũ.
- Lịch makeup sinh từ gói dùng mã liên kết ổn định, có thể sửa lịch và upload ảnh layout. Lượt thuê trang phục từ gói cũng cho phép thao tác nhận/trả trong Lịch trang phục.
- Lưu Chọn gói tạo các lịch con theo `sourcePackageId/sourceEntryId` và giữ trang phục với Firebase transaction chống trùng; đa đường dẫn RTDB update cho các bản ghi lịch. Gói cũ chưa được tự chuyển đổi sang schema V6.
- Leader quay chụp phân công nhân sự thật và chỉnh lịch; giá công được ẩn và giữ nguyên phía server. Lịch thiếu thợ hoặc thiếu số lượng theo bốn công việc có màu hồng/đỏ nổi bật.
- Lịch mới dùng `confirmed`, `done`, `cancelled`. Lịch `pending` cũ được đọc hiển thị như đã chốt; muốn đổi trạng thái gốc trong DB dùng script migration dry-run trước.

## Quy tắc quan trọng

- Tổng tiền/cọc nằm ở **gói**; các lịch con phát sinh từ gói có số tiền 0 để tránh cộng trùng báo cáo.
- Khi hủy gói, lịch con được đánh dấu **đã hủy**, không xóa lịch sử. Không cho hủy khi trang phục vẫn đang `picked_up`.
- Không xóa cứng gói đồng bộ. Hãy hủy gói để giải phóng lịch và trang phục; bản ghi cũ được giữ phục vụ đối soát.
- Khi một lịch quay chụp đã có nhân sự được phân công, không được thay đổi ngày giờ bằng giao diện Chọn gói; chỉnh lịch chuyên môn trước. Lịch quay chụp con không thể bị xóa trực tiếp hoặc sửa tiền/trạng thái tách khỏi gói.
- Lịch Decor/Makeup liên kết từ Chọn gói khi đổi ngày giờ qua API chuyên môn sẽ cập nhật lại kế hoạch gói trước khi trả kết quả.
- Gói từ phiên bản V5 cũ có trường `services` dạng phẳng, phải chuyển đổi với đối soát thủ công. Bản V6 chủ động chặn sửa ghi đè dữ liệu lịch cũ.

## Những việc CHƯA đủ điều kiện production

1. Chưa có chạy test E2E với Firebase thật để đo **đồng thời**: Sale chọn gói → giữ mã váy → Leader phân công → sửa lịch/hủy gói.
2. Các tài nguyên thuộc các nhánh Firebase khác nhau **không có giao dịch ACID chung**. Có bước bù trừ khi lỗi, nhưng nếu hỏng mạng ngay giữa nhiều thao tác vẫn cần đối soát thủ công các booking có `packageId`.
3. `npm run build` chưa được xác nhận trong môi trường này do không cài được đầy đủ dependencies; phải chạy trên Windows và ngừng trước khi push nếu lỗi.
4. Chưa có thao tác chuyển đổi tự động tất cả gói/Decor legacy. Không nên thay thế production khi chưa sao lưu và thử migration.
5. Kiểm thử tải ở mức nhiều Sale/Leader sửa cùng bản ghi và kiểm tra quyền truy cập thực tế chưa chạy.

## Cách thử nghiệm local

```
npm ci
npm run test:elia-v6
npm run test:firebase-restore
npm run build
```

Khuyến nghị đưa lên preview/staging trước, không deploy thẳng lên `main` sản xuất. Nếu muốn chuyển trạng thái `pending` cũ, chạy `node --env-file=.env.local scripts/elia-v6-migrate-pending.mjs` để xem dry-run, sau khi có FULL BACKUP dùng `--backup=... --apply --confirm=CONFIRM_PENDING_TO_CONFIRMED`.

Trước khi chuyển VPS: duy trì Firebase Auth/RTDB và R2 trong thời gian chuyển tiếp; export database, tài khoản và media; sau đó di chuyển qua PostgreSQL và local media theo kế hoạch riêng.
