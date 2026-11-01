import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {authenticatedOffice,type OfficeRole} from '@/lib/server/office-auth';
import {adminDatabase} from '@/lib/server/firebase-admin';
import {asWeddingItem} from '@/lib/server/wedding-wardrobe';
import {conceptKey,uploadConcept,deleteConcept,signConceptRead} from '@/lib/server/concept-r2';

/** Firebase-era compatibility route: R2 concept bucket is temporary, until VPS migration.
 * No writable local storage: Vercel filesystem is ephemeral. Never expose an unguarded R2 URL.
 */
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Module='wardrobe'|'makeup';
const UUID=/^(?:[0-9a-f-]{36}|pk[a-f0-9]{32})$/i,WARDROBE=/^[a-f0-9]{64}$/i; // Accept linked package makeup records.
const PHOTO=/^[0-9a-f-]{36}\.(jpg|png|webp)$/i;
const respond=(v:object,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const valid=(kind:string,id:string)=>(kind==='wardrobe'&&WARDROBE.test(id))||(kind==='makeup'&&UUID.test(id));
const storage=(kind:Module,id:string)=>kind==='wardrobe'?adminDatabase().ref('studioPlanner_v1/weddingWardrobe/items').child(id):adminDatabase().ref('studioPlanner_v1/eliaModules/makeup').child(id);
const r2key=(kind:Module,id:string,file:string)=>conceptKey(`${kind}-${id}`,file.slice(0,36),file.slice(37) as 'jpg'|'png'|'webp');
function mime(buf:Buffer):{ext:'jpg'|'png'|'webp';type:string}|null{
 if(buf.length>=3&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff)return {ext:'jpg',type:'image/jpeg'};
 if(buf.length>=8&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {ext:'png',type:'image/png'};
 if(buf.length>=12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP')return {ext:'webp',type:'image/webp'};
 return null;
}
async function authorized(req:Request,kind:string,write=false){
 const roles:OfficeRole[]=kind==='wardrobe'?['admin','sale']:['admin','sale','leader_makeup'];
 const actor=await authenticatedOffice(req,roles);
 return actor&&(!write||actor.role==='admin'||actor.role==='sale')?actor:null;
}
export async function GET(req:Request){
 try{
  const u=new URL(req.url),kind=u.searchParams.get('kind')||'',id=u.searchParams.get('id')||'',file=u.searchParams.get('file')||'';
  if(!valid(kind,id)||!PHOTO.test(file))return respond({error:'Ảnh không hợp lệ'},422);
  if(!await authorized(req,kind))return respond({error:'Không có quyền xem ảnh'},403);
  const record=(await storage(kind as Module,id).once('value')).val() as {photos?:unknown}|null;
  if(!record||!Array.isArray(record.photos)||!record.photos.includes(file))return respond({error:'Không tìm thấy ảnh'},404);
  // Signed URL stays server-side; proxy the small photo so the browser never sees R2 credentials or signed URL.
  const upstream=await fetch(signConceptRead(r2key(kind as Module,id,file)),{signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!upstream.ok||!upstream.body)return respond({error:'Ảnh chưa sẵn sàng'},upstream.status===404?404:503);
  const headers:Record<string,string>={
   'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg',
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
   'Content-Disposition':'inline'
  };
  return new Response(upstream.body,{status:200,headers});
 }catch(err){console.error('[office-photo-read]',err instanceof Error?err.name:'unknown');return respond({error:'Không đọc được ảnh'},503);}
}
export async function POST(req:Request){
 let savedKey='';
 try{
  if(Number(req.headers.get('content-length')||0)>6*1024*1024)return respond({error:'Mỗi ảnh tối đa 5 MB'},413);
  if(!await authenticatedOffice(req,['admin','sale']))return respond({error:'Không có quyền tải ảnh'},403);
  const form=await req.formData(),kind=String(form.get('kind')||''),id=String(form.get('id')||'');
  if(!valid(kind,id))return respond({error:'Mã đối tượng không hợp lệ'},422);
  if(!await authorized(req,kind,true))return respond({error:'Không có quyền tải ảnh'},403);
  const upload=form.get('file');
  if(!(upload instanceof File)||upload.size===0||upload.size>5*1024*1024)return respond({error:'Ảnh phải nhỏ hơn hoặc bằng 5 MB'},422);
  const bytes=Buffer.from(await upload.arrayBuffer()),detected=mime(bytes);
  if(!detected)return respond({error:'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ'},422);
  const ref=storage(kind as Module,id),current=(await ref.once('value')).val() as {photos?:string[]}|null;
  if(!current||(kind==='wardrobe'&&!asWeddingItem(current)))return respond({error:'Trang phục hoặc lịch makeup không tồn tại'},404);
  if((Array.isArray(current.photos)?current.photos:[]).length>=8)return respond({error:'Mỗi mục tối đa 8 ảnh'},409);
  const file=`${randomUUID()}.${detected.ext}`;
  savedKey=r2key(kind as Module,id,file);
  await uploadConcept(savedKey,detected.type,bytes);
  const tx=await ref.transaction(raw=>{
   if(!raw)return;
   const photos=Array.isArray(raw.photos)?raw.photos:[];
   if(photos.length>=8)return;
   return {...raw,photos:[...photos,file],updatedAt:Date.now()};
  },undefined,false);
  if(!tx.committed){await deleteConcept(savedKey).catch(()=>{});return respond({error:'Đã đạt giới hạn 8 ảnh hoặc dữ liệu vừa thay đổi'},409);}
  return respond({file,photos:(tx.snapshot.val() as {photos?:string[]}|null)?.photos||[]},201);
 }catch(err){if(savedKey)await deleteConcept(savedKey).catch(()=>{});console.error('[office-photo-upload]',err instanceof Error?err.name:'unknown');return respond({error:'Không tải được ảnh; kiểm tra quyền bucket ảnh concept R2'},503);}
}
export async function DELETE(req:Request){
 try{
  const body=await req.json() as {kind?:string;id?:string;file?:string};
  const kind=String(body.kind||''),id=String(body.id||''),file=String(body.file||'');
  if(!valid(kind,id)||!PHOTO.test(file))return respond({error:'Ảnh không hợp lệ'},422);
  if(!await authorized(req,kind,true))return respond({error:'Không có quyền xóa ảnh'},403);
  const ref=storage(kind as Module,id);
  const tx=await ref.transaction(raw=>{
   if(!raw||!Array.isArray(raw.photos)||!raw.photos.includes(file))return;
   return {...raw,photos:raw.photos.filter((name:string)=>name!==file),updatedAt:Date.now()};
  },undefined,false);
  if(!tx.committed)return respond({error:'Ảnh không còn trong danh sách'},404);
  // A failed R2 delete must never undo a successful list update; log and clean as orphan later.
  await deleteConcept(r2key(kind as Module,id,file)).catch(err=>console.error('[office-photo-delete]',err instanceof Error?err.name:'unknown'));
  return respond({photos:(tx.snapshot.val() as {photos?:string[]}|null)?.photos||[]});
 }catch(err){console.error('[office-photo-delete]',err instanceof Error?err.name:'unknown');return respond({error:'Không thể xóa ảnh'},503);}
}
