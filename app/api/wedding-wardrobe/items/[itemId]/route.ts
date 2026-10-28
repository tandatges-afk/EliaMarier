import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {publicAuthFailure} from '@/lib/server/firebase-admin';
import {asWeddingItem,publicWeddingError,weddingAudit,weddingItemsRef,WeddingFault} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function PATCH(request:Request,{params}:{params:Promise<{itemId:string}>}){
 let actor;try{actor=await authenticatedOffice(request);}catch(err){const e=publicAuthFailure(err);return json(e,e.status);}
 if(!actor||actor.role!=='admin')return json({error:'Chỉ Admin được sửa hoặc ngừng sử dụng mã váy'},403);
 try{
  const {itemId}=await params;
  if(!/^[a-f0-9]{64}$/.test(itemId))throw new WeddingFault(422,'Mã trang phục không hợp lệ.','INVALID_ID');
  let body:Record<string,unknown>;try{body=await request.json();}catch{throw new WeddingFault(400,'JSON không hợp lệ.','INVALID_JSON');}
  const hasName=Object.prototype.hasOwnProperty.call(body,'name'),hasActive=Object.prototype.hasOwnProperty.call(body,'active');
  if(!hasName&&!hasActive)throw new WeddingFault(422,'Không có thông tin cần cập nhật.','EMPTY_UPDATE');
  const name=hasName?String(body.name||'').trim():null;
  if(hasName && (!name||name.length<2||name.length>120))throw new WeddingFault(422,'Tên trang phục từ 2 đến 120 ký tự.','INVALID_NAME');
  if(hasActive && typeof body.active!=='boolean')throw new WeddingFault(422,'Trạng thái không hợp lệ.','INVALID_ACTIVE');
  let denied='';
  const tx=await weddingItemsRef().child(itemId).transaction(raw=>{
   const item=asWeddingItem(raw);if(!item){denied='NOT_FOUND';return;}
   denied='';return {...item,...(hasName?{name}:{}),...(hasActive?{active:body.active}:{})};
  },undefined,false);
  if(!tx.committed)throw new WeddingFault(denied==='NOT_FOUND'?404:409,'Mã váy không tồn tại.','NOT_FOUND');
  await weddingAudit(actor.token,'WEDDING_ITEM_UPDATED',itemId,'Cập nhật danh mục váy cưới');
  return json({item:asWeddingItem(tx.snapshot.val())});
 }catch(err){const e=publicWeddingError(err);return json(e,e.status);}
}
