import {WardrobeEventCodes,officeWardrobeRequest} from './WardrobeEventCodes';
'use client';
import {useEffect,useState, type ChangeEvent} from 'react';
import {ImagePlus,Trash2,X,RefreshCw,Image as ImageIcon} from 'lucide-react';
import type {User} from 'firebase/auth';

export const MAX_CONCEPT_PHOTOS=6;
export type ConceptPhoto={id:string;name:string;size:number;createdAt:number;url:string};
const validType=(f:File)=>['image/jpeg','image/png','image/webp'].includes(f.type);

export async function optimizedConceptPhoto(file:File):Promise<File>{
 if(!validType(file))throw new Error('Chỉ nhận hình JPG, PNG hoặc WebP.');
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Không xử lý được ảnh trên trình duyệt.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const makeBlob=(quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không xuất được ảnh')), 'image/jpeg',quality));
  let blob=await makeBlob(.82);if(blob.size>2_500_000)blob=await makeBlob(.65);
  if(blob.size>2_500_000)throw new Error('Ảnh quá lớn, vui lòng thu nhỏ trước khi tải.');
  return new File([blob],`${file.name.replace(/\.[^.]+$/,'').slice(0,90)||'concept'}.jpg`,{type:'image/jpeg'});
 }finally{bitmap.close();}
}
export async function uploadConceptPhoto(user:User,eventId:string,file:File){
 const prepared=await optimizedConceptPhoto(file);const data=new FormData();data.set('photo',prepared);
 const request=async(refresh:boolean)=>fetch(`/api/events/${encodeURIComponent(eventId)}/concept-photos`,{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken(refresh)}`},body:data});
 let response=await request(false);if(response.status===401)response=await request(true);
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||'Không thể tải hình trang phục');
 return body.photo as ConceptPhoto;
}

/** Legacy compatibility only. All new wardrobe reservations use WardrobeEventCodes. */
export function ConceptPhotoDraft(_props:{files:File[];onChange:(files:File[])=>void;disabled?:boolean}){
 return <aside className="elia-concept-retired rounded-xl border border-[#e2d5bb] bg-[#fbf7ee] p-4 sm:col-span-2"><strong className="text-sm text-[#343a30]">Mã trang phục · Ngày lấy/trả</strong><p className="mt-1 text-xs text-[#75674f]">Không cần tải hình. Hãy chọn mã trang phục và kiểm tra lịch trước/sau 2 ngày trong mục Lịch váy cưới được liên kết với lịch này.</p></aside>;
}

/** Backwards-compatible mount for old Studio screens that still render ConceptPhotoGallery.
 * It now shows the SAME dress-code picker used by the updated EventEditor.
 * Historical images remain in storage and available through the read-only GET API.
 */
export function ConceptPhotoGallery({user,eventId,readOnly=false}:{user:User;eventId:string;readOnly?:boolean}){
 const [event,setEvent]=useState<{date:string;name:string;phone?:string}|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{let live=true;
  void officeWardrobeRequest<{event:{date:string;name:string;phone?:string}}>(user,`/api/events/${encodeURIComponent(eventId)}`)
   .then(result=>{if(live)setEvent(result.event);})
   .catch(err=>{if(live)setError(err instanceof Error?err.message:'Không tải được lịch');});
  return()=>{live=false;};
 },[user,eventId]);
 if(error)return <p role="alert" className="elia-wedding-message error">{error}</p>;
 if(!event)return <p className="text-xs text-[#736752]">Đang tải mã trang phục và lịch lấy/trả…</p>;
 return <WardrobeEventCodes user={user} eventId={eventId} eventDate={event.date} eventName={event.name} eventPhone={event.phone||''} readOnly={readOnly}/>;
}
