import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
test('Admin can create V7 office roles but cannot mint other Admin accounts',()=>{
 const add=read('app/api/office-accounts/route.ts');
 const update=read('app/api/office-accounts/[uid]/route.ts');
 assert.match(add,/authenticatedAdmin\(request\)/);
 assert.match(add,/OFFICE_ROLES\.includes\(role\)/);
 assert.match(add,/role==='admin'/);
 assert.match(update,/adminTargetGuard\(uid/);
 assert.match(update,/role==='admin'/);
});
test('role selector offers Sale and each specialist Leader',()=>{
 const c=read('components/OfficeAccountsManager.tsx');
 assert.match(c,/<select value=\{role\}/);
 for(const role of ['sale','leader_photo','leader_makeup','leader_decor'])assert.ok(c.includes(`value="${role}"`),role);
 assert.doesNotMatch(c,/<option value="admin"/);
});
test('legacy receptionist maps to Sale; non-Admin staff never sees other crew costs',()=>{
 const s=read('lib/server/office-auth.ts');
 assert.match(s,/record\.role==='receptionist'\?'sale':record\.role/);
 assert.match(s,/\.map\(\(\{cost:_/);
 assert.match(s,/allowed:readonly OfficeRole\[\]=\['admin','sale'\]/);
});
test('luxe CSS imported in dashboard and admin page',()=>{
 assert.match(read('components/Dashboard.tsx'),/elia-luxe.css/);
 assert.match(read('app/admin/nhan-vien/page.tsx'),/elia-luxe.css/);
});
