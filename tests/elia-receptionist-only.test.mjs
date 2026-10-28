import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
test('receptionist is the only office role created',()=>{
 const add=read('app/api/office-accounts/route.ts');
 assert.match(add,/role:'receptionist',active:true/);
 assert.doesNotMatch(add,/role:body.role/);
 const update=read('app/api/office-accounts/[uid]/route.ts');
 assert.match(update,/role:'receptionist'/);
});
test('no role selector in receptionist UI',()=>{
 const c=read('components/OfficeAccountsManager.tsx');
 assert.doesNotMatch(c,/<select/);
 assert.doesNotMatch(c,/setRole/);
 assert.match(c,/Tạo tài khoản lễ tân/);
});
test('legacy sale accounts authenticate as receptionist, admin-only costs remain filtered',()=>{
 const s=read('lib/server/office-auth.ts');
 assert.match(s,/record.role!=='receptionist'&&record.role!=='sale'/);
 assert.match(s,/return 'receptionist'/);
 assert.match(s,/\.map\(\(\{cost:_/);
});
test('luxe CSS imported in dashboard and admin page',()=>{
 assert.match(read('components/Dashboard.tsx'),/elia-luxe.css/);
 assert.match(read('app/admin/nhan-vien/page.tsx'),/elia-luxe.css/);
});
