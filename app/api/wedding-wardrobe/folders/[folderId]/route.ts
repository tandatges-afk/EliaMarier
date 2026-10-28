import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {AdminAuthFailure,publicAuthFailure} from '@/lib/server/firebase-admin';
import {asWeddingItem,asWeddingFolder,publicWeddingError,weddingAudit,weddingFoldersRef,weddingItemsRef,WeddingFault} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const valid=(s:string)=>/^[a-f0-9-]{36}$/i.test(s);
export async function PATCH(req:Request,{params}:{params:Promise<{folderId:string}>}){
 try{const actor=await authenticatedOffice(req);if(actor?.role!=='admin')return json({error:'Chỉ Admin được sửa thư mục.'},403);
  const {folderId}=await params;if(!valid(folderId))throw new WeddingFault(422,'ID thư mục không hợp lệ.','INVALID_FOLDER');
  const body=await req.json(),name=String(body?.name||'').trim();if(!name||name.length>60)throw new WeddingFault(422,'Tên thư mục không hợp lệ.','INVALID_NAME');
  let missing=false;const tx=await weddingFoldersRef().child(folderId).transaction(raw=>{const folder=asWeddingFolder(raw);if(!folder){missing=true;return;}missing=false;return {...folder,name};},undefined,false);
  if(!tx.committed)throw new WeddingFault(missing?404:409,'Không tìm thấy thư mục.','NOT_FOUND');
  await weddingAudit(actor.token,'WEDDING_FOLDER_UPDATED',folderId,`Sửa thư mục ${name}`);return json({folder:asWeddingFolder(tx.snapshot.val())});
 }catch(e){if(e instanceof AdminAuthFailure){const f=publicAuthFailure(e);return json(f,f.status);}const f=publicWeddingError(e);return json(f,f.status);}
}
export async function DELETE(req:Request,{params}:{params:Promise<{folderId:string}>}){
 try{const actor=await authenticatedOffice(req);if(actor?.role!=='admin')return json({error:'Chỉ Admin được xóa thư mục.'},403);
  const {folderId}=await params;if(!valid(folderId))throw new WeddingFault(422,'ID thư mục không hợp lệ.','INVALID_FOLDER');
  const inFolder=(await weddingItemsRef().once('value')).val()||{};
  if(Object.values(inFolder).some(value=>asWeddingItem(value)?.folderId===folderId))throw new WeddingFault(409,'Thư mục đang chứa mã váy. Hãy chuyển mã sang thư mục khác trước khi xóa.','FOLDER_NOT_EMPTY');
  const snap=await weddingFoldersRef().child(folderId).once('value');if(!snap.exists())throw new WeddingFault(404,'Không tìm thấy thư mục.','NOT_FOUND');
  await weddingFoldersRef().child(folderId).remove();await weddingAudit(actor.token,'WEDDING_FOLDER_DELETED',folderId,'Xóa thư mục trang phục');return json({success:true});
 }catch(e){if(e instanceof AdminAuthFailure){const f=publicAuthFailure(e);return json(f,f.status);}const f=publicWeddingError(e);return json(f,f.status);}
}
