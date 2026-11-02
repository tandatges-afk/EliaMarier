'use client';
import {useMemo,useState} from 'react';
import {Plus,X} from 'lucide-react';
import type {User} from '@/lib/auth/client';
import type {StudioEvent,Staff,Assignment} from '@/lib/domain/types';
import {crewChoices,crewKeysForPhoto,isCombinedHouses} from '@/lib/domain/elia-operations';
import {taskOptionsFor} from '@/lib/domain/staff-task';
import {hasMissingCrew} from '@/lib/domain/operations';

function optionsFor(role:string,service:string){
 const available=new Set(crewKeysForPhoto(service).map(k=>crewChoices[k]));
 return taskOptionsFor(role,'Cưới').filter(t=>available.has(t));
}
export function PhotoLeaderPlanner({user,events,staff,onChanged}:{user:User;events:StudioEvent[];staff:Staff[];onChanged:()=>void}){
 const [editing,setEditing]=useState<string|null>(null);
 const [date,setDate]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState('');
 const [startTrai,setStartTrai]=useState(''),[startGai,setStartGai]=useState('');
 const [crew,setCrew]=useState<Assignment[]>([]),[showAdd,setShowAdd]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useMemo(()=>events.find(e=>e.id===editing),[events,editing]);
 const photoType=current?.photoServiceType||current?.eventType||'';
 const combined=isCombinedHouses(photoType);
 const startEdit=(e:StudioEvent)=>{
  setEditing(e.id);setDate(e.date);setStart(e.start);setEnd(e.end);
  setStartTrai(e.startTrai||'');setStartGai(e.startGai||'');
  setCrew(e.assignments.map(x=>({...x,cost:0})));setShowAdd(false);setError('');
 };
 const add=(s:Staff)=>{
  const options=optionsFor(s.role,photoType);
  if(!options.length||crew.some(a=>a.id===s.id))return;
  setCrew(list=>[...list,{id:s.id,cost:0,task:options[0],locType:combined?'':current?.isRuocDau?'Nhà gái':''}]);
  setShowAdd(false);
 };
 const change=(id:string,key:'task'|'locType',value:string)=>setCrew(list=>list.map(a=>a.id===id?{...a,[key]:value}:a));
 const save=async()=>{
  if(!editing)return;
  if(combined&&crew.some(a=>!['Nhà trai','Nhà gái'].includes(a.locType))){setError('Vu quy + Đám nối: chọn nhà trai hoặc nhà gái cho từng thợ.');return;}
  if(crew.some(a=>!optionsFor(staff.find(s=>s.id===a.id)?.role||'',photoType).includes(a.task))){setError('Một hoặc nhiều thợ không phù hợp với dịch vụ quay chụp.');return;}
  setBusy(true);setError('');
  try{
   const get=await fetch(`/api/events/${encodeURIComponent(editing)}`,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store'});
   const original=await get.json();if(!get.ok)throw Error(original.error||'Không đọc được lịch');
   const r=await fetch(`/api/events/${encodeURIComponent(editing)}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({expectedVersion:original.version,changes:{date,start,end,assignments:crew,...(original.event?.isRuocDau?(combined?{startTrai:start,startGai:start}:{startTrai,startGai}):{})}})});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Không lưu được');
   setEditing(null);onChanged();
  }catch(e){setError(e instanceof Error?e.message:'Lưu lịch lỗi');}finally{setBusy(false);}
 };
 return <section className="elia-v5-scheduler">
  <div className="elia-v5-heading"><h2>Lịch quay chụp · Leader</h2></div>
  {error&&<p role="alert" className="elia-v5-error">{error}</p>}
  <div className="elia-v5-records">{events.map(e=><article key={e.id} className={`elia-v5-record ${e.status==='confirmed'&&hasMissingCrew(e)?'elia-v6-crew-alert':''}`}>
   <header><strong>{e.name}</strong><button type="button" onClick={()=>startEdit(e)}>Phân công</button></header>
   {editing===e.id?<div className="elia-v6-crew-editor">
    <div className="elia-v5-form-grid"><label>Ngày<input type="date" value={date} onChange={x=>setDate(x.target.value)}/></label><label>Bắt đầu<input type="time" value={start} onChange={x=>setStart(x.target.value)}/></label><label>Kết thúc<input type="time" value={end} onChange={x=>setEnd(x.target.value)}/></label>
     {e.isRuocDau&&!combined&&<><label>Giờ nhà trai<input type="time" value={startTrai} onChange={x=>setStartTrai(x.target.value)}/></label><label>Giờ nhà gái<input type="time" value={startGai} onChange={x=>setStartGai(x.target.value)}/></label></>}
    </div>
    <div className="elia-v7-crew-top"><strong>Thợ được phân công ({crew.length})</strong><button type="button" className="secondary-button" onClick={()=>setShowAdd(o=>!o)} aria-expanded={showAdd}><Plus size={14}/> Thêm thợ</button></div>
    {showAdd&&<div className="elia-v7-staff-menu">{staff.filter(s=>s.active!==false&&!crew.some(a=>a.id===s.id)&&optionsFor(s.role,photoType).length>0).map(s=><button type="button" key={s.id} onClick={()=>add(s)}>{s.name} · {s.role}</button>)}</div>}
    <div className="elia-v7-crew-assigned">{crew.map(a=>{const s=staff.find(x=>x.id===a.id);const options=optionsFor(s?.role||'',photoType);return <div key={a.id} className="elia-v7-crew-row"><strong>{s?.name||a.id}</strong><select aria-label={`Công việc của ${s?.name||a.id}`} value={a.task} onChange={x=>change(a.id,'task',x.target.value)}>{!options.includes(a.task)&&<option value={a.task}>{a.task}</option>}{options.map(t=><option key={t} value={t}>{t}</option>)}</select>{combined&&<select aria-label={`Nhà làm việc của ${s?.name||a.id}`} required value={a.locType||''} onChange={x=>change(a.id,'locType',x.target.value)}><option value="">Chọn nhà</option><option value="Nhà trai">Nhà trai</option><option value="Nhà gái">Nhà gái</option></select>}<button type="button" aria-label={`Bỏ ${s?.name||a.id}`} onClick={()=>setCrew(list=>list.filter(x=>x.id!==a.id))}><X size={16}/></button></div>;})}</div>
    <div className="elia-v5-form-actions"><button type="button" className="primary-button" disabled={busy} onClick={()=>void save()}>Lưu phân công</button><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>Hủy</button></div>
   </div>:<p>{e.date} · {e.start} – {e.end} · {e.photoServiceType||e.eventType} · {hasMissingCrew(e)?'⚠ Cần bổ sung/phân công thợ':`${e.assignments.length} thợ`}</p>}
  </article>)}</div>
 </section>;
}
