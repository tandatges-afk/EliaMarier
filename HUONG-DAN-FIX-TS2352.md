# Élia Marier — Fix TypeScript TS2352

Bản vá chỉ thay `app/api/office-accounts/[uid]/route.ts`.

- Bỏ 2 phép ép kiểu `{uid,admin:false} as DecodedIdToken` không an toàn.
- Kiểm tra tài khoản cần sửa/khóa bằng allowlist `AMORRI_ADMIN_UIDS` hoặc Firebase Custom Claim `admin`.
- Nếu không đọc được quyền Firebase, trả HTTP 503 và không thay đổi tài khoản.

## Cài bản vá từ thư mục dự án có package.json

```powershell
Copy-Item -LiteralPath '.\app\api\office-accounts\[uid]\route.ts' -Destination "$env:USERPROFILE\Downloads\elia-office-route.ts.bak"
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\EliaMarier_Fix_OfficeAccounts_TS2352_20261028.zip" -DestinationPath (Get-Location).Path -Force
npm run typecheck
npm run build
```

Chỉ sau khi hai lệnh trên thành công:

```powershell
git add -- 'app/api/office-accounts/[uid]/route.ts'
git diff --cached --check
git commit -m "Fix office account admin protection typecheck"
git push origin main
```

Không push khóa bí mật hoặc file sao lưu. Cảnh báo `npm audit` cần xử lý riêng; không dùng `npm audit fix --force` khi chưa kiểm tra tính tương thích.
