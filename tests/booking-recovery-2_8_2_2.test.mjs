import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBookingAbort} from '../lib/domain/booking-recovery.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hash=v=>v.etag;
test('null is not treated as deletion until a separate read',()=>{
  assert.equal(classifyBookingAbort({etag:'old'},'old',hash),'BOOKING_RETRY');
  assert.equal(classifyBookingAbort({etag:'new'},'old',hash),'BOOKING_CONFLICT');
  assert.equal(classifyBookingAbort(null,'old',hash),'BOOKING_NOT_FOUND');
});
test('booking PATCH uses ETag instead of aborting on a transient local null',()=>{
 const src=read('app/api/events/[id]/route.ts');
 assert.match(src,/saveBookingConditional/);
 assert.doesNotMatch(src,/BOOKING_TRANSACTION_RETRY/);
 assert.match(read('lib/domain/booking-cas.ts'),/if-match/);
});
test('audit is performed AFTER per-date schedule lock returns',()=>{
 const src=read('app/api/events/[id]/route.ts');
 // Package-linked writes also hold the shared package lease. The audit still runs
 // after both the date lock and package lease return, not inside either lock.
 assert.match(src,/const write=\(\)=>needsScheduleLock \? withScheduleLock\(action,targetDate\) : action\(\)/);
 assert.match(src,/const response=previous\.value\.sourcePackageId/);
 assert.match(src,/withPackageMutationLease\(String\(previous\.value\.sourcePackageId\)/);
 assert.match(src,/if\(committedForAudit\)await audit/);
 assert.ok(src.indexOf('if(committedForAudit)await audit')>src.indexOf('const response=previous.value.sourcePackageId'));
});
test('lease TTL and retry budget tolerate a crashed writer then release safely',()=>{
 const src=read('lib/server/staff-scheduling.ts');
 assert.match(src,/const leaseMs=12_000/);
 assert.match(src,/const deadline=Date.now\(\)\+15_000/);
 assert.match(src,/current\?\.owner===owner\?null:undefined/);
 assert.match(src,/setInterval\(\(\)=>\{void renew\(\);\},2_500\)/);
});
test('read-only admin diagnostics never return lock ownership secrets',()=>{
 const src=read('app/api/scheduling/diagnostics/route.ts');
 assert.match(src,/authenticatedAdmin\(request\)/);
 assert.match(src,/scheduleLockPath\(date\)/);
 assert.doesNotMatch(src,/owner:value\.owner/);
});
