import type { EventStatus,Assignment } from './types';
import {isCombinedHouses,isTwoHousePhoto,photoVenueMode} from './elia-operations.ts';
import {validateEventChanges} from './event-management.ts';

export type BookingInput = {
  id: string;
  name: string;
  date: string;
  start: string;
  end: string;
  eventType: string;
  location: string;
  phone?: string;
  note?: string;
  photoServiceType?:string; brideName?:string; groomName?:string;
  brideRestaurant?:string;groomRestaurant?:string;
  status: EventStatus;
  price: number;
  deposit: number;
  assignments?:Assignment[];
  isRuocDau?:boolean;
  startTrai?:string;startGai?:string;locTrai?:string;locGai?:string;phoneTrai?:string;phoneGai?:string;
};
export type BookingValidation = { ok: true; value: BookingInput } | { ok: false; message: string };
const validId = /^[a-zA-Z0-9_-]{12,100}$/;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
function validDate(value: string) {
  const match = datePattern.exec(value);
  if (!match) return false;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return y >= 2020 && y <= 2100 && utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}
export function validateBooking(input: unknown): BookingValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {ok:false,message:'Dữ liệu lịch không hợp lệ'};
  const v = input as Record<string, unknown>;
  const string = (key:string,limit:number) => typeof v[key]==='string' ? (v[key] as string).trim().slice(0,limit) : '';
  const id=string('id',101), name=string('name',180), date=string('date',10), start=string('start',5), end=string('end',5);
  const photoServiceType=string('photoServiceType',80), brideName=string('brideName',150),groomName=string('groomName',150),brideRestaurant=string('brideRestaurant',500),groomRestaurant=string('groomRestaurant',500);
  const eventType=string('eventType',80), location=string('location',1500), phone=string('phone',50), note=string('note',1000), status=string('status',30);
  const price= v.price, deposit=v.deposit;
  if (!validId.test(id)) return {ok:false,message:'Mã lịch không hợp lệ'};
  if (!name || name.length < 2) return {ok:false,message:'Nhập tên dự án hoặc khách hàng (từ 2 ký tự)'};
  if (!validDate(date)) return {ok:false,message:'Ngày đặt lịch không hợp lệ'};
  if (!timePattern.test(start)||!timePattern.test(end)) return {ok:false,message:'Giờ bắt đầu và kết thúc phải có định dạng HH:mm'};
  if (!['confirmed','done','cancelled'].includes(status)) return {ok:false,message:'Trạng thái không hợp lệ'};
  if (typeof price !=='number' || !Number.isSafeInteger(price) || price < 0 || price > 1_000_000_000_000) return {ok:false,message:'Giá trị hợp đồng không hợp lệ'};
  if (typeof deposit !=='number' || !Number.isSafeInteger(deposit) || deposit < 0 || deposit > 1_000_000_000_000) return {ok:false,message:'Tiền cọc không hợp lệ'};
  if (deposit > price) return {ok:false,message:'Tiền cọc không được lớn hơn giá trị hợp đồng'};
  const assignmentInput=v.assignments??[];
  const checked=validateEventChanges({assignments:assignmentInput},{});
  if('message' in checked)return {ok:false,message:checked.message};
  const assignments=checked.value.assignments||[];
  if(v.isRuocDau!==undefined && typeof v.isRuocDau!=='boolean')return {ok:false,message:'Kiểu lịch rước dâu không hợp lệ'};
  const isRuocDau=v.isRuocDau===true;
  const startTrai=string('startTrai',5),startGai=string('startGai',5);
  const locTrai=string('locTrai',1500),locGai=string('locGai',1500);
  const phoneTrai=string('phoneTrai',50),phoneGai=string('phoneGai',50);
  if(isRuocDau&&(!timePattern.test(startTrai)||!timePattern.test(startGai)||!locTrai||!locGai))return {ok:false,message:'Lịch rước dâu cần giờ và địa điểm cho cả hai nhà'};
  if(photoServiceType&&isTwoHousePhoto(photoServiceType)&&(!brideName||!groomName||!phoneTrai||!phoneGai||!locTrai||!locGai))return {ok:false,message:'Lịch hai nhà cần đầy đủ thông tin cô dâu, chú rể, SĐT và địa chỉ hai nhà'};
  if(photoServiceType&&!isRuocDau&&photoVenueMode(photoServiceType)==='external'&&!location)return {ok:false,message:'Dịch vụ này cần địa điểm quay chụp'};
  if(groomRestaurant&&!groomName)return {ok:false,message:'Nhà hàng nhà trai cần thông tin chú rể'};
  if(isCombinedHouses(photoServiceType)&&assignments.some(a=>!['Nhà trai','Nhà gái'].includes(a.locType)))return {ok:false,message:'Vu quy + Đám nối: chọn nhà trai hoặc nhà gái cho từng thợ'};
  if(isRuocDau && (end<startTrai||end<startGai))return {ok:false,message:'Giờ kết thúc phải sau giờ bắt đầu tại cả hai nhà'};
  if(!isRuocDau&&['startTrai','startGai','locTrai','locGai','phoneTrai','phoneGai'].some(k=>v[k]))return {ok:false,message:'Trường hai nhà chỉ được dùng cho lịch rước dâu'};
  return {ok:true,value:{id,name,date,start,end,eventType:eventType||'Khác',photoServiceType,brideName,groomName,brideRestaurant,groomRestaurant,location,phone,note,status:status as EventStatus,price,deposit,assignments,isRuocDau,startTrai:startTrai||'',startGai:startGai||'',locTrai:locTrai||'',locGai:locGai||'',phoneTrai:phoneTrai||'',phoneGai:phoneGai||''}};
}
