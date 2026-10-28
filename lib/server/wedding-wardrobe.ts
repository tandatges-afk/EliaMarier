import {createHash,randomUUID} from 'node:crypto';
import {adminDatabase} from '@/lib/server/firebase-admin';
import type {WeddingItem,WeddingBooking} from '@/lib/domain/wedding-rental';
import {normalizeWeddingCode,validWeddingCode,isValidWeddingDate,validWeddingRange} from '@/lib/domain/wedding-rental';

const BASE='studioPlanner_v1/weddingWardrobe/items';
export const weddingItemsRef=()=>adminDatabase().ref(BASE);
export function weddingKey(code:string):string{
 const value=normalizeWeddingCode(code);
 if(!validWeddingCode(value))throw new WeddingFault(422,'Mã váy phải từ 2–36 ký tự, chỉ gồm chữ, số, khoảng trắng, dấu gạch hoặc chấm.','INVALID_CODE');
 return createHash('sha256').update(value).digest('hex');
}
export class WeddingFault extends Error{
 constructor(public status:number, message:string, public code:string){super(message);this.name='WeddingFault';}
}
export function publicWeddingError(err:unknown):{status:number;error:string;code:string}{
 if(err instanceof WeddingFault)return {status:err.status,error:err.message,code:err.code};
 console.error('[wedding-wardrobe] unexpected error',err instanceof Error?err.name:'unknown');
 return {status:503,error:'Không thể kết nối dữ liệu lịch váy cưới. Hãy thử lại.',code:'WARDROBE_UNAVAILABLE'};
}
export function asWeddingItem(raw:unknown):WeddingItem|null{
 if(!raw||typeof raw!=='object')return null;
 const a=raw as Partial<WeddingItem>;
 if(typeof a.id!=='string'||typeof a.code!=='string')return null;
 return {id:a.id,code:a.code,name:String(a.name||a.code),kind:a.kind==='outfit'?'outfit':'wedding_dress',active:a.active!==false,createdAt:Number(a.createdAt||0),createdBy:String(a.createdBy||''),bookings:(a.bookings && typeof a.bookings==='object')?a.bookings:{}};
}
export async function weddingAudit(actor:{uid:string;email?:string},action:string,itemId:string,detail:string){
 try {const id=randomUUID();await adminDatabase().ref('studioPlanner_v1/auditLogs').child(id).set({id,action,actionLabel:detail,category:'wedding-rental',severity:'info',actorId:actor.uid,actorName:actor.email||'Nhân viên',timestamp:Date.now(),targetType:'wedding-item',targetId:itemId,message:detail});}
 catch(e){console.error('[wedding-wardrobe] audit unavailable',e instanceof Error?e.name:'unknown');}
}
export function validateWeddingBookingInput(body:Record<string,unknown>){
 const customerName=String(body.customerName||'').trim(),customerPhone=String(body.customerPhone||'').trim();
 const startDate=String(body.startDate||''),endDate=String(body.endDate||''),notes=String(body.notes||'').trim();
 if(customerName.length<2||customerName.length>120)throw new WeddingFault(422,'Tên khách hàng từ 2 đến 120 ký tự.','INVALID_CUSTOMER');
 if(customerPhone.length>30|| (customerPhone && !/^[+\d() .-]{8,30}$/.test(customerPhone)))throw new WeddingFault(422,'Số điện thoại không hợp lệ.','INVALID_PHONE');
 if(!isValidWeddingDate(startDate)||!validWeddingRange(startDate,endDate))throw new WeddingFault(422,'Khoảng thuê không hợp lệ (tối đa 181 ngày, tính cả ngày đầu và ngày cuối).','INVALID_DATE_RANGE');
 if(notes.length>1000)throw new WeddingFault(422,'Ghi chú tối đa 1000 ký tự.','INVALID_NOTES');
 return {customerName,customerPhone,startDate,endDate,notes};
}
export function makeWeddingBooking(actor:{uid:string},itemId:string,data:ReturnType<typeof validateWeddingBookingInput>):WeddingBooking{
 const now=Date.now();return {...data,id:randomUUID(),itemId,status:'reserved',createdAt:now,createdBy:actor.uid,updatedAt:now,updatedBy:actor.uid};
}
