/** Shared contracts for operational schedules, Firebase RTDB now and VPS later. */
export type EliaModule='decor'|'makeup'|'packages';
export const MODULES:EliaModule[]=['decor','makeup','packages'];
export type ModuleRecord={id:string;createdAt:number;updatedAt:number;createdBy:string;photos?:string[];[key:string]:unknown};
export const serviceLabels:Record<string,string>={photo:'Quay / Chụp',wardrobe:'Trang phục',makeup:'Makeup',decor:'Decor'};
export const decorTypes:Record<string,string>={dam_ngo:'Dạm ngõ',dam_noi:'Đám nối',vu_quy:'Vu quy',thanh_hon:'Thành hôn'};
export const photoTypes=['Chụp cổng','Dạm ngõ','Đám nối','Vu quy','Rước dâu','Xuất giá','Concept','Pre-wedding','Khác'] as const;
export const crewChoices:Record<string,string>={photo_traditional:'Chụp truyền thống',photo_reportage:'Chụp phóng sự',video_traditional:'Quay truyền thống',video_reportage:'Quay phóng sự'};
export const VALID_STATUSES=['confirmed','done','cancelled'] as const;
export type ModuleFailure={error:string;status:number};
const date=/^\d{4}-\d{2}-\d{2}$/,time=/^([01]\d|2[0-3]):[0-5]\d$/;
const clean=(v:unknown,n=250)=>typeof v==='string'?v.trim().slice(0,n):'';
function field(v:unknown,name:string,n=250){if(typeof v!=='string'||v.length>n)throw Error(`Thông tin ${name} không hợp lệ`);return clean(v,n);}
const validDate=(d:string)=>date.test(d)&&!Number.isNaN(Date.parse(`${d}T00:00:00Z`))&&new Date(`${d}T00:00:00Z`).toISOString().slice(0,10)===d;
const day=(v:unknown,name:string)=>{const s=field(v,name,10);if(!validDate(s))throw Error(`Ngày ${name} không hợp lệ`);return s;};
const clock=(v:unknown,name:string)=>{const s=field(v,name,5);if(!time.test(s))throw Error(`Giờ ${name} không hợp lệ`);return s;};
const textFields=<K extends string>(v:Record<string,unknown>,keys:readonly K[]):Record<K,string>=>Object.fromEntries(keys.map(k=>[k,field(v[k]??'',k,500)])) as Record<K,string>;
const money=(v:unknown,name:string)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>1_000_000_000_000)throw Error(`Tiền ${name} không hợp lệ`);return n;};
const entries=(v:unknown,name:string,max=40):Record<string,unknown>[]=>{
 if(!Array.isArray(v)||!v.length||v.length>max)throw Error(`${name}: cần 1–${max} mục`);
 return v.map((row,i)=>{if(!row||typeof row!=='object'||Array.isArray(row))throw Error(`${name} #${i+1} không hợp lệ`);return row as Record<string,unknown>;});
};
const stableId=(v:unknown)=>{const s=field(v,'mã mục',64);if(!/^[a-zA-Z0-9_-]{8,64}$/.test(s))throw Error('Mã mục dịch vụ không hợp lệ');return s;};
const unique=<T extends {id:string}>(items:T[]):T[]=>{if(new Set(items.map(v=>v.id)).size!==items.length)throw Error('Mã mục bị trùng');return items;};
function validateDecorEvents(input:unknown){
 return unique(entries(input,'Tiệc decor',12).map(row=>{
  const id=stableId(row.id),type=field(row.type,'loại tiệc',24);
  if(!decorTypes[type])throw Error('Vui lòng chọn loại tiệc Decor');
  const installDate=day(row.installDate,'thi công'),removalDate=day(row.removalDate,'tháo dỡ');
  if(removalDate<installDate)throw Error('Ngày tháo dỡ phải sau hoặc bằng ngày thi công');
  return {id,type,installDate,removalDate,notes:field(row.notes??'','ghi chú tiệc',1000)};
 }));
}
function validatePhotoEntries(input:unknown){
 return unique(entries(input,'Lịch quay chụp',30).map(row=>{
  const id=stableId(row.id),type=field(row.type,'gói chụp',80);
  if(!type||type.length>80)throw Error('Cần tên gói chụp');
  const date=day(row.date,'quay chụp'),start=clock(row.start,'bắt đầu'),end=clock(row.end,'kết thúc');
  if(end<start)throw Error('Giờ kết thúc phải sau giờ bắt đầu');
  const ruocDau=type.toLocaleLowerCase('vi').includes('rước dâu');
  const startTrai=ruocDau?clock(row.startTrai,'nhà trai'):'',startGai=ruocDau?clock(row.startGai,'nhà gái'):'';
  const locTrai=ruocDau?field(row.locTrai??'','địa điểm nhà trai',500):'',locGai=ruocDau?field(row.locGai??'','địa điểm nhà gái',500):'';
  if(ruocDau&&(!locTrai||!locGai||end<startTrai||end<startGai))throw Error('Rước dâu cần địa điểm và giờ hợp lệ cho cả hai nhà');
  const rawCrew=row.crew&&typeof row.crew==='object'&&!Array.isArray(row.crew)?row.crew as Record<string,unknown>:{};
  const crew=Object.fromEntries(Object.keys(crewChoices).map(k=>{const n=Number(rawCrew[k]??0);if(!Number.isSafeInteger(n)||n<0||n>20)throw Error('Số lượng thợ không hợp lệ');return [k,n];}));
  return {id,type,date,start,end,location:field(row.location??'','địa điểm',500),notes:field(row.notes??'','ghi chú',1000),startTrai,startGai,locTrai,locGai,phoneTrai:field(row.phoneTrai??'','số nhà trai',40),phoneGai:field(row.phoneGai??'','số nhà gái',40),crew};
 }));
}
function validateWardrobeEntries(input:unknown){
 return unique(entries(input,'Trang phục',30).map(row=>{
  const id=stableId(row.id),itemId=field(row.itemId,'mã trang phục',64);
  if(!/^[a-f0-9]{64}$/.test(itemId))throw Error('Hãy chọn trang phục từ kho');
  const startDate=day(row.startDate,'ngày lấy'),endDate=day(row.endDate,'ngày trả');
  if(endDate<startDate||Date.parse(endDate)-Date.parse(startDate)>180*86400000)throw Error('Khoảng thuê trang phục không hợp lệ');
  return {id,itemId,startDate,endDate,notes:field(row.notes??'','ghi chú trang phục',500),advisoryAcknowledged:row.advisoryAcknowledged===true};
 }));
}
function validateMakeupEntries(input:unknown){
 return unique(entries(input,'Makeup',30).map(row=>({id:stableId(row.id),date:day(row.date,'makeup'),time:clock(row.time,'makeup'),notes:field(row.notes??'','ghi chú makeup',1000)})));
}
export function validateModule(module:EliaModule,raw:unknown):Record<string,unknown>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Dữ liệu không hợp lệ');
 const v=raw as Record<string,unknown>;
 if(module==='decor'){
  const obj={...textFields(v,['brideName','groomName','brideAddress','groomAddress','bridePhone','groomPhone','contactPhone']),notes:field(v.notes??'','ghi chú',1500),price:money(v.price??0,'chi phí'),deposit:money(v.deposit??0,'cọc'),status:v.status==='done'||v.status==='cancelled'?v.status:'confirmed',events:validateDecorEvents(v.events)};
  if(obj.deposit>obj.price)throw Error('Cọc không vượt tổng chi phí');
  if(!obj.brideName&&!obj.groomName)throw Error('Cần tên dâu hoặc rể');
  if(obj.events.some(x=>x.type==='thanh_hon')&&!obj.groomName)throw Error('Tiệc Thành hôn cần tên chú rể');
  if(obj.events.some(x=>x.type!=='thanh_hon')&&!obj.brideName)throw Error('Tiệc nhà dâu cần tên cô dâu');
  return {...obj,balance:obj.price-obj.deposit};
 }
 if(module==='makeup'){
  const obj={customerName:field(v.customerName??'','tên khách',150),phone:field(v.phone??'','số liên hệ',40),makeupDate:day(v.makeupDate,'makeup'),makeupTime:clock(v.makeupTime,'makeup'),layout:field(v.layout??'','layout',500),notes:field(v.notes??'','ghi chú',1500),status:v.status==='done'||v.status==='cancelled'?v.status:'confirmed'};
  if(obj.customerName.length<2)throw Error('Tên khách cần ít nhất 2 ký tự');return obj;
 }
 const obj={...textFields(v,['brideName','groomName','bridePhone','groomPhone','contactPhone','brideAddress','groomAddress']),notes:field(v.notes??'','ghi chú',1500),price:money(v.price??0,'chi phí'),deposit:money(v.deposit??0,'cọc'),status:v.status==='done'||v.status==='cancelled'?v.status:'confirmed'};
 if(obj.deposit>obj.price)throw Error('Cọc không vượt tổng chi phí');
 if(!obj.brideName&&!obj.groomName)throw Error('Cần thông tin dâu hoặc rể');
 if(!v.services||typeof v.services!=='object'||Array.isArray(v.services))throw Error('Hãy chọn ít nhất một dịch vụ');
 const service=v.services as Record<string,unknown>,keys=Object.keys(service);
 if(!keys.length||keys.some(k=>!serviceLabels[k]))throw Error('Dịch vụ không hợp lệ');
 const services:Record<string,unknown>={};
 for(const key of keys){
  const section=service[key];if(!section||typeof section!=='object'||Array.isArray(section))throw Error('Thông tin dịch vụ không hợp lệ');
  const rows=(section as Record<string,unknown>).entries;
  services[key]={entries:key==='photo'?validatePhotoEntries(rows):key==='wardrobe'?validateWardrobeEntries(rows):key==='makeup'?validateMakeupEntries(rows):validateDecorEvents(rows)};
 }
 return {...obj,balance:obj.price-obj.deposit,services};
}
export function safeScheduleEdit(module:EliaModule,old:Record<string,unknown>,newData:Record<string,unknown>){
 if(module==='packages')return false;
 const next=validateModule(module,{...old,...newData});
 const current=validateModule(module,old);
 if(module==='makeup')return Object.entries(next).every(([k,v])=>['makeupDate','makeupTime'].includes(k)||JSON.stringify(v)===JSON.stringify(current[k]));
 const oldEvents=current.events,nextEvents=next.events;
 if(!Array.isArray(oldEvents)||!Array.isArray(nextEvents)||oldEvents.length!==nextEvents.length)return false;
 for(let index=0;index<oldEvents.length;index++){
  const before=oldEvents[index] as Record<string,unknown>,after=nextEvents[index] as Record<string,unknown>;
  if(before.id!==after.id||before.type!==after.type||before.notes!==after.notes)return false;
 }
 return Object.entries(next).every(([k,v])=>k==='events'||JSON.stringify(v)===JSON.stringify(current[k]));
}
