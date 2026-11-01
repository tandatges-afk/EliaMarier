/** Compatibility checks retained from V5 after V6 changes to package schema and roles. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
test('default office API denies leader access unless explicitly granted',()=>{
 const code=read('lib/server/office-auth.ts');
 assert.match(code,/allowed:readonly OfficeRole\[\]=\['admin','sale'\]/);
 for(const role of ['leader_makeup','leader_photo','leader_decor'])assert.match(code,new RegExp(role));
});
test('wardrobe upload remains authenticated, private, and capped at eight',()=>{
 const code=read('app/api/office-uploads/route.ts');
 assert.match(code,/photos\.length>=8/);
 assert.match(code,/await authorized\(req,kind/);
 assert.match(code,/image\/webp/);
 assert.doesNotMatch(code,/public\/uploads/);
});
test('catalog retains cyclic gallery, swipe and rental mini-calendar',()=>{
 const code=read('components/WardrobeShowroom.tsx');
 assert.match(code,/rotate\(-1\)/);assert.match(code,/rotate\(1\)/);
 assert.match(code,/onPointerUp/);assert.match(code,/weddingConflict/);
});
test('graduation remains removed and catalog is first after overview',()=>{
 assert.doesNotMatch(read('components/NewBookingDialog.tsx'),/Tốt nghiệp/);
 const code=read('components/Dashboard.tsx');
 assert.ok(code.indexOf("key:'overview'")<code.indexOf("key:'catalog'"));
});
