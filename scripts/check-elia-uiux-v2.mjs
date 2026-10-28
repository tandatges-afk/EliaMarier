import fs from 'node:fs';
const files=['app/layout.tsx','components/WeddingWardrobe.tsx','components/WeddingCatalogManager.tsx','components/elia-uiux-v2.css'];
let failed=false;
for(const file of files){if(!fs.existsSync(file)){console.error('MISSING',file);failed=true;}}
if(failed)process.exit(1);
const wedding=fs.readFileSync(files[1],'utf8');const catalog=fs.readFileSync(files[2],'utf8');const layout=fs.readFileSync(files[0],'utf8');
const checks={
 'Không còn elia-wedding-hero trong JSX':!wedding.includes('className="elia-wedding-hero"'),
 'Không còn ewc-hero trong JSX':!catalog.includes('className="ewc-hero"'),
 'Nút tạo lịch thuê vẫn hoạt động':wedding.includes('className="elia-wedding-actions"')&&wedding.includes('elia-wedding-booking-form'),
 'Nút làm mới danh mục vẫn hoạt động':(catalog.includes('aria-label="Làm mới kho trang phục"') || (catalog.includes('elia-catalog-admin') && catalog.includes('Làm mới'))),
 'CSS mới đã import trong app/layout.tsx':layout.includes("@/components/elia-uiux-v2.css"),
 'Không xóa API quan trọng':wedding.includes('/api/wedding-wardrobe/bookings')&&catalog.includes('/api/wedding-wardrobe/items'),
};
for(const [k,v] of Object.entries(checks)){console.log(v?'PASS':'FAIL',k);if(!v)failed=true;}
if(failed)process.exit(1);
