/** Élia Marier wedding wardrobe. Dates are local calendar days in Vietnam, inclusive. */
export type WeddingRentalStatus = 'reserved' | 'picked_up' | 'returned' | 'cancelled';
export type WeddingBooking = {
  id: string;
  itemId: string;
  customerName: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
  status: WeddingRentalStatus;
  notes: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
};
export type WeddingItem = {
  id: string;
  code: string;
  name: string;
  kind: 'wedding_dress'|'outfit';
  active: boolean;
  createdAt: number;
  createdBy: string;
  bookings: Record<string,WeddingBooking>;
};
export const WEDDING_STATUSES:WeddingRentalStatus[]=['reserved','picked_up','returned','cancelled'];
const validCalendarDate=(s:string):boolean=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const [y,m,d]=s.split('-').map(Number);
 const date=new Date(Date.UTC(y,m-1,d));
 return y>=2000 && y<=2100 && date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
};
export const isValidWeddingDate=validCalendarDate;
export function normalizeWeddingCode(code:string):string{
 return code.trim().replace(/\s+/g,' ').toLocaleUpperCase('vi-VN');
}
export function validWeddingCode(code:string):boolean{
 return code.length>=2 && code.length<=36 && /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u.test(code);
}
export function validWeddingRange(start:string,end:string):boolean{
 if(!validCalendarDate(start)||!validCalendarDate(end)||start>end)return false;
 const days=(Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000;
 return days<=180;
}
export function weddingOverlaps(startA:string,endA:string,startB:string,endB:string):boolean{
 return startA<=endB && startB<=endA;
}
/** Returned rentals stay in their original historical date ranges; only cancellations release dates. */
export function weddingConflict(bookings:Record<string,WeddingBooking>|undefined,start:string,end:string,omitId?:string):WeddingBooking|null{
 for(const booking of Object.values(bookings||{})){
  if(booking.id===omitId||booking.status==='cancelled')continue;
  if(weddingOverlaps(start,end,booking.startDate,booking.endDate))return booking;
 }
 return null;
}
export const weddingDateLabel=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)?`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`:s;
