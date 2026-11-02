import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../lib/domain/studio.ts';
  const staff={"3":{id:'s1',name:'Hà',role:'Quay'},"7":{id:'s2',name:'Hùng',role:'Chụp'}};
  const booking=[{id:'e1',name:'Đám cưới',date:'2026-10-18',status:'confirmed',price:5000000,deposit:2000000,assignments:[{id:'s1',cost:1400000}],products:{p:{id:'p1',name:'Video'}}},{id:'e2',name:'Hẹn',date:'2026-10-20',status:'pending',assignments:[]}];
  test('normalises Firebase numeric keys',()=>assert.equal(domain.normaliseStaff(staff).length,2));
  test('supports Firebase mixed array/object data',()=>assert.equal(domain.normaliseEvents({1:booking[0],4:booking[1]}).length,2));
  test('preserves media products for client galleries',()=>assert.equal(domain.normaliseEvents(booking)[0].products[0].id,'p1'));
  test('legacy pending stays visibly unconfirmed, not written back',()=>{ const e=domain.normaliseEvents(booking)[1];assert.equal(e.status,'pending');assert.equal(e.needsStatusReview,true);assert.equal(domain.statusName(e.status),'Cần xác minh');});
  test('status and unpaid computations',()=>assert.deepEqual(domain.getMonthStats(domain.normaliseEvents(booking),'2026-10'),{total:2,confirmed:1,pending:1,cancelled:0,done:0,unpaid:1}));
  test('unverified legacy pending does not contribute to crew payroll',()=>{const rows=domain.normaliseEvents([{id:'xx',date:'2026-10-10',status:'unknown',assignments:[{id:'s1',cost:300000}]}]);assert.equal(domain.calculatePayroll({month:'2026-10',events:rows,payroll:{}},'s1').gross,0);});
  test('correct monthly payroll without cancelled events',()=>{
    const data={month:'2026-10',events:domain.normaliseEvents(booking),payroll:{s1:{advance:200000,paid:300000}}};
    assert.deepEqual(domain.calculatePayroll(data,'s1'),{gross:1400000,advance:200000,paid:300000,balance:900000});
  });
  test('42 calendar cells from Monday',()=>{
    const cells=domain.buildCalendarCells('2026-10');assert.equal(cells.length,42);assert.equal(cells[0].date,'2026-09-28');
  });
  test('month shifting handles December rollover',()=>assert.equal(domain.shiftMonth('2026-12',1),'2027-01'));
  test('rejects invalid month',()=>assert.equal(domain.buildCalendarCells('2026-13').length,0));
  test('supports legacy missing field defaults',()=>{
    const x=domain.normaliseEvents([{id:'abc',date:'2026-10-04'}])[0];assert.equal(x.name,'');assert.deepEqual(x.assignments,[]);
  });
