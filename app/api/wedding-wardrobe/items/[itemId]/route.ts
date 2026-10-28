import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {AdminAuthFailure,publicAuthFailure} from '@/lib/server/firebase-admin';
import {asWeddingItem,publicWeddingError,weddingAudit,weddingItemsRef,weddingFoldersRef,weddingKey,WeddingFault} from '@/lib/server/wedding-wardrobe';
import {normalizeWeddingCode} from '@/lib/domain/wedding-rental';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function admin(request:Request){const actor=await authenticatedOffice(request);if(!actor||actor.role!=='admin')throw new WeddingFault(403,'Chỉ Admin được sửa/xóa mã trang phục.','ADMIN_ONLY');return actor;}
const idOk=(id:string)=>/^[a-f0-9]{64}$/.test(id);
export async function PATCH(request:Request,{params}:{params:Promise<{itemId:string}>}){
 try{
  const actor=await admin(request),{itemId}=await params;
  if(!idOk(itemId))throw new WeddingFault(422,'Mã trang phục không hợp lệ.','INVALID_ID');
  const body=await request.json() as Record<string,unknown>;
  const has=(key:string)=>Object.prototype.hasOwnProperty.call(body,key);
  if(!['code','name','kind','folderId','active'].some(has))throw new WeddingFault(422,'Chưa có thông tin cần sửa.','EMPTY_UPDATE');
  const code=has('code')?normalizeWeddingCode(String(body.code||'')):undefined;
  if(code!==undefined)weddingKey(code);
  const name=has('name')?String(body.name||'').trim():undefined;
  if(name!==undefined && (name.length<1||name.length>120))throw new WeddingFault(422,'Tên trang phục tối đa 120 ký tự.','INVALID_NAME');
  const kind=has('kind')?(body.kind==='outfit'?'outfit':body.kind==='wedding_dress'?'wedding_dress':null):undefined;
  if(kind===null)throw new WeddingFault(422,'Loại trang phục không hợp lệ.','INVALID_KIND');
  const folderId=has('folderId')?String(body.folderId||'').trim():undefined;
  if(folderId!==undefined && folderId && !(await weddingFoldersRef().child(folderId).once('value')).exists())throw new WeddingFault(422,'Thư mục không tồn tại.','INVALID_FOLDER');
  if(has('active')&&typeof body.active!=='boolean')throw new WeddingFault(422,'Trạng thái không hợp lệ.','INVALID_ACTIVE');
  let denied='';
  // Root transaction prevents two concurrent code edits from creating duplicate codes.
  const tx=await weddingItemsRef().transaction(raw=>{
    const all=(raw||{}) as Record<string,unknown>,item=asWeddingItem(all[itemId]);
    if(!item){denied='NOT_FOUND';return;}
    const nextCode=code??item.code;
    if(Object.entries(all).some(([id,value])=>id!==itemId&&asWeddingItem(value)?.code===nextCode)){denied='CODE_EXISTS';return;}
    denied='';return {...all,[itemId]:{...item,...(code!==undefined?{code}:{}),...(name!==undefined?{name}:{}),...(kind!==undefined?{kind}:{}),...(folderId!==undefined?{folderId}:{}),...(has('active')?{active:body.active}:{}),updatedAt:Date.now()}};
  },undefined,false);
  if(!tx.committed)throw new WeddingFault(denied==='NOT_FOUND'?404:409,denied==='CODE_EXISTS'?'Mã trang phục đã tồn tại.':'Không tìm thấy mã trang phục. ',denied||'UPDATE_FAILED');
  await weddingAudit(actor.token,'WEDDING_ITEM_UPDATED',itemId,'Sửa mã trang phục');
  return json({item:asWeddingItem(tx.snapshot.child(itemId).val())});
 }catch(e){if(e instanceof AdminAuthFailure){const failure=publicAuthFailure(e);return json(failure,failure.status);}const f=publicWeddingError(e);return json(f,f.status);}
}
export async function DELETE(request:Request,{params}:{params:Promise<{itemId:string}>}){
 try{
  const actor=await admin(request),{itemId}=await params;
  if(!idOk(itemId))throw new WeddingFault(422,'Mã không hợp lệ.','INVALID_ID');
  let denied='';
  const tx=await weddingItemsRef().child(itemId).transaction(raw=>{
    const item=asWeddingItem(raw);if(!item){denied='NOT_FOUND';return;}
    if(Object.keys(item.bookings).length){denied='HAS_HISTORY';return;}
    denied='';return null;
  },undefined,false);
  if(!tx.committed)throw new WeddingFault(denied==='NOT_FOUND'?404:409,denied==='HAS_HISTORY'?'Mã đã có lịch sử thuê. Hãy ngừng sử dụng thay vì xóa.':'Không tìm thấy mã.',denied||'DELETE_FAILED');
  await weddingAudit(actor.token,'WEDDING_ITEM_DELETED',itemId,'Xóa mã chưa có lịch thuê');
  return json({success:true});
 }catch(e){if(e instanceof AdminAuthFailure){const failure=publicAuthFailure(e);return json(failure,failure.status);}const f=publicWeddingError(e);return json(f,f.status);}
}
