/** Operational records kept separate from the photo-shoot bookings and wardrobe rental ledger. */
export type EliaModule='decor'|'makeup'|'packages';
export const MODULES:EliaModule[]=['decor','makeup','packages'];
export type ModuleRecord={id:string;createdAt:number;updatedAt:number;createdBy:string;photos?:string[];[key:string]:unknown};
export type ModuleFailure={error:string;status:number};
const date=/^\d{4}-\d{2}-\d{2}$/,time=/^([01]\d|2[0-3]):[0-5]\d$/;
export const serviceLabels:Record<string,string>={photo:'Quay / Chụp',wardrobe:'Trang phục',makeup:'Makeup',decor:'Decor'};
const clean=(v:unknown,n=250)=>typeof v==='string'?v.trim().slice(0,n):'';
const money=(v:unknown)=>Number.isSafeInteger(Number(v))&&Number(v)>=0&&Number(v)<=1e12?Number(v):NaN;
const validDate=(d:string)=>date.test(d)&&!Number.isNaN(Date.parse(`${d}T00:00:00Z`))&&new Date(`${d}T00:00:00Z`).toISOString().slice(0,10)===d;
function field(v:unknown,name:string,n=250){if(typeof v!=='string'||v.length>n)throw new Error(`Thông tin ${name} không hợp lệ`);return clean(v,n);}
function day(v:unknown,name:string,required=true){const s=field(v,name,10);if(required||s){if(!validDate(s))throw Error(`Ngày ${name} không hợp lệ`);}return s;}
function clock(v:unknown,name:string,required=false){const s=field(v,name,5);if((required||s)&&!time.test(s))throw Error(`Giờ ${name} không hợp lệ`);return s;}
function amount(v:unknown,name:string){const n=money(v);if(!Number.isFinite(n))throw Error(`Tiền ${name} không hợp lệ`);return n;}
function textFields(v:Record<string,unknown>,names:readonly string[],limit=250){return Object.fromEntries(names.map(k=>[k,field(v[k]??'',k,limit)]));}
export function validateModule(module:EliaModule,raw:unknown):Record<string,unknown>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Dữ liệu không hợp lệ');
 const v=raw as Record<string,unknown>;
 if(module==='decor'){
  const obj={...textFields(v,['brideName','groomName','brideAddress','groomAddress','bridePhone','groomPhone','contactPhone'],500),notes:field(v.notes??'','ghi chú',1500),partyDate:day(v.partyDate,'tiệc'),installDate:day(v.installDate,'thực hiện decor'),pickupDate:day(v.pickupDate,'thu hồi decor'),price:amount(v.price,'chi phí'),deposit:amount(v.deposit,'cọc')};
  if(obj.installDate>obj.pickupDate||obj.deposit>obj.price)throw Error('Ngày thu hồi phải sau ngày thực hiện, cọc không vượt tổng chi phí');
  if(!clean(v.brideName)&&!clean(v.groomName))throw Error('Cần tên dâu hoặc rể');
  return {...obj,balance:obj.price-obj.deposit};
 }
 if(module==='makeup'){
  const obj={customerName:field(v.customerName??'','tên khách',150),phone:field(v.phone??'','số liên hệ',40),makeupDate:day(v.makeupDate,'makeup'),makeupTime:clock(v.makeupTime,'makeup',true),layout:field(v.layout??'','layout',500),notes:field(v.notes??'','ghi chú',1500)};
  if(obj.customerName.length<2)throw Error('Tên khách cần ít nhất 2 ký tự');return obj;
 }
 const obj={...textFields(v,['brideName','groomName','bridePhone','groomPhone','contactPhone','brideAddress','groomAddress'],500),notes:field(v.notes??'','ghi chú',1500)};
 if(!clean(v.brideName)&&!clean(v.groomName))throw Error('Cần thông tin dâu hoặc rể');
 if(!v.services||typeof v.services!=='object'||Array.isArray(v.services))throw Error('Hãy chọn ít nhất một dịch vụ');
 const entries=Object.entries(v.services as Record<string,unknown>);
 if(!entries.length||entries.length>4||entries.some(([key])=>!serviceLabels[key]))throw Error('Dịch vụ không hợp lệ');
 const services:Record<string,unknown>={};
 for(const [key,rawService] of entries){
  if(!rawService||typeof rawService!=='object'||Array.isArray(rawService))throw Error('Chi tiết dịch vụ không hợp lệ');
  const row=rawService as Record<string,unknown>;
  const detail={date:day(row.date,key),time:clock(row.time,key),endDate:day(row.endDate,key,false),endTime:clock(row.endTime,key,false),location:field(row.location??'','địa điểm',500),notes:field(row.notes??'','ghi chú',500)};
  if(detail.endDate&&detail.endDate<detail.date)throw Error('Ngày kết thúc trước ngày bắt đầu');
  services[key]=detail;
 }
 return {...obj,services};
}
export function safeScheduleEdit(module:EliaModule,old:Record<string,unknown>,newData:Record<string,unknown>){
 const next=validateModule(module,{...old,...newData});
 const allowed=module==='decor'?['partyDate','installDate','pickupDate']:module==='makeup'?['makeupDate','makeupTime']:[];
 return allowed.length>0&&Object.entries(next).every(([key,value])=>allowed.includes(key)||JSON.stringify(value)===JSON.stringify(old[key]));
}
