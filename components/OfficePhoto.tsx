'use client';
import {useEffect,useRef,useState} from 'react';
import type {User} from '@/lib/auth/client';

type Props={user:User;kind:'wardrobe'|'makeup';id:string;file:string;alt:string;loading?:'lazy'|'eager';draggable?:boolean};
/** Images use authenticated fetch + short-lived object URLs. Never put Firebase ID tokens in image URLs. */
export function OfficePhoto({user,kind,id,file,alt,loading='lazy',draggable}:Props){
 const ref=useRef<HTMLImageElement|null>(null);
 const [src,setSrc]=useState<string>();
 const [visible,setVisible]=useState(loading==='eager');
 useEffect(()=>{
  if(visible)return;
  const element=ref.current;
  if(!element||typeof IntersectionObserver==='undefined'){setVisible(true);return;}
  const obs=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))setVisible(true);},{rootMargin:'160px'});
  obs.observe(element);return()=>obs.disconnect();
 },[visible,kind,id,file]);
 useEffect(()=>{
  if(!visible)return;
  const abort=new AbortController();let objectUrl='';
  void (async()=>{
   try{
    const token=await user.getIdToken();
    if(abort.signal.aborted)return;
    const url=`/api/office-uploads?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}&file=${encodeURIComponent(file)}`;
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:abort.signal,cache:'no-store'});
    if(!response.ok)throw new Error('Không đọc được ảnh');
    const blob=await response.blob();if(abort.signal.aborted)return;
    objectUrl=URL.createObjectURL(blob);setSrc(objectUrl);
   }catch{if(!abort.signal.aborted)setSrc(undefined);}
  })();
  return()=>{abort.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[visible,user,kind,id,file]);
 return <img ref={ref} src={src} alt={alt} loading={loading} draggable={draggable}/>;
}
