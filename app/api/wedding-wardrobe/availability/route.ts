import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {publicAuthFailure} from '@/lib/server/firebase-admin';
import {validWeddingRange} from '@/lib/domain/wedding-rental';
import {predictWardrobeUsage} from '@/lib/domain/wedding-advisory';
import {asWeddingItem,publicWeddingError,weddingItemsRef,WeddingFault} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 let actor;try{actor=await authenticatedOffice(request);}catch(err){const e=publicAuthFailure(err);return json(e,e.status);}
 if(!actor)return json({error:'Không có quyền xem tình trạng váy cưới'},403);
 try{
  const params=new URL(request.url).searchParams,itemId=params.get('itemId')||'',start=params.get('startDate')||'',end=params.get('endDate')||'';
  if(!/^[a-f0-9]{64}$/.test(itemId)||!validWeddingRange(start,end))throw new WeddingFault(422,'Chọn mã váy và khoảng ngày hợp lệ.','INVALID_QUERY');
  const item=asWeddingItem((await weddingItemsRef().child(itemId).once('value')).val());
  if(!item)throw new WeddingFault(404,'Không tìm thấy mã váy.','NOT_FOUND');
  const omitBookingId=params.get('omitBookingId')||undefined;
  const forecast=predictWardrobeUsage(item.bookings,start,end,omitBookingId);
  return json({available:item.active&&forecast.conflicts.length===0,active:item.active,conflict:forecast.conflicts[0]||null,conflicts:forecast.conflicts,nearby:forecast.nearby,windowStart:forecast.windowStart,windowEnd:forecast.windowEnd});
 }catch(err){const e=publicWeddingError(err);return json(e,e.status);}
}
