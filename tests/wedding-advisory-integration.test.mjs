import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('new and existing event views display prediction by dress code and pickup/return dates',()=>{
 const newBooking=read('components/NewBookingDialog.tsx');
 const existing=read('components/WardrobeEventCodes.tsx');
 for(const src of [newBooking,existing]){
  assert.match(src,/WardrobeRiskNotice/);
  assert.match(src,/predictWardrobeUsage/);
  assert.match(src,/advisoryAcknowledged/);
  assert.match(src,/acknowledgedNearbyIds/);
 }
 assert.match(newBooking,/Gõ mã váy \/ trang phục/);
 assert.match(existing,/Tìm mã váy \/ trang phục/);
});
test('backend validates acknowledgement against exactly the nearby bookings seen',()=>{
 const src=read('app/api/wedding-wardrobe/bookings/route.ts');
 assert.match(src,/NEARBY_ACK_REQUIRED/);
 assert.match(src,/acknowledgedNearbyIds/);
 assert.match(src,/\.transaction\(/);
 assert.doesNotMatch(src,/EVENT_DATE_MISMATCH/);
});
test('wardrobe availability API shows names and nearby reservations',()=>{
 const src=read('app/api/wedding-wardrobe/availability/route.ts');
 assert.match(src,/predictWardrobeUsage/);
 assert.match(src,/nearby:forecast\.nearby/);
});
test('old concept photo flow is replaced and old records remain accessible',()=>{
 const src=read('components/ConceptPhotos.tsx');
 const api=read('app/api/events/[id]/concept-photos/route.ts');
 assert.match(src,/WardrobeEventCodes/);
 assert.match(api,/CONCEPT_UPLOAD_RETIRED/);
 assert.match(api,/export async function GET/);
});
