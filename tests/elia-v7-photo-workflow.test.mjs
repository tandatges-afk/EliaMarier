import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateModule,photoTypes,photoVenueMode,crewKeysForPhoto,isTwoHousePhoto,isCombinedHouses} from '../lib/domain/elia-operations.ts';
import {validateBooking} from '../lib/domain/booking.ts';
const file=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const shared={brideName:'Lan',bridePhone:'0901000000',brideAddress:'Nhà cô dâu',groomName:'Minh',groomPhone:'0902000000',groomAddress:'Nhà chú rể',price:700001,deposit:200001};
const photo=(type,more={})=>({id:'photo-00001',type,date:'2026-12-15',start:'08:00',end:'12:00',notes:'',crew:{},startTrai:'08:00',startGai:'08:00',...more});
const pack=(entry,data=shared)=>({...data,services:{photo:{entries:[entry]}}});
test('Photo service matrix only enables suitable crew roles',()=>{
 assert.ok(photoTypes.includes('Vu quy + Đám nối'));
 assert.deepEqual(crewKeysForPhoto('Chụp cổng'),['photo_traditional']);
 assert.deepEqual(crewKeysForPhoto('Concept'),['photo_traditional']);
 for(const kind of ['Dạm ngõ','Xuất giá','Pre-wedding'])assert.deepEqual(crewKeysForPhoto(kind),['photo_traditional','video_traditional']);
 for(const kind of ['Đám nối','Vu quy','Rước dâu','Vu quy + Đám nối'])assert.equal(crewKeysForPhoto(kind).length,4);
});
test('External destinations required, other shoots inherit bride house',()=>{
 for(const kind of ['Chụp cổng','Concept','Pre-wedding']){
  assert.equal(photoVenueMode(kind),'external');
  assert.throws(()=>validateModule('packages',pack(photo(kind))),/địa điểm/);
  assert.equal(validateModule('packages',pack(photo(kind,{location:'Studio'}))).balance,500000);
 }
 for(const kind of ['Dạm ngõ','Xuất giá','Đám nối','Vu quy']){
  assert.equal(photoVenueMode(kind),'bride');
  assert.equal(validateModule('packages',pack(photo(kind))).balance,500000);
 }
});
test('Crew choices rejected when invalid for photo product',()=>{
 assert.throws(()=>validateModule('packages',pack(photo('Chụp cổng',{location:'Studio',crew:{video_reportage:1}}))),/không sử dụng/);
 assert.equal(validateModule('packages',pack(photo('Đám nối',{crew:{video_reportage:1}}))).services.photo.entries[0].crew.video_reportage,1);
});
test('Two-house photo service requires groom complete details',()=>{
 for(const kind of ['Rước dâu','Vu quy + Đám nối']){
  assert.equal(isTwoHousePhoto(kind),true);
  assert.throws(()=>validateModule('packages',pack(photo(kind),{...shared,groomPhone:''})),/nhà trai|chú rể/);
  assert.throws(()=>validateModule('packages',pack(photo(kind),{...shared,groomAddress:''})),/nhà trai|chú rể/);
  assert.equal(validateModule('packages',pack(photo(kind))).status,'confirmed');
 }
});
test('Groom restaurant triggers groom details; bride-only work does not',()=>{
 assert.equal(validateModule('packages',pack(photo('Vu quy'),{brideName:'Lan',bridePhone:'0901000000',brideAddress:'Nhà dâu'})).balance,0);
 assert.throws(()=>validateModule('packages',pack(photo('Vu quy'),{...shared,groomName:'',groomRestaurant:'Nhà hàng trai'})),/nhà trai|chú rể/);
 assert.equal(validateModule('packages',pack(photo('Vu quy'),{...shared,brideRestaurant:'Nhà hàng gái',groomRestaurant:'Nhà hàng trai'})).groomRestaurant,'Nhà hàng trai');
});
test('Direct booking combined event cannot assign a default house',()=>{
 const v={id:'booking-123456',name:'Vu quy + Đám nối Lan Minh',date:'2026-12-15',start:'08:00',end:'12:00',eventType:'Cưới',photoServiceType:'Vu quy + Đám nối',isRuocDau:true,startTrai:'08:00',startGai:'08:00',locTrai:'Nhà trai',locGai:'Nhà gái',phoneTrai:'0902000000',phoneGai:'0901000000',brideName:'Lan',groomName:'Minh',price:0,deposit:0,status:'confirmed',location:'',assignments:[{id:'staff-00001',task:'Chụp truyền thống',cost:0,locType:''}]};
 assert.equal(isCombinedHouses(v.photoServiceType),true);
 assert.match(validateBooking(v).message,/chọn nhà/);
 const checked=validateBooking({...v,assignments:[{...v.assignments[0],locType:'Nhà trai'}]});
 assert.equal(checked.ok,true);
});
test('Compact crew UI and per-person location enforced by server',()=>{
 const c=file('components/EliaOperationsSchedules.tsx');
 assert.match(c,/CompactCrewPicker/);assert.match(c,/Thêm thợ/);assert.doesNotMatch(c,/Số lượng thợ cần chuẩn bị/);
 const l=file('components/PhotoLeaderPlanner.tsx');assert.match(l,/Chọn nhà/);assert.match(l,/isCombinedHouses/);
 const api=file('app/api/events/[id]/route.ts');assert.match(api,/bắt buộc chọn nhà trai hoặc nhà gái/);
 const staff=file('app/api/staff/shared/route.ts');assert.match(staff,/brideRestaurant/);assert.match(staff,/groomRestaurant/);
 const screen=file('components/StaffPortal.tsx');assert.match(screen,/Nhà hàng nhà trai/);assert.match(screen,/Nhà hàng nhà gái/);
});
test('Package creation removes extra contact phone and status selector',()=>{
 const c=file('components/EliaOperationsSchedules.tsx');
 assert.doesNotMatch(c,/contactPhone:'SĐT liên hệ'/);
 assert.match(c,/module!=='packages'\|\|Boolean\(editing\)/);
});

test('Package with a combined photo event can be edited after leader allocation',()=>{
 const code=file('lib/server/elia-package-sync.ts');
 assert.match(code,/entry\.type!==\(oldEvent\.photoServiceType\|\|oldEvent\.eventType\)/);
 assert.match(code,/ruocDau&&\(entry\.startTrai!==oldEvent\.startTrai/);
});
