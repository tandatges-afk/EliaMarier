import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isValidWeddingDate,normalizeWeddingCode,validWeddingCode,validWeddingRange,weddingConflict,weddingOverlaps} from '../lib/domain/wedding-rental.ts';
const booking=(id,startDate,endDate,status='reserved')=>({id,startDate,endDate,status});
test('dates are valid calendar dates and end day is included',()=>{
 assert.equal(isValidWeddingDate('2028-02-29'),true);
 assert.equal(isValidWeddingDate('2027-02-29'),false);
 assert.equal(validWeddingRange('2026-10-31','2026-11-02'),true);
 assert.equal(validWeddingRange('2026-11-02','2026-10-31'),false);
 assert.equal(weddingOverlaps('2026-11-02','2026-11-04','2026-11-04','2026-11-05'),true);
 assert.equal(weddingOverlaps('2026-11-02','2026-11-03','2026-11-04','2026-11-05'),false);
});
test('same dress cannot be reserved twice, including return day',()=>{
 const data={a:booking('a','2026-11-02','2026-11-04')};
 assert.equal(weddingConflict(data,'2026-11-04','2026-11-05')?.id,'a');
 assert.equal(weddingConflict(data,'2026-11-05','2026-11-06'),null);
 assert.equal(weddingConflict(data,'2026-11-02','2026-11-04','a'),null);
});
test('cancelled does not block date, returned preserves past reservation',()=>{
 const data={a:booking('a','2026-11-01','2026-11-04','cancelled'),b:booking('b','2026-11-05','2026-11-07','returned')};
 assert.equal(weddingConflict(data,'2026-11-01','2026-11-04'),null);
 assert.equal(weddingConflict(data,'2026-11-06','2026-11-07')?.id,'b');
});
test('code normalization treats same codes as same key input',()=>{
 assert.equal(normalizeWeddingCode(' vc-001  '),'VC-001');
 assert.equal(validWeddingCode(normalizeWeddingCode(' váy cưới-01 ')),true);
 assert.equal(validWeddingCode('VC/001'),false);
});
test('booking endpoints use transaction and authenticated office guard',()=>{
 const create=readFileSync(new URL('../app/api/wedding-wardrobe/bookings/route.ts',import.meta.url),'utf8');
 const edit=readFileSync(new URL('../app/api/wedding-wardrobe/bookings/[itemId]/[bookingId]/route.ts',import.meta.url),'utf8');
 assert.match(create,/authenticatedOffice\(request\)/);assert.match(create,/\.transaction\(/);assert.match(create,/weddingConflict/);
 assert.match(edit,/authenticatedOffice\(request\)/);assert.match(edit,/\.transaction\(/);assert.match(edit,/weddingConflict/);
});
