import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {retiringWardrobeEntries,linkedWardrobeEditCode,wardrobeHasUnreturnedPickup} from '../lib/domain/elia-package-write-safety.ts';

const src=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('removing a dress from a package retires its previous booking',()=>{
 const a={id:'service001',itemId:'dressA',startDate:'2026-11-03',endDate:'2026-11-04'};
 assert.deepEqual(retiringWardrobeEntries([a],[],false),[a]);
});
test('switching a package service to another dress retires the previous booking',()=>{
 const a={id:'service001',itemId:'dressA'};
 assert.deepEqual(retiringWardrobeEntries([a],[{id:'service001',itemId:'dressB'}],false),[a]);
});
test('date adjustment for the same booking identity does not cancel the new booking',()=>{
 const a={id:'service001',itemId:'dressA',startDate:'2026-11-03',endDate:'2026-11-04'};
 assert.deepEqual(retiringWardrobeEntries([a],[{...a,startDate:'2026-11-06'}],false),[]);
});
test('cancelling a package retires all linked reservations',()=>{
 const old=[{id:'service001',itemId:'dressA'},{id:'service002',itemId:'dressB'}];
 assert.deepEqual(retiringWardrobeEntries(old,old,true),old);
});
test('picked-up dress must be returned before removal even during package cancellation',()=>{
 assert.equal(wardrobeHasUnreturnedPickup('picked_up'),true);
 for(const state of ['reserved','returned','cancelled',null])assert.equal(wardrobeHasUnreturnedPickup(state),false);
});
test('linked dress cannot modify dates or cancel through direct calendar endpoint',()=>{
 assert.equal(linkedWardrobeEditCode(true,true,undefined),'PACKAGE_LINKED_FIELDS');
 assert.equal(linkedWardrobeEditCode(true,false,'cancelled'),'PACKAGE_LINKED_CANCEL');
 assert.equal(linkedWardrobeEditCode(true,false,'picked_up'),null);
 assert.equal(linkedWardrobeEditCode(true,false,'returned'),null);
 assert.equal(linkedWardrobeEditCode(false,true,'cancelled'),null);
});
test('both photo leader write and package save share the same package mutation lock',()=>{
 assert.match(src('app/api/events/[id]/route.ts'),/withPackageMutationLease\(String\(previous\.value\.sourcePackageId\)/);
 assert.match(src('lib/server/elia-package-sync.ts'),/export async function withPackageMutationLease/);
 assert.match(src('lib/server/elia-package-sync.ts'),/await lease\(pkgId,actor\.token\.uid\)/);
});
test('pickup and return of a linked wardrobe booking share its package lease',()=>{
 const code=src('app/api/wedding-wardrobe/bookings/[itemId]/[bookingId]/route.ts');
 assert.match(code,/withPackageMutationLease\(original\.packageId/);
 assert.match(code,/linkedWardrobeEditCode\(Boolean\(previous\.packageId\),canEdit,wantedStatus\)/);
});
test('cleanup failures are verified and recorded rather than silently returning success',()=>{
 const code=src('lib/server/elia-package-sync.ts');
 assert.match(code,/eliaPackageReconciliations/);
 assert.match(code,/cleanupFailures\.push/);
 assert.match(code,/PACKAGE_WARDROBE_CLEANUP_PENDING/);
 assert.match(code,/const latest=asWeddingItem\(/);
});

test('linked makeup endpoint responds with the final record after specialist layout update',()=>{
 const code=src('app/api/elia-operations/[module]/[id]/route.ts');
 const write=code.indexOf("await moduleRef('makeup').child(id).update({layout:");
 const read=code.indexOf('const latest=(await moduleRef(module).child(id).once');
 assert.ok(write>=0 && read>write, 'returned makeup record must not predate the final update');
});
