import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {publicAuthFailure} from '@/lib/server/firebase-admin';
import {weddingConflict} from '@/lib/domain/wedding-rental';
import {asWeddingItem,makeWeddingBooking,publicWeddingError,validateWeddingBookingInput,weddingAudit,weddingItemsRef,WeddingFault} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request){
 let actor;try{actor=await authenticatedOffice(request);}catch(err){const e=publicAuthFailure(err);return json(e,e.status);}
 if(!actor)return json({error:'Không có quyền tạo lịch thuê váy cưới'},403);
 try{
  if(Number(request.headers.get('content-length')||0)>8192)throw new WeddingFault(413,'Dữ liệu quá lớn.','BODY_TOO_LARGE');
  let body:Record<string,unknown>;try{body=await request.json();}catch{throw new WeddingFault(400,'JSON không hợp lệ.','INVALID_JSON');}
  const itemId=String(body.itemId||'');
  if(!/^[a-f0-9]{64}$/.test(itemId))throw new WeddingFault(422,'Hãy chọn mã váy hợp lệ.','INVALID_ID');
  const data=validateWeddingBookingInput(body),booking=makeWeddingBooking(actor.token,itemId,data);
  let denied='';
  // Atomic per-dress transaction: simultaneous requests cannot reserve overlapping dates.
  const tx=await weddingItemsRef().child(itemId).transaction(raw=>{
   const item=asWeddingItem(raw);
   if(!item){denied='NOT_FOUND';return;}
   if(!item.active){denied='INACTIVE_ITEM';return;}
   if(weddingConflict(item.bookings,booking.startDate,booking.endDate)){denied='RENTAL_CONFLICT';return;}
   denied='';return {...item,bookings:{...item.bookings,[booking.id]:booking}};
  },undefined,false);
  if(!tx.committed){
   if(denied==='RENTAL_CONFLICT')throw new WeddingFault(409,'Mã váy đã có lịch thuê trùng ngày. Vui lòng chọn mã khác hoặc ngày khác.','RENTAL_CONFLICT');
   if(denied==='INACTIVE_ITEM')throw new WeddingFault(409,'Mã váy đang ngừng nhận lịch thuê.','INACTIVE_ITEM');
   throw new WeddingFault(404,'Mã váy không tồn tại.','NOT_FOUND');
  }
  await weddingAudit(actor.token,'WEDDING_BOOKING_CREATED',itemId,`Đặt mã ${asWeddingItem(tx.snapshot.val())?.code||''} từ ${booking.startDate} đến ${booking.endDate}`);
  return json({booking},201);
 }catch(err){const e=publicWeddingError(err);return json(e,e.status);}
}
