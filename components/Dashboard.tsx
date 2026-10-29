'use client';
import Image from 'next/image';
import {formatVnd} from '@/lib/domain/vietnam-money';

import {OfficeAccountsManager} from './OfficeAccountsManager';
import {WeddingWardrobe} from './WeddingWardrobe';
import {WeddingCatalogManager} from './WeddingCatalogManager';
import {PayrollManager} from '@/components/PayrollManager';
import {DeliveryGrantManager} from '@/components/DeliveryGrantManager';
import {DeliveryReviewManager} from '@/components/DeliveryReviewManager';
import {AdminThumbnail,THUMB_CACHE_NAME,type CoverInfo} from '@/components/AdminThumbnail';
import {OperationsHub} from './OperationsHub';
import {CalendarPlanner} from './CalendarPlanner';
import {StudioAnalytics} from './StudioAnalytics';
import {SystemHealth} from './SystemHealth';
import MigrationReadiness from './MigrationReadiness';
import './v29.css';
import './v30.css';
import './elia-luxe.css';
import './elia-logo.css';
import './elia-brand-refine.css';
import './elia-uiux-v3.css';
import './elia-uiux-v4.css';
import {EliaBrandMini} from './EliaBrandMini';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  Activity, ArrowRight, BadgeCheck, CalendarDays, ChevronLeft, ChevronRight, Copy,
  CircleDollarSign, Clock3, Download, Film, FolderOpen, Images, LayoutDashboard, ChartNoAxesCombined,
  LockKeyhole, LogOut, Menu, Plus, RefreshCw, Search, Settings2, ShieldCheck,
  Sparkles, Users, WalletCards, Shirt, X
} from 'lucide-react';
import { browserAuth } from '@/lib/firebase/client';
import { NewBookingDialog } from './NewBookingDialog';
import { EventEditor } from './EventEditor';
import { BookingDetailPanel } from './BookingDetailPanel';
import { StaffManager } from './StaffManager';
import { getMonthStats, monthEvents, shiftMonth, statusName } from '@/lib/domain/studio';
import type { DashboardData, StudioEvent } from '@/lib/domain/types';

