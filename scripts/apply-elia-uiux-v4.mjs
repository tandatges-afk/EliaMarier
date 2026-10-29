import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=process.cwd();
const kit=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rel=['app/layout.tsx','components/Dashboard.tsx','components/OperationsHub.tsx'];
for(const name of rel){if(!fs.existsSync(path.join(root,name))){console.error(`DỪNG: thiếu ${name}; hãy mở đúng thư mục có package.json`);process.exit(1);}}
const updates=new Map();
const current=name=>fs.readFileSync(path.join(root,name),'utf8');
function schedule(name,value){if(value!==current(name))updates.set(name,value);}
try {
 let layout=current('app/layout.tsx');
 if(!layout.includes('elia-uiux-v4.css')){
   if(!layout.includes("import './globals.css';"))throw Error('app/layout.tsx không có import globals.css dự kiến. Không sửa để tránh lỗi.');
   layout=layout.replace("import './globals.css';", "import './globals.css';\nimport '@/components/elia-uiux-v4.css';");
 }
 if(!layout.includes('elia-ui-v4')){
   if(!/<body(?:\s+[^>]*)?>/.test(layout))throw Error('Không tìm thấy thẻ body trong app/layout.tsx');
   layout=layout.replace(/<body(?:\s+[^>]*)?>/,match=> {
     if(/className="([^"]*)"/.test(match))return match.replace(/className="([^"]*)"/,(_,s)=>`className="${s} elia-ui-v4"`);
     return match.replace('>', ' className="elia-ui-v4">');
   });
 }
 schedule('app/layout.tsx',layout);
 let dash=current('components/Dashboard.tsx');
 // Keep theme CSS as the last style import in Dashboard too; overrides are scoped to body.
 if(!dash.includes("import './elia-uiux-v4.css';")){
   const cssImports=[...dash.matchAll(/^import ['"]\.\/[\w-]+\.css['"];?$/gm)];
   if(!cssImports.length)throw Error('Không có import CSS trong Dashboard để đặt theme V4');
   const last=cssImports.at(-1)[0];
   dash=dash.replace(last,`${last}\nimport './elia-uiux-v4.css';`);
 }
 // Unnecessary admin account promotion card from previous patches.
 dash=dash.replace(/\n[ \t]*\{canAdmin&&tab==='overview'&&<section\b[\s\S]*?<\/section>\}\r?\n/,'\n');
 // Original oversized decorative welcome billboard (single JSX line).
 dash=dash.replace(/^\s*<div className="welcome-band">[^\r\n]*\r?\n/gm,'');
 // Preserve actual metrics, put the work queue below them rather than before.
 if(!dash.includes('elia-workspace-section-title')){
   const ops='<OperationsHub data={data} today={localToday()} onOpenEvent={setSelected} onNavigate={goTab}/>';
   const preceding=`${ops}\n            <div className="metrics-grid">`;
   if(dash.includes(preceding)){
     dash=dash.replace(preceding,'<div className="elia4-overview-toolbar"><h2>Tình hình tháng</h2></div>\n            <div className="metrics-grid">');
     dash=dash.replace('            <div className="dashboard-two">',`            ${ops}\n            <div className="dashboard-two">`);
   }
 }
 // A quiet, unmistakable deployment marker, not a new oversized badge.
 if(dash.includes('UI 3.0'))dash=dash.replace('UI 3.0','UI 4.0');
 if(!dash.includes('elia-build-label')){
   dash=dash.replace('<div className="topbar-right">','<div className="topbar-right"><span className="elia-build-label" title="Giao diện Élia Marier V4">UI 4.0</span>');
 }
 schedule('components/Dashboard.tsx',dash);
 let ops=current('components/OperationsHub.tsx');
 ops=ops.replaceAll('OPERATIONS DESK · VNEXT 2.9','CÔNG VIỆC TRONG NGÀY').replaceAll('Việc cần ưu tiên','Cần xử lý');
 schedule('components/OperationsHub.tsx',ops);
 for(const name of ['components/WeddingWardrobe.tsx','components/WeddingCatalogManager.tsx']){
   if(!fs.existsSync(path.join(root,name)))continue;
   let src=current(name);
   // Limit removal to one-line old hero; leave unfamiliar markup unchanged safely.
   if(name.endsWith('WeddingWardrobe.tsx'))src=src.replace(/^\s*<section className="elia-wedding-hero">[^\r\n]*?<\/section>\r?\n/gm,'');
   schedule(name,src);
 }
 const srcCSS=path.join(kit,'components/elia-uiux-v4.css');
 const nameCSS='components/elia-uiux-v4.css';
 const css=fs.readFileSync(srcCSS,'utf8');
 if(!fs.existsSync(path.join(root,nameCSS))||current(nameCSS)!==css)updates.set(nameCSS,css);
 const proof='public/elia-ui-version.json';
 const proofData=JSON.stringify({project:'Elia Marier',design:'Quiet Luxury V4',version:'4.0',release:'2026-10-29'},null,2)+'\n';
 if(!fs.existsSync(path.join(root,proof))||current(proof)!==proofData)updates.set(proof,proofData);
 const backup=path.join(os.homedir(),'Downloads',`Elia_UI_V4_BACKUP_${new Date().toISOString().replace(/[:.]/g,'-')}`);
 for(const [name,value] of updates){
   const full=path.join(root,name);
   if(fs.existsSync(full)){const copy=path.join(backup,name);fs.mkdirSync(path.dirname(copy),{recursive:true});fs.copyFileSync(full,copy);}
   fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,value);
 }
 console.log(`Élia Marier UI V4: ${updates.size} file được cập nhật.`);
 for(const name of updates.keys())console.log('  ✓',name);
 if(updates.size)console.log('Sao lưu file ghi đè:',backup);
 else console.log('Đã cập nhật trước đó, không có thay đổi.');
} catch(e){console.error('DỪNG AN TOÀN:',e.message);process.exitCode=1;}
