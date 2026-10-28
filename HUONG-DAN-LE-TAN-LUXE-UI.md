# ÉLIA MARIER · BẢN NÂNG CẤP LỄ TÂN & LUXE UI 2026-10-28

## Những thay đổi đã thực hiện

- Chỉ còn loại tài khoản **Lễ tân**: form không có dropdown Sale/Lễ tân; API chỉ tạo và cập nhật quyền receptionist. Tài khoản Sale đã tạo ở phiên bản trước vẫn đăng nhập, hệ thống diễn giải thành Lễ tân. Khi Admin sửa tài khoản cũ, role trong Database được chuẩn hóa thành receptionist.
- Admin có quyền tạo/sửa/khóa/vô hiệu hóa tài khoản; Lễ tân được quản lý lịch, thông tin khách và bàn giao theo quy tắc đang có, không được xem báo cáo, tiền công, phân công nhân sự.
- Giao diện mới Élia Marier: tone kem, than xanh rêu đậm và champagne; typography editorial, sidebar và trang tổng quan, lịch, thẻ số liệu, biểu mẫu, màn bàn giao và trang nhân sự đồng bộ; responsive điện thoại/PC.
- Không sửa workflow Firebase, R2, GitHub Actions, dữ liệu lịch hay link video.

## LƯU Ý về chọn ZIP

1. **PATCH**: dùng cho repository EliaMarier đang chạy, chỉ ghi đè 15 file tương ứng (an toàn hơn cho các thay đổi khác của bạn).
2. **FULL**: bản source tích hợp để tham khảo hoặc cài mới, KHÔNG nên ghi đè toàn bộ repository hiện tại vì code trên GitHub của bạn có thể đã mới hơn bản này.

## Cài bản PATCH trên Windows / VS Code

Mở Terminal đúng thư mục chứa `package.json`.

```powershell
# Xem các thay đổi bạn đã có trước khi ghi đè
git status --short
git remote -v

# Lưu dự phòng trước khi ghi đè (nếu đã có thay đổi chưa commit, lưu chúng trước)
git branch backup/before-elia-luxe

Expand-Archive `
 -LiteralPath "$env:USERPROFILE\Downloads\EliaMarier_LeTan_Luxe_UI_Patch_20261028.zip" `
 -DestinationPath (Get-Location).Path `
 -Force

# Kiểm tra có các file chính
Test-Path '.\components\OfficeAccountsManager.tsx'
Test-Path '.\components\elia-luxe.css'
Test-Path '.\app\api\office-accounts\route.ts'

npm run typecheck
npm run build
```

* Nếu TypeScript hoặc build lỗi, đừng push bản lỗi lên GitHub; gửi log để xử lý.
* Nếu build đạt, kiểm tra `git diff`, `git status --short`, bảo đảm `.env.local`, service-account JSON, R2 tokens không nằm trong commit:

```powershell
git add -- app components/OfficeAccountsManager.tsx components/Dashboard.tsx components/elia-luxe.css components/delivery.css components/StaffPortal.tsx components/NewBookingDialog.tsx components/EventEditor.tsx lib/server/office-auth.ts tests/elia-office-role-contract.test.mjs tests/elia-receptionist-only.test.mjs
git diff --cached --name-only
git commit -m "Receptionist-only roles and Elia Marier luxe UI"
git push origin main
```

Sau khi Vercel Ready, mở `/admin/nhan-vien`, thử tạo lễ tân. Sau đó thử với tài khoản Lễ tân trên mobile và PC.

## Kiểm thử ưu tiên

1. Admin tạo lễ tân mới (chỉ Họ tên / Email / Mật khẩu), sửa và khóa.
2. Tài khoản Sale cũ, nếu có, được nhận diện là Lễ tân; không truy cập báo cáo, lương, chi phí thợ hoặc quản lý tài khoản.
3. Admin và lễ tân tạo/sửa lịch, mở lịch chụp của thợ, nhập tiền hợp đồng/cọc.
4. Gửi/xem bàn giao hình ảnh và video 1080p R2; góp ý ảnh và timeline không mất chức năng.
5. Desktop 1440px, tablet 768px, mobile 390px: menu, scroll bảng, modal và form hoạt động.
6. Kiểm toán **Firebase Realtime Database Security Rules** trước khi cấp tài khoản thật. Một số đường Firebase legacy có thể truy cập trực tiếp; ẩn giao diện/API chưa bảo đảm chống đọc chi phí.

## Kết quả kiểm tra khi đóng gói

- TypeScript/TSX: 129 file parsed, 0 syntax errors.
- 8/8 bài kiểm tra receptionist và contract phân quyền đạt.
- `scripts/check-static.mjs` còn lỗi có sẵn `Legacy JS retired` trong source gốc; không xóa file legacy tùy tiện.
- Không thể chạy build Next.js đầy đủ trong môi trường đóng gói vì npm dependencies chưa tải được; phải chạy `npm run typecheck` và `npm run build` trên máy bạn.
