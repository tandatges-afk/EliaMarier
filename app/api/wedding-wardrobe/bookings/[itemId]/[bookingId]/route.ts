import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {publicAuthFailure} from '@/lib/server/firebase-admin';
import {weddingConflict,WEDDING_STATUSES,type WeddingBooking,type WeddingRentalStatus} from '@/lib/domain/wedding-rental';
import {asWeddingItem,publicWeddingError,validateWeddingBookingInput,weddingAudit,weddingItemsRef,WeddingFault} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function PATCH(request:Request,{params}:{params:Promise<{itemId:string;bookingId:string}>}){
 let actor;try{actor=await authenticatedOffice(request);}catch(err){const e=publicAuthFailure(err);return json(e,e.status);}
 if(!actor)return json({error:'Không có quyền cập nhật lịch thuê'},403);
 try{
  if(Number(request.headers.get('content-length')||0)>8192)throw new WeddingFault(413,'Dữ liệu quá lớn.','BODY_TOO_LARGE');
  const {itemId,bookingId}=await params;
  if(!/^[a-f0-9]{64}$/.test(itemId)||!/^[0-9a-f-]{36}$/i.test(bookingId))throw new WeddingFault(422,'Mã lịch thuê không hợp lệ.','INVALID_ID');
  let body:Record<string,unknown>;try{body=await request.json();}catch{throw new WeddingFault(400,'JSON không hợp lệ.','INVALID_JSON');}
  if(body.status!==undefined&& !WEDDING_STATUSES.includes(body.status as WeddingRentalStatus))throw new WeddingFault(422,'Trạng thái không hợp lệ.','INVALID_STATUS');
  const canEdit=['customerName','customerPhone','startDate','endDate','notes'].some(k=>Object.prototype.hasOwnProperty.call(body,k));
  const wantedStatus=body.status as WeddingRentalStatus|undefined;
  if(!canEdit&&!wantedStatus)throw new WeddingFault(422,'Không có thay đổi.','EMPTY_UPDATE');
  let denied='';
  const tx=await weddingItemsRef().child(itemId).transaction(raw=>{
   const item=asWeddingItem(raw);if(!item){denied='NOT_FOUND';return;}
   const previous=item.bookings[bookingId];if(!previous){denied='NOT_FOUND';return;}
   // A cancelled or returned rental is immutable. Keep audit history intact.
   if(previous.status==='cancelled'||previous.status==='returned'){denied='CLOSED_BOOKING';return;}
   const allowed:WeddingRentalStatus[]=previous.status==='reserved'?['reserved','picked_up','cancelled']:['picked_up','returned'];
   const nextStatus=wantedStatus??previous.status;
   if(!allowed.includes(nextStatus)){denied='INVALID_TRANSITION';return;}
   if(canEdit&&previous.status!=='reserved'){denied='PICKED_UP_IMMUTABLE';return;}
   let fields:ReturnType<typeof validateWeddingBookingInput>;
   try {fields=validateWeddingBookingInput({...previous,...body});} catch{denied='INVALID_FIELDS';return;}
   if(nextStatus!=='cancelled'&&weddingConflict(item.bookings,fields.startDate,fields.endDate,bookingId)){denied='RENTAL_CONFLICT';return;}
   const updated:WeddingBooking={...previous,...fields,status:nextStatus,updatedAt:Date.now(),updatedBy:actor.token.uid};
   denied='';return {...item,bookings:{...item.bookings,[bookingId]:updated}};
  },undefined,false);
  if(!tx.committed){
   const errors:Record<string,[number,string]>={NOT_FOUND:[404,'Không tìm thấy lịch thuê.'],CLOSED_BOOKING:[409,'Lịch thuê đã đóng, không thể sửa.'],INVALID_TRANSITION:[409,'Không thể chuyển trạng thái theo thứ tự này.'],PICKED_UP_IMMUTABLE:[409,'Đã giao váy nên không thể đổi thông tin lịch.'],INVALID_FIELDS:[422,'Thông tin lịch thuê không hợp lệ.'],RENTAL_CONFLICT:[409,'Mã váy đã được đặt trong khoảng ngày này.']};
   const [status,message]=errors[denied]||[409,'Có người vừa thay đổi lịch thuê. Hãy tải lại.'];throw new WeddingFault(status,message,denied||'UPDATE_CONFLICT');
  }
  await weddingAudit(actor.token,'WEDDING_BOOKING_UPDATED',itemId,`Cập nhật lịch thuê ${bookingId}`);
  return json({booking:asWeddingItem(tx.snapshot.val())?.bookings[bookingId]});
 }catch(err){const e=publicWeddingError(err);return json(e,e.status);}
}
