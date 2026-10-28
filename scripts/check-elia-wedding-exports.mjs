import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverFile = path.join(root,'lib/server/wedding-wardrobe.ts');
const domainFile = path.join(root,'lib/domain/wedding-rental.ts');
const read = (p) => fs.readFileSync(p,'utf8');
const errors=[];
for (const file of [serverFile,domainFile]) {
  if(!fs.existsSync(file)) errors.push(`Thiếu ${path.relative(root,file)}`);
}
if(errors.length){for(const e of errors)console.error('✗',e); process.exit(1);}
const server=read(serverFile),domain=read(domainFile);
const hasExport=(src,name)=>new RegExp(`\\bexport\\s+(?:async\\s+)?(?:const|function|class|type|interface)\\s+${name}\\b`).test(src);
const names=['weddingFoldersRef','asWeddingFolder','weddingItemsRef','asWeddingItem','weddingAudit','weddingKey','WeddingFault','publicWeddingError','validateWeddingBookingInput','makeWeddingBooking','hasActiveWeddingEventLinks'];
for(const name of names){if(!hasExport(server,name))errors.push(`Thiếu export ${name} trong lib/server/wedding-wardrobe.ts`);}
for(const name of ['WeddingFolder','WeddingItem','WeddingBooking']){if(!hasExport(domain,name))errors.push(`Thiếu type ${name} trong lib/domain/wedding-rental.ts`);}
const files=[
 'app/api/wedding-wardrobe/folders/route.ts',
 'app/api/wedding-wardrobe/folders/[folderId]/route.ts',
 'app/api/wedding-wardrobe/items/route.ts',
 'app/api/wedding-wardrobe/items/[itemId]/route.ts',
 'app/api/wedding-wardrobe/bookings/route.ts',
 'app/api/wedding-wardrobe/bookings/[itemId]/[bookingId]/route.ts',
 'app/api/wedding-wardrobe/availability/route.ts'
];
for (const rel of files){
 const p=path.join(root,rel);
 if(!fs.existsSync(p)){errors.push(`Thiếu API ${rel}`);continue;}
 const source=read(p);
 const re=/import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/server\/wedding-wardrobe['"]/g;
 for(const m of source.matchAll(re)){
  for(const name of m[1].split(',').map(x=>x.trim().split(/\s+as\s+/)[0]).filter(Boolean)){
   if(!hasExport(server,name)) errors.push(`${rel}: import ${name} nhưng backend chưa export`);
  }
 }
}
if(!/folderId\??\s*:/.test(domain))errors.push('WeddingItem chưa có folderId');
if(!/eventId\??\s*:/.test(domain))errors.push('WeddingBooking chưa có eventId');
if(errors.length){for(const e of errors)console.error('✗',e);process.exit(1);}
console.log('✓ Đủ 11 export backend, 3 kiểu dữ liệu và các API Kho trang phục.');
console.log('Lưu ý: vẫn cần chạy npm run typecheck và npm run build để xác nhận toàn dự án.');