type Tab = 'overview'|'calendar'|'wedding'|'staff'|'payroll'|'delivery'|'analytics'|'system'|'accounts';
type AccessRole='admin'|'receptionist'|'guest'|'staff';
type SystemSection='health'|'activity'|'data'|'wardrobe';
const monthNow = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const localToday = () => { const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const take=(type:string)=>parts.find(p=>p.type===type)?.value||'';return `${take('year')}-${take('month')}-${take('day')}`; };
const money = formatVnd;
const dateDisplay = (s:string) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}` : s;
const pages: {key:Tab;name:string;sub:string;icon:typeof LayoutDashboard}[] = [
  {key:'overview',name:'Tổng quan',sub:'Tình hình vận hành',icon:LayoutDashboard},
  {key:'calendar',name:'Lịch quay & chụp',sub:'Lịch và công việc',icon:CalendarDays},
  {key:'wedding',name:'Lịch váy cưới',sub:'Thuê váy & kiểm tra mã trống',icon:Shirt},
  {key:'staff',name:'Đội ngũ',sub:'Nhân sự, phân công',icon:Users},
  {key:'payroll',name:'Lương thợ',sub:'Theo dõi thanh toán',icon:WalletCards},
  {key:'delivery',name:'Bàn giao sản phẩm',sub:'Ảnh, video, đánh giá',icon:FolderOpen},
  {key:'analytics',name:'Báo cáo',sub:'Thống kê vận hành',icon:ChartNoAxesCombined},
  {key:'system',name:'Hệ thống',sub:'Hoạt động, sức khỏe và dữ liệu',icon:Settings2},
  {key:'accounts',name:'Tài khoản nhân viên',sub:'Admin quản lý',icon:ShieldCheck}
];
function Status({status}:{status:StudioEvent['status']}) {
  return <span className={`status status-${status}`}><i />{statusName(status)}</span>;
}
function Empty({title,detail}:{title:string;detail:string}){
  return <div className="empty-state"><FolderOpen size={30}/><b>{title}</b><p>{detail}</p></div>;
}
function Login({onLogin,error,loading}:{onLogin:(email:string,password:string)=>void;error:string;loading:boolean}){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  return <div className="login-layout">
    <div className="login-showcase">
      <div className="login-brand"><Image className="elia-brand-login" src="/logo.png" alt="Élia Marier" width={2048} height={2452} priority unoptimized /></div>
      <div className="showcase-main"><div className="overline">ÉLIA MARIER · STUDIO WORKSPACE</div>
        <h1>Chăm chút từng khoảnh khắc.<br/><em>Vẹn tròn từng trải nghiệm.</em></h1>
        <p>Không gian điều hành dành riêng cho Élia Marier, nơi mỗi lịch hẹn và lần bàn giao đều được chăm chút.</p>
        <div className="showcase-pills"><span>Lịch làm việc</span><span>Đội ngũ</span><span>Bàn giao ảnh & phim</span></div>
      </div><div className="login-bottom">A MORE THOUGHTFUL STUDIO EXPERIENCE <span>© ÉLIA MARIER</span></div>
    </div>
    <div className="login-panel"><div className="login-box">
      <div className="login-lock"><LockKeyhole size={21}/></div>
      <div className="eyebrow">ĐĂNG NHẬP NỘI BỘ</div><h2>Chào mừng trở lại</h2>
      <p>Đăng nhập bằng tài khoản Élia Marier do Admin cấp.</p>
      <form onSubmit={e=>{e.preventDefault();onLogin(email,password);}}>
        <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" placeholder="email@example.com" required value={email} onChange={e=>setEmail(e.target.value)}/>
        <label htmlFor="password">Mật khẩu</label><input id="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" required value={password} onChange={e=>setPassword(e.target.value)}/>
        {error&&<div className="alert error" role="alert">{error}</div>}
        <button disabled={loading} className="primary-button wide" type="submit">{loading?'Đang xác thực…':'Đăng nhập'}<ArrowRight size={17}/></button>
      </form>
      <div className="login-foot"><ShieldCheck size={16}/> Quyền truy cập được xác minh trên server.</div>
      <a className="legacy-link" href="/migration">Kiểm tra an toàn dữ liệu →</a>

    </div></div>
  </div>;
}

function EventTable({events,staff,compact=false,onSelect}:{events:StudioEvent[];staff:DashboardData['staff'];compact?:boolean;onSelect:(id:string)=>void}) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Ngày & giờ</th><th>Dự án / Khách hàng</th><th>Dịch vụ</th>{!compact&&<th>Phân công</th>}<th>Trạng thái</th><th/></tr></thead>
    <tbody>{events.length ? events.slice(0,compact?6:150).map(event=>{
      const crew=event.assignments.map(a=>staff.find(s=>s.id===a.id)?.name).filter(Boolean);
      return <tr key={event.id}><td><div className="date-cell">{dateDisplay(event.date)}</div><div className="hint">{event.start||'Chưa có giờ'}</div></td>
        <td><strong className="event-name">{event.name||'Không có tên'}</strong><div className="hint clamp">{event.location||'Chưa có địa điểm'}</div></td>
        <td><span className="type-pill">{event.eventType||'Khác'}</span></td>
        {!compact&&<td><div className="crew-cell">{crew.length?crew.join(', '):'Chưa phân công'}</div></td>}
        <td><Status status={event.status}/></td>
        <td><button className="icon-link" onClick={()=>onSelect(event.id)} aria-label={`Chi tiết ${event.name}`} title="Xem và chỉnh sửa lịch"><ArrowRight size={16}/></button></td>
      </tr>;
    }):<tr><td colSpan={compact?5:6}><Empty title="Chưa có lịch phù hợp" detail="Dữ liệu sẽ hiển thị sau khi được đồng bộ từ Firebase."/></td></tr>}</tbody></table></div>;
}

type ProductMediaSummary={id:string;name:string;kind:'video'|'image'|'mixed'|'unknown';videoCount:number;imageCount:number;selectedNames:string[];cover?:CoverInfo;warning?:string;r2?:{state:'ready'|'pending'|'invalid'|'error'|'none';readyCount:number;totalCount:number;message:string;checkedAt:number}};
function DeliveryProductGroup({event,user,refresh=false}:{event:StudioEvent;user:User;refresh?:boolean}){
 const [products,setProducts]=useState<ProductMediaSummary[]>([]);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [visible,setVisible]=useState(false);
 const [r2Refresh,setR2Refresh]=useState(0);
 const groupRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
   const node=groupRef.current;if(!node)return;
   if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
   const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'150px'});
   observer.observe(node);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!visible)return;
  let active=true;
  void (async()=>{setBusy(true);try{
   const doFetch=async(forceToken=false)=>fetch(`/api/delivery/${encodeURIComponent(event.id)}/admin-media?refresh=1`,{headers:{Authorization:`Bearer ${await user.getIdToken(forceToken)}`},cache:'no-store'});
   let response=await doFetch();if(response.status===401)response=await doFetch(true);
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Không đọc được Google Drive');
   if(active)setProducts(data.products||[]);
  }catch(e){if(active)setError(e instanceof Error?e.message:'Không đọc được sản phẩm');}
  finally{if(active)setBusy(false);}})();
  return()=>{active=false;};
 },[visible,event.id,user,refresh,r2Refresh]);
 // Refresh pending R2 status in the background so Admin sees green without F5.
 useEffect(()=>{
  if(!visible||!products.some(p=>p.r2?.state==='pending'))return;
  const timer=window.setInterval(()=>setR2Refresh(n=>n+1),90000);
  return ()=>window.clearInterval(timer);
 },[visible,products]);
 const [hiddenProducts,setHiddenProducts]=useState<string[]>([]);
 const remaining=event.products.filter(p=>!event.completedProductIds?.includes(p.id)&&!hiddenProducts.includes(p.id));
 if(event.deliveryCompleted||!remaining.length)return null;
 // A booking only reserves as many grid columns as it has unfinished products.
 // The nested grid keeps sibling products side by side, while other bookings
 // can fill the remaining slots on the same row.
 return <section className={`delivery-event-group delivery-event-group--span-${Math.min(remaining.length,4)}`} ref={groupRef} aria-label={`Sản phẩm của lịch ${event.name}`}>
   <div className="delivery-event-products">{remaining.map(product=>{
     const meta=products.find(row=>row.id===product.id);
     return <DeliveryProductCard key={product.id} event={event} product={product} user={user} info={meta} onRefreshR2={()=>setR2Refresh(n=>n+1)} onComplete={()=>setHiddenProducts(previous=>[...previous,product.id])}/>;
   })}</div>
   {busy&&<p className="delivery-event-loading">Đang nhận diện sản phẩm trên Drive…</p>}
   {error&&<p role="alert" className="delivery-event-loading">{error}</p>}
 </section>;
}
function DeliveryProductCard({event,product,user,info,onRefreshR2,onComplete}:{event:StudioEvent;product:StudioEvent['products'][number];user:User;info?:ProductMediaSummary;onRefreshR2:()=>void;onComplete:()=>void}){
 const [completing,setCompleting]=useState(false),[message,setMessage]=useState('');
 const [copied,setCopied]=useState(false);
 const isVideo=info?.kind==='video'||info?.kind==='mixed'||product.mediaType==='video';
 const isPhoto=info?.kind==='image'||info?.kind==='mixed'||(!info&&product.mediaType==='image');
 const complete=async()=>{
  if(completing)return;setCompleting(true);setMessage('');
  try{
   const run=async(force=false)=>fetch(`/api/delivery/${encodeURIComponent(event.id)}/status`,{method:'PATCH',cache:'no-store',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken(force)}`},body:JSON.stringify({completed:true,productId:product.id})});
   let response=await run();if(response.status===401)response=await run(true);
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Không thể hoàn thành sản phẩm');
   onComplete();
  }catch(e){setMessage(e instanceof Error?e.message:'Không thể hoàn thành');}
  finally{setCompleting(false);}
 };
 const copyNames=async()=>{try{await navigator.clipboard.writeText((info?.selectedNames||[]).join('\n'));setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setMessage('Trình duyệt chặn sao chép');}};
 return <article className="delivery-card" aria-label={`Bàn giao sản phẩm ${product.name}`}>
   <div className="delivery-art"><AdminThumbnail eventId={event.id} user={user} cover={info?.cover}/>
     <div className="delivery-art-meta delivery-art-meta--single"><span>{isVideo?'VIDEO DELIVERY':isPhoto?'PHOTO DELIVERY':'STUDIO DELIVERY'}</span></div>
   </div>
   <div className="delivery-details"><div className="delivery-date"><CalendarDays size={13}/>{dateDisplay(event.date)} · {event.eventType}</div>
     <h3>{product.name}</h3><p className="delivery-project-owner">Lịch: {event.name}</p>
     {isPhoto&&<div className="delivery-product-action-row"><span>Khách đã chọn <b>{info?.selectedNames.length||0} ảnh</b></span><button type="button" className="secondary-button small" disabled={!info?.selectedNames.length} onClick={()=>void copyNames()}><Copy size={14}/>{copied?'Đã copy':'Copy tên ảnh'}</button></div>}
     {isVideo&&<div className="delivery-product-action-row delivery-product-video-action">
       <DeliveryReviewManager eventId={event.id} productId={product.id} user={user}/>
       <button type="button" onClick={onRefreshR2}
         className={`amorri-r2-mini amorri-r2-mini--${info?.r2?.state||'checking'}`}
         title={`${info?.r2?.message||'Đang kiểm tra trạng thái R2'} — bấm để kiểm tra lại`}
         aria-label={`R2: ${info?.r2?.state==='ready'?'Đã sẵn sàng':info?.r2?.message||'Đang kiểm tra'}; bấm để làm mới`}>
         R2 {info?.r2?.state==='ready'?<BadgeCheck size={14} aria-hidden="true"/>:
           info?.r2?.state==='pending'?<Clock3 size={13} aria-hidden="true"/>:
           <RefreshCw size={13} aria-hidden="true"/>}
       </button>
     </div>}
     {!info&&<div className="delivery-product-action-row">Đang xác định loại sản phẩm…</div>}
     {info?.warning&&<div className="delivery-product-warning">Không đọc được file Drive. {info.warning}</div>}
     <div className="delivery-card-actions"><DeliveryGrantManager eventId={event.id} productId={product.id} user={user}/>
     <button type="button" disabled={completing} className="secondary-button small" onClick={()=>void complete()}><BadgeCheck size={15}/>{completing?'Đang xử lý…':'Hoàn thành'}</button></div>
     {message&&<div role="alert" className="delivery-share-toast">{message}</div>}
   </div>
 </article>;
}

