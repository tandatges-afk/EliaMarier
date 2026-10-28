import type {WeddingBooking,WeddingItem} from './wedding-rental';
import {validWeddingRange,weddingOverlaps} from './wedding-rental';

export const WARDROBE_BUFFER_DAYS=2;
export type WardrobeRiskSide='before'|'after';
export type WardrobeRisk={
  id:string;customerName:string;customerPhone:string;startDate:string;endDate:string;
  status:WeddingBooking['status'];side:WardrobeRiskSide;gapDays:number;eventId?:string;
};
export type WardrobePrediction={valid:boolean;conflicts:WeddingBooking[];nearby:WardrobeRisk[];windowStart:string;windowEnd:string};

/** Shift a YYYY-MM-DD calendar day using UTC; never use browser locale or DST. */
export function shiftWeddingDay(day:string,offset:number):string{
 if(!validWeddingRange(day,day))return '';
 const d=new Date(`${day}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);
 return d.toISOString().slice(0,10);
}
const dayDistance=(left:string,right:string)=>Math.round((Date.parse(`${right}T00:00:00Z`)-Date.parse(`${left}T00:00:00Z`))/86400000);
/**
 * An overlap blocks a reservation. Non-overlapping reservations within 2 calendar
 * days either side are advisory only; they do not silently extend the booking.
 * Cancelled reservations are ignored. omitting a booking supports edit preview.
 */
export function predictWardrobeUsage(bookings:WeddingItem['bookings']|undefined,startDate:string,endDate:string,omitId?:string):WardrobePrediction{
 if(!validWeddingRange(startDate,endDate))return {valid:false,conflicts:[],nearby:[],windowStart:'',windowEnd:''};
 const conflicts:WeddingBooking[]=[],nearby:WardrobeRisk[]=[];
 for(const b of Object.values(bookings||{})){
  if(!b||b.id===omitId||b.status==='cancelled')continue;
  if(weddingOverlaps(startDate,endDate,b.startDate,b.endDate)){
   conflicts.push(b);continue;
  }
  // A returned booking is historical and does not threaten nearby hand-offs.
  if(b.status==='returned')continue;
  const before=b.endDate<startDate;
  const gapDays=before?dayDistance(b.endDate,startDate):dayDistance(endDate,b.startDate);
  if(gapDays>=1&&gapDays<=WARDROBE_BUFFER_DAYS){
   nearby.push({id:b.id,customerName:b.customerName||'Khách chưa ghi tên',customerPhone:b.customerPhone||'',startDate:b.startDate,endDate:b.endDate,status:b.status,side:before?'before':'after',gapDays,eventId:b.eventId});
  }
 }
 conflicts.sort((a,b)=>a.startDate.localeCompare(b.startDate));
 nearby.sort((a,b)=>a.gapDays-b.gapDays||a.startDate.localeCompare(b.startDate));
 return {valid:true,conflicts,nearby,windowStart:shiftWeddingDay(startDate,-WARDROBE_BUFFER_DAYS),windowEnd:shiftWeddingDay(endDate,WARDROBE_BUFFER_DAYS)};
}
