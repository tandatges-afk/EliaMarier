import {bookingVersion} from './event-storage';
import {localCasFetch} from './vps-cas-fetch';
import {conditionalBookingWrite,BookingCasError} from '../domain/booking-cas';
import {conditionalProductWrite,conditionalProductDelete,type ProductBaseline} from '../domain/product-cas';
import {readVpsPath,transactionVpsPath} from './vps-database';
export {BookingCasError} from '../domain/booking-cas';
export {ProductCasError} from '../domain/product-cas';
const target=(key:string)=>{
 if(!/^[A-Za-z0-9_-]{1,160}$/.test(key))throw new BookingCasError(503,'BOOKING_CAS_KEY','Khóa lịch không hợp lệ');
 return `http://elia-local-cas/studioPlanner_v1/events/${key}.json`;
};
export async function saveBookingConditional(input:{key:string;id:string;expectedVersion:string;changes:object;actorUid:string}){
 return conditionalBookingWrite({...input,url:target(input.key),token:'local',request:localCasFetch,versionOf:bookingVersion});
}
export async function saveProductConditional(input:{
 key:string;id:string;expectedVersion:string;productId:string;newId:string;
 name:string;url:string;mediaType:string;originalProduct?:ProductBaseline|null;actorUid:string;
}){
 return conditionalProductWrite({...input,driveUrl:input.url,url:target(input.key),token:'local',request:localCasFetch,versionOf:bookingVersion});
}
export async function deleteProductConditional(input:{key:string;id:string;expectedVersion:string;productId:string;originalProduct:ProductBaseline}){
 return conditionalProductDelete({...input,url:target(input.key),token:'local',request:localCasFetch,versionOf:bookingVersion});
}
export async function deleteBookingConditional(input:{key:string;id:string;expectedVersion:string}){
 target(input.key);
 const state:{outcome:'missing'|'conflict'|'ok'}={outcome:'missing'};
 await transactionVpsPath(`studioPlanner_v1/events/${input.key}`,previous=>{
  if(!previous || typeof previous!=='object'||String((previous as Record<string,unknown>).id)!==input.id){state.outcome='missing';return undefined;}
  if(bookingVersion(previous)!==input.expectedVersion){state.outcome='conflict';return undefined;}
  state.outcome='ok';return null;
 });
 if(state.outcome==='missing')throw new BookingCasError(404,'BOOKING_NOT_FOUND','Lịch không còn tồn tại.');
 if(state.outcome==='conflict')throw new BookingCasError(409,'BOOKING_CONFLICT','Lịch đã thay đổi. Vui lòng tải lại.');
}
