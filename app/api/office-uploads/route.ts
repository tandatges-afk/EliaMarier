import {NextResponse} from 'next/server';
import {mkdir,stat,statfs,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {authenticatedOffice,type OfficeRole} from '@/lib/server/office-auth';
import {adminDatabase} from '@/lib/server/firebase-admin';
import {asWeddingItem} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const UUID=/^[0-9a-f-]{36}$/i, WARDROBE=/^[a-f0-9]{64}$/i;
const PHOTO=/^[0-9a-f-]{36}\.(jpg|png|webp)$/i;
const base=()=>path.join(process.env.ELIA_MEDIA_ROOT||'/srv/elia/media','office-photos');
const respond=(v:object,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
type Module='wardrobe'|'makeup';
function valid(kind:string,id:string){return (kind==='wardrobe'&&WARDROBE.test(id))||(kind==='makeup'&&UUID.test(id));}
const storage=(kind:Module,id:string)=>kind==='wardrobe'?adminDatabase().ref('studioPlanner_v1/weddingWardrobe/items').child(id):adminDatabase().ref('studioPlanner_v1/eliaModules/makeup').child(id);
function mime(buf:Buffer):{ext:string;type:string}|null{
 if(buf.length>=3&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff)return {ext:'jpg',type:'image/jpeg'};
 if(buf.length>=8&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {ext:'png',type:'image/png'};
 if(buf.length>=12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP')return {ext:'webp',type:'image/webp'};
 return null;
}
async function office(req:Request,kind:string,write=false){
 const roles:OfficeRole[]=kind==='wardrobe'?['admin','sale']:['admin','sale','leader_makeup'];
 const actor=await authenticatedOffice(req,roles);
 if(!actor||write&&actor.role==='leader_makeup')return null;
 return actor;
}
export async function GET(req:Request){
 try{
  const u=new URL(req.url),kind=u.searchParams.get('kind')||'',id=u.searchParams.get('id')||'',file=u.searchParams.get('file')||'';
  if(!valid(kind,id)||!PHOTO.test(file))return respond({error:'Ảnh không hợp lệ'},422);
  if(!await office(req,kind))return respond({error:'Không có quyền xem ảnh'},403);
  const record=(await storage(kind as Module,id).once('value')).val() as Record<string,unknown>|null;
  if(!record||!Array.isArray(record.photos)||!record.photos.includes(file))return respond({error:'Không tìm thấy ảnh'},404);
  const location=path.join(base(),kind,id,file);
  const type=file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg';
  const fileInfo=await stat(location);if(!fileInfo.isFile())return respond({error:'Ảnh không tồn tại'},404);
  const headers:Record<string,string>={'Content-Type':type,'Content-Length':String(fileInfo.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Referrer-Policy':'no-referrer'};
  if(process.env.ELIA_USE_X_ACCEL==='true'){headers['X-Accel-Redirect']=`/_elia_internal/office-photos/${kind}/${id}/${file}`;return new Response(null,{headers});}
  return new Response(Readable.toWeb(createReadStream(location)) as ReadableStream,{headers});
 }catch{return respond({error:'Không đọc được ảnh'},404);}
}
export async function POST(req:Request){
 let saved='';
 try{
  if(Number(req.headers.get('content-length')||0)>6*1024*1024)return respond({error:'Mỗi ảnh tối đa 5 MB'},413);
  if(!await authenticatedOffice(req,['admin','sale']))return respond({error:'Không có quyền tải ảnh'},403);
  const form=await req.formData(),kind=String(form.get('kind')||''),id=String(form.get('id')||'');
  if(!valid(kind,id))return respond({error:'Mã đối tượng không hợp lệ'},422);
  const actor=await office(req,kind,true);if(!actor)return respond({error:'Không có quyền tải ảnh'},403);
  const upload=form.get('file');if(!(upload instanceof File)||upload.size===0||upload.size>5*1024*1024)return respond({error:'Ảnh phải nhỏ hơn hoặc bằng 5 MB'},422);
  const bytes=Buffer.from(await upload.arrayBuffer());const detected=mime(bytes);
  if(!detected)return respond({error:'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ'},422);
  const ref=storage(kind as Module,id),current=(await ref.once('value')).val() as Record<string,unknown>|null;
  if(!current||kind==='wardrobe'&&!asWeddingItem(current))return respond({error:'Trang phục hoặc lịch makeup không tồn tại'},404);
  if((Array.isArray(current.photos)?current.photos:[]).length>=8)return respond({error:'Mỗi mục tối đa 8 ảnh'},409);
  const file=`${randomUUID()}.${detected.ext}`,dir=path.join(base(),kind,id);
  await mkdir(dir,{recursive:true,mode:0o750});
  const disk=await statfs(dir);const free=disk.bavail*disk.bsize;
  const minFree=Math.max(2*1024**3,Number(process.env.ELIA_MEDIA_RESERVE_BYTES||8*1024**3));
  if(free-bytes.byteLength<minFree)return respond({error:'Ổ VPS sắp đầy. Cần giải phóng dung lượng trước khi thêm ảnh.'},507);
  saved=path.join(dir,file);
  await writeFile(saved,bytes,{flag:'wx',mode:0o640});
  const tx=await ref.transaction(raw=>{
   if(!raw)return;
   const photos=Array.isArray(raw.photos)?raw.photos:[];
   if(photos.length>=8)return;
   return {...raw,photos:[...photos,file],updatedAt:Date.now()};
  },undefined,false);
  if(!tx.committed){await unlink(saved).catch(()=>{});return respond({error:'Đã đạt giới hạn 8 ảnh hoặc dữ liệu vừa thay đổi'},409);}
  return respond({file,photos:tx.snapshot.val()?.photos||[]},201);
 }catch(e){if(saved)await unlink(saved).catch(()=>{});console.error('[office-upload] failed',e instanceof Error?e.name:'unknown');return respond({error:'Không thể tải ảnh lên máy chủ'},503);}
}
export async function DELETE(req:Request){
 try{
  const body=await req.json(),kind=String(body.kind||''),id=String(body.id||''),file=String(body.file||'');
  if(!valid(kind,id)||!PHOTO.test(file))return respond({error:'Ảnh không hợp lệ'},422);
  if(!await office(req,kind,true))return respond({error:'Không có quyền xóa ảnh'},403);
  const ref=storage(kind as Module,id);
  const tx=await ref.transaction(raw=>{
   if(!raw||!Array.isArray(raw.photos)||!raw.photos.includes(file))return;
   return {...raw,photos:raw.photos.filter((name:string)=>name!==file),updatedAt:Date.now()};
  },undefined,false);
  if(!tx.committed)return respond({error:'Ảnh không còn trong danh sách'},404);
  await unlink(path.join(base(),kind,id,file)).catch(e=>console.error('[office-upload] unlink error',(e as {code?:string})?.code||'unknown'));
  return respond({photos:tx.snapshot.val()?.photos||[]});
 }catch{return respond({error:'Không thể xóa ảnh'},503);}
}
