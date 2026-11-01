/** One-time pending -> confirmed normalization. Always backup; default DRY RUN.
 * Never run while production is writing new events. A backup of the DB must exist.
 */
import {writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
const apply=process.argv.includes('--apply');
const confirmed=process.argv.includes('--confirm=CONFIRM_PENDING_TO_CONFIRMED');
const backupOption=process.argv.find(x=>x.startsWith('--backup='));
const backup=backupOption?.slice('--backup='.length);
if(apply&&(!confirmed||!backup))throw Error('Áp dụng yêu cầu --backup=FILE.json và --confirm=CONFIRM_PENDING_TO_CONFIRMED');
const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if(!credentials||!process.env.FIREBASE_DATABASE_URL)throw Error('Cần FIREBASE_SERVICE_ACCOUNT_JSON và FIREBASE_DATABASE_URL trong môi trường');
const app=initializeApp({credential:cert(JSON.parse(credentials)),databaseURL:process.env.FIREBASE_DATABASE_URL},'elia-pending-migration');
try{
 const events=getDatabase(app).ref('studioPlanner_v1/events');
 const snapshot=await events.once('value');
 const all=snapshot.val()||{};
 const candidates=Object.entries(all).filter(([,value])=>value&&typeof value==='object'&&value.status==='pending');
 console.log(`Có ${candidates.length} lịch cũ trạng thái pending (sẽ đổi thành Đã chốt).`);
 if(!apply){console.log('DRY RUN: Không ghi dữ liệu. Dùng --backup=... --apply --confirm=CONFIRM_PENDING_TO_CONFIRMED khi đã kiểm tra và sao lưu toàn DB.');process.exitCode=0;}
 else{
  const target=resolve(backup);
  try{await access(target);throw Error('Đã có tệp backup tại đường dẫn này; hãy chọn tên mới để tránh ghi đè.');}catch(e){if(e.code!=='ENOENT')throw e;}
  // This is ONLY a backup of the event branch; keep separate complete RTDB export for recovery.
  await writeFile(target,JSON.stringify({exportedAt:new Date().toISOString(),path:'studioPlanner_v1/events',records:all},null,2),{flag:'wx',mode:0o600});
  console.log(`Đã lưu bản sao toàn bộ nhánh events: ${target}`);
  let changed=0,skipped=0;
  for(const [key] of candidates){
   const tx=await events.child(key).transaction(old=>old?.status==='pending'?{...old,status:'confirmed',statusMigratedAt:Date.now()}:undefined,undefined,false);
   if(tx.committed)changed++;else skipped++;
  }
  console.log(`Đã cập nhật ${changed}; bỏ qua/không thay đổi ${skipped}. Kiểm tra các lịch thực tế trước khi tiếp tục.`);
 }
}finally{await deleteApp(app);}
