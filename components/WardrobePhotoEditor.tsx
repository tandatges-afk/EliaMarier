'use client';
import {useEffect,useState} from 'react';
import type {User} from '@/lib/auth/client';
import {ImagePlus,Trash2} from 'lucide-react';
import type {WeddingItem} from '@/lib/domain/wedding-rental';
import {optimizeOfficePhoto} from '@/lib/ui/optimize-office-image';
import {OfficePhoto} from './OfficePhoto';
export function WardrobePhotoEditor({user,item,onChanged}:{user:User;item:WeddingItem;onChanged:()=>void}){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const files=item.photos||[];
 const upload=async(e:React.ChangeEvent<HTMLInputElement>)=>{
  const chosen=Array.from(e.target.files||[]) as File[];e.target.value='';if(!chosen.length)return;
  if(chosen.length+files.length>8){setMsg('Một trang phục chỉ được tối đa 8 ảnh');return;}
  setBusy(true);setMsg('');try{
   for(const f of chosen){const data=new FormData();data.set('kind','wardrobe');data.set('id',item.id);data.set('file',await optimizeOfficePhoto(f));const r=await fetch('/api/office-uploads',{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`},body:data});const v=await r.json();if(!r.ok)throw Error(v.error||'Lỗi upload');}
   onChanged();setMsg('Đã lưu ảnh vào kho');
  }catch(e){setMsg(e instanceof Error?e.message:'Lỗi upload');onChanged();}finally{setBusy(false);}
 };
 const remove=async(file:string)=>{if(!window.confirm('Xóa ảnh này khỏi trang phục?'))return;setBusy(true);setMsg('');try{const r=await fetch('/api/office-uploads',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({kind:'wardrobe',id:item.id,file})});const v=await r.json();if(!r.ok)throw Error(v.error||'Lỗi xóa');onChanged();}catch(e){setMsg(e instanceof Error?e.message:'Không thể xóa ảnh');}finally{setBusy(false);}};
 return <div className="elia-v5-photo-editor"><div className="elia-v5-photo-editor-heading"><strong>Hình trang phục ({files.length}/8)</strong><label className="elia-v5-upload"><ImagePlus size={16}/> Thêm ảnh<input disabled={busy||files.length>=8} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>void upload(e)}/></label></div><div className="elia-v5-photo-list">{files.map(f=><div key={f} className="elia-v5-photo-tile"><OfficePhoto user={user} kind="wardrobe" id={item.id} file={f} alt={`Ảnh trang phục ${item.code}`}/><button type="button" onClick={()=>void remove(f)} disabled={busy} aria-label="Xóa ảnh"><Trash2 size={15}/></button></div>)}</div><small>Ảnh JPEG/PNG/WebP, tối đa 5 MB/ảnh. Ảnh lớn được tự thu nhỏ khi trình duyệt hỗ trợ, giúp tiết kiệm dung lượng lưu trữ.</small>{msg&&<p role="status">{msg}</p>}</div>;
}
