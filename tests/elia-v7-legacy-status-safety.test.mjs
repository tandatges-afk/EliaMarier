import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normaliseEvents,statusName,getMonthStats,calculatePayroll} from '../lib/domain/studio.ts';
import {getOperationsSnapshot} from '../lib/domain/operations.ts';
const base={id:'legacy-one',name:'Lịch cũ',date:'2026-11-02',start:'08:00',end:'11:00',price:4_000_000,deposit:1_000_000,assignments:[{id:'staff-1',cost:800000}],products:[]};
test('pending/unknown/missing statuses are NOT silently confirmed',()=>{
 for(const raw of ['pending','unexpected',undefined]){
  const [event]=normaliseEvents([{...base,status:raw}]);
  assert.equal(event.status,'pending');assert.equal(event.needsStatusReview,true);
  assert.equal(statusName(event.status),'Cần xác minh');
  assert.equal(event.legacyStatus,raw||'(missing)');
 }
 assert.equal(normaliseEvents([{...base,status:'confirmed'}])[0].needsStatusReview,false);
});
test('unreviewed status is excluded from confirmed, unpaid and crew wages',()=>{
 const events=normaliseEvents([{...base,status:'pending'}]);
 assert.deepEqual(getMonthStats(events,'2026-11'),{total:1,confirmed:0,pending:1,cancelled:0,done:0,unpaid:0});
 assert.equal(calculatePayroll({month:'2026-11',events,payroll:{},staff:[],audit:[],eventLimitReached:false,generatedAt:''},'staff-1').gross,0);
 const ops=getOperationsSnapshot(events,[],'2026-11','2026-11-02');
 assert.deepEqual(ops.pendingConfirmation.map(e=>e.id),['legacy-one']);
 assert.equal(ops.outstanding,0);assert.equal(ops.unassigned.length,0);
});
test('new bookings cannot write the legacy pending status',()=>{
 const source=readFileSync(new URL('../lib/domain/booking.ts',import.meta.url),'utf8');
 assert.match(source,/\['confirmed','done','cancelled'\]\.includes\(status\)/);
 assert.doesNotMatch(source,/\['confirmed','pending'/);
});
test('public obsolete Firebase write script is no longer published',()=>{
 const source=readFileSync(new URL('../scripts/check-static.mjs',import.meta.url),'utf8');
 assert.match(source,/!exists\('public\/assets\/js\/main\.js'\)/);
});

test('legacy status resolution requires Admin and a validated new status',()=>{
 const source=readFileSync(new URL('../app/api/events/[id]/route.ts',import.meta.url),'utf8');
 assert.match(source,/LEGACY_STATUS_REVIEW_REQUIRED/);
 assert.match(source,/!isAdmin\(user\)\|\|!\['confirmed','done','cancelled'\]/);
 assert.match(source,/saveBookingConditional\(/); // Optimistic write, no blind overwrite.
});
test('legacy pending is not counted as payroll debt by separate ledger',async()=>{
 const {buildPayrollLedger}=await import('../lib/domain/payroll.ts');
 const staff={s:{id:'staff-1',name:'Thợ Một',role:'Quay',active:true}};
 const events={x:{...base,status:'pending'}};
 const ledger=buildPayrollLedger('2026-11',staff,events,{});
 assert.equal(ledger.rows[0].gross,0);assert.equal(ledger.rows[0].jobs,0);
});
