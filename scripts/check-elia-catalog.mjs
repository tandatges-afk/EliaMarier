import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const required = [
  'components/WeddingCatalogManager.tsx',
  'components/wedding-catalog-luxe.css',
  'app/api/wedding-wardrobe/items/route.ts',
  'app/api/wedding-wardrobe/items/[itemId]/route.ts',
  'app/api/wedding-wardrobe/folders/route.ts',
  'app/api/wedding-wardrobe/folders/[folderId]/route.ts',
  'app/api/wedding-wardrobe/bookings/route.ts',
  'app/api/wedding-wardrobe/bookings/[itemId]/[bookingId]/route.ts',
  'app/api/wedding-wardrobe/availability/route.ts',
  'lib/domain/wedding-rental.ts',
  'lib/server/wedding-wardrobe.ts',
];
let missing = 0;
for (const file of required) {
  const yes = existsSync(file);
  console.log(`${yes?'OK   ':'THIẾU'} ${file}`);
  if (!yes) missing++;
}
if (!missing) {
  const domain=readFileSync('lib/domain/wedding-rental.ts','utf8');
  const server=readFileSync('lib/server/wedding-wardrobe.ts','utf8');
  if(!domain.includes('WeddingFolder')||!domain.includes('folderId')) {
    console.error('Model WeddingFolder/folderId chưa đồng bộ với module mới.');missing++;
  }
  if(!server.includes('weddingFoldersRef')) {
    console.error('Backend thiếu weddingFoldersRef.');missing++;
  }
}
if (missing) {
  console.error(`\nCòn ${missing} vấn đề cần sửa trước khi build.`);
  process.exitCode=1;
} else {
  console.log('\nĐủ file cục bộ. Bước tiếp theo: npm run typecheck && npm run build');
  try {
    const changed=execFileSync('git',['status','--short','--','app/api/wedding-wardrobe','components/WeddingCatalogManager.tsx','components/wedding-catalog-luxe.css'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    if(changed)console.log('\nCác file cần kiểm tra commit/push:\n'+changed);
  } catch { /* valid when project is not yet initialized with Git */ }
}
