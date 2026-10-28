'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {User} from 'firebase/auth';
import {CalendarCheck,RefreshCw,Search,Shirt,XCircle} from 'lucide-react';
import type {WeddingBooking,WeddingItem,WeddingFolder} from '@/lib/domain/wedding-rental';
import {weddingDateLabel,validWeddingRange} from '@/lib/domain/wedding-rental';
import {predictWardrobeUsage} from '@/lib/domain/wedding-advisory';
import {WardrobeRiskNotice} from './WardrobeRiskNotice';
import './wedding-wardrobe.css';

export async function officeWardrobeRequest<T>(user:User,path:string,init:RequestInit={}):Promise<T>{
 const send=async(force:boolean)=>fetch(path,{...init,cache:'no-store',headers:{'Content-Type':'application/json',...init.headers,Authorization:`Bearer ${await user.getIdToken(force)}`}});
 let res=await send(false);if(res.status===401)res=await send(true);
 const contentType=res.headers.get('content-type')||'';
 if(!contentType.includes('application/json'))throw new Error(`Không đọc được API trang phục (HTTP ${res.status}). Kiểm tra đã deploy đủ các route /api/wedding-wardrobe.`);
 const body=await res.json();if(!res.ok)throw new Error(body.error||`HTTP ${res.status}`);return body as T;
}
export type EventWardrobeOption={id:string;code:string;name:string;folderId?:string;active:boolean;bookings:WeddingItem['bookings']};
export function WardrobeEventCodes({user,eventId,eventDate,eventName,eventPhone='',readOnly=false}:{user:User;eventId:string;eventDate:string;eventName:string;eventPhone?:string;readOnly?:boolean}){
 const [items,setItems]=useState<WeddingItem[]>([]),[folders,setFolders]=useState<WeddingFolder[]>([]);
 const [codeId,setCodeId]=useState(''),[startDate,setStartDate]=useState(eventDate),[endDate,setEndDate]=useState(eventDate);
 const [folderId,setFolderId]=useState('all'),[query,setQuery]=useState(''),[ack,setAck]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const reload=useCallback(async()=>{setLoading(true);setError('');try{
  const [a,b]=await Promise.all([officeWardrobeRequest<{items:WeddingItem[]}>(user,'/api/wedding-wardrobe/items'),officeWardrobeRequest<{folders:WeddingFolder[]}>(user,'/api/wedding-wardrobe/folders')]);
  setItems(a.items||[]);setFolders(b.folders||[]);
 }catch(e){setError(e instanceof Error?e.message:'Không tải được danh mục trang phục');}finally{setLoading(false);}},[user]);
 useEffect(()=>{void reload();},[reload]);
 useEffect(()=>{setStartDate(eventDate);setEndDate(eventDate);setAck(false);},[eventDate]);
 const attached=useMemo(()=>items.flatMap(item=>Object.values(item.bookings||{}).filter(b=>b.eventId===eventId&&b.status!=='cancelled').map(b=>({item,booking:b}))),[items,eventId]);
 const options=useMemo(()=>items.filter(i=>i.active&&!attached.some(a=>a.item.id===i.id)&&(folderId==='all'||i.folderId===folderId)&&`${i.code} ${i.name}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))).slice(0,25),[items,attached,folderId,query]);
 const selected=items.find(i=>i.id===codeId);
 const forecast=useMemo(()=>predictWardrobeUsage(selected?.bookings,startDate,endDate),[selected,startDate,endDate]);
 useEffect(()=>setAck(false),[codeId,startDate,endDate]);
 async function add(e:FormEvent){
  e.preventDefault();if(!selected||!forecast.valid||forecast.conflicts.length||(forecast.nearby.length&&!ack))return;
  setBusy(true);setError('');setNotice('');
  try{
   // Always perform a fresh server check; the Firebase transaction does final overlap validation.
   const checked=await officeWardrobeRequest<{available:boolean;nearby:unknown[]}>(user,`/api/wedding-wardrobe/availability?itemId=${encodeURIComponent(codeId)}&startDate=${startDate}&endDate=${endDate}`);
   if(!checked.available)throw new Error('Mã váy vừa có lịch trùng hoặc đã ngừng nhận. Hãy chọn lại.');
   if(checked.nearby.length&&!ack){await reload();throw new Error('Có lịch thuê sát ngày vừa cập nhật. Hãy xem cảnh báo, xác nhận với khách rồi thử lại.');}
   await officeWardrobeRequest(user,'/api/wedding-wardrobe/bookings',{method:'POST',body:JSON.stringify({itemId:codeId,eventId,customerName:eventName||'Khách hàng',customerPhone:/^[+\d() .-]{8,30}$/.test(eventPhone.trim())?eventPhone.trim():'',startDate,endDate,advisoryAcknowledged:ack,acknowledgedNearbyIds:forecast.nearby.map(b=>b.id),notes:''})});
   setNotice(`Đã giữ mã ${selected.code}: ${weddingDateLabel(startDate)} – ${weddingDateLabel(endDate)}.`);
   setCodeId('');setQuery('');await reload();
  }catch(e){if(e instanceof Error&&e.message.includes('NEARBY_ACK_REQUIRED')){setAck(false);await reload();}setError(e instanceof Error?e.message:'Không thể giữ mã trang phục');}finally{setBusy(false);}
 }
 async function cancel(booking:WeddingBooking){if(!window.confirm('Hủy giữ mã trang phục trong lịch này?'))return;setBusy(true);setError('');try{
  await officeWardrobeRequest(user,`/api/wedding-wardrobe/bookings/${booking.itemId}/${booking.id}`,{method:'PATCH',body:JSON.stringify({status:'cancelled'})});
  setNotice('Đã hủy giữ mã.');await reload();
 }catch(e){setError(e instanceof Error?e.message:'Không hủy được mã');}finally{setBusy(false);}}
 return <section className="elia-event-wardrobe elia-wardrobe-predict" aria-label="Mã trang phục và lịch lấy trả">
  <div className="elia-event-wardrobe-heading"><div><span className="elia-wedding-eyebrow">ÉLIA MARIER · TRANG PHỤC</span><h3><Shirt size={18}/> Mã váy & lịch lấy/trả ({attached.length})</h3></div><button type="button" aria-label="Làm mới mã trang phục" disabled={loading} onClick={()=>void reload()}><RefreshCw size={16}/></button></div>
  <p className="elia-event-wardrobe-desc">Gõ mã trang phục, chọn ngày lấy – ngày trả. Hệ thống cảnh báo lịch trùng và lịch sát trong vòng 2 ngày.</p>
  {error&&<p role="alert" className="elia-wedding-message error">{error}</p>}{notice&&<p role="status" className="elia-wedding-message success">{notice}</p>}
  <div className="elia-event-attached">{attached.map(({item,booking})=><div key={booking.id} className="elia-attached-block"><article><span className="elia-catalog-code">{item.code}</span><div><strong>{item.name}</strong><small>{weddingDateLabel(booking.startDate)} – {weddingDateLabel(booking.endDate)} · {booking.status==='picked_up'?'Đã giao':booking.status==='returned'?'Đã trả':'Đã giữ'}</small></div>{!readOnly&&booking.status==='reserved'&&<button type="button" onClick={()=>void cancel(booking)} disabled={busy} title="Hủy giữ mã"><XCircle size={17}/></button>}</article><WardrobeRiskNotice item={item} startDate={booking.startDate} endDate={booking.endDate} omitBookingId={booking.id} compact/></div>)}{!attached.length&&<p className="elia-wedding-empty">Chưa liên kết mã trang phục nào</p>}</div>
  {!readOnly&&<form onSubmit={e=>void add(e)} className="elia-wardrobe-predict-form">
   <div className="elia-wardrobe-predict-grid"><label>Ngày lấy trang phục<input type="date" required value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><label>Ngày trả trang phục<input type="date" required min={startDate} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label></div>
   <div className="elia-wardrobe-predict-grid"><label>Thư mục<select value={folderId} onChange={e=>setFolderId(e.target.value)}><option value="all">Tất cả thư mục</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Tìm mã váy / trang phục<div className="elia-wardrobe-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="VD: VC-001"/></div></label></div>
   <div className="elia-wardrobe-options" role="group" aria-label="Mã trang phục có thể chọn">{options.map(i=><button type="button" key={i.id} className={i.id===codeId?'selected':''} aria-pressed={i.id===codeId} onClick={()=>setCodeId(i.id)}><strong>{i.code}</strong><small>{i.name}</small></button>)}{!options.length&&<span>Không tìm thấy mã phù hợp. Admin thêm mã trong Hệ thống → Kho trang phục.</span>}</div>
   {selected&&<WardrobeRiskNotice item={selected} startDate={startDate} endDate={endDate}/>}
   {selected&&forecast.nearby.length>0&&forecast.conflicts.length===0&&<label className="elia-risk-ack"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> Tôi đã xem lịch thuê sát ngày và sẽ trao đổi rõ thời hạn trả với khách</label>}
   <button type="submit" className="elia-wedding-dark-btn" disabled={busy||loading||!selected||!forecast.valid||forecast.conflicts.length>0||(forecast.nearby.length>0&&!ack)}><CalendarCheck size={16}/>{busy?'Đang giữ mã…':'Xác nhận giữ mã'}</button>
  </form>}
  <p className="elia-wedding-caption">Ngày lấy và trả có thể khác ngày quay/chụp. Lịch trùng bị chặn ở máy chủ; cảnh báo ±2 ngày giúp nhân viên chủ động chuẩn bị.</p>
 </section>;
}
