# Élia Marier — Lịch váy cưới & thuê trang phục

## Tính năng

- Menu trái có tab **Lịch váy cưới** cho cả Admin và Lễ tân.
- Tạo **mã trang phục** duy nhất (ví dụ `VC-001`, `AO-002`), chọn loại **Váy cưới** hoặc **Trang phục khác**.
- Chọn mã và ngày trên lịch tháng để xem còn trống / đã được giữ.
- Tạo lịch thuê có tên khách, số điện thoại, ngày nhận, ngày trả, ghi chú.
- Tính **cả ngày nhận và ngày trả** là ngày chiếm lịch. Ví dụ 10–12/11 thì không thể đặt 12–14/11 cùng mã.
- Các trạng thái: **Đã giữ lịch → Đã giao váy → Đã trả**; lịch đặt trước có thể **hủy**.
- Khi hủy, ngày được giải phóng. Lịch đã trả vẫn được giữ để đối chiếu lịch sử thuê trong quá khứ.
- Sửa ngày/khách/ghi chú khi lịch đang **Đã giữ lịch**. Không thay mã váy trong lịch cũ; nếu chọn sai mã, hủy và tạo lại.
- Admin có thể bật/tắt nhận lịch mới cho từng mã; Lễ tân có thể thêm mã và đặt lịch.
- Mỗi thao tác tạo/sửa có kiểm tra quyền tại Next.js API và ghi audit (best effort).

## Bảo vệ chống đặt trùng

Dữ liệu được lưu trong Firebase Realtime Database tại:

`studioPlanner_v1/weddingWardrobe/items/{sha256(normalized-code)}`

Mỗi mã trang phục có tập `bookings`. Khi đặt lịch, endpoint `/api/wedding-wardrobe/bookings` chạy **Firebase RTDB transaction tại node của mã đó**. Điều kiện không trùng được kiểm tra trong hàm transaction: dù hai lễ tân gửi cùng lúc, các cập nhật được tuần tự hóa tại cùng node. Trùng lịch trả về `409 RENTAL_CONFLICT` và không tạo lịch.

Hệ thống hiện chỉ quản lý các mốc **ngày**, chưa quản lý giờ lấy/trả hoặc thời gian giặt/vệ sinh đệm. Nên dành thêm ngày đệm theo quy trình cửa hàng nếu cần. Không tự ý rút ngày trả để đặt chồng lên lịch khác.

## Cài vào dự án hiện tại (Windows + VS Code)

1. Sao lưu hoặc commit code hiện tại. Chỉ áp dụng bản vá lên source **Élia Marier**, không phải Amorri.
2. Giải nén `EliaMarier_Lich_Vay_Cuoi_Patch_20261028.zip` vào đúng thư mục có `package.json`, giữ nguyên đường dẫn `app/`, `components/`, `lib/`, `tests/`.
3. Kiểm tra `Test-Path '.\components\WeddingWardrobe.tsx'` và `Test-Path '.\app\api\wedding-wardrobe\bookings\route.ts'` đều là `True`.
4. Chạy `npm run typecheck`, `npm run build`, `node --experimental-strip-types --test tests/wedding-wardrobe.test.mjs`.
5. Chỉ khi build thành công, chạy `git add app/api/wedding-wardrobe components/Dashboard.tsx components/WeddingWardrobe.tsx components/wedding-wardrobe.css lib/domain/wedding-rental.ts lib/server/wedding-wardrobe.ts tests/wedding-wardrobe.test.mjs HUONG-DAN-LICH-VAY-CUOI-ELIA.md`, `git commit -m "Add wedding wardrobe rental calendar"`, `git push origin main`.
6. Mở Vercel -> Deployments; đợi **Ready**; vào tab **Lịch váy cưới** và thử 2 lễ tân đặt trùng một mã cùng ngày.

Không yêu cầu API key hoặc bucket R2 mới. Module dùng **Firebase Realtime Database và Firebase Authentication đã cấu hình**.

## Bảo mật Firebase (quan trọng)

Trang mới dùng Firebase Admin SDK qua API có xác thực tài khoản admin/lễ tân, nhưng điều này **không tự ngăn đọc trực tiếp Firebase RTDB từ trình duyệt**. Cần kiểm tra **toàn bộ Realtime Database Rules**. Đường dẫn `studioPlanner_v1/weddingWardrobe` không được cho phép client đọc/ghi trực tiếp; quyền `.read` / `.write` ở node cha cũng phải không quá rộng (Rules cha cho phép thì Rules con không thu hồi được). Không thay toàn bộ Rules hiện có bằng mẫu ngắn vì có thể làm hỏng các tính năng legacy.

Test trên Vercel Preview trước khi đưa dữ liệu khách thật vào. Backup Realtime Database trước khi áp dụng và kiểm tra Security Rules.

## Giới hạn / mở rộng tương lai

- Chưa tích hợp tiền cọc, giá thuê, hình ảnh từng bộ trang phục, mã QR, barcode, ngày giặt đệm, phí trễ.
- Chưa có tính năng một đơn chứa nhiều mã trang phục (mỗi lịch gắn một mã). Có thể mở rộng sau khi luồng chính ổn định.
- Nếu danh mục và lịch thuê tăng rất lớn, cần phân trang danh sách thay vì đọc toàn bộ danh mục cùng lịch sử ở một request.
