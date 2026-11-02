/** Package save + specialist calendar projection for Firebase RTDB.
 * RTDB multi-location update makes photo, decor, makeup and package records visible together.
 * Dress reservations are independently guarded by per-item transactions and compensated on failure.
 */
import {createHash,randomUUID} from 'node:crypto';
import {adminDatabase} from './firebase-admin';
import {asWeddingItem,weddingItemsRef,makeWeddingBooking,validateWeddingBookingInput} from './wedding-wardrobe';
import {weddingConflict, type WeddingBooking} from '@/lib/domain/wedding-rental';
import {predictWardrobeUsage} from '@/lib/domain/wedding-advisory';
import {validateModule,isTwoHousePhoto,isRuocDau,photoVenueMode} from '@/lib/domain/elia-operations';
import {moduleRef} from './elia-operations';
import type {OfficeIdentity} from './office-auth';

type Item={id:string;[key:string]:any};
type PackageRecord=Record<string,any>;
const base=()=>adminDatabase().ref('studioPlanner_v1');
const serviceEntries=(doc:PackageRecord,k:string):Item[]=>Array.isArray(doc.services?.[k]?.entries)?doc.services[k].entries:[];
const recordId=(pkgId:string,entryId:string)=>'pk'+createHash('sha256').update(`${pkgId}:${entryId}`).digest('hex').slice(0,32);
const safeText=(value:unknown)=>String(value||'').trim();
const statusIsCancelled=(doc:PackageRecord)=>doc.status==='cancelled';
class PackageFault extends Error{constructor(public status:number,message:string,public code:string){super(message);}}
export {PackageFault};
async function lease(pkgId:string,uid:string){
 const lock=base().child('eliaPackageLocks').child(pkgId),token=randomUUID();
 const tx=await lock.transaction(current=>!current||Number(current.expiresAt)<Date.now()?{uid,token,expiresAt:Date.now()+90000}:undefined,undefined,false);
 if(!tx.committed)throw new PackageFault(409,'Gói đang được cập nhật bởi người khác. Vui lòng thử lại.','PACKAGE_BUSY');
 return async()=>{try{await lock.transaction(current=>current?.token===token?null:undefined,undefined,false);}catch(e){console.error('[package] failed to release lease',e);}};
}
/** Create/update an operational package and every specialist calendar using one source package ID. */
export async function savePackage(actor:OfficeIdentity,input:unknown,opts:{id?:string;expectedUpdatedAt?:number}={}){
 const doc=validateModule('packages',input) as PackageRecord;
 const pkgId=opts.id||randomUUID(),release=await lease(pkgId,actor.token.uid);
 const made:{itemId:string;bookingId:string;prior?:unknown}[]=[];
 let parentCommitted=false;
 try{
  const old=opts.id?(await moduleRef('packages').child(pkgId).once('value')).val() as PackageRecord|null:null;
  if(opts.id&&(!old||old.updatedAt!==opts.expectedUpdatedAt))throw new PackageFault(409,'Gói đã được cập nhật. Tải lại để tránh ghi đè.','PACKAGE_VERSION');
  if(old && old.sourceVersion!==2)throw new PackageFault(409,'Gói phiên bản khác cần chuyển đổi trước khi sửa.','PACKAGE_LEGACY');
  if(old?.status==='cancelled'&&doc.status!=='cancelled')throw new PackageFault(409,'Gói đã hủy. Hãy tạo một gói mới để giữ lịch và trang phục.','PACKAGE_CANCELLED');
  const oldWard=serviceEntries(old||{},'wardrobe');
  // Disallow two simultaneous reservations of the same dress inside one package.
  const selected=new Set<string>();
  for(const entry of serviceEntries(doc,'wardrobe')){
   const key=`${entry.itemId}`;if(selected.has(key))throw new PackageFault(422,'Một gói không thể chọn trùng một trang phục. Hãy gộp khoảng thuê.','DUPLICATE_DRESS');selected.add(key);
  }
  const parentId=old?.id||pkgId,now=Date.now();
  const status=doc.status==='cancelled'?'cancelled':doc.status==='done'?'done':'confirmed';
  const projected=new Map<string,unknown>();
  const photoOld=serviceEntries(old||{},'photo'),makeupOld=serviceEntries(old||{},'makeup');
  // Preserve historical specialist records as cancelled instead of deleting completed work/photos.
  const photoNewIds=new Set(serviceEntries(doc,'photo').map(e=>e.id));
  for(const entry of photoOld){
   const id=recordId(pkgId,entry.id),prior=(await base().child('events').child(id).once('value')).val();
   if(prior && (statusIsCancelled(doc)||!photoNewIds.has(entry.id))){
    if(prior.assignments?.length && !statusIsCancelled(doc))throw new PackageFault(409,'Lịch đã phân công thợ. Gỡ phân công trong lịch quay chụp trước khi bỏ dịch vụ.','PHOTO_HAS_CREW');
    projected.set(`events/${id}`,{...prior,status:'cancelled'});
   }
  }
  const makeupNewIds=new Set(serviceEntries(doc,'makeup').map(e=>e.id));
  for(const entry of makeupOld){
   const id=recordId(pkgId,entry.id),prior=(await moduleRef('makeup').child(id).once('value')).val();
   if(prior&&(statusIsCancelled(doc)||!makeupNewIds.has(entry.id)))projected.set(`eliaModules/makeup/${id}`,{...prior,status:'cancelled',updatedAt:Date.now()});
  }
  if(serviceEntries(old||{},'decor').length){const prior=(await moduleRef('decor').child(pkgId).once('value')).val();if(prior&&(statusIsCancelled(doc)||!serviceEntries(doc,'decor').length))projected.set(`eliaModules/decor/${pkgId}`,{...prior,status:'cancelled',updatedAt:Date.now()});}
  const clientName=[doc.brideName,doc.groomName].filter(Boolean).join(' & ')||'Khách hàng';
  const phone=safeText(doc.bridePhone||doc.groomPhone);
  if(status!=='cancelled'){
   for(const entry of serviceEntries(doc,'photo')){
    const id=recordId(pkgId,entry.id),ruocDau=isRuocDau(entry.type),twoHouses=isTwoHousePhoto(entry.type),venueMode=photoVenueMode(entry.type);
    const oldEvent=photoOld.some(e=>e.id===entry.id)?(await base().child('events').child(id).once('value')).val():null;
    if(oldEvent?.assignments?.length &&entry.type!==(oldEvent.photoServiceType||oldEvent.eventType))throw new PackageFault(409,'Lịch đã phân công thợ. Hãy gỡ phân công trước khi đổi loại dịch vụ.','CREW_ASSIGNED_TYPE');
    if(oldEvent?.assignments?.length &&(entry.date!==oldEvent.date||entry.start!==oldEvent.start||entry.end!==oldEvent.end||(ruocDau&&(entry.startTrai!==oldEvent.startTrai||entry.startGai!==oldEvent.startGai)))){
     throw new PackageFault(409,'Lịch quay chụp đã phân công thợ. Hãy chỉnh thời gian tại lịch chuyên môn trước.','CREW_ASSIGNED');
    }
    projected.set(`events/${id}`,{...oldEvent,id,name:clientName,date:entry.date,start:entry.start,end:entry.end,eventType:entry.type,phone,location:venueMode==='external'?entry.location:doc.brideAddress,note:entry.notes,price:0,deposit:0,status,
     assignments:oldEvent?.assignments||[],photoServiceType:entry.type,isRuocDau:twoHouses,startTrai:twoHouses?(ruocDau?entry.startTrai:entry.start):'',startGai:twoHouses?(ruocDau?entry.startGai:entry.start):'',locTrai:twoHouses?doc.groomAddress:'',locGai:twoHouses?doc.brideAddress:'',phoneTrai:twoHouses?doc.groomPhone:'',phoneGai:twoHouses?doc.bridePhone:'',brideName:doc.brideName,groomName:doc.groomName,brideRestaurant:doc.brideRestaurant,groomRestaurant:doc.groomRestaurant,
     products:oldEvent?.products||[],favoritePhotos:oldEvent?.favoritePhotos||[],favoritePhotoItems:oldEvent?.favoritePhotoItems||[],
     requiredCrew:entry.crew,sourcePackageId:pkgId,sourceEntryId:entry.id});
   }
   for(const entry of serviceEntries(doc,'makeup')){
    const id=recordId(pkgId,entry.id),oldRecord=makeupOld.some(e=>e.id===entry.id)?(await moduleRef('makeup').child(id).once('value')).val():null;
    projected.set(`eliaModules/makeup/${id}`,{...oldRecord,id,customerName:clientName,phone,makeupDate:entry.date,makeupTime:entry.time,layout:oldRecord?.layout||'',photos:oldRecord?.photos||[],notes:entry.notes,status,createdAt:oldRecord?.createdAt||now,createdBy:oldRecord?.createdBy||actor.token.uid,updatedAt:now,sourcePackageId:pkgId,sourceEntryId:entry.id});
   }
   const decorEntries=serviceEntries(doc,'decor');
   if(decorEntries.length){const oldDecor=(await moduleRef('decor').child(pkgId).once('value')).val();projected.set(`eliaModules/decor/${pkgId}`,{...oldDecor,...Object.fromEntries(['brideName','groomName','bridePhone','groomPhone','brideAddress','groomAddress','brideRestaurant','groomRestaurant'].map(k=>[k,doc[k]])),id:pkgId,notes:doc.notes,price:0,deposit:0,balance:0,status,events:decorEntries,createdAt:oldDecor?.createdAt||now,createdBy:oldDecor?.createdBy||actor.token.uid,updatedAt:now,sourcePackageId:pkgId});}
  }
  if(status==='cancelled'){for(const entry of oldWard){const item=asWeddingItem((await weddingItemsRef().child(entry.itemId).once('value')).val());const booking=item?.bookings[recordId(pkgId,entry.id)];if(booking?.status==='picked_up')throw new PackageFault(409,'Trang phục đang được khách nhận. Cần hoàn trả trước khi hủy gói.','WARDROBE_NOT_RETURNED');}}
  // Reserve newly selected/changed dress dates one item at a time, with conflict checks.
  // Old reservations remain until the linked calendars and package commit succeeds.
  const nextWard=serviceEntries(doc,'wardrobe');
  for(const entry of nextWard){
   const previous=oldWard.find(e=>e.id===entry.id && e.itemId===entry.itemId && e.startDate===entry.startDate && e.endDate===entry.endDate);
   if(previous && status!=='cancelled')continue;
   if(status==='cancelled')continue;
   const validated=validateWeddingBookingInput({customerName:clientName,customerPhone:phone,startDate:entry.startDate,endDate:entry.endDate,notes:entry.notes});
   const booking={...makeWeddingBooking(actor.token,entry.itemId,validated),id:recordId(pkgId,entry.id),packageId:pkgId,packageEntryId:entry.id};
   let denial='';let prior:WeddingBooking|undefined;
   const tx=await weddingItemsRef().child(entry.itemId).transaction(raw=>{
    const item=asWeddingItem(raw);if(!item){denial='Không tìm thấy trang phục';return;}
    if(!item.active){denial='Trang phục đã ngừng sử dụng';return;}
    prior=item.bookings[booking.id];
    if(prior && ['picked_up','returned'].includes(prior.status)){denial='Trang phục đã nhận/trả; không thể chuyển ngày giữ mã trong gói. Hãy tạo lượt thuê mới.';return;}
    const conflict=weddingConflict(item.bookings,entry.startDate,entry.endDate,booking.id);
    if(conflict){denial=`Trang phục ${item.code} đã được thuê từ ${conflict.startDate} đến ${conflict.endDate}`;return;}
    const nearby=predictWardrobeUsage(item.bookings,entry.startDate,entry.endDate,booking.id).nearby;
    if(nearby.length&&!entry.advisoryAcknowledged){denial=`Trang phục ${item.code} có lịch sát ngày. Vui lòng kiểm tra và xác nhận tư vấn.`;return;}
    return {...item,bookings:{...item.bookings,[booking.id]:booking}};
   },undefined,false);
   if(!tx.committed)throw new PackageFault(409,denial||'Không giữ được trang phục','WARDROBE_CONFLICT');
   made.push({itemId:entry.itemId,bookingId:booking.id,prior});
  }
  const oldBookingPairs=oldWard.map(e=>({itemId:e.itemId,bookingId:recordId(pkgId,e.id)}));
  const newBookingPairs=nextWard.map(e=>({itemId:e.itemId,bookingId:recordId(pkgId,e.id)}));
  const retained=new Set(status==='cancelled'?[]:newBookingPairs.map(x=>`${x.itemId}:${x.bookingId}`));
  const record={...doc,id:parentId,createdBy:old?.createdBy||actor.token.uid,createdAt:old?.createdAt||now,updatedAt:now,sourceVersion:2};
  projected.set(`eliaModules/packages/${pkgId}`,record);
  await base().update(Object.fromEntries(projected));
  parentCommitted=true;
  // Release old dress reservations ONLY after the new schedule is committed.
  // Use transaction guards so independent staff changes cannot be overwritten.
  for(const previous of oldBookingPairs){
   if(retained.has(`${previous.itemId}:${previous.bookingId}`))continue;
   try{await weddingItemsRef().child(previous.itemId).transaction(raw=>{
    const item=asWeddingItem(raw);if(!item)return;
    const booking=item.bookings[previous.bookingId] as any;
    if(!booking||booking.packageId!==pkgId)return;
    if(booking.status==='picked_up'||booking.status==='returned')return;
    const bookings={...item.bookings,[previous.bookingId]:{...booking,status:'cancelled',updatedAt:Date.now()}};return {...item,bookings};
   },undefined,false);}catch(e){console.error('[package] old wardrobe booking cleanup needed',previous,e);}
  }
  return record;
 }catch(e){
  if(!parentCommitted){for(const x of made.reverse()){
   try{await weddingItemsRef().child(x.itemId).transaction(raw=>{const item=asWeddingItem(raw);if(!item)return;const existing=item.bookings[x.bookingId] as any;if(existing?.packageId!==pkgId)return;const bookings={...item.bookings};if(x.prior)bookings[x.bookingId]=x.prior as typeof item.bookings[string];else delete bookings[x.bookingId];return {...item,bookings};},undefined,false);}catch(rollbackError){console.error('[package] reservation compensation failed; manual reconciliation needed',rollbackError);}
  }}
  throw e;
 }finally{await release();}
}
