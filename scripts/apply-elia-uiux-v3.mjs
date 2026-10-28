import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=process.cwd();
const pkg=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const exists=(p)=>fs.existsSync(path.join(root,p));
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const source=(p)=>fs.readFileSync(path.join(pkg,p),'utf8');
const updates=new Map();
function requireFile(p){if(!exists(p))throw Error(`Thiếu ${p}. Không thay đổi file nào; hãy kiểm tra đúng thư mục source.`);}
function replaceExactly(text,oldText,newText,label){
 if(text.includes(newText))return text;
 if(!text.includes(oldText))throw Error(`Source khác bản dự kiến ở ${label}; dừng an toàn. Hãy dùng source mới nhất của bạn để đối chiếu.`);
 return text.replace(oldText,newText);
}
const mark = '<span className="elia-build-label" title="Élia Marier UI/UX phiên bản 3">UI 3.0</span>';
try {
 requireFile('package.json');requireFile('app/layout.tsx');requireFile('components/Dashboard.tsx');
 requireFile('components/OperationsHub.tsx');
 let layout=read('app/layout.tsx');
 if(!layout.includes('elia-uiux-v3.css')){
   layout=replaceExactly(layout,"import './globals.css';", "import './globals.css';\nimport '@/components/elia-uiux-v3.css';",'app/layout.tsx import');
 }
 if(!layout.includes('className="elia-ui-v3"')){
   if(/<body\s*>/.test(layout))layout=layout.replace(/<body\s*>/,'<body className="elia-ui-v3">');
   else if(/<body\s+className="([^"]*)"/.test(layout))layout=layout.replace(/<body\s+className="([^"]*)"/,'<body className="$1 elia-ui-v3"');
   else throw Error('Không tìm thấy thẻ body chuẩn để gắn version UI.');
 }
 if(layout!==read('app/layout.tsx'))updates.set('app/layout.tsx',layout);
 let dash=read('components/Dashboard.tsx');
 if(!dash.includes("import './elia-uiux-v3.css';")){
   const imports=["import './elia-brand-refine.css';","import './elia-logo.css';","import './elia-luxe.css';"];
   const found=imports.find(x=>dash.includes(x));
   if(!found)throw Error('Dashboard không có import theme dự kiến.');
   dash=dash.replace(found,found+"\nimport './elia-uiux-v3.css';");
 }
 // Navigation becomes two meaningful functional groups instead of one undifferentiated stack.
 const oldNav='<div className="sidebar-label">WORKSPACE</div><nav aria-label="Điều hướng chính" className="nav-items">{availablePages.map(p=>{\n        const Icon=p.icon; return <button key={p.key} onClick={()=>goTab(p.key)} className={`nav-item ${tab===p.key?\'nav-active\':\'\'}`}><Icon size={19}/><span>{p.name}</span>{tab===p.key&&<i/>}</button>;\n      })}</nav>';
 const newNav='<nav aria-label="Điều hướng chính" className="nav-items">{([\n        {heading:"ĐIỀU HÀNH",keys:["overview","calendar","wedding","delivery"]},\n        {heading:"QUẢN TRỊ",keys:["staff","payroll","analytics","system","accounts"]}\n      ] as const).map(group=><div className="elia-nav-group" key={group.heading}>\n        <div className="elia-nav-caption">{group.heading}</div>\n        {availablePages.filter(p=>(group.keys as readonly string[]).includes(p.key)).map(p=>{\n          const Icon=p.icon;return <button key={p.key} onClick={()=>goTab(p.key)} className={`nav-item ${tab===p.key?\'nav-active\':\'\'}`} aria-current={tab===p.key?\'page\':undefined}><Icon size={19}/><span>{p.name}</span>{tab===p.key&&<i/>}</button>;\n        })}\n      </div>)}</nav>';
 if(!dash.includes('elia-nav-group')){
   if(dash.includes(oldNav))dash=dash.replace(oldNav,newNav);
   else throw Error('Menu Dashboard đã thay cấu trúc, không tự động chèn điều hướng sai.');
 }
 // A visible, unobtrusive release badge distinguishes deployed v3 from stale deployments.
 if(!dash.includes('elia-build-label')){
   const current='<div className="topbar-right"><span className="live-dot"/>';
   dash=replaceExactly(dash,current,`<div className="topbar-right">${mark}<span className="live-dot"/>`,'topbar release badge');
 }
 // Overview: operational metrics first, actionable warnings directly below, then actual booking data.
 if(!dash.includes('elia-workspace-section-title')){
   const ops='<OperationsHub data={data} today={localToday()} onOpenEvent={setSelected} onNavigate={goTab}/>';
   const oldTop=`${ops}\n            <div className="metrics-grid">`;
   const newTop='<div className="elia-workspace-section-title"><div><h2>Tình hình studio</h2><p>Số liệu và công việc cần xử lý trong tháng</p></div></div>\n            <div className="metrics-grid">';
   dash=replaceExactly(dash,oldTop,newTop,'overview section header');
   const beforeDashboard='            <div className="dashboard-two">';
   dash=replaceExactly(dash,beforeDashboard,`            ${ops}\n${beforeDashboard}`,'overview order');
 }
 if(dash!==read('components/Dashboard.tsx'))updates.set('components/Dashboard.tsx',dash);
 // Remove obsolete v2.9 technical language from visible operations workspace.
 let hub=read('components/OperationsHub.tsx');
 hub=hub.replace('OPERATIONS DESK · VNEXT 2.9','ƯU TIÊN TRONG NGÀY');
 hub=hub.replace('<span className="ops29-status"><ShieldCheck size={15}/> Chỉ Admin</span>', '<span className="ops29-status"><ShieldCheck size={15}/> Đang cập nhật</span>');
 if(hub!==read('components/OperationsHub.tsx'))updates.set('components/OperationsHub.tsx',hub);
 // Remove any residual redundant big hero markup, only for known one-line patterns.
 for(const p of ['components/WeddingWardrobe.tsx','components/WeddingCatalogManager.tsx']){
   if(!exists(p))continue;
   let s=read(p);
   if(p.includes('WeddingWardrobe') && s.includes('className="elia-wedding-hero"')){
     const re=/^[ \t]*<section className="elia-wedding-hero">[^\r\n]*?<\/section>\r?\n/m;
     if(!re.test(s))throw Error('Cấu trúc elia-wedding-hero không phải mẫu an toàn.');
     s=s.replace(re,'');
   }
   if(p.includes('WeddingCatalogManager') && s.includes('className="ewc-hero"')){
     const re=/^[ \t]*<header className="ewc-hero">[\s\S]*?<\/header>[ \t]*\r?\n/m;
     if(!re.test(s))throw Error('Cấu trúc ewc-hero không phải mẫu an toàn.');
     s=s.replace(re,'');
   }
   if(p.includes('WeddingCatalogManager') && s.includes('className="ewc-toolbar-actions"') && !s.includes('aria-label="Làm mới kho trang phục"')){
     s=s.replace('className="ewc-toolbar-actions">', `className="ewc-toolbar-actions"><button type="button" className="ewc-refresh" onClick={()=>void reload()} disabled={loading||busy} aria-label="Làm mới kho trang phục" title="Làm mới"><RefreshCw size={17} className={loading?'ewc-spinning':''}/></button>`);
   }
   if(s!==read(p))updates.set(p,s);
 }
 const css='components/elia-uiux-v3.css';
 if(!exists(css) || read(css)!==source(css))updates.set(css,source(css));
 const proof='public/elia-ui-version.json';
 const proofData=JSON.stringify({project:'Elia Marier',design:'UI/UX V3',release:'2026-10-29',source:'uiux-v3-patch'},null,2)+'\n';
 if(!exists(proof)||read(proof)!==proofData)updates.set(proof,proofData);
 if(!updates.size){console.log('UI/UX V3 đã được áp dụng. Không có file nào thay đổi.');process.exit(0);}
 const backup=path.join(os.homedir(),'Downloads',`Elia_UIUX_V3_BACKUP_${new Date().toISOString().replace(/[:.]/g,'-')}`);
 for(const [rel,content] of updates){
   const abs=path.join(root,rel);
   if(fs.existsSync(abs)){
     const bak=path.join(backup,rel);fs.mkdirSync(path.dirname(bak),{recursive:true});fs.copyFileSync(abs,bak);
   }
   fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,content);
 }
 console.log(`Đã cập nhật ${updates.size} file. Đã sao lưu vào ${backup}`);
 for(const file of updates.keys())console.log('  ✓',file);
 console.log('Kiểm tra: node scripts/check-elia-uiux-v3.mjs && npm run typecheck && npm run build');
} catch(error){console.error('DỪNG AN TOÀN:',error.message);process.exitCode=1;}
