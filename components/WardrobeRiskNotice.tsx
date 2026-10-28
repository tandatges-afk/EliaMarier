'use client';
import {AlertTriangle,CalendarRange,ShieldCheck} from 'lucide-react';
import {weddingDateLabel} from '@/lib/domain/wedding-rental';
import {predictWardrobeUsage} from '@/lib/domain/wedding-advisory';
import type {WeddingItem} from '@/lib/domain/wedding-rental';

export function WardrobeRiskNotice({item,startDate,endDate,omitBookingId,compact=false}:{item:WeddingItem|null|undefined;startDate:string;endDate:string;omitBookingId?:string;compact?:boolean}){
 if(!item)return null;
 const forecast=predictWardrobeUsage(item.bookings,startDate,endDate,omitBookingId);
 if(!forecast.valid)return <p className="elia-risk-invalid">Hãy chọn ngày lấy và ngày trả hợp lệ để xem trước lịch.</p>;
 return <div className={`elia-risk ${compact?'elia-risk-compact':''}`} aria-live="polite">
  {forecast.conflicts.length>0&&<div className="elia-risk-blocked"><div className="elia-risk-title"><AlertTriangle size={17}/> Trùng lịch — không thể giữ mã {item.code}</div>
   {forecast.conflicts.map(b=><p key={b.id}><strong>{b.customerName||'Khách chưa ghi tên'}</strong> · {weddingDateLabel(b.startDate)} – {weddingDateLabel(b.endDate)}{b.customerPhone?` · ${b.customerPhone}`:''}</p>)}
  </div>}
  {forecast.nearby.length>0&&<div className="elia-risk-nearby"><div className="elia-risk-title"><CalendarRange size={17}/> Có lịch thuê sát ngày (±2 ngày) — cần chủ động chuẩn bị</div>
   <p className="elia-risk-intro">Khoảng kiểm tra: {weddingDateLabel(forecast.windowStart)} – {weddingDateLabel(forecast.windowEnd)}. Đây là cảnh báo để trao đổi giờ lấy/trả, không phải đặt trùng.</p>
   {forecast.nearby.map(b=><div className="elia-risk-entry" key={b.id}><div><strong>{b.customerName}</strong><span>{weddingDateLabel(b.startDate)} – {weddingDateLabel(b.endDate)}{b.customerPhone?` · ${b.customerPhone}`:''}</span></div><span className="elia-risk-day">{b.side==='before'?'Trước':'Sau'} {b.gapDays} ngày</span></div>)}
   <p className="elia-risk-tip">{forecast.nearby.some(b=>b.side==='after')?'Có khách thuê sau: nhắc khách hiện tại trả đúng hạn hoặc thỏa thuận trả sớm trước khi giao. ':''}{forecast.nearby.some(b=>b.side==='before')?'Có khách thuê trước: xác nhận ngày trả, thời gian vệ sinh và khả năng giao váy trước khi chốt.':''}</p>
  </div>}
  {forecast.nearby.length===0&&forecast.conflicts.length===0&&<div className="elia-risk-clear"><ShieldCheck size={15}/> Không có lịch khác trong vòng 2 ngày trước/sau theo dữ liệu hiện tại.</div>}
 </div>;
}
