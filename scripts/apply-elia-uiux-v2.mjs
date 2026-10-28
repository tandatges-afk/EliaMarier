/** Élia Marier · UI/UX v2. Precise source edits, no data/credentials touched. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const project = process.cwd();
// Derive the directory from import.meta.url in a cross-platform way.
const {fileURLToPath} = await import('node:url');
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const styleSrc = path.join(pkg, 'components', 'elia-uiux-v2.css');
const styleDest = path.join(project, 'components', 'elia-uiux-v2.css');
const read = (relative)=>fs.readFileSync(path.join(project,relative),'utf8');
const existing = (relative)=>fs.existsSync(path.join(project,relative));
const changes = [];
const note = [];
if(!existing('package.json') || !existing('components/Dashboard.tsx')){
 console.error('Vui lòng chạy tại thư mục gốc Élia Marier có package.json và components/Dashboard.tsx.');process.exit(1);
}
if(!fs.existsSync(styleSrc)){console.error('Thiếu components/elia-uiux-v2.css trong gói bản vá.');process.exit(1);}
const wardrobe = 'components/WeddingWardrobe.tsx';
if(!existing(wardrobe)){console.error(`Thiếu ${wardrobe}; không thay đổi source.`);process.exit(1);}
let ww = read(wardrobe);
const wwHero = /(^[ \t]*<section className="elia-wedding-hero">[^\r\n]*?<\/section>\r?\n)/m;
if(wwHero.test(ww)) {
 ww = ww.replace(wwHero,'');
 note.push('Đã xóa hẳn elia-wedding-hero khỏi WeddingWardrobe.tsx');
} else if(ww.includes('elia-wedding-hero')) {
 console.error('Đã gặp elia-wedding-hero với cấu trúc khác; dừng để tránh xóa nhầm JSX.');process.exit(1);
} else note.push('elia-wedding-hero đã được xóa trước đó');
if(!ww.includes('className="elia-wedding-actions"')) {
 const marker = '  {error&&<div role="alert" className="elia-wedding-message error">';
 if(!ww.includes(marker)){console.error('Không tìm thấy vị trí nút Tạo lịch nhanh trong WeddingWardrobe.tsx; dừng.');process.exit(1);}
 const bar = '  <div className="elia-wedding-actions"><button type="button" className="elia-wedding-action-primary" onClick={()=>document.getElementById(\'elia-wedding-booking-form\')?.scrollIntoView({behavior:\'smooth\',block:\'start\'})}><CalendarDays size={16}/> Tạo lịch thuê</button></div>\n';
 ww = ww.replace(marker,bar+marker);
 note.push('Đã chuyển nút Tạo lịch thuê thành thanh thao tác gọn');
}
if(ww!==read(wardrobe))changes.push([wardrobe,ww]);

const catalog = 'components/WeddingCatalogManager.tsx';
if(!existing(catalog)) {console.error(`Thiếu ${catalog}; hãy cài module Kho trang phục mới trước khi cập nhật giao diện.`);process.exit(1);}
let wc = read(catalog);
const catHero = /^[ \t]*<header className="ewc-hero">[\s\S]*?<\/header>\s*/m;
if(catHero.test(wc)) {wc=wc.replace(catHero,'\n    ');note.push('Đã xóa hẳn ewc-hero khỏi WeddingCatalogManager.tsx');}
else if(wc.includes('ewc-hero')){console.error('Cấu trúc ewc-hero khác dự kiến; dừng để tránh xóa nhầm.');process.exit(1);}
else note.push('ewc-hero đã được xóa trước đó');
if(!wc.includes('aria-label="Làm mới kho trang phục"')){
 // Place reload within existing action group (do not add another banner).
 const tool = '<div className="ewc-toolbar-actions">';
 if(!wc.includes(tool)) {
  if(wc.includes('elia-catalog-admin')) note.push('Phát hiện danh mục legacy: giữ nút Làm mới có sẵn, không chèn toolbar mới.');
  else {console.error('Thiếu ewc-toolbar-actions; dừng để tránh sửa JSX sai.');process.exit(1);}
 }
 if(wc.includes(tool)){
 const refresh = '<button type="button" className="ewc-refresh" onClick={()=>void reload()} disabled={loading||busy} aria-label="Làm mới kho trang phục" title="Làm mới"><RefreshCw size={17} className={loading?\'ewc-spinning\':\'\'}/></button>';
 wc=wc.replace(tool,tool+refresh);
 note.push('Đã chuyển nút tải lại vào thanh công cụ danh mục');
 }
}
if(wc!==read(catalog))changes.push([catalog,wc]);

const layout = 'app/layout.tsx';
if(!existing(layout)){console.error(`Thiếu ${layout}; dừng.`);process.exit(1);}
let root=read(layout);
if(!root.includes('elia-uiux-v2.css')) {
 const marker="import './globals.css';";
 if(!root.includes(marker)){console.error('Không thấy import globals.css trong app/layout.tsx; dừng.');process.exit(1);}
 root=root.replace(marker,marker+"\nimport '@/components/elia-uiux-v2.css';");
 changes.push([layout,root]);note.push('Đã nhập bộ design system ở app/layout.tsx');
}
if(!fs.existsSync(styleDest) || fs.readFileSync(styleDest,'utf8')!==fs.readFileSync(styleSrc,'utf8')) {
 changes.push(['components/elia-uiux-v2.css',fs.readFileSync(styleSrc,'utf8')]);
}
if(!changes.length){console.log('Élia UI/UX v2 đã được áp dụng; không có thay đổi mới.');process.exit(0);}
// Backup *exactly* the files being changed, outside the repository if feasible.
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(os.homedir(),'Downloads',`Elia_UIUX_Backup_${stamp}`);
fs.mkdirSync(backup,{recursive:true});
for(const [rel,content] of changes){
 const full=path.join(project,rel);
 if(fs.existsSync(full)) {const dest=path.join(backup,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(full,dest);}
 fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,content,'utf8');
}
console.log(note.join('\n'));
console.log(`Đã cập nhật ${changes.length} file. Bản sao lưu: ${backup}`);
console.log('Tiếp theo: node scripts/check-elia-uiux-v2.mjs && npm run typecheck && npm run build');
