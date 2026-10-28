'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {User} from 'firebase/auth';
import {BadgeCheck,CalendarDays,Clock3,ChevronLeft,ChevronRight,Heart,RefreshCw,Search,Shirt,ShoppingBag,SquarePen,Trash2,CheckCircle2} from 'lucide-react';
import type {WeddingBooking,WeddingItem,WeddingRentalStatus,WeddingFolder} from '@/lib/domain/wedding-rental';
import {validWeddingRange,weddingConflict,weddingDateLabel} from '@/lib/domain/wedding-rental';
import {predictWardrobeUsage} from '@/lib/domain/wedding-advisory';
import {WardrobeRiskNotice} from './WardrobeRiskNotice';
import './wedding-wardrobe.css';

type ApiError={error?:string;code?:string};
type BookingDraft={itemId:string;customerName:string;customerPhone:string;startDate:string;endDate:string;notes:string};
const vnToday=()=>{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=(key:string)=>f.find(p=>p.type===key)?.value||'';return `${part('year')}-${part('month')}-${part('day')}`;};
const blank=(date:string):BookingDraft=>({itemId:'',customerName:'',customerPhone:'',startDate:date,endDate:date,notes:''});
const statusNames:Record<WeddingRentalStatus,string>={reserved:'Đã giữ lịch',picked_up:'Đã giao váy',returned:'Đã trả',cancelled:'Đã hủy'};
const months=Array.from({length:12},(_,i)=>`Tháng ${i+1}`);
const monthMove=(month:string,n:number)=>{const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+n,1));return d.toISOString().slice(0,7);};
const dayOfMonth=(month:string,day:number)=>`${month}-${String(day).padStart(2,'0')}`;
const monthDays=(month:string)=>{const [y,m]=month.split('-').map(Number);const days=new Date(Date.UTC(y,m,0)).getUTCDate();const offset=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7;return [...Array(offset).fill(''),...Array.from({length:days},(_,i)=>dayOfMonth(month,i+1))] as string[];};
const allBookings=(items:WeddingItem[])=>items.flatMap(item=>Object.values(item.bookings||{}).map(booking=>({...booking,itemCode:item.code,itemName:item.name}))).sort((a,b)=>b.startDate.localeCompare(a.startDate));
export function WeddingWardrobe({user}:{user:User}){
 const today=useMemo(vnToday,[]);
 const [month,setMonth]=useState(today.slice(0,7));
 const [selectedDay,setSelectedDay]=useState(today);
 const [items,setItems]=useState<WeddingItem[]>([]);
 const [selectedId,setSelectedId]=useState('');
 const [folders,setFolders]=useState<WeddingFolder[]>([]),[folderFilter,setFolderFilter]=useState('all'),[onlyFree,setOnlyFree]=useState(false);
 const [search,setSearch]=useState('');
 const [draft,setDraft]=useState<BookingDraft>(()=>blank(today));
 const [editing,setEditing]=useState<WeddingBooking|null>(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [availability,setAvailability]=useState<{available:boolean;conflict?:{startDate:string;endDate:string}|null}|null>(null);
 const [availabilityLoading,setAvailabilityLoading]=useState(false);
 const [advisoryConfirmed,setAdvisoryConfirmed]=useState(false);
 const request=useCallback(async<T extends object = ApiError>(path:string,init:RequestInit={}):Promise<T>=>{
  const run=async(force=false)=>fetch(path,{...init,cache:'no-store',headers:{...{'Content-Type':'application/json'},...init.headers,Authorization:`Bearer ${await user.getIdToken(force)}`}});
  let res=await run();if(res.status===401)res=await run(true);
  const result=await res.json() as ApiError;
  if(!res.ok)throw new Error(result.error||`Lỗi HTTP ${res.status}`);
  return result as T;
 },[user]);
 const reload=useCallback(async()=>{
  setLoading(true);setError('');try {const [result,dir]=await Promise.all([request<{items:WeddingItem[]}>('/api/wedding-wardrobe/items'),request<{folders:WeddingFolder[]}>('/api/wedding-wardrobe/folders')]);setItems(result.items||[]);setFolders(dir.folders||[]);}
  catch(err){setError(err instanceof Error?err.message:'Không đọc được lịch váy cưới.');}
  finally{setLoading(false);}
 },[request]);
 useEffect(()=>{void reload();},[reload]);
 const current=useMemo(()=>items.find(i=>i.id===draft.itemId)||null,[items,draft.itemId]);
 const selectedItem=useMemo(()=>items.find(i=>i.id===selectedId)||null,[items,selectedId]);
 const bookings=useMemo(()=>allBookings(items),[items]);
 const visibleItems=useMemo(()=>items.filter(i=>(folderFilter==='all'||(folderFilter==='none'?!i.folderId:i.folderId===folderFilter))&&(!onlyFree||(i.active&&!weddingConflict(i.bookings,selectedDay,selectedDay)))&&`${i.code} ${i.name}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))),[items,search,folderFilter,onlyFree,selectedDay]);
 const dayBookings=useMemo(()=>bookings.filter(b=>b.startDate<=selectedDay&&selectedDay<=b.endDate&&b.status!=='cancelled').sort((a,b)=>a.itemCode.localeCompare(b.itemCode,'vi')),[bookings,selectedDay]);
 const periodValid=validWeddingRange(draft.startDate,draft.endDate);
 const knownConflict=useMemo(()=>periodValid&&current?weddingConflict(current.bookings,draft.startDate,draft.endDate,editing?.id):null,[current,draft.startDate,draft.endDate,editing?.id,periodValid]);
 const prediction=useMemo(()=>predictWardrobeUsage(current?.bookings,draft.startDate,draft.endDate,editing?.id),[current,draft.startDate,draft.endDate,editing?.id]);
 useEffect(()=>setAdvisoryConfirmed(false),[draft.itemId,draft.startDate,draft.endDate,editing?.id]);
 useEffect(()=>{
  if(editing||!current||!current.active||!periodValid){setAvailability(null);setAvailabilityLoading(false);return;}
  let cancelled=false;setAvailability(null);setAvailabilityLoading(true);
  void request<{available:boolean;conflict?:{startDate:string;endDate:string}|null}>(`/api/wedding-wardrobe/availability?itemId=${encodeURIComponent(current.id)}&startDate=${encodeURIComponent(draft.startDate)}&endDate=${encodeURIComponent(draft.endDate)}`)
   .then(data=>{if(!cancelled)setAvailability(data);})
   .catch(()=>{if(!cancelled)setAvailability(null);})
   .finally(()=>{if(!cancelled)setAvailabilityLoading(false);});
  return()=>{cancelled=true;};
 },[current?.id,current?.active,draft.startDate,draft.endDate,periodValid,editing,request]);
 const selectItem=(id:string)=>{if(editing)return;setSelectedId(id);setDraft(p=>({...p,itemId:id}));};
 const chooseDay=(day:string)=>{setSelectedDay(day);if(!editing)setDraft(p=>({...p,startDate:day,endDate:day}));};
 const changeMonth=(n:number)=>{const m=monthMove(month,n);setMonth(m);chooseDay(`${m}-01`);};
 const submitBooking=async(e:FormEvent)=>{e.preventDefault();setError('');setNotice('');if(!periodValid||!draft.itemId){setError('Vui lòng chọn mã váy và khoảng ngày thuê hợp lệ.');return;}
  if(prediction.nearby.length&&!advisoryConfirmed){setError('Có khách thuê cách lịch này 1–2 ngày. Hãy xem thông tin và xác nhận kế hoạch lấy/trả trước khi lưu.');return;}
  if(knownConflict){setError(`Mã váy đã có lịch thuê từ ${weddingDateLabel(knownConflict.startDate)} đến ${weddingDateLabel(knownConflict.endDate)}.`);return;}
  setBusy(true);try{
   if(editing){await request(`/api/wedding-wardrobe/bookings/${encodeURIComponent(editing.itemId)}/${encodeURIComponent(editing.id)}`,{method:'PATCH',body:JSON.stringify({...draft,advisoryAcknowledged:advisoryConfirmed,acknowledgedNearbyIds:prediction.nearby.map(b=>b.id)})});setNotice('Đã cập nhật lịch thuê.');}
   else{await request('/api/wedding-wardrobe/bookings',{method:'POST',body:JSON.stringify({...draft,advisoryAcknowledged:advisoryConfirmed,acknowledgedNearbyIds:prediction.nearby.map(b=>b.id)})});setNotice('Đã giữ lịch thuê váy cưới thành công.');}
   setEditing(null);setDraft({...blank(draft.startDate),itemId:draft.itemId});await reload();
  }catch(err){if(err instanceof Error&&err.message.includes('NEARBY_ACK_REQUIRED'))setAdvisoryConfirmed(false);setError(err instanceof Error?err.message:'Không thể lưu lịch thuê.');await reload();}finally{setBusy(false);}
 };
 const updateStatus=async(booking:WeddingBooking,next:WeddingRentalStatus)=>{
  const label=next==='cancelled'?'Hủy lịch thuê này?':next==='picked_up'?'Xác nhận đã giao váy cho khách?':'Xác nhận khách đã trả váy?';
  if(!window.confirm(label))return;
  setBusy(true);setError('');setNotice('');try{
   await request(`/api/wedding-wardrobe/bookings/${encodeURIComponent(booking.itemId)}/${encodeURIComponent(booking.id)}`,{method:'PATCH',body:JSON.stringify({status:next})});
   setNotice(`Đã cập nhật: ${statusNames[next]}.`);await reload();
  }catch(err){setError(err instanceof Error?err.message:'Không thể cập nhật trạng thái.');}finally{setBusy(false);}
 };
 const startEdit=(booking:WeddingBooking)=>{
  setEditing(booking);setSelectedId(booking.itemId);setDraft({itemId:booking.itemId,customerName:booking.customerName,customerPhone:booking.customerPhone,startDate:booking.startDate,endDate:booking.endDate,notes:booking.notes||''});setError('');setNotice('');
  document.getElementById('elia-wedding-booking-form')?.scrollIntoView({behavior:'smooth',block:'center'});
 };
 const monthGrid=useMemo(()=>monthDays(month),[month]);
 const countBusy=items.filter(i=>i.active&&Boolean(weddingConflict(i.bookings,selectedDay,selectedDay))).length;
 const monthBooked=bookings.filter(b=>b.status!=='cancelled'&&b.startDate<=`${month}-31`&&b.endDate>=`${month}-01`).length;
 return <div className="elia-wedding">
  <div className="elia-wedding-metrics"><div><span>Mã trang phục</span><strong>{items.length}</strong><small>Đã tạo trong danh mục</small></div><div><span>Đang có lịch · {weddingDateLabel(selectedDay)}</span><strong>{countBusy}</strong><small>Mã đã được giữ trong ngày</small></div><div><span>Lịch thuê trong tháng</span><strong>{monthBooked}</strong><small>Không tính lịch đã hủy</small></div></div>
  <div className="elia-wedding-actions"><button type="button" className="elia-wedding-action-primary" onClick={()=>document.getElementById('elia-wedding-booking-form')?.scrollIntoView({behavior:'smooth',block:'start'})}><CalendarDays size={16}/> Tạo lịch thuê</button></div>
  {error&&<div role="alert" className="elia-wedding-message error">{error}</div>}
  {notice&&<div role="status" className="elia-wedding-message success"><CheckCircle2 size={16}/>{notice}</div>}
  <div className="elia-wedding-main">
   <section className="elia-wedding-panel elia-wedding-catalog"><div className="elia-wedding-panel-head"><div><span className="elia-wedding-eyebrow">BỘ SƯU TẬP</span><h3>Danh mục trang phục</h3></div><button type="button" className="elia-wedding-icon" onClick={()=>void reload()} title="Tải lại"><RefreshCw size={17} className={loading?'spin':''}/></button></div><div className="elia-wedding-quickfilter"><label className="elia-wedding-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Gõ mã, ví dụ VC-001"/></label><select aria-label="Lọc theo thư mục" value={folderFilter} onChange={e=>setFolderFilter(e.target.value)}><option value="all">Tất cả thư mục</option><option value="none">Chưa phân loại</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><label className="elia-wedding-free-check"><input type="checkbox" checked={onlyFree} onChange={e=>setOnlyFree(e.target.checked)}/> Chỉ mã trống ngày chọn</label></div>
   <div className="elia-wedding-items">{visibleItems.map(item=>{const busyDay=Boolean(weddingConflict(item.bookings,selectedDay,selectedDay));return <div className={`elia-wedding-item ${selectedId===item.id?'selected':''}`} key={item.id}><button type="button" className="elia-wedding-item-main" onClick={()=>selectItem(item.id)}><span className="elia-wedding-item-icon"><Shirt size={20}/></span><span className="elia-wedding-item-copy"><strong>{item.code}</strong><small>{folders.find(f=>f.id===item.folderId)?.name|| (item.kind==='outfit'?'Trang phục':'Váy cưới')} · {item.name}</small></span><span className={`elia-wedding-dot ${!item.active?'off':busyDay?'busy':'free'}`} title={!item.active?'Ngừng nhận lịch':busyDay?'Đã thuê ngày này':'Trống ngày này'}/></button></div>;})}{!visibleItems.length&&<p className="elia-wedding-empty">{loading?'Đang tải danh mục…':'Chưa có mã phù hợp. Admin thêm mã tại Hệ thống → Kho trang phục.'}</p>}</div>
   <div className="elia-wedding-legend"><span><i className="free"/> Còn trống</span><span><i className="busy"/> Có lịch thuê</span><span><i className="off"/> Ngừng nhận</span></div></section>
   <section className="elia-wedding-panel elia-wedding-calendar"><div className="elia-wedding-panel-head"><div><span className="elia-wedding-eyebrow">TÌNH TRẠNG THEO NGÀY</span><h3>{selectedItem?selectedItem.code:'Tất cả mã váy'}</h3></div><div className="elia-wedding-month"><button type="button" aria-label="Tháng trước" onClick={()=>changeMonth(-1)}><ChevronLeft size={18}/></button><strong>{months[Number(month.slice(5))-1]} {month.slice(0,4)}</strong><button type="button" aria-label="Tháng sau" onClick={()=>changeMonth(1)}><ChevronRight size={18}/></button></div></div><div className="elia-wedding-weekdays">{['T2','T3','T4','T5','T6','T7','CN'].map(day=><span key={day}>{day}</span>)}</div><div className="elia-wedding-grid">{monthGrid.map((date,i)=>{const relevant=selectedItem?[selectedItem]:items.filter(x=>x.active);const count=date?relevant.filter(item=>Boolean(weddingConflict(item.bookings,date,date))).length:0;return date?<button type="button" key={date} onClick={()=>chooseDay(date)} className={`elia-wedding-day ${date===selectedDay?'selected':''} ${date===today?'today':''} ${count?'has-rental':''}`} title={`${weddingDateLabel(date)}: ${count} mã có lịch`}><span>{Number(date.slice(-2))}</span>{count>0&&<small>{selectedItem?'Đã thuê':`${count} mã`}</small>}</button>:<span key={`offset-${i}`} className="elia-wedding-day blank"/>;})}</div><div className="elia-wedding-calendar-foot"><div className="elia-wedding-day-shortcuts"><button type="button" className="elia-wedding-today" onClick={()=>{setMonth(today.slice(0,7));chooseDay(today);}}>Hôm nay</button><button type="button" className="elia-wedding-today" onClick={()=>{const next=new Date(`${today}T00:00:00Z`);next.setUTCDate(next.getUTCDate()+1);const date=next.toISOString().slice(0,10);setMonth(date.slice(0,7));chooseDay(date);}}>Ngày mai</button></div><span><CalendarDays size={15}/> Đang xem: <b>{weddingDateLabel(selectedDay)}</b></span><span>{selectedItem?(weddingConflict(selectedItem.bookings,selectedDay,selectedDay)?'Mã này đã có lịch thuê':'Mã này còn trống'):`${dayBookings.length} lịch đang chiếm ngày`}</span></div></section>
  </div>
  <div className="elia-wedding-lower"><section id="elia-wedding-booking-form" className="elia-wedding-panel elia-wedding-form"><div className="elia-wedding-panel-head"><div><span className="elia-wedding-eyebrow">ĐẶT LỊCH THUÊ</span><h3>{editing?'Sửa lịch thuê':'Giữ lịch nhanh'}</h3></div><ShoppingBag size={22}/></div><form onSubmit={e=>void submitBooking(e)}><label>Mã trang phục<select required value={draft.itemId} disabled={Boolean(editing)} onChange={e=>{setDraft(p=>({...p,itemId:e.target.value}));setSelectedId(e.target.value);}}><option value="">Chọn mã váy cưới</option>{items.filter(i=>i.active||i.id===draft.itemId).map(i=><option key={i.id} value={i.id}>{i.code}{i.name!==i.code?` · ${i.name}`:''}{i.active?'':' (ngừng nhận)'}</option>)}</select></label><div className="elia-wedding-two"><label>Ngày nhận váy<input required type="date" value={draft.startDate} onChange={e=>setDraft(p=>({...p,startDate:e.target.value,endDate:e.target.value>p.endDate?e.target.value:p.endDate}))}/></label><label>Ngày trả váy<input required type="date" min={draft.startDate} value={draft.endDate} onChange={e=>setDraft(p=>({...p,endDate:e.target.value}))}/></label></div>{current&&periodValid&&<WardrobeRiskNotice item={current} startDate={draft.startDate} endDate={draft.endDate} omitBookingId={editing?.id}/>}
   {prediction.nearby.length>0&&!knownConflict&&<label className="elia-risk-ack"><input type="checkbox" checked={advisoryConfirmed} onChange={e=>setAdvisoryConfirmed(e.target.checked)}/> Đã kiểm tra lịch sát ngày và sẽ tư vấn khách về thời hạn trả</label>}
   {current&&periodValid&&<div className={`elia-wedding-availability ${!current.active||knownConflict||(!editing&&availability?.available===false)?'occupied':'clear'}`} role="status"><BadgeCheck size={16}/>{!current.active?'Mã váy đang ngừng nhận lịch':knownConflict?`Đã có lịch ${weddingDateLabel(knownConflict.startDate)} – ${weddingDateLabel(knownConflict.endDate)}`:!editing&&availabilityLoading?'Đang xác minh tình trạng với máy chủ…':!editing&&availability?.available===false?'Khoảng ngày này đã được đặt':editing?'Đang chỉnh sửa lịch giữ chỗ':availability?.available===true?'Máy chủ xác nhận mã váy còn trống':'Chưa xác minh trực tiếp; máy chủ sẽ kiểm tra khi lưu'}</div>}
   <div className="elia-wedding-two"><label>Tên khách hàng<input required maxLength={120} value={draft.customerName} onChange={e=>setDraft(p=>({...p,customerName:e.target.value}))} placeholder="Họ tên khách thuê"/></label><label>Số điện thoại<input type="tel" maxLength={30} value={draft.customerPhone} onChange={e=>setDraft(p=>({...p,customerPhone:e.target.value}))} placeholder="Số liên hệ"/></label></div><label>Ghi chú (không bắt buộc)<textarea rows={2} maxLength={1000} value={draft.notes} onChange={e=>setDraft(p=>({...p,notes:e.target.value}))} placeholder="Ví dụ: thử váy, ngày lấy, tình trạng phụ kiện…"/></label><div className="elia-wedding-form-actions"><button type="submit" disabled={busy||(!current?.active&&!editing)||!periodValid||Boolean(knownConflict)||(prediction.nearby.length>0&&!advisoryConfirmed)||(!editing&&availabilityLoading)||(!editing&&availability?.available===false)} className="elia-wedding-dark-btn"><CalendarDays size={17}/>{busy?'Đang lưu…':editing?'Lưu thay đổi':'Xác nhận giữ lịch'}</button>{editing&&<button type="button" className="elia-wedding-secondary-btn" onClick={()=>{setEditing(null);setDraft(blank(selectedDay));}}>Hủy chỉnh sửa</button>}</div><p className="elia-wedding-caption">Ngày nhận và ngày trả đều được tính là ngày giữ váy. Máy chủ sẽ kiểm tra trùng lịch một lần nữa ngay khi lưu.</p></form></section>
   <section className="elia-wedding-panel elia-wedding-bookings"><div className="elia-wedding-panel-head"><div><span className="elia-wedding-eyebrow">NHẬT KÝ THUÊ</span><h3>Lịch thuê · {weddingDateLabel(selectedDay)}</h3></div><span className="elia-wedding-count">{dayBookings.length}</span></div><div className="elia-wedding-booking-list">{dayBookings.map(b=><article className="elia-wedding-booking" key={b.id}><div className="elia-wedding-booking-top"><strong>{b.itemCode}</strong><span className={`elia-wedding-status ${b.status}`}>{statusNames[b.status]}</span></div><b>{b.customerName}</b><p>{weddingDateLabel(b.startDate)} – {weddingDateLabel(b.endDate)}{b.customerPhone?` · ${b.customerPhone}`:''}</p>{b.eventId&&<small className="elia-wedding-linked-event">Liên kết lịch quay/chụp · {b.eventId.slice(0,8)}</small>}{b.notes&&<small>{b.notes}</small>}<div className="elia-wedding-booking-actions">{b.status==='reserved'&&<><button type="button" disabled={busy} onClick={()=>startEdit(b)}><SquarePen size={14}/> Sửa</button><button type="button" disabled={busy} onClick={()=>void updateStatus(b,'picked_up')}><ShoppingBag size={14}/> Đã giao</button><button type="button" className="danger" disabled={busy} onClick={()=>void updateStatus(b,'cancelled')}><Trash2 size={14}/> Hủy lịch</button></>}{b.status==='picked_up'&&<button type="button" disabled={busy} onClick={()=>void updateStatus(b,'returned')}><BadgeCheck size={14}/> Đã trả</button>}{b.status==='returned'&&<span className="elia-wedding-closed"><BadgeCheck size={14}/> Hoàn tất</span>}</div></article>)}{!dayBookings.length&&<div className="elia-wedding-empty full"><Clock3 size={28}/><strong>Chưa có lịch thuê trong ngày này</strong><p>Chọn mã váy và tạo lịch ở biểu mẫu bên cạnh.</p></div>}</div></section>
  </div>
 </div>;
}
