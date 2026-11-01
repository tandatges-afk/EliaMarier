'use client';
import {useEffect,useState} from 'react';
import {CalendarDays,Phone,UserRound,X} from 'lucide-react';
import type {User} from '@/lib/auth/client';
import type {StudioEvent} from '@/lib/domain/types';
import {decorTypes,serviceLabels} from '@/lib/domain/elia-operations';

type AnyRow=Record<string,any>;
type Payload={customer:{name:string;phone:string;location:string};events:StudioEvent[];packages:AnyRow[];decor:AnyRow[];makeup:AnyRow[];wardrobe:AnyRow[]};
const money=(v:unknown)=>Number(v||0).toLocaleString('vi-VN')+' đ';
const getEntries=(section:unknown):AnyRow[]=>section&&typeof section==='object'&&Array.isArray((section as AnyRow).entries)?(section as AnyRow).entries:[];
const describeEntry=(key:string,entry:AnyRow)=>key==='photo'
 ? `${entry.type||'Quay chụp'} · ${entry.date||'—'} ${entry.start||''}–${entry.end||''}${entry.location?` · ${entry.location}`:''}`
 : key==='wardrobe'
 ? `Trang phục ${entry.itemCode||entry.itemId||''} · Lấy ${entry.startDate||'—'} · Trả ${entry.endDate||'—'}`
 : key==='makeup'
 ? `Makeup · ${entry.date||'—'} ${entry.time||''}${entry.notes?` · ${entry.notes}`:''}`
 : `${decorTypes[entry.type]||entry.type||'Decor'} · Thi công ${entry.installDate||'—'} · Tháo dỡ ${entry.removalDate||'—'}`;
function PackageDetails({pkg}:{pkg:AnyRow}){
 const services=Object.entries(pkg.services||{});
 return <div className="elia-v5-customer-row"><strong>{pkg.brideName||'Khách'}{pkg.groomName?` & ${pkg.groomName}`:''}</strong>
  <span>Điện thoại: {pkg.contactPhone||pkg.bridePhone||pkg.groomPhone||'—'}</span>
  <span>Nhà dâu: {pkg.brideAddress||'—'} · Nhà rể: {pkg.groomAddress||'—'}</span>
  <span>Trạng thái: {pkg.status==='cancelled'?'Đã hủy':pkg.status==='done'?'Hoàn thành':'Đã chốt'}</span>
  <span>Tổng chi phí: {money(pkg.price)} · Đã cọc: {money(pkg.deposit)} · Còn lại: {money(pkg.balance??Number(pkg.price||0)-Number(pkg.deposit||0))}</span>
  {services.flatMap(([key,value])=>{
    const list=getEntries(value);
    if(list.length)return list.map((item,i)=><span key={`${key}-${item.id||i}`}><CalendarDays size={13}/> {serviceLabels[key]||key}: {describeEntry(key,item)}</span>);
    // Older V5 records remain readable, but are not silently migrated on save.
    const old=value&&typeof value==='object'?value as AnyRow:{};
    return [<span key={key}>{serviceLabels[key]||key}: {String(old.date||'')} {String(old.time||'')} {String(old.location||'')}</span>];
  })}
  {pkg.notes&&<small>Ghi chú: {pkg.notes}</small>}
 </div>;
}
export function EliaCustomerProfile({user,eventId,onClose}:{user:User;eventId:string;onClose:()=>void}){
 const [data,setData]=useState<Payload|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();void (async()=>{try{const r=await fetch(`/api/customers/profile?eventId=${encodeURIComponent(eventId)}`,{signal:c.signal,headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Không đọc được hồ sơ');setData(d);}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Lỗi tải dữ liệu');}})();return()=>c.abort();},[eventId,user]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[onClose]);
 return <div className="elia-v5-modal-backdrop" role="presentation" onClick={onClose}><section className="elia-v5-customer-modal" role="dialog" aria-modal="true" aria-label="Hồ sơ khách hàng" onClick={e=>e.stopPropagation()}><header><div><span className="eyebrow">HỒ SƠ KHÁCH HÀNG</span><h2>{data?.customer.name||'Đang tải hồ sơ…'}</h2><small><Phone size={13}/> {data?.customer.phone||'Chưa có số điện thoại'}</small></div><button onClick={onClose} type="button" aria-label="Đóng"><X size={20}/></button></header>
 {error&&<p role="alert">{error}</p>}
 {data&&<div className="elia-v5-customer-body"><p><UserRound size={16}/> Địa điểm gần nhất: {data.customer.location||'Chưa nhập'}</p>
 <section><h3>Lịch quay/chụp ({data.events.length})</h3>{data.events.map(x=><div key={x.id} className="elia-v5-customer-row"><strong>{x.name}</strong><span>{x.date} · {x.start}–{x.end} · {x.eventType} · {x.status}</span><span>Địa điểm: {x.location||'Chưa nhập'}</span><span>Giá: {money(x.price)} · Cọc: {money(x.deposit)}</span>{x.products.length>0&&<span>Sản phẩm: {x.products.map(p=>p.name).join(', ')}</span>}{(x as StudioEvent&{note?:string}).note&&<span>Ghi chú: {(x as StudioEvent&{note?:string}).note}</span>}</div>)}</section>
 <section><h3>Gói dịch vụ ({data.packages.length})</h3>{data.packages.map(p=><PackageDetails key={p.id} pkg={p}/>)}</section>
 <section><h3>Decor ({data.decor.length}) · Makeup ({data.makeup.length}) · Trang phục ({data.wardrobe.length})</h3>
  {data.decor.map(p=><div className="elia-v5-customer-row" key={p.id}><strong>Decor · {p.brideName||p.groomName||'Khách'}</strong>{(Array.isArray(p.events)?p.events:[]).map((entry:AnyRow,i:number)=><span key={entry.id||i}>{decorTypes[entry.type]||entry.type}: Thi công {entry.installDate} → Tháo dỡ {entry.removalDate}</span>)}{!Array.isArray(p.events)&&<span>Thi công {p.installDate||'—'} → Tháo dỡ {p.removalDate||p.pickupDate||'—'}</span>}{!p.sourcePackageId&&<span>Chi phí: {money(p.price)} · Cọc: {money(p.deposit)}</span>}</div>)}
  {data.makeup.map(p=><div className="elia-v5-customer-row" key={p.id}>Makeup · {p.makeupDate} {p.makeupTime} · {p.layout||p.notes||'—'}</div>)}
  {data.wardrobe.map(p=><div className="elia-v5-customer-row" key={p.id}>Trang phục {p.itemCode} · {p.startDate} → {p.endDate} · {p.status}</div>)}
 </section><small>Đối chiếu theo số điện thoại; lịch cũ thiếu số điện thoại được ghép theo tên chính xác và có thể chưa đầy đủ.</small></div>}
 </section></div>;
}
