#!/usr/bin/env node
/** Fail-closed, idempotent patch. Edits only exact brand/overview fragments. */
import {readFileSync,writeFileSync,existsSync,copyFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';

const root=process.cwd();
const f=join(root,'components','Dashboard.tsx');
const component=join(root,'components','EliaBrandMini.tsx');
const css=join(root,'components','elia-brand-refine.css');
for (const path of [join(root,'package.json'),f,component,css,join(root,'public','logo-mark.png')]) {
  if (!existsSync(path)) throw new Error(`Thiếu file: ${path}. Giải nén ZIP vào thư mục gốc dự án.`);
}
let s=readFileSync(f,'utf8');
const original=s;
const replacements=[];
function changeOnce(before,after,label) {
  if(s.includes(after))return;
  const count=s.split(before).length-1;
  if(count!==1)throw new Error(`${label}: cần tìm đúng 1 vị trí, hiện có ${count}. Không sửa file để tránh ghi đè nhầm.`);
  s=s.replace(before,after);replacements.push(label);
}
function changeRegex(pattern,after,label,already) {
  if(already && s.includes(already))return;
  const matches=[...s.matchAll(pattern)];
  if(matches.length===0 && label.startsWith('overview:'))return;
  if(matches.length!==1)throw new Error(`${label}: cần tìm đúng 1 vị trí, hiện có ${matches.length}. Không sửa file để tránh ghi đè nhầm.`);
  s=s.replace(pattern,after);replacements.push(label);
}

if(!s.includes("import {EliaBrandMini} from './EliaBrandMini';")){
  const anchor="import './elia-logo.css';";
  if(!s.includes(anchor))throw new Error('Không tìm thấy import elia-logo.css, source chưa phải phiên bản logo đang chạy.');
  s=s.replace(anchor,`${anchor}\nimport './elia-brand-refine.css';\nimport {EliaBrandMini} from './EliaBrandMini';`);
  replacements.push('import logo');
}else if(!s.includes("import './elia-brand-refine.css';")){
  s=s.replace("import './elia-logo.css';","import './elia-logo.css';\nimport './elia-brand-refine.css';");
  replacements.push('import CSS');
}

// Main sidebar symbol and the wordmark must form one vertical lockup.
changeRegex(/<div className="brand"><span className="elia-brandmark-shell">[\s\S]*?<\/span><div><div className="brand-word">[\s\S]*?<\/small><\/div><button onClick=\{\(\)=>setMenuOpen\(false\)\} className="sidebar-close" aria-label="Đóng menu"><X size=\{19\}\/><\/button><\/div>/g,
 '<div className="brand elia-brand-refined"><EliaBrandMini variant="sidebar" /><button onClick={()=>setMenuOpen(false)} className="sidebar-close" aria-label="Đóng menu"><X size={19}/></button></div>',
 'logo sidebar', 'className="brand elia-brand-refined"');
// Replace E initials with mark + wordmark, preserve user identity, role and logout button.
changeRegex(/<div className="user-avatar">\{\(user\.email\|\|'A'\)\.slice\(0,1\)\.toUpperCase\(\)\}<\/div>/g,
 '<EliaBrandMini variant="profile" />','avatar sidebar','<EliaBrandMini variant="profile" />');
changeRegex(/<div className="top-avatar">\{\(user\.email\|\|'A'\)\.slice\(0,1\)\.toUpperCase\(\)\}<\/div>/g,
 '<EliaBrandMini variant="topbar" />','avatar topbar','<EliaBrandMini variant="topbar" />');
// Remove the extra decorative mark next to breadcrumb: avoids double icons on mobile.
const mobileOld='<span className="elia-topbar-logo"><Image src="/logo-mark.png" alt="" width={1024} height={1024} aria-hidden="true" unoptimized /></span>';
if(s.includes(mobileOld)){s=s.replace(mobileOld,'');replacements.push('duplicate mobile logo');}
// Remove only the redundant admin shortcut in the topbar; navigation remains in the sidebar.
const shortcut='{canAdmin&&<a href="/admin/nhan-vien" title="Tài khoản lễ tân" aria-label="Quản lý tài khoản nhân viên" className="top-icon" style={{display:"inline-flex",alignItems:"center",justifyContent:"center"}}><ShieldCheck size={19}/></a>}';
if(s.includes(shortcut)){s=s.replace(shortcut,'');replacements.push('duplicate admin shortcut');}
// Remove precisely the two redundant overview blocks.
changeRegex(/\{canAdmin&&tab==='overview'&&<section className="surface" style=\{\{padding:16,marginBottom:16,[\s\S]*?<\/section>\}/g,
 '', 'overview: receptionist intro','/* brand-refine: receptionist promo removed */');
changeRegex(/^\s*<div className="welcome-band"><div><div className="welcome-kicker">[\s\S]*?<\/div><\/div><\/div>\s*$/gm,
 '', 'overview: welcome hero','/* brand-refine: hero removed */');

if(s===original){console.log('Đã áp dụng từ trước, không cần sửa lại Dashboard.');process.exit(0)}
const backupDir=join(homedir(),'Downloads','EliaMarier-Brand-Backups');mkdirSync(backupDir,{recursive:true});
const backup=join(backupDir,`Dashboard.before-brand-refine-${Date.now()}.tsx`);
if(!existsSync(backup))copyFileSync(f,backup);
writeFileSync(f,s,'utf8');
console.log('Đã sửa:', replacements.join(', '));
console.log('Đã tạo backup tại:',backup);
