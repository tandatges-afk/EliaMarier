#!/usr/bin/env node
/* Minimal, idempotent source patch: preserves the user's latest Dashboard. */
import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
const root=process.cwd();
const dashboard=join(root,'components','Dashboard.tsx');
const layout=join(root,'app','layout.tsx');
const assets=['logo.png','public/logo.png','public/logo-mark.png','components/elia-logo.css'];
for(const a of assets)if(!existsSync(join(root,a))){console.error(`Thiếu ${a}. Hãy giải nén ZIP vào thư mục có package.json.`);process.exit(1)}
for(const f of [dashboard,layout])if(!existsSync(f)){console.error(`Không tìm thấy ${f}`);process.exit(1)}
let d=readFileSync(dashboard,'utf8');
const old=d;
const replaceRequired=(from,to,label)=>{
  if(d.includes(to))return;
  if(!d.includes(from))throw Error(`Không tìm thấy đoạn ${label} trong Dashboard.tsx. Hãy gửi phần logo hiện tại để ghép an toàn.`);
  d=d.replace(from,to);
};
if(!d.includes("from 'next/image'"))d=d.replace("'use client';", "'use client';\nimport Image from 'next/image';");
if(!d.includes("import './elia-logo.css'")){
 if(d.includes("import './elia-luxe.css';"))d=d.replace("import './elia-luxe.css';", "import './elia-luxe.css';\nimport './elia-logo.css';");
 else if(d.includes("import './v30.css';"))d=d.replace("import './v30.css';", "import './v30.css';\nimport './elia-logo.css';");
 else throw Error('Không tìm được import CSS của Dashboard để thêm hiệu ứng logo.');
}
replaceRequired('<div className="login-brand"><div className="brand-square">É<span>.</span></div><span>ÉLIA <strong>MARIER</strong></span></div>', '<div className="login-brand"><Image className="elia-brand-login" src="/logo.png" alt="Élia Marier" width={2048} height={2452} priority unoptimized /></div>', 'logo đăng nhập');
replaceRequired('<div className="boot-screen"><div className="brand-square">É<span>.</span></div><p>Đang kết nối Élia Marier…</p></div>', '<div className="boot-screen"><Image className="elia-brand-boot" src="/logo.png" alt="Élia Marier" width={2048} height={2452} priority unoptimized /><p>Đang kết nối Élia Marier…</p></div>', 'logo màn hình chờ');
replaceRequired('<div className="brand"><div className="brand-square">É<span>.</span></div>', '<div className="brand"><span className="elia-brandmark-shell"><Image className="elia-brandmark" src="/logo-mark.png" alt="Biểu tượng Élia Marier" width={1024} height={1024} priority unoptimized /></span>', 'logo sidebar');
replaceRequired('<div className="art-center">É<span>.</span></div>', '<div className="art-center elia-art-emblem"><Image src="/logo-mark.png" width={1024} height={1024} alt="" aria-hidden="true" unoptimized /></div>', 'logo banner tổng quan');
replaceRequired('<div className="breadcrumb">ÉLIA MARIER', '<span className="elia-topbar-logo"><Image src="/logo-mark.png" alt="" width={1024} height={1024} aria-hidden="true" unoptimized /></span><div className="breadcrumb">ÉLIA MARIER', 'logo topbar mobile');
if(d!==old){writeFileSync(dashboard,d);console.log('OK: Dashboard.tsx (5 vi tri logo + CSS)')}else console.log('Dashboard.tsx đã có logo.');
let l=readFileSync(layout,'utf8');const l0=l;
if(!/icons\s*:/.test(l)){
 if(!l.includes("title: 'Élia Marier',"))throw Error('Không tìm thấy metadata title trong app/layout.tsx.');
 l=l.replace("title: 'Élia Marier',", "title: 'Élia Marier',\n  icons: { icon: '/logo-mark.png', apple: '/logo-mark.png' },");
}
if(l!==l0){writeFileSync(layout,l);console.log('OK: favicon trong metadata')}else console.log('Favicon đã khai báo.');
console.log('Hoàn tất: file gốc logo.png + file trình duyệt public/logo.png + logo-mark.png.');
