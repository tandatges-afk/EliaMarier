'use client';
import {useState} from 'react';
import type {User} from '@/lib/auth/client';
import type {StudioEvent} from '@/lib/domain/types';
export function PhotoLeaderPlanner({user,events,onChanged}:{user:User;events:StudioEvent[];onChanged:()=>void}){
 const [editing,setEditing]=useState<string|null>(null),[date,setDate]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const startEdit=(e:StudioEvent)=>{setEditing(e.id);setDate(e.date);setStart(e.start);setEnd(e.end);setError('');};
 const save=async()=>{if(!editing)return;setBusy(true);setError('');try{
  const get=await fetch(`/api/events/${encodeURIComponent(editing)}`,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store'});const original=await get.json();if(!get.ok)throw Error(original.error||'Không đọc được lịch');
  const r=await fetch(`/api/events/${encodeURIComponent(editing)}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({expectedVersion:original.version,changes:{date,start,end}})});const data=await r.json();if(!r.ok)throw Error(data.error||'Không lưu được');setEditing(null);onChanged();
 }catch(e){setError(e instanceof Error?e.message:'Lưu lịch lỗi');}finally{setBusy(false);}};
 return <section className="elia-v5-scheduler"><div className="elia-v5-heading"><h2>Lịch quay và chụp</h2><p>Leader quay chụp chỉ được sửa ngày và giờ thực hiện, không thay đổi chi phí hoặc phân công.</p></div>{error&&<p role="alert" className="elia-v5-error">{error}</p>}<div className="elia-v5-records">{events.map(e=><article key={e.id} className="elia-v5-record"><header><strong>{e.name}</strong><button type="button" onClick={()=>startEdit(e)}>Chỉnh giờ</button></header>{editing===e.id?<div className="elia-v5-photo-schedule"><label>Ngày<input type="date" value={date} onChange={x=>setDate(x.target.value)}/></label><label>Bắt đầu<input type="time" value={start} onChange={x=>setStart(x.target.value)}/></label><label>Kết thúc<input type="time" value={end} onChange={x=>setEnd(x.target.value)}/></label><button type="button" disabled={busy} onClick={()=>void save()}>Lưu</button><button type="button" onClick={()=>setEditing(null)}>Hủy</button></div>:<p>{e.date} · {e.start} – {e.end} · {e.eventType}</p>}</article>)}</div></section>;
}
