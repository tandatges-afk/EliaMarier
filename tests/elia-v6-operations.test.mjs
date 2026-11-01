import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateModule,safeScheduleEdit} from '../lib/domain/elia-operations.ts';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const e=(id,type,installDate,removalDate)=>({id,type,installDate,removalDate,notes:''});
const shared={brideName:'Lan',groomName:'Minh',bridePhone:'0901234567',contactPhone:'0901234567',brideAddress:'Nhà dâu',groomAddress:'Nhà rể',price:32000123,deposit:1234567};
const decor={...shared,events:[e('decor-vuquy','vu_quy','2026-12-09','2026-12-11'),e('decor-thanhhon','thanh_hon','2026-12-14','2026-12-15')]};
const photo={id:'photo-00001',type:'Rước dâu',date:'2026-12-12',start:'06:00',end:'12:00',startTrai:'06:00',startGai:'08:00',locTrai:'Nhà rể',locGai:'Nhà dâu',crew:{photo_traditional:2,video_reportage:1},notes:''};
const dress={id:'dress-00001',itemId:'a'.repeat(64),startDate:'2026-12-11',endDate:'2026-12-13',notes:'',advisoryAcknowledged:false};
const wedding={...shared,services:{photo:{entries:[photo,{...photo,id:'photo-00002',type:'Chụp cổng',date:'2026-12-15'}]},decor:{entries:decor.events},makeup:{entries:[{id:'makeup-0001',date:'2026-12-12',time:'04:30',notes:'Tự nhiên'}]},wardrobe:{entries:[dress]}}};
test('decor accepts multiple ceremonies and flexible per-ceremony construction dates',()=>{const d=validateModule('decor',decor);assert.equal(d.balance,30765556);assert.equal(d.events.length,2);assert.equal(d.events[0].installDate,'2026-12-09');});
test('decor requires groom only for groom-side ceremony and a bride for other ceremonies',()=>{assert.throws(()=>validateModule('decor',{...decor,groomName:''}),/Thành hôn/);assert.throws(()=>validateModule('decor',{...decor,brideName:''}),/nhà dâu/);assert.throws(()=>validateModule('decor',{...decor,events:[{...decor.events[0],removalDate:'2026-12-01'}]}),/tháo dỡ/);});
test('leader decor may edit construction dates but cannot edit ceremony kind or notes',()=>{assert.equal(safeScheduleEdit('decor',decor,{events:decor.events.map((x,i)=>i?x:{...x,installDate:'2026-12-10'})}),true);assert.equal(safeScheduleEdit('decor',decor,{events:decor.events.map((x,i)=>i?x:{...x,type:'dam_ngo'})}),false);assert.equal(safeScheduleEdit('decor',decor,{events:[decor.events[0]]}),false);});
test('makeup uses only one date/time and notes in packages',()=>{const v=validateModule('packages',wedding);assert.equal(v.services.makeup.entries[0].time,'04:30');assert.equal(v.services.photo.entries.length,2);});
test('photo packages include groom/bride timings and crew count options',()=>{const v=validateModule('packages',wedding);assert.equal(v.services.photo.entries[0].crew.photo_traditional,2);assert.equal(v.services.photo.entries[0].crew.video_reportage,1);assert.throws(()=>validateModule('packages',{...wedding,services:{photo:{entries:[{...photo,locTrai:''}]}}}),/Rước dâu/);});
test('wardrobe entry requires real dress ID and ordered pickup return dates',()=>{assert.equal(validateModule('packages',wedding).services.wardrobe.entries[0].itemId,'a'.repeat(64));assert.throws(()=>validateModule('packages',{...wedding,services:{wardrobe:{entries:[{...dress,endDate:'2026-11-01'}]}}}),/Khoảng thuê/);});
test('money is exact VND without step multiples',()=>{const v=validateModule('packages',wedding);assert.equal(v.price,32000123);assert.equal(v.deposit,1234567);assert.equal(v.balance,30765556);});
test('UI implements calendar grid, role crew controls, and dropdown order',()=>{const x=read('components/EliaOperationsSchedules.tsx');assert.match(x,/buildCalendarCells/);assert.match(x,/VndInput/);assert.match(x,/predictWardrobeUsage/);assert.match(x,/crewChoices/);const dash=read('components/Dashboard.tsx');assert.ok(dash.indexOf("key:'overview'")<dash.indexOf("key:'catalog'"));assert.ok(dash.indexOf("key:'catalog'")<dash.indexOf("key:'packages'"));assert.ok(dash.indexOf("key:'packages'")<dash.indexOf("key:'calendar'"));});
test('package projection uses Firebase atomic update and per-item dress transactions',()=>{const s=read('lib/server/elia-package-sync.ts');assert.match(s,/base\(\)\.update/);assert.match(s,/weddingItemsRef\(\)\.child\(entry\.itemId\)\.transaction/);assert.match(s,/new PackageFault\(409/);assert.match(s,/sourcePackageId/);});
test('three booking statuses and manager-only crew assignment',()=>{const dialog=read('components/NewBookingDialog.tsx');assert.doesNotMatch(dialog,/Chờ xác nhận/);assert.match(read('app/api/events/[id]/route.ts'),/actorRole==='leader_photo'/);assert.match(read('components/CalendarPlanner.tsx'),/elia-v6-unassigned/);});

test('package-linked makeup IDs support editing timelines and uploading reference photos',()=>{
 assert.match(read('app/api/elia-operations/[module]/[id]/route.ts'),/pk\[a-f0-9\]\{32\}/);
 assert.match(read('app/api/office-uploads/route.ts'),/pk\[a-f0-9\]\{32\}/);
});

test('package-held wardrobe bookings can be picked up and returned in wardrobe calendar',()=>{
 assert.match(read('app/api/wedding-wardrobe/bookings/[itemId]/[bookingId]/route.ts'),/pk\[a-f0-9\]\{32\}/);
});

test('photo leader can update bride and groom times for bridal procession and sync package',()=>{
 const component=read('components/PhotoLeaderPlanner.tsx'),api=read('app/api/events/[id]/route.ts');
 assert.match(component,/Giờ nhà trai/);assert.match(component,/Giờ nhà gái/);assert.match(api,/startTrai:committed.startTrai/);
});

test('linked photo records reject independent deletion or financial modifications',()=>{
 const api=read('app/api/events/[id]/route.ts');
 assert.match(api,/if\(item\.value\.sourcePackageId\)/);
 assert.match(api,/only change|chỉ thay đổi thời gian/i);
});

test('Rước dâu schedule keeps both house times when normalised for leader',()=>{
 const code=read('lib/domain/studio.ts');assert.match(code,/isRuocDau:e\.isRuocDau===true/);
 assert.match(code,/startTrai:txt\(e.startTrai/);
});
