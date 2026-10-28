import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {publicAuthFailure} from '@/lib/server/firebase-admin';
import {asWeddingItem,publicWeddingError,weddingAudit,weddingItemsRef,weddingKey,weddingFoldersRef,WeddingFault} from '@/lib/server/wedding-wardrobe';
import {normalizeWeddingCode} from '@/lib/domain/wedding-rental';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 try{
  const actor=await authenticatedOffice(request);if(!actor)return json({error:'Không có quyền xem lịch váy cưới'},403);
  const snap=await weddingItemsRef().once('value');
  const items=Object.values((snap.val()||{}) as Record<string,unknown>).map(asWeddingItem).filter(x=>x!==null).sort((a,b)=>a.code.localeCompare(b.code,'vi'));
  return json({items});
 }catch(err){const failure=publicAuthFailure(err);if(failure.code!=='AUTH_SERVICE_UNAVAILABLE'&&failure.code!=='AUTH_CONFIG_MISSING'&&failure.code!=='AUTH_CONFIG_INVALID')return json(failure,failure.status);return json(publicWeddingError(err),503);}
}
export async function POST(request:Request){
 let actor;try{actor=await authenticatedOffice(request);}catch(err){const e=publicAuthFailure(err);return json(e,e.status);}
 if(!actor||actor.role!=='admin')return json({error:'Chỉ Admin được quản lý mã trang phục'},403);
 try{
  if(Number(request.headers.get('content-length')||0)>4096)throw new WeddingFault(413,'Dữ liệu quá lớn.','BODY_TOO_LARGE');
  let body:Record<string,unknown>;try{body=await request.json();}catch{throw new WeddingFault(400,'JSON không hợp lệ.','INVALID_JSON');}
  const code=normalizeWeddingCode(String(body.code||'')),id=weddingKey(code),name=String(body.name||'').trim()||code;
  const folderId=String(body.folderId||'').trim();
  if(folderId && !/^[a-f0-9-]{36}$/i.test(folderId))throw new WeddingFault(422,'Thư mục không hợp lệ.','INVALID_FOLDER');
  if(folderId && !(await weddingFoldersRef().child(folderId).once('value')).exists())throw new WeddingFault(422,'Thư mục không tồn tại.','INVALID_FOLDER');
  const kind=body.kind==='outfit'?'outfit':'wedding_dress';
  if(name.length<2||name.length>120)throw new WeddingFault(422,'Tên trang phục từ 2 đến 120 ký tự.','INVALID_NAME');
  const item={id,code,name,kind,folderId,active:true,createdAt:Date.now(),createdBy:actor.token.uid,bookings:{}};
  const tx=await weddingItemsRef().transaction(raw=>{const all=(raw||{}) as Record<string,unknown>;
    if(all[id]||Object.values(all).some(value=>asWeddingItem(value)?.code===code))return;
    return {...all,[id]:item};
  },undefined,false);
  if(!tx.committed)throw new WeddingFault(409,'Mã váy đã có trong danh mục.','CODE_EXISTS');
  await weddingAudit(actor.token,'WEDDING_ITEM_CREATED',id,`Thêm mã váy ${code}`);
  return json({item},201);
 }catch(err){const e=publicWeddingError(err);return json(e,e.status);}
}
