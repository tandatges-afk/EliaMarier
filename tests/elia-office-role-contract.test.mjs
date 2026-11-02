import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('office roles are separate from crew and check active flag',()=>{
 const s=read('lib/server/office-auth.ts');
 assert.match(s,/officeAccounts/);assert.match(s,/record\.active!==true/);
 assert.match(s,/safeOfficeEvent/);assert.match(s,/\.map\(\(\{cost:_/);
});
test('employee must not manage payroll or crew assignment costs',()=>{
 const dashboard=read('app/api/dashboard/route.ts');
 assert.match(dashboard,/actorRole==='admin'\?normalisePayroll/);
 assert.match(dashboard,/safeOfficeEvent\(event,actorRole\)/);
 assert.match(read('app/api/events/[id]/route.ts'),/Chỉ Admin được phân công nhân sự/);
 assert.match(read('app/api/events/route.ts'),/Chỉ Admin được phân công/);
 assert.match(read('app/api/payroll/route.ts'),/identity\(request,true\)/);
});
test('account management requires admin',()=>{
 assert.match(read('app/api/office-accounts/route.ts'),/authenticatedAdmin/);
 assert.match(read('app/api/office-accounts/[uid]/route.ts'),/authenticatedAdmin/);
});
test('Sale has operational pages without payroll or analytics; Admin-only controls are guarded',()=>{
 const dashboard=read('components/Dashboard.tsx');
 assert.match(dashboard,/access==='sale'\?pages\.filter\(p=>!\['payroll','analytics','system','accounts'\]\.includes\(p\.key\)\)/);
 assert.match(dashboard,/canAdmin&&tab==='payroll'/);
 assert.match(dashboard,/canAdmin&&tab==='analytics'/);
 assert.match(dashboard,/<OfficeAccountsManager user=\{user\}/);
 assert.match(read('app/api/payroll/route.ts'),/identity\(request,true\)/);
});
