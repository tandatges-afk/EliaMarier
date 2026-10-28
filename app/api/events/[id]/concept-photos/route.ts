import {authenticatedOffice} from '@/lib/server/office-auth';
import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {adminDatabase,publicAuthFailure} from '@/lib/server/firebase-admin';
import {findBooking} from '@/lib/server/event-storage';
import {conceptKey,signConceptRead,uploadConcept,deleteConcept} from '@/lib/server/concept-r2';
import {detectConceptImage,EVENT_ID,PHOTO_ID,MAX_CONCEPT_PHOTOS,MAX_CONCEPT_BYTES} from '@/lib/server/concept-policy.mjs';

export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
type Photo={id:string;key:string;name:string;size:number;contentType:string;createdAt:number};
async function auth(request:Request){
 try{const office=await authenticatedOffice(request);return office?.token||reply({error:'Chỉ nhân viên vận hành hoặc Admin được xem và tải hình concept'},403);}
 catch(e){const f=publicAuthFailure(e);return reply({error:f.error,code:f.code},f.status);}
}
function failure(e:unknown){
 const code=e instanceof Error?e.message:'CONCEPT_UNKNOWN_ERROR';
 console.error('[concept-photos]',code.startsWith('CONCEPT_')?code:'SERVER_ERROR');
 return reply({error:code==='CONCEPT_R2_NOT_CONFIGURED'?'Chưa cấu hình R2 để lưu hình trang phục.': 'Không thể xử lý hình concept. Vui lòng thử lại.',code:code.startsWith('CONCEPT_')?code:'CONCEPT_STORAGE_ERROR'},503);
}
const ref=(id:string)=>adminDatabase().ref('studioPlanner_v1/conceptPhotos').child(id);
async function eventExists(id:string){try{await findBooking(id);return true;}catch{return false;}}
async function photos(id:string){
 const raw=(await ref(id).once('value')).val()||{};
 return Object.values(raw as Record<string,Photo>).filter(p=>p&&PHOTO_ID.test(p.id)&&typeof p.key==='string'&&p.key.startsWith(`concepts/${id}/`))
  .sort((a,b)=>a.createdAt-b.createdAt);
}
const payload=(list:Photo[])=>list.map(p=>({id:p.id,name:p.name,size:p.size,createdAt:p.createdAt,url:signConceptRead(p.key)}));
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await auth(request);if(user instanceof Response)return user;
 const {id}=await params;if(!EVENT_ID.test(id))return reply({error:'Mã lịch không hợp lệ'},400);
 if(!await eventExists(id))return reply({error:'Lịch không tồn tại'},404);
 try{return reply({photos:payload(await photos(id))});}catch(e){return failure(e);}
}
/** Concept photo upload has been replaced by wardrobe code reservations.
 * Existing photos remain readable/removable for historical appointments. */
export async function POST(request:Request){
 const user=await auth(request);if(user instanceof Response)return user;
 return reply({error:'Đã chuyển sang chọn mã trang phục và ngày lấy/trả trong lịch váy cưới.',code:'CONCEPT_UPLOAD_RETIRED'},410);
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await auth(request);if(user instanceof Response)return user;
 const {id}=await params;if(!EVENT_ID.test(id))return reply({error:'Mã lịch không hợp lệ'},400);
 if(!await eventExists(id))return reply({error:'Lịch không tồn tại'},404);
 const url=new URL(request.url);const photoId=url.searchParams.get('photoId')||'';
 if(!PHOTO_ID.test(photoId))return reply({error:'Mã ảnh không hợp lệ'},400);
 try{
  const snap=await ref(id).child(photoId).once('value');const photo=snap.val() as Photo|null;
  if(!photo)return reply({error:'Ảnh không tồn tại'},404);
  // Never delete arbitrary bucket objects from untrusted metadata.
  if(!['jpg','png','webp'].some(ext=>photo.key===`concepts/${id}/${photoId}.${ext}`))return reply({error:'Đường dẫn ảnh không hợp lệ'},400);
  await deleteConcept(photo.key);await ref(id).child(photoId).remove();
  return reply({success:true});
 }catch(e){return failure(e);}
}
