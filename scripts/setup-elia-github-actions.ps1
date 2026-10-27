# Élia Marier: cấu hình GitHub Actions Secrets và Variables. Chạy script trên Windows.
# Không chứa secret. KHÔNG đặt JSON trong source; phải dùng JSON Firebase Admin mới đã rotate.
[CmdletBinding()]
param(
  [string]$Repo = 'tandatges-afk/EliaMarier',
  [string]$FirebaseAdminJsonPath,
  [string]$DriveServiceAccountJsonPath,
  [string]$R2AccountId,
  [string]$Bucket = 'elia-marier-private-videos'
)
$ErrorActionPreference = 'Stop'
function CheckExit([string]$Name) { if ($LASTEXITCODE -ne 0) { throw "$Name failed ($LASTEXITCODE)" } }
function SecretFromInput([string]$Name, [string]$Value) {
  # Nội dung đến stdin để tránh lộ secret trong tham số command-line.
  $Value | gh secret set $Name --repo $Repo
  CheckExit $Name
}
function ReadSecurePlain([string]$Prompt) {
  $sec=Read-Host $Prompt -AsSecureString
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
  throw 'Chưa cài GitHub CLI. Cài từ https://cli.github.com/ và chạy gh auth login.'
}
& gh auth status 2>$null
CheckExit 'gh auth status (đăng nhập bằng gh auth login)'
& gh repo view $Repo --json name --jq .name | Out-Null
CheckExit "GitHub repo $Repo chưa tồn tại/không có quyền truy cập"
if (!$FirebaseAdminJsonPath) { $FirebaseAdminJsonPath=Read-Host 'Đường dẫn JSON Firebase Admin MỚI (đã thay khóa cũ)' }
if (!$DriveServiceAccountJsonPath) { $DriveServiceAccountJsonPath=Read-Host 'Đường dẫn JSON Google Drive Service Account' }
if (!$R2AccountId) { $R2AccountId=Read-Host 'Cloudflare Account ID (32 ký tự)' }
if ($R2AccountId -notmatch '^[a-fA-F0-9]{32}$') { throw 'Cloudflare Account ID phải là 32 ký tự hex' }
foreach($file in @($FirebaseAdminJsonPath,$DriveServiceAccountJsonPath)) {
  if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Không tìm thấy JSON ở đường dẫn đã nhập" }
}
$firebase = Get-Content -LiteralPath $FirebaseAdminJsonPath -Raw | ConvertFrom-Json
$drive = Get-Content -LiteralPath $DriveServiceAccountJsonPath -Raw | ConvertFrom-Json
if ($firebase.type -ne 'service_account' -or $firebase.project_id -ne 'eliamarier' -or !$firebase.private_key) { throw 'Firebase Admin JSON không thuộc project eliamarier' }
if ($drive.type -ne 'service_account' -or !$drive.private_key -or !$drive.client_email) { throw 'Drive Service Account JSON không hợp lệ' }
if ($drive.client_email -eq $firebase.client_email) { throw 'Khuyến nghị dùng tài khoản Drive riêng, không dùng Firebase Admin làm Drive reader' }
Write-Host "Firebase: $($firebase.project_id); Drive reader: $($drive.client_email)"
$ok=Read-Host 'Bạn đã bật Google Drive API và SHARE thư mục Drive cho email này với quyền Viewer? (YES để tiếp tục)'
if($ok -ne 'YES'){throw 'Dừng: cần cấp quyền Drive trước khi kết nối'}
$firebaseText=Get-Content -LiteralPath $FirebaseAdminJsonPath -Raw
$driveText=Get-Content -LiteralPath $DriveServiceAccountJsonPath -Raw
try {
  SecretFromInput 'AMORRI_FIREBASE_SERVICE_ACCOUNT_JSON' $firebaseText
  SecretFromInput 'AMORRI_DRIVE_SERVICE_ACCOUNT_JSON' $driveText
  SecretFromInput 'AMORRI_FIREBASE_DATABASE_URL' 'https://eliamarier-default-rtdb.firebaseio.com/'
  $r2key = ReadSecurePlain 'R2 Upload Access Key ID (chỉ quyền bucket video)'
  $r2secret = ReadSecurePlain 'R2 Upload Secret Access Key'
  SecretFromInput 'AMORRI_R2_UPLOAD_ACCESS_KEY_ID' $r2key
  SecretFromInput 'AMORRI_R2_UPLOAD_SECRET_ACCESS_KEY' $r2secret
} finally {
  $firebaseText=$null; $driveText=$null; $r2key=$null; $r2secret=$null
}
& gh variable set AMORRI_R2_ACCOUNT_ID --body $R2AccountId --repo $Repo
CheckExit 'AMORRI_R2_ACCOUNT_ID'
& gh variable set AMORRI_R2_BUCKET --body $Bucket --repo $Repo
CheckExit 'AMORRI_R2_BUCKET'
& gh variable set AMORRI_ENABLE_AUTO_R2_SYNC --body false --repo $Repo
CheckExit 'AMORRI_ENABLE_AUTO_R2_SYNC'
Write-Host 'Đã cài GitHub Actions secrets và variables cho Élia Marier.'
Write-Host 'Tự động hóa vẫn TẮT. Chạy thử bằng workflow_dispatch dry_run=true trước.'
Write-Host 'Tiếp theo: gh workflow run r2-video-sync.yml --repo' $Repo '-f dry_run=true -f drive_folder_id=YOUR_FOLDER_ID'