export function Dashboard(){
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
  const [access,setAccess]=useState<AccessRole|null>(null),[accessError,setAccessError]=useState('');
  const [authError,setAuthError]=useState(''),[logging,setLogging]=useState(false);
  const [deliverySearch,setDeliverySearch]=useState('');
  const [month,setMonth]=useState(monthNow),[tab,setTab]=useState<Tab>('overview');
  const [systemSection,setSystemSection]=useState<SystemSection>('health');
  const [driveRefresh,setDriveRefresh]=useState(0);
  const [data,setData]=useState<DashboardData|null>(null),[loading,setLoading]=useState(false);
  const [lastSynced,setLastSynced]=useState<string|null>(null);
  const [requestError,setRequestError]=useState(''),[search,setSearch]=useState('');
  const [menuOpen,setMenuOpen]=useState(false),[selected,setSelected]=useState<string|null>(null);
  const [reload,setReload]=useState(0);
  const [newBookingOpen,setNewBookingOpen]=useState(false);
  const [newBookingDate,setNewBookingDate]=useState('');
  const createBooking=(date='')=>{setNewBookingDate(date);setNewBookingOpen(true);};
  const [editEventId,setEditEventId]=useState<string|null>(null);

  useEffect(()=>{
    try {
      const unsub=onAuthStateChanged(browserAuth(), u=>{setUser(u);setReady(true);},()=>{setReady(true);setAuthError('Firebase Auth chưa được kết nối.');});
      return ()=>unsub();
    } catch(error) {
      setReady(true);setAuthError(error instanceof Error?error.message:'Thiếu cấu hình Firebase');
    }
  },[]);
  useEffect(()=>{
   if(!user){setAccess(null);setAccessError('');return;}
   let alive=true;setAccess(null);setAccessError('');
   void (async()=>{try{const token=await user.getIdToken();const response=await fetch('/api/access/me',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const payload=await response.json();
    if(!response.ok)throw Error(payload.error||'Không thể kiểm tra quyền truy cập');
    if(alive)setAccess(payload.role as AccessRole);
   }catch(e){if(alive)setAccessError(e instanceof Error?e.message:'Không thể tải quyền nhân viên');}})();
   return()=>{alive=false;};
  },[user]);
  const canAdmin=access==='admin';
  const login=async (email:string,password:string)=>{setLogging(true);setAuthError('');try {await signInWithEmailAndPassword(browserAuth(),email,password);}catch{setAuthError('Đăng nhập không thành công. Kiểm tra email, mật khẩu và quyền Firebase.');}finally{setLogging(false);}};
  const load=useCallback(async (signal:AbortSignal)=>{
    if(!user || !['admin','receptionist'].includes(access||'')){setData(null);return;}
    setLoading(true);setRequestError('');
    // A previous month's data must never be displayed under a new month heading.
    setData(previous=>previous?.month===month?previous:null);
    try {
      const fetchWithToken=async (forceRefresh=false)=>{
        const token=await user.getIdToken(forceRefresh);
        return fetch(`/api/dashboard?month=${encodeURIComponent(month)}`,{headers:{Authorization:`Bearer ${token}`},signal,cache:'no-store'});
      };
      let resp=await fetchWithToken();
      // Retry once with a freshly issued Firebase ID token. Never retry 403/503 automatically.
      if(resp.status===401 && !signal.aborted)resp=await fetchWithToken(true);
      const value=await resp.json();
      if(!resp.ok) {
        if(resp.status===401 && !value.code && value.error==='Không thể xác thực. Kiểm tra phiên đăng nhập/cấu hình Firebase.') {
          throw new Error('API đang dùng bản Beta 2 cũ. Cập nhật mã nguồn Auth Fix và redeploy Production; kiểm tra /api/health có release staff-scheduling-20261013-r1.');
        }
        throw new Error(`${value.error||`HTTP ${resp.status}`}${value.code?` [${value.code}]`:''}${value.requestId?` · Mã tra cứu ${value.requestId}`:''}`);
      }
      if(!signal.aborted){setData(value as DashboardData);setLastSynced(new Date().toISOString());}
    }catch(error){
      if(!signal.aborted){setData(previous=>previous?.month===month?previous:null);setRequestError(error instanceof Error?error.message:'Không tải được dữ liệu');}
    }finally{if(!signal.aborted)setLoading(false);}
  },[user,month,access]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return ()=>controller.abort();},[load,reload]);
  useEffect(()=>{if(!user)return;const interval=setInterval(()=>setReload(x=>x+1),60_000);return()=>clearInterval(interval);},[user]);

  const filtered=useMemo(()=> (data ? monthEvents(data.events,data.month).filter(e=>[e.name,e.location,e.eventType,...e.assignments.map(a=>data.staff.find(s=>s.id===a.id)?.name||'')].join(' ').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))) : []),[data,search]);
  const deliveryEvents=useMemo(()=>{
    if(!data)return [];
    const term=deliverySearch.trim().toLocaleLowerCase('vi');
    return monthEvents(data.events,data.month).filter(event=>
      event.products.length>0 && !event.deliveryCompleted &&
      event.products.some(product=>!event.completedProductIds?.includes(product.id)) &&
      (!term || [event.name,event.date,event.eventType,event.location,...event.products.map(product=>product.name)]
        .join(' ').toLocaleLowerCase('vi').includes(term)));
  },[data,deliverySearch]);
  const stats=data?getMonthStats(data.events,data.month):null;
  const nextEvents=useMemo(()=>filtered.filter(e=>e.date>=localToday()&&e.status!=='cancelled').slice(0,6),[filtered]);
  const availablePages=pages.filter(p=>canAdmin||!['payroll','analytics','system','accounts'].includes(p.key));
  const title=pages.find(p=>p.key===tab);
  const goTab=(next:Tab)=>{if(!canAdmin&&['payroll','analytics','system','accounts'].includes(next))return;setTab(next);setSelected(null);setMenuOpen(false);};
  const currentEvent=selected?data?.events.find(e=>e.id===selected):null;

  if(!ready)return <div className="boot-screen"><Image className="elia-brand-boot" src="/logo.png" alt="Élia Marier" width={2048} height={2452} priority unoptimized /><p>Đang kết nối Élia Marier…</p></div>;
  if(!user)return <Login onLogin={login} error={authError} loading={logging}/>;
  if(accessError)return <div className="boot-screen"><p role="alert">{accessError}</p><button className="secondary-button" onClick={()=>void signOut(browserAuth())}>Đăng xuất</button></div>;
  if(access===null)return <div className="boot-screen"><p>Đang kiểm tra quyền tài khoản…</p></div>;
  if(!['admin','receptionist'].includes(access))return <div className="boot-screen"><p>Không có quyền truy cập hệ thống. Liên hệ quản trị viên.</p><button className="secondary-button" onClick={()=>void signOut(browserAuth())}>Đăng xuất</button></div>;

  return <div className="shell">
    {menuOpen&&<button className="mobile-dimmer" aria-label="Đóng menu" onClick={()=>setMenuOpen(false)}/>}
    <aside className={`sidebar ${menuOpen?'sidebar-visible':''}`}>
      <div className="brand elia-brand-refined"><EliaBrandMini variant="sidebar" /><button onClick={()=>setMenuOpen(false)} className="sidebar-close" aria-label="Đóng menu"><X size={19}/></button></div>
      <nav aria-label="Điều hướng chính" className="nav-items">{([
        {heading:"ĐIỀU HÀNH",keys:["overview","calendar","wedding","delivery"]},
        {heading:"QUẢN TRỊ",keys:["staff","payroll","analytics","system","accounts"]}
      ] as const).map(group=><div className="elia-nav-group" key={group.heading}>
        <div className="elia-nav-caption">{group.heading}</div>
        {availablePages.filter(p=>(group.keys as readonly string[]).includes(p.key)).map(p=>{
          const Icon=p.icon;return <button key={p.key} onClick={()=>goTab(p.key)} className={`nav-item ${tab===p.key?'nav-active':''}`} aria-current={tab===p.key?'page':undefined}><Icon size={19}/><span>{p.name}</span>{tab===p.key&&<i/>}</button>;
        })}
      </div>)}</nav>
      <div className="sidebar-bottom">
        <div className="user-identity"><EliaBrandMini variant="profile" /><div className="user-meta"><strong>{user.email?.split('@')[0]||'Admin'}</strong><span>{canAdmin?'Quản trị viên':'Lễ tân'}</span></div><button title="Đăng xuất" onClick={async()=>{await signOut(browserAuth());if('caches' in window)void caches.delete(THUMB_CACHE_NAME);}}><LogOut size={19}/></button></div>
      </div>
    </aside>
    <main className="content">
      <header className="topbar"><div className="topbar-left"><button aria-label="Mở menu" className="menu-toggle" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button><div className="breadcrumb">ÉLIA MARIER <span>/</span> {title?.name.toUpperCase()}</div></div><div className="topbar-right"><span className="elia-build-label" title="Élia Marier UI/UX phiên bản 3">UI 4.0</span><span className="live-dot"/><span className="topbar-time">{lastSynced?`Đồng bộ ${new Date(lastSynced).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}`:'Chưa đồng bộ'}</span><button aria-label="Tải lại" title="Làm mới" onClick={()=>setReload(x=>x+1)} className="top-icon"><RefreshCw size={18} className={loading?'spin':''}/></button><EliaBrandMini variant="topbar" /></div></header>
      <div className="content-inner">
        <div className="page-heading ops29-page-heading"><div><div className="eyebrow">ÉLIA MARIER · STUDIO WORKSPACE</div><h1>{title?.name}</h1><p>{title?.sub}{tab!=='system'?` · Tháng ${month.slice(5)}/${month.slice(0,4)}`:' · Chỉ tài khoản Admin'}</p></div><div className="heading-actions">{tab!=='system'&&tab!=='wedding'&&<><button className="secondary-button" onClick={()=>setReload(x=>x+1)} disabled={loading}><RefreshCw size={16} className={loading?'spin':''}/> Đồng bộ</button><button className="primary-button" onClick={()=>createBooking()}><Plus size={18}/> Tạo lịch mới</button></>}</div></div>
        
        {requestError&&tab!=='system'&&tab!=='wedding'&&<div className="alert error"><ShieldCheck size={18}/><div><strong>Không tải được dữ liệu quản trị</strong><p>{requestError}</p>{data?.month===month&&<p>Đang hiển thị dữ liệu tải thành công gần nhất của tháng này; hãy thử Đồng bộ lại.</p>}<button type="button" className="secondary-button" onClick={()=>{setSystemSection('health');goTab('system');}}><Settings2 size={15}/> Mở Hệ thống</button></div></div>}
        {data?.eventLimitReached&&<div className="alert notice">Dữ liệu tháng vượt giới hạn truy vấn 1001 bản ghi. Cần phân trang và index Firebase trước khi dùng báo cáo.</div>}
        {canAdmin&&tab==='system'&&<section className="ops30-system-panel">
          <div className="ops30-system-tabs" role="group" aria-label="Chức năng hệ thống">
            <button type="button" className={systemSection==='health'?'active':''} onClick={()=>setSystemSection('health')}><ShieldCheck size={16}/> Sức khỏe</button>
            <button type="button" className={systemSection==='activity'?'active':''} onClick={()=>setSystemSection('activity')}><Activity size={16}/> Hoạt động</button>
            <button type="button" className={systemSection==='data'?'active':''} onClick={()=>setSystemSection('data')}><Settings2 size={16}/> Kiểm tra dữ liệu</button>
            <button type="button" className={systemSection==='wardrobe'?'active':''} onClick={()=>setSystemSection('wardrobe')}><Shirt size={16}/> Kho trang phục</button>
          </div>
          {systemSection==='health'&&<SystemHealth user={user}/>}
          {systemSection==='wardrobe'&&<WeddingCatalogManager user={user}/>}
          {systemSection==='data'&&<MigrationReadiness embedded/>}
          {systemSection==='activity'&&<section className="surface"><div className="surface-title"><h3>Nhật ký hoạt động gần đây</h3></div>{data?.audit.length?<div className="activity-list">{data.audit.map((a,i)=><div key={a.id||i} className="activity-item"><div className="activity-symbol"><Activity size={17}/></div><div><strong>{a.message||a.action||'Hoạt động'}</strong><p>{a.action} · {a.createdAt?new Date(a.createdAt<1e12?a.createdAt*1000:a.createdAt).toLocaleString('vi-VN'):'Chưa xác định'}</p></div></div>)}</div>:<Empty title="Chưa có nhật ký" detail="Nếu Dashboard chưa tải được, hãy mở Sức khỏe để chẩn đoán Firebase."/>}</section>}
        </section>}
        {!data && loading && tab!=='system' && tab!=='wedding' && <div className="loading-state"><RefreshCw size={24} className="spin"/> Đang tải dữ liệu Firebase…</div>}
        {tab==='wedding'&&<WeddingWardrobe user={user}/>}
        {data && tab!=='system' && tab!=='wedding' && <>
          {tab==='overview'&&<>

            <div className="elia-workspace-section-title"><div><h2>Tình hình studio</h2><p>Số liệu và công việc cần xử lý trong tháng</p></div></div>
            <div className="metrics-grid">
              {[
                {label:'Tổng số lịch',value:stats?.total||0,hint:'Trong tháng được chọn',icon:CalendarDays,kind:'purple'},
                {label:'Lịch đã chốt',value:stats?.confirmed||0,hint:'Sẵn sàng triển khai',icon:BadgeCheck,kind:'blue'},
                {label:'Chờ xác nhận',value:stats?.pending||0,hint:'Cần theo dõi',icon:Clock3,kind:'orange'},
                {label:'Chưa thanh toán đủ',value:stats?.unpaid||0,hint:'Theo giá trị booking',icon:CircleDollarSign,kind:'green'}
              ].map(c=>{const Icon=c.icon;return <div className="metric" key={c.label}><div className={`metric-icon ${c.kind}`}><Icon size={19}/></div><span>{c.label}</span><strong>{c.value.toString().padStart(2,'0')}</strong><small>{c.hint}</small></div>;})}
            </div>
            <OperationsHub data={data} today={localToday()} onOpenEvent={setSelected} onNavigate={goTab}/>
            <div className="dashboard-two"><section className="surface"><div className="surface-title"><div><span className="eyebrow">SẮP DIỄN RA</span><h3>Lịch làm việc tiếp theo</h3></div><button onClick={()=>goTab('calendar')} className="text-action">Xem tất cả <ArrowRight size={16}/></button></div>
              {nextEvents.length?<div className="upcoming-items">{nextEvents.map(e=><button className="upcoming-row" onClick={()=>setSelected(e.id)} key={e.id}><div className="upcoming-date"><b>{e.date.slice(-2)}</b><span>TH {Number(e.date.slice(5,7))}</span></div><div className="upcoming-info"><strong>{e.name}</strong><span>{e.start||'--:--'} · {e.eventType||'Khác'}</span></div><Status status={e.status}/><ChevronRight size={17}/></button>)}</div>:<Empty title="Chưa có lịch sắp tới" detail="Các sự kiện sắp diễn ra trong tháng sẽ xuất hiện tại đây."/>}</section>
              <section className="surface"><div className="surface-title"><div><span className="eyebrow">THÁNG NÀY</span><h3>Tổng hợp trạng thái</h3></div><button className="month-navigator" onClick={()=>setMonth(shiftMonth(month,-1))} title="Tháng trước"><ChevronLeft size={16}/></button><span className="month-chip">{month.slice(5)}/{month.slice(0,4)}</span><button className="month-navigator" onClick={()=>setMonth(shiftMonth(month,1))} title="Tháng sau"><ChevronRight size={16}/></button></div>
                <div className="status-breakdown">{[
                  ['Đã chốt',stats?.confirmed||0,'var(--blue)'],['Chờ xác nhận',stats?.pending||0,'var(--amber)'],['Hoàn thành',stats?.done||0,'var(--green)']
                ].map(([name,count,color])=><div className="breakdown-row" key={String(name)}><div className="breakdown-copy"><span>{name}</span><strong>{count}</strong></div><div className="progress-track"><div style={{width:`${stats?.total?Number(count)/stats.total*100:0}%`,background:String(color)}}/></div></div>)}<div className="breakdown-foot"><span>Nhân sự hoạt động</span><strong>{data.staff.length} thành viên</strong></div></div>
              </section></div>
            <section className="surface"><div className="surface-title"><div><span className="eyebrow">DANH SÁCH LỊCH HẸN</span><h3>Danh sách lịch trong tháng</h3></div><button onClick={()=>goTab('calendar')} className="text-action">Xem lịch tháng <ArrowRight size={16}/></button></div><EventTable events={filtered} staff={data.staff} compact onSelect={setSelected}/></section>
          </>}
          {tab==='calendar'&&<><div className="toolbar"><div className="search-input"><Search size={17}/><input placeholder="Tìm tên khách, loại dịch vụ, nhân sự..." value={search} onChange={e=>setSearch(e.target.value)} aria-label="Tìm kiếm lịch"/></div><div className="toolbar-right"><button className="month-navigator" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft size={18}/></button><strong className="month-title">Tháng {month.slice(5)}/{month.slice(0,4)}</strong><button className="month-navigator" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight size={18}/></button></div></div><CalendarPlanner data={data} filter={search} onSelect={setSelected} onCreate={createBooking}/><section className="surface"><div className="surface-title"><h3>Danh sách đặt lịch <span className="counter">{filtered.length}</span></h3><span className="text-xs text-slate-500">Chọn một lịch để chỉnh sửa trên web chính</span></div><EventTable events={filtered} staff={data.staff} onSelect={setSelected}/></section></>}
          {tab==='staff'&&(canAdmin?<StaffManager user={user} month={month} onChanged={()=>setReload(x=>x+1)}/>:<section className="surface"><div className="surface-title"><h3>Danh sách nhân sự quay chụp</h3></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Họ tên</th><th>Vị trí</th><th>Trạng thái</th></tr></thead><tbody>{data.staff.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.role}</td><td>{s.active!==false?'Đang làm':'Ngưng hoạt động'}</td></tr>)}</tbody></table></div></section>)}
          {canAdmin&&tab==='payroll'&&<PayrollManager month={month} user={user}/>}
          {tab==='delivery'&&<>
            <div className="delivery-browser-toolbar"><label className="search-input"><Search size={17}/><input aria-label="Tìm lịch hoặc sản phẩm bàn giao" placeholder="Tìm theo tên lịch, khách hàng hoặc sản phẩm..." value={deliverySearch} onChange={e=>setDeliverySearch(e.target.value)}/></label><button type="button" className="secondary-button" onClick={()=>{if(typeof window!=='undefined'&&'caches' in window)void caches.delete(THUMB_CACHE_NAME);setDriveRefresh(n=>n+1);}}><RefreshCw size={15}/> Làm mới Drive</button><span className="delivery-browser-hint">Metadata Drive được lưu đệm 15 phút</span></div>
            <div className="delivery-grid">{deliveryEvents.map(event=><DeliveryProductGroup key={`${event.id}:${driveRefresh}`} event={event} user={user} refresh={driveRefresh>0}/>)}</div>
            {!deliveryEvents.length&&<Empty title={deliverySearch?'Không tìm thấy sản phẩm phù hợp':'Không có bộ bàn giao đang mở'} detail="Các bộ đã hoàn thành vẫn có thể xem lại từ Quản lý lịch."/>}
          </>}
          {canAdmin&&tab==='analytics'&&<StudioAnalytics data={data} today={localToday()}/>}
        </>}
        {canAdmin&&tab==='accounts'&&<OfficeAccountsManager user={user}/>}
      </div><footer className="footer">ÉLIA MARIER · STUDIO WORKSPACE <span>ÉLIA MARIER · {new Date().getFullYear()}</span></footer>
    </main>
    <NewBookingDialog isAdmin={canAdmin} open={newBookingOpen} initialDate={newBookingDate} onClose={()=>setNewBookingOpen(false)} onCreated={()=>{setReload(x=>x+1);setTab('calendar');}} user={user} staff={data?.staff||[]}/>
    <EventEditor isAdmin={canAdmin} id={editEventId} staff={data?.staff||[]} user={user} onClose={()=>setEditEventId(null)} onDataUpdated={()=>setReload(v=>v+1)} onChanged={(date)=>{setEditEventId(null);setSelected(null);if(date && date.slice(0,7)!==month)setMonth(date.slice(0,7));setReload(v=>v+1);}}/>
    {currentEvent&&<BookingDetailPanel isAdmin={canAdmin} event={currentEvent} user={user} staff={data?.staff||[]} onClose={()=>setSelected(null)} onEdit={()=>{setEditEventId(currentEvent.id);setSelected(null);}}/>}
  </div>;
}
