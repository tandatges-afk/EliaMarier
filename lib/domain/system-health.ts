/** Local VPS diagnostics: read-only server configuration checks, never reveal credentials. */
export type HealthStatus='ok'|'warning'|'error';
export type HealthCheck={id:string;title:string;status:HealthStatus;detail:string;action:string};
export type EnvValues=Record<string,string|undefined>;
const row=(id:string,title:string,status:HealthStatus,detail:string,action:string):HealthCheck=>({id,title,status,detail,action});
export function localSystemChecks(env:EnvValues):HealthCheck[]{
 const db=Boolean(env.DATABASE_URL?.startsWith('postgresql://')||env.DATABASE_URL?.startsWith('postgres://'));
 const key=Boolean(env.ELIA_MEDIA_SIGNING_KEY&&env.ELIA_MEDIA_SIGNING_KEY.length>=32);
 const media=Boolean(env.ELIA_MEDIA_ROOT?.startsWith('/'));
 const archive=Boolean(env.AMORRI_ARCHIVE_ENCRYPTION_KEY||env.DRIVE_VIDEO_SIGNING_SECRET);
 const grant=Boolean((env.AMORRI_DELIVERY_LINK_KEY||env.DRIVE_VIDEO_SIGNING_SECRET||'').length>=32);
 const staff=Boolean((env.AMORRI_STAFF_LINK_KEY||env.AMORRI_DELIVERY_LINK_KEY||env.DRIVE_VIDEO_SIGNING_SECRET||'').length>=32);
 const drive=Boolean(env.DRIVE_SERVICE_ACCOUNT_JSON);
 return [
 row('postgres-config','PostgreSQL URL',db?'ok':'error',db?'Đã đặt DATABASE_URL (chưa thử kết nối).':'Chưa cấu hình PostgreSQL.','Đặt DATABASE_URL với tài khoản Élia riêng.'),
 row('media-config','Lưu trữ trên VPS',media?'ok':'error',media?'Đã đặt đường dẫn lưu trữ media riêng.':'Thiếu ELIA_MEDIA_ROOT.','Gắn ổ lưu trữ vào /srv/elia/media.'),
 row('media-signing','Link video riêng tư',key?'ok':'error',key?'Đã đặt khóa ký URL media.':'Thiếu khóa ký URL media.','Tạo ELIA_MEDIA_SIGNING_KEY tối thiểu 32 ký tự ngẫu nhiên.'),
 row('delivery-links','Khóa bàn giao khách',grant?'ok':'error',grant?'Có khóa phục hồi link bàn giao.':'Thiếu khóa dùng để mở link khách.','Giữ nguyên các khóa AMORRI_DELIVERY_LINK_KEY/DRIVE_VIDEO_SIGNING_SECRET đã dùng.'),
 row('staff-links','Khóa link nhân sự',staff?'ok':'warning',staff?'Đã có khóa link nhân sự.':'Chưa đặt khóa riêng cho lịch nhân sự.','Giữ AMORRI_STAFF_LINK_KEY từ bản cũ.'),
 row('archive','Khóa lưu trữ đã mã hóa',archive?'ok':'warning',archive?'Đã có khóa archive.':'Thiếu khóa mở bản ghi lưu trữ.','Giữ khóa mã hóa archive cũ trước khi cắt chuyển.'),
 row('drive-source','Nguồn Google Drive',drive?'ok':'warning',drive?'Đã có service account Drive.':'Chưa có quyền đọc album Drive.','Thiết lập DRIVE_SERVICE_ACCOUNT_JSON nếu tiếp tục dùng Drive làm nguồn.'),
 ];
}
export function healthTotals(checks:HealthCheck[]){const errors=checks.filter(x=>x.status==='error').length;const warnings=checks.filter(x=>x.status==='warning').length;return {total:checks.length,errors,warnings,ok:checks.length-errors-warnings,status:errors?'error':warnings?'warning':'ok'};}
