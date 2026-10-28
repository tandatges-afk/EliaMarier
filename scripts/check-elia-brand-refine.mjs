#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const page=join(root,'components','Dashboard.tsx');
const files=['components/EliaBrandMini.tsx','components/elia-brand-refine.css','public/logo-mark.png'];
let errors=[];
for(const p of files)if(!existsSync(join(root,p)))errors.push(`Thiếu ${p}`);
if(!existsSync(page))errors.push('Thiếu components/Dashboard.tsx');
if(!errors.length){
 const source=readFileSync(page,'utf8');
 const checks=[
 ['Logo đầu sidebar',source.includes('<EliaBrandMini variant="sidebar" />')],
 ['Logo khu vực người dùng',source.includes('<EliaBrandMini variant="profile" />')],
 ['Logo góc header',source.includes('<EliaBrandMini variant="topbar" />')],
 ['Đã bỏ thẻ tài khoản lễ tân dư',!source.includes("canAdmin&&tab==='overview'&&<section")],
 ['Đã bỏ banner Tổng quan',!source.includes('className="welcome-band"')],
 ['Tài khoản Admin vẫn có menu riêng',source.includes("key:'accounts'")],
 ['Lịch và dữ liệu vẫn giữ nguyên',source.includes('<OperationsHub data={data}')],
 ];
 for(const [label,pass]of checks){console.log(`${pass?'OK':'FAILED'}: ${label}`);if(!pass)errors.push(label)}
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('PASS: bố cục logo và Tổng quan đã cập nhật. Chưa thay thế cho npm run typecheck / npm run build.');
