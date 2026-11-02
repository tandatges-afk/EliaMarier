'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { X, CalendarPlus, Plus } from 'lucide-react';
import type { User } from '@/lib/auth/client';
import type { Staff,Assignment } from '@/lib/domain/types';
import { validateBooking, type BookingInput } from '@/lib/domain/booking';
import {defaultStaffTask, taskOptionsFor} from '@/lib/domain/staff-task';
import {crewChoices,crewKeysForPhoto,isCombinedHouses,photoVenueMode} from '@/lib/domain/elia-operations';
import {MapLocationInput} from '@/lib/ui/MapLocationInput';
import {VndInput} from '@/lib/ui/VndInput';
import {useStaffAvailability} from '@/lib/ui/useStaffAvailability';
import {officeWardrobeRequest} from './WardrobeEventCodes';
import type {WeddingItem,WeddingFolder} from '@/lib/domain/wedding-rental';
import {weddingConflict,validWeddingRange,weddingDateLabel} from '@/lib/domain/wedding-rental';
import {predictWardrobeUsage} from '@/lib/domain/wedding-advisory';
import {WardrobeRiskNotice} from './WardrobeRiskNotice';

type Props = {isAdmin:boolean;open:boolean; onClose:()=>void; onCreated:()=>void; user:User;staff:Staff[];initialDate?:string};
const today = () => new Date(Date.now()+7*60*60*1000).toISOString().slice(0,10);
export function NewBookingDialog({isAdmin,open,onClose,onCreated,user,staff,initialDate}:Props){
 const [id,setId]=useState('');
 const [selectedWardrobe,setSelectedWardrobe]=useState<string[]>([]),[wardrobeItems,setWardrobeItems]=useState<WeddingItem[]>([]),[wardrobeFolders,setWardrobeFolders]=useState<WeddingFolder[]>([]),[wardrobeFolder,setWardrobeFolder]=useState('all'),[wardrobeStart,setWardrobeStart]=useState(today()),[wardrobeEnd,setWardrobeEnd]=useState(today()),[wardrobeQuery,setWardrobeQuery]=useState(''),[wardrobeAck,setWardrobeAck]=useState(false),[wardrobeError,setWardrobeError]=useState(''),[createdEventId,setCreatedEventId]=useState<string|null>(null);
 const [name,setName]=useState(''),[date,setDate]=useState(today),[start,setStart]=useState('08:00'),[end,setEnd]=useState('17:00');
 const [eventType,setEventType]=useState('Cưới'),[location,setLocation]=useState(''),[phone,setPhone]=useState(''),[note,setNote]=useState('');
 const [step,setStep]=useState<'main'|'wedding'|'form'>('main');
 const [weddingSubtype,setWeddingSubtype]=useState('');
 const mainTypes=[['✨','Concept','Concept'],['💍','Cưới','Cưới'],['📷','Chụp cổng','Chụp cổng'],['🖼️','Pre-wedding','Pre-wedding'],['🎉','Sự kiện','Sự kiện'],['🧧','Tết','Tết']] as const;
 const weddingTypes=['Dạm Ngõ','Đám Nối','Vu Quy','Vu quy + Đám nối','Rước Dâu','Xuất Giá'] as const;
 const [status,setStatus]=useState<BookingInput['status']>('confirmed'),[price,setPrice]=useState('0'),[deposit,setDeposit]=useState('0');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [staffPickerOpen,setStaffPickerOpen]=useState(false);
 const [assignments,setAssignments]=useState<Assignment[]>([]),[isRuocDau,setIsRuocDau]=useState(false);
 const [startTrai,setStartTrai]=useState('08:00'),[startGai,setStartGai]=useState('08:00');
 const [locTrai,setLocTrai]=useState(''),[locGai,setLocGai]=useState(''),[phoneTrai,setPhoneTrai]=useState(''),[phoneGai,setPhoneGai]=useState('');
 const [brideName,setBrideName]=useState(''),[groomName,setGroomName]=useState(''),[brideRestaurant,setBrideRestaurant]=useState(''),[groomRestaurant,setGroomRestaurant]=useState('');
 const serviceType=weddingSubtype||eventType;
 const allowedTasks=(role:string)=>{const allowed=new Set(crewKeysForPhoto(serviceType).map(k=>crewChoices[k]));return taskOptionsFor(role,'Cưới').filter(t=>allowed.has(t));};
 const toggleStaff=(staffId:string,enabled:boolean)=>setAssignments(prev=>enabled?[...prev,{id:staffId,task:allowedTasks(staff.find(s=>s.id===staffId)?.role||'')[0]||defaultStaffTask(staff.find(s=>s.id===staffId)?.role||'',eventType),cost:0,locType:isCombinedHouses(serviceType)?'':isRuocDau?'Nhà gái':''}]:prev.filter(a=>a.id!==staffId));
 const changeAssignment=(staffId:string,key:'task'|'cost'|'locType',value:string|number)=>setAssignments(prev=>prev.map(a=>a.id===staffId?{...a,[key]:value}:a));
 const availability=useStaffAvailability(user,{date,start,end,isRuocDau,startTrai:isCombinedHouses(serviceType)?start:startTrai,startGai:isCombinedHouses(serviceType)?start:startGai,status},open&&step==='form');
 useEffect(()=>{if(open){setStaffPickerOpen(false);setSelectedWardrobe([]);setStatus('confirmed');setWardrobeQuery('');setWardrobeAck(false);setWardrobeStart(/^\d{4}-\d{2}-\d{2}$/.test(initialDate||'')?initialDate!:today());setWardrobeEnd(/^\d{4}-\d{2}-\d{2}$/.test(initialDate||'')?initialDate!:today());setWardrobeError('');setCreatedEventId(null);setId(crypto.randomUUID());setError('');setAssignments([]);setStep('main');setWeddingSubtype('');setName('');setDate(/^\d{4}-\d{2}-\d{2}$/.test(initialDate||'')?initialDate!:today());setEventType('Cưới');setIsRuocDau(false);setStart('08:00');setEnd('17:00');}},[open,initialDate]);
 const chooseService=(type:string,subtype='')=>{
  if(type==='Cưới'&&!subtype){setStep('wedding');return;}
  const ruocDau=type==='Cưới'&&subtype==='Rước Dâu';
  setEventType(type);setWeddingSubtype(subtype);setIsRuocDau(ruocDau||isCombinedHouses(subtype));
  setName(subtype?`${subtype} `:'');
  setStart(subtype==='Xuất Giá'?'16:00':'08:00');setEnd(subtype==='Xuất Giá'?'22:00':subtype?'12:00':'17:00');
  setAssignments([]);setStep('form');
 }; 
 useEffect(()=>{if(!open)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)onClose();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[open,onClose,busy]);
 useEffect(()=>{if(!open)return;let mounted=true;
  void Promise.all([officeWardrobeRequest<{items:WeddingItem[]}>(user,'/api/wedding-wardrobe/items'),officeWardrobeRequest<{folders:WeddingFolder[]}>(user,'/api/wedding-wardrobe/folders')])
   .then(([a,b])=>{if(mounted){setWardrobeItems(a.items||[]);setWardrobeFolders(b.folders||[]);}})
   .catch(err=>{if(mounted)setWardrobeError(err instanceof Error?err.message:'Không tải được mã trang phục');});
  return()=>{mounted=false;};
 },[open,user]);
 useEffect(()=>setWardrobeEnd(d=>d<wardrobeStart?wardrobeStart:d),[wardrobeStart]);
 useEffect(()=>setWardrobeAck(false),[wardrobeStart,wardrobeEnd,selectedWardrobe]);
 const chosenRisk=selectedWardrobe.map(codeId=>({item:wardrobeItems.find(i=>i.id===codeId),codeId})).filter(x=>x.item).map(x=>({item:x.item!,forecast:predictWardrobeUsage(x.item!.bookings,wardrobeStart,wardrobeEnd)}));
 const hasWardrobeConflict=chosenRisk.some(x=>!x.forecast.valid||x.forecast.conflicts.length>0);
 const hasWardrobeNear=chosenRisk.some(x=>x.forecast.nearby.length>0);
 if(!open)return null;
 async function submit(e:FormEvent){
   e.preventDefault();if(busy)return;
   // The event is created once; a failed code reservation can be retried safely.
   async function reserveForEvent(eventId:string){
     for(const codeId of selectedWardrobe){
       await officeWardrobeRequest(user,'/api/wedding-wardrobe/bookings',{method:'POST',body:JSON.stringify({itemId:codeId,eventId,customerName:name||'Khách hàng',customerPhone:/^[+\d() .-]{8,30}$/.test(phone.trim())?phone.trim():'',startDate:wardrobeStart,endDate:wardrobeEnd,advisoryAcknowledged:wardrobeAck,acknowledgedNearbyIds:chosenRisk.find(x=>x.item.id===codeId)?.forecast.nearby.map(b=>b.id)||[],notes:''})});
       setSelectedWardrobe(prev=>prev.filter(v=>v!==codeId));
     }
   }
   if(hasWardrobeConflict){setError('Có mã trang phục bị trùng ngày thuê. Hãy đổi mã hoặc khoảng ngày trước khi lưu.');return;}
   if(hasWardrobeNear&&!wardrobeAck){setError('Hãy xem và xác nhận cảnh báo thuê sát ngày trước khi lưu.');return;}
   if(createdEventId){
     setBusy(true);setError('');
     try{await reserveForEvent(createdEventId);onCreated();onClose();}
     catch(err){if(err instanceof Error&&err.message.includes('NEARBY_ACK_REQUIRED')){setWardrobeAck(false);try{const fresh=await officeWardrobeRequest<{items:WeddingItem[]}>(user,'/api/wedding-wardrobe/items');setWardrobeItems(fresh.items||[]);}catch{}}setError(`Lịch đã được tạo nhưng chưa liên kết hết mã váy: ${err instanceof Error?err.message:'Không thể giữ mã'}. Bấm Hoàn tất để thử lại, không tạo lịch mới.`);}
     finally{setBusy(false);}return;
   }
   if(hasWardrobeConflict){setError('Có mã trang phục đã trùng ngày thuê. Vui lòng đổi mã hoặc ngày lấy/trả.');return;}
   if(hasWardrobeNear&&!wardrobeAck){setError('Hãy xem lịch thuê sát ngày và xác nhận đã trao đổi kế hoạch trả váy trước khi lưu.');return;}
   if(status==='cancelled' && selectedWardrobe.length){setError('Không thể giữ trang phục cho lịch đã hủy. Hãy bỏ chọn mã hoặc đổi trạng thái lịch.');return;}
   const busyNames=availability.ready?assignments.filter(a=>availability.busy[a.id]).map(a=>staff.find(s=>s.id===a.id)?.name||a.id):[];
   if(busyNames.length){setError(`${busyNames.join(', ')} đã có lịch hoặc đã báo nghỉ. Bỏ phân công này hoặc đổi giờ/ngày.`);return;}
   const checked=validateBooking({id,name,date,start,end,eventType,photoServiceType:serviceType,brideName,groomName,brideRestaurant,groomRestaurant,location,phone,note,status,price:Number(price),deposit:Number(deposit),assignments:isAdmin?assignments:[],isRuocDau,
     startTrai:isRuocDau?(isCombinedHouses(serviceType)?start:startTrai):'',startGai:isRuocDau?(isCombinedHouses(serviceType)?start:startGai):'',locTrai:isRuocDau?locTrai:'',locGai:isRuocDau?locGai:'',phoneTrai:isRuocDau?phoneTrai:'',phoneGai:isRuocDau?phoneGai:''});
   if(!checked.ok){setError(checked.message);return;}
   setBusy(true);setError('');
   try{
     const post=async (forceRefresh=false)=>{
       const token=await user.getIdToken(forceRefresh);
       return fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(checked.value)});
     };
     let result=await post();
     // Safe retry: event.id is an idempotency key; the API never overwrites an existing event.
     if(result.status===401)result=await post(true);
     const payload=await result.json();
     if(!result.ok)throw new Error(`${payload.error||'Không thể tạo lịch'}${payload.code?` [${payload.code}]`:''}`);
     setCreatedEventId(id);onCreated();
     try{await reserveForEvent(id);}
     catch(err){if(err instanceof Error&&err.message.includes('NEARBY_ACK_REQUIRED')){setWardrobeAck(false);try{const fresh=await officeWardrobeRequest<{items:WeddingItem[]}>(user,'/api/wedding-wardrobe/items');setWardrobeItems(fresh.items||[]);}catch{}}setError(`Lịch đã tạo nhưng có mã trang phục chưa giữ được: ${err instanceof Error?err.message:'Không thể giữ mã'}. Hãy kiểm tra lịch váy cưới hoặc bấm Hoàn tất để thử lại.`);return;}
     onCreated();onClose();
   }catch(err){setError(err instanceof Error?err.message:'Không thể tạo lịch');}
   finally{setBusy(false);}
 }
 const field='mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
 const lab='block text-xs font-bold text-slate-600';
 return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/65 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
  <section role="dialog" aria-modal="true" aria-label={step==='form'?'Tạo lịch quay chụp':'Chọn loại lịch'} className={`elia-booking-dialog flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${step==='form'?'max-w-2xl':'max-w-lg'}`}>
    <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><CalendarPlus size={20}/></span><div><h2 className="text-lg font-bold text-slate-900">{step==='form'?'Tạo lịch mới':'Chọn loại lịch'}</h2><p className="text-xs text-slate-500">{step==='form'?'Tạo lịch theo dịch vụ đã chọn':'Chọn một dịch vụ để bắt đầu'}</p></div></div><button type="button" onClick={onClose} disabled={busy} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></header>
    {step!=='form'?<div className="grid gap-3 overflow-y-auto bg-[#faf7f3] px-5 py-6 sm:px-7">
       {step==='wedding'&&<button className="mb-1 text-left text-sm font-semibold text-slate-600" type="button" onClick={()=>setStep('main')}>‹ Quay lại chọn loại lịch</button>}
       {step==='main'?mainTypes.map(([emoji,label,type])=><button type="button" key={label} className="flex items-center justify-between rounded-xl border border-[#e5dfd9] bg-white px-4 py-3.5 text-left text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-500" onClick={()=>chooseService(type)}><span>{emoji} {label}</span>{type==='Cưới'&&<span aria-hidden="true">›</span>}</button>):weddingTypes.map(subtype=><button type="button" key={subtype} className="rounded-xl border border-[#e5dfd9] bg-white px-4 py-3.5 text-left text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-500" onClick={()=>chooseService('Cưới',subtype)}>{subtype==='Rước Dâu'?'Rước Dâu (Thành hôn)':subtype}</button>)}
    </div>:<>
    <form id="new-booking-form" onSubmit={submit} className="grid grid-cols-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-7">
      <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"><div><p className="text-xs text-indigo-700">Dịch vụ đã chọn</p><strong className="text-sm text-indigo-950">{eventType==='Cưới'?`Cưới · ${weddingSubtype}`:eventType}</strong></div><button type="button" className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700" onClick={()=>setStep('main')}>Đổi dịch vụ</button></div>
      <label className={`${lab} sm:col-span-2`}>Tên khách hàng / dự án *<input required minLength={2} maxLength={180} className={field} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className={lab}>Ngày thực hiện *<input required type="date" className={field} value={date} onChange={e=>setDate(e.target.value)}/></label>
      {(!isRuocDau||isCombinedHouses(serviceType))&&<label className={lab}>Bắt đầu *<input required type="time" className={field} value={start} onChange={e=>setStart(e.target.value)}/></label>}
      <label className={lab}>Kết thúc *<input required type="time" className={field} value={end} onChange={e=>setEnd(e.target.value)}/></label>
      {isRuocDau&&<div className="sm:col-span-2 grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
       <label className={lab}>Tên cô dâu *<input required className={field} value={brideName} onChange={e=>setBrideName(e.target.value)}/></label>
       <label className={lab}>Tên chú rể *<input required className={field} value={groomName} onChange={e=>setGroomName(e.target.value)}/></label>
       {!isCombinedHouses(serviceType)&&<><label className={lab}>Giờ nhà trai<input type="time" required className={field} value={startTrai} onChange={e=>setStartTrai(e.target.value)}/></label>
       <label className={lab}>Giờ nhà gái<input type="time" required className={field} value={startGai} onChange={e=>setStartGai(e.target.value)}/></label></>}
       <label className={lab}>Địa điểm nhà trai<MapLocationInput required className={field} user={user} value={locTrai} onChange={setLocTrai} maxLength={1500}/></label>
       <label className={lab}>Địa điểm nhà gái<MapLocationInput required className={field} user={user} value={locGai} onChange={setLocGai} maxLength={1500}/></label>
       <label className={lab}>SĐT chú rể *<input required className={field} value={phoneTrai} onChange={e=>setPhoneTrai(e.target.value)} maxLength={50}/></label>
       <label className={lab}>SĐT cô dâu *<input required className={field} value={phoneGai} onChange={e=>setPhoneGai(e.target.value)} maxLength={50}/></label>
       <label className={lab}>Nhà hàng nhà trai<input className={field} value={groomRestaurant} onChange={e=>setGroomRestaurant(e.target.value)}/></label>
       <label className={lab}>Nhà hàng nhà gái<input className={field} value={brideRestaurant} onChange={e=>setBrideRestaurant(e.target.value)}/></label>
      </div>}
      {!isRuocDau&&<label className={`${lab} sm:col-span-2`}>{photoVenueMode(serviceType)==='external'?'Địa điểm':'Địa chỉ nhà dâu'}<MapLocationInput required className={field} user={user} maxLength={1500} value={location} onChange={setLocation} /></label>}
      {!isRuocDau&&<><label className={lab}>SĐT cô dâu<input type="tel" maxLength={50} className={field} value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className={lab}>Nhà hàng nhà gái<input className={field} value={brideRestaurant} onChange={e=>setBrideRestaurant(e.target.value)}/></label></>}
      <label className={lab}>Trạng thái<select className={field} value={status} onChange={e=>setStatus(e.target.value as BookingInput['status'])}><option value="confirmed">Đã chốt</option><option value="done">Hoàn thành</option><option value="cancelled">Đã hủy</option></select></label>
      <label className={lab}>Giá trị hợp đồng (VND)<VndInput className={field} value={Number(price)} onValueChange={v=>setPrice(String(v))}/></label>
      <label className={lab}>Đã cọc (VND)<VndInput className={field} value={Number(deposit)} onValueChange={v=>setDeposit(String(v))}/></label>
      <label className={`${lab} sm:col-span-2`}>Ghi chú<textarea rows={2} maxLength={1000} className={field} value={note} onChange={e=>setNote(e.target.value)}/></label>
      <section className="elia-new-booking-wardrobe elia-wardrobe-predict sm:col-span-2" aria-label="Chọn mã trang phục và dự báo lịch thuê">
       <div className="elia-new-booking-head"><strong>Mã trang phục · Lịch lấy/trả</strong></div>
       <div className="elia-wardrobe-predict-grid"><label className={lab}>Ngày lấy trang phục<input required={selectedWardrobe.length>0} className={field} type="date" value={wardrobeStart} onChange={e=>setWardrobeStart(e.target.value)}/></label><label className={lab}>Ngày trả trang phục<input required={selectedWardrobe.length>0} className={field} type="date" min={wardrobeStart} value={wardrobeEnd} onChange={e=>setWardrobeEnd(e.target.value)}/></label></div>
       <div className="elia-wardrobe-predict-grid"><label className={lab}>Thư mục<select className={field} value={wardrobeFolder} onChange={e=>setWardrobeFolder(e.target.value)}><option value="all">Tất cả</option>{wardrobeFolders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label className={lab}>Gõ mã váy / trang phục<input className={field} value={wardrobeQuery} onChange={e=>setWardrobeQuery(e.target.value)}/></label></div>
       {wardrobeError&&<p role="alert" className="text-xs text-rose-700">{wardrobeError}</p>}
       <div className="elia-new-booking-chips">{wardrobeItems.filter(item=>item.active&&(wardrobeFolder==='all'||item.folderId===wardrobeFolder)&&`${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(wardrobeQuery.trim().toLocaleLowerCase('vi'))).slice(0,40).map(item=>{const blocked=!validWeddingRange(wardrobeStart,wardrobeEnd)||Boolean(weddingConflict(item.bookings,wardrobeStart,wardrobeEnd));return <label key={item.id} className={`elia-new-booking-chip ${selectedWardrobe.includes(item.id)?'active':''} ${blocked?'blocked':''}`}><input type="checkbox" checked={selectedWardrobe.includes(item.id)} disabled={busy||blocked} onChange={e=>setSelectedWardrobe(ids=>e.target.checked?[...ids,item.id]:ids.filter(id=>id!==item.id))}/><span>{item.code}</span>{blocked&&<small>Trùng ngày</small>}</label>;})}{!wardrobeItems.length&&<span className="text-xs text-slate-500">Chưa có mã trang phục. Admin thêm tại Hệ thống → Kho trang phục.</span>}</div>
       {wardrobeQuery.trim().length>=2&&wardrobeItems.filter(item=>item.active&&!selectedWardrobe.includes(item.id)&&`${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(wardrobeQuery.trim().toLocaleLowerCase('vi'))).slice(0,4).map(item=><div key={item.id} className="elia-selected-wardrobe-risk"><strong className="elia-selected-wardrobe-title">Kiểm tra mã {item.code}</strong><WardrobeRiskNotice item={item} startDate={wardrobeStart} endDate={wardrobeEnd} compact/></div>)}
       {chosenRisk.map(({item})=><div key={item.id} className="elia-selected-wardrobe-risk"><strong className="elia-selected-wardrobe-title">{item.code}</strong><WardrobeRiskNotice item={item} startDate={wardrobeStart} endDate={wardrobeEnd} compact/></div>)}
       {hasWardrobeNear&&!hasWardrobeConflict&&<label className="elia-risk-ack"><input type="checkbox" checked={wardrobeAck} onChange={e=>setWardrobeAck(e.target.checked)}/> Tôi đã kiểm tra các khách thuê sát lịch và sẽ tư vấn thời gian trả váy cho khách</label>}
       {selectedWardrobe.length>0&&<p className="text-xs text-emerald-800">Đã chọn {selectedWardrobe.length} mã · Lấy {weddingDateLabel(wardrobeStart)} · Trả {weddingDateLabel(wardrobeEnd)}. Hệ thống sẽ kiểm tra trùng lần cuối khi lưu.</p>}
      </section>
      {isAdmin&&<fieldset className="sm:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
       <legend className="px-2 text-sm font-bold text-slate-800">Phân công thợ ({assignments.length})</legend>
       <div className="elia-v7-crew-top"><strong>{assignments.length} thợ đã chọn</strong><button type="button" className="secondary-button" aria-expanded={staffPickerOpen} onClick={()=>setStaffPickerOpen(v=>!v)}><Plus size={14}/> Thêm thợ</button></div>
       {staffPickerOpen&&<div className="elia-v7-staff-menu">{staff.filter(s=>s.active!==false&&!assignments.some(a=>a.id===s.id)&&allowedTasks(s.role).length>0).map(st=>{const conflict=availability.busy[st.id];return <button type="button" key={st.id} disabled={Boolean(conflict)} title={conflict?.label||''} onClick={()=>{toggleStaff(st.id,true);setStaffPickerOpen(false);}}>{st.name} · {st.role}{conflict?' · Bận':''}</button>;})}</div>}
       <div className="elia-v7-crew-assigned">{assignments.map(a=>{const st=staff.find(s=>s.id===a.id);return <div key={a.id} className="elia-v7-crew-row">
         <strong>{st?.name||a.id}</strong>
         <select aria-label={`Công việc ${st?.name||a.id}`} value={a.task} onChange={e=>changeAssignment(a.id,'task',e.target.value)}>{!allowedTasks(st?.role||'').includes(a.task)&&<option value={a.task}>{a.task}</option>}{allowedTasks(st?.role||'').map(t=><option key={t} value={t}>{t}</option>)}</select>
         {isRuocDau&&<select aria-label={`Nhà làm việc ${st?.name||a.id}`} required value={a.locType||''} onChange={e=>changeAssignment(a.id,'locType',e.target.value)}><option value="">Chọn nhà</option><option value="Nhà trai">Nhà trai</option><option value="Nhà gái">Nhà gái</option></select>}
         <button type="button" title="Bỏ thợ" aria-label={`Bỏ ${st?.name||a.id}`} onClick={()=>toggleStaff(a.id,false)}><X size={15}/></button>
         <label className="elia-v7-crew-cost">Chi phí thợ <VndInput className={field} value={a.cost} onValueChange={v=>changeAssignment(a.id,'cost',v)}/></label>
        </div>;})}</div>
      </fieldset>}

      {error&&<p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
    </form>
    <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-7"><div/><div className="flex gap-2"><button onClick={onClose} type="button" disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700">Hủy</button><button form="new-booking-form" disabled={busy} type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50">{busy?'Đang lưu…':createdEventId?'Hoàn tất liên kết mã':'Lưu lịch'}</button></div></footer>
    </>}
  </section>
 </div>;
}
