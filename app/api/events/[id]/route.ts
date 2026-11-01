import {withApiTrace} from '@/lib/server/trace';
import {hasActiveWeddingEventLinks} from '@/lib/server/wedding-wardrobe';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { adminDatabase, authenticatedAdmin, publicAuthFailure } from '@/lib/server/firebase-admin';
import { findBooking, bookingVersion, BookingStoreError } from '@/lib/server/event-storage';
import { saveBookingConditional, deleteBookingConditional, BookingCasError } from '@/lib/server/booking-cas';
import { validateEventChanges, requireVersion } from '@/lib/domain/event-management';
import { normaliseEvents } from '@/lib/domain/studio';
import { scheduleConflict, recordValues } from '@/lib/domain/scheduling';
import { withScheduleLock, dailyEvents, dailyBlackouts, ScheduleError } from '@/lib/server/staff-scheduling';
import {authenticatedOffice,safeOfficeEvent} from '@/lib/server/office-auth';
import {taskOptionsFor} from '@/lib/domain/staff-task';
import {moduleRef} from '@/lib/server/elia-operations';
import {isAdmin} from '@/lib/server/firebase-admin';
import { encryptBookingArchive, ArchiveConfigurationError } from '@/lib/server/booking-archive';
import type { DecodedIdToken } from 'firebase-admin/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};
const json=(payload:object,status=200)=>NextResponse.json(payload,{status,headers});
async function requireAdmin(request:Request):Promise<DecodedIdToken|Response>{
  try {const actor=await authenticatedOffice(request,['admin','sale','leader_photo']);return actor?.token||json({error:'Tài khoản không có quyền vận hành'},403);}
  catch(err){const failure=publicAuthFailure(err);return json({error:failure.error,code:failure.code},failure.status);}
}
function fail(err:unknown){
  if(err instanceof BookingCasError)return json({error:err.message,code:err.code},err.status);
  if(err instanceof BookingStoreError)return json({error:err.message,code:err.status===503?'BOOKING_READ_FAILED':'BOOKING_LOOKUP_FAILED'},err.status);
  if(err instanceof ScheduleError)return json({error:err.message,code:err.code},err.status);
  if(err instanceof ArchiveConfigurationError)return json({error:err.message,code:'ARCHIVE_CONFIG_MISSING'},503);
  const rawCode=String((err as {code?:unknown})?.code||'');
  const detail=err instanceof Error?err.message:'';
  // Never echo raw backend exception to browser (it can contain internal paths).
  const errorCode=/permission.denied/i.test(rawCode+' '+detail)?'DATABASE_PERMISSION_DENIED':
    /timeout|deadline|ETIMEDOUT/i.test(rawCode+' '+detail)?'DATABASE_TIMEOUT':
    /network|ECONN|UNAVAILABLE/i.test(rawCode+' '+detail)?'DATABASE_CONNECTION_FAILED':
    'BOOKING_WRITE_FAILED';
  console.error('[booking-manager]',{code:errorCode,backendCode:rawCode,details:detail,at:new Date().toISOString()});
  return json({error:'Không thể lưu lịch vào Firebase. Kiểm tra dịch vụ database và nhật ký server.',code:errorCode},503);
}
async function audit(action:string,user:DecodedIdToken,event:Record<string,unknown>,id:string,detail:string){
  try {const key=randomUUID();await adminDatabase().ref('studioPlanner_v1/auditLogs').child(key).set({
    id:key, action,actionLabel:action==='EVENT_DELETED'?'Xóa lịch':'Cập nhật lịch',category:'booking',severity:action==='EVENT_DELETED'?'danger':'info',
    actorId:user.uid, actorName:user.email||'Admin',actorRole:isAdmin(user)?'admin':'office',timestamp:Date.now(),
    targetType:'event', targetId:id,eventName:String(event.name||''),eventDate:String(event.date||''),message:detail,
  });}catch(err){console.error('[booking-manager] audit failed',err);}
}
async function handleGET(request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireAdmin(request);if(user instanceof Response)return user;
  try{const {id}=await params;const item=await findBooking(id);
    const deliveryState=(await adminDatabase().ref(`studioPlanner_v1/deliveryState/${id}`).once('value')).val() as {completedAt?:number}|null;
    const deliveryCompleted=Boolean(deliveryState?.completedAt);
    const productState=(await adminDatabase().ref(`studioPlanner_v1/deliveryProductState/${id}`).once('value')).val()||{};
    const completedProductIds=Object.entries(productState as Record<string,{completedAt?:unknown}>).filter(([,value])=>Boolean(value?.completedAt)).map(([productId])=>productId);
    const role=(await authenticatedOffice(request,['admin','sale','leader_photo']))?.role;
    const event=safeOfficeEvent(normaliseEvents([item.value])[0],isAdmin(user)?'admin':role||'sale');
    return json({event:{...event,...(role==='leader_photo'?{price:0,deposit:0,products:[]}:{ }),deliveryCompleted,completedProductIds,phone:item.value.phone||'',note:item.value.note||'',isRuocDau:item.value.isRuocDau===true,
    sourceLinks:role==='leader_photo'?{}:Object.fromEntries(recordValues(item.value.assignments).filter(a=>a.id!=null).map(a=>[String(a.id),String(a.link||'')])),
    products:role==='leader_photo'?[]:recordValues(item.value.products).map(p=>({id:String(p.id||''),name:String(p.name||''),url:String(p.url||''),mediaType:String(p.mediaType||'auto')})),
    startTrai:item.value.startTrai||'',startGai:item.value.startGai||'',locTrai:item.value.locTrai||'',locGai:item.value.locGai||'',phoneTrai:item.value.phoneTrai||'',phoneGai:item.value.phoneGai||''},version:item.version});
  }catch(err){return fail(err);}
}
async function handlePATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireAdmin(request);if(user instanceof Response)return user;
  const actorRole=(await authenticatedOffice(request,['admin','sale','leader_photo']))?.role;
  if(actorRole==='leader_photo'){
    const candidate=await request.clone().json().catch(()=>null);const keys=candidate?.changes&&typeof candidate.changes==='object'&&!Array.isArray(candidate.changes)?Object.keys(candidate.changes):[];
    if(!keys.length||keys.some((key:string)=>!['date','start','end','startTrai','startGai','assignments'].includes(key)))return json({error:'Leader quay chụp chỉ được sửa ngày và giờ.'},403);
  }
  if(Number(request.headers.get('content-length')||0)>20_480)return json({error:'Yêu cầu quá lớn'},413);
  let body:unknown;try{body=await request.json();}catch{return json({error:'JSON không hợp lệ'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Yêu cầu không hợp lệ'},400);
  const payload=body as Record<string,unknown>;
  if(!isAdmin(user)&&actorRole!=='leader_photo'&&payload.changes&&typeof payload.changes==='object'&&Object.prototype.hasOwnProperty.call(payload.changes,'assignments'))return json({error:'Chỉ Admin được phân công nhân sự và sửa chi phí nhân sự'},403);
  if(!requireVersion(payload.expectedVersion))return json({error:'Thiếu mã phiên bản lịch. Hãy tải lại chi tiết trước khi sửa.'},400);
  try {
    const {id}=await params;
    const changesHaveScheduleFields=Boolean(payload.changes && typeof payload.changes==='object' &&
      ['date','start','end','startTrai','startGai','status','assignments'].some(key=>Object.prototype.hasOwnProperty.call(payload.changes,key)));
    // Fast-path: notes, prices and non-schedule fields never require the date lease.
    // An event without assigned staff cannot conflict with another staff schedule.
    const previous=await findBooking(id);
    const requestedAssignments=(payload.changes as Record<string,unknown>)?.assignments;
    const hasAssignedStaff=recordValues(requestedAssignments===undefined?previous.value.assignments:requestedAssignments).some(a=>a.id!=null);
    const needsScheduleLock=changesHaveScheduleFields && hasAssignedStaff;
    let committedForAudit:Record<string,unknown>|null=null;
    const action=async()=>{
    const located=await findBooking(id);
    // Leader may choose the crew but never change or even submit its pay rates.
    if(actorRole==='leader_photo'&&payload.changes&&typeof payload.changes==='object'&&'assignments' in payload.changes){
      const changes=payload.changes as Record<string,unknown>;
      if(!Array.isArray(changes.assignments))return json({error:'Danh sách phân công không hợp lệ'},422);
      const existing=recordValues(located.value.assignments);
      const costs=new Map(existing.map(a=>[String(a.id),Number(a.cost)||0]));
      for(const item of changes.assignments){
        if(!item||typeof item!=='object'||Array.isArray(item)||!Number.isInteger(item.cost)||item.cost!==0)return json({error:'Leader không có quyền chỉnh chi phí nhân sự'},403);
      }
      changes.assignments=changes.assignments.map((entry:{id:string;task:string;locType:string;cost:number})=>({...entry,cost:costs.get(String(entry.id))||0}));
    }
    if(located.value.sourcePackageId){
      const allowed=['date','start','end','startTrai','startGai','assignments'];
      const proposedKeys=payload.changes&&typeof payload.changes==='object'&&!Array.isArray(payload.changes)?Object.keys(payload.changes):[];
      if(proposedKeys.some(key=>!allowed.includes(key)))return json({error:'Lịch thuộc gói: chỉ thay đổi thời gian và phân công tại đây. Thông tin, trạng thái và tiền phải chỉnh trong Chọn gói.'},409);
    }
    const validated=validateEventChanges(payload.changes,located.value);
    if(!validated.ok)return json({error:validated.message,code:'BOOKING_VALIDATION'},422);
    if(located.version!==payload.expectedVersion)return json({error:'Lịch đã thay đổi ở một phiên khác. Hãy tải lại trước khi lưu.'},409);
    if((validated.value.date&&validated.value.date!==located.value.date)||validated.value.status==='cancelled'){
      if(await hasActiveWeddingEventLinks(id))return json({error:'Lịch đang giữ mã trang phục. Hãy hủy các lượt giữ trong mục Trang phục trước khi đổi ngày hoặc hủy lịch.',code:'WARDROBE_LINK_ACTIVE'},409);
    }
    // Validate references against authoritative staff list, not the UI's cached roster.
    if(validated.value.assignments){
      const snap=await adminDatabase().ref('studioPlanner_v1/staff').once('value');
      const staff=Object.values(snap.val()||{}) as {id?:string;active?:boolean;role?:string}[];
      const allowed=new Set(staff.filter(s=>s.active!==false).map(s=>String(s?.id||'')));
      const old=Array.isArray(located.value.assignments)?located.value.assignments:Object.values(located.value.assignments||{});
      for(const record of old as {id?:unknown}[])if(record?.id!=null)allowed.add(String(record.id));
      if(validated.value.assignments.some(s=>!allowed.has(s.id)))return json({error:'Có nhân sự không tồn tại trong Firebase.'},422);
      if(actorRole==='leader_photo'){
        const roster=new Map(staff.map(s=>[String(s.id),String((s as {role?:string}).role||'')]));
        for(const assigned of validated.value.assignments){
          const options=taskOptionsFor(roster.get(assigned.id)||'','Cưới');
          if(options.length&&!options.includes(assigned.task))return json({error:'Công việc thợ không phù hợp chuyên môn.'},422);
        }
      }
    }
    // Server-side overlap checks must use the latest data while the VNext write lease is held.
    const proposed={...located.value,...validated.value};
    const assignedIds=recordValues(proposed.assignments).map(a=>String(a.id||'')).filter(Boolean);
    if(assignedIds.length && proposed.status!=='cancelled' && ['date','start','end','startTrai','startGai','assignments','status'].some(k=>Object.hasOwn(validated.value,k))){
      const date=String(proposed.date||'');
      const [dayEvents,dayBlackouts]=await Promise.all([dailyEvents(date),dailyBlackouts(date)]);
      const collision=scheduleConflict(proposed,assignedIds,dayEvents,dayBlackouts,id);
      if(collision)return json({error:collision.message,code:'SCHEDULE_CONFLICT',conflict:collision},409);
    }
    // Atomically replace only the verified booking key through REST ETag CAS.
    // Admin SDK RTDB transaction callbacks can abort on an initial local null
    // even while the server still has the record; do not use that path for PATCH.
    const saved=await saveBookingConditional({
      key:located.key,id,expectedVersion:String(payload.expectedVersion),
      changes:validated.value,actorUid:user.uid
    });
    const committed=saved.record;
    committedForAudit=committed;
    // Keep the timeline in the source package aligned when Leader edits the specialist event.
    if(committed.sourcePackageId&&committed.sourceEntryId&&(['date','start','end','startTrai','startGai'].some(key=>Object.hasOwn(validated.value,key)))){
      const pkgId=String(committed.sourcePackageId),entryId=String(committed.sourceEntryId);
      let packageUpdated=false;
      try{
       const tx=await moduleRef('packages').child(pkgId).transaction(raw=>{
        if(!raw?.services?.photo?.entries?.some((entry:{id:string})=>entry.id===entryId))return;
        const entries=raw.services.photo.entries.map((entry:{id:string;[key:string]:unknown})=>entry.id===entryId?{...entry,date:committed.date,start:committed.start,end:committed.end,startTrai:committed.startTrai,startGai:committed.startGai}:entry);
        return {...raw,services:{...raw.services,photo:{...raw.services.photo,entries}},updatedAt:Date.now()};
       },undefined,false);
       packageUpdated=tx.committed;
      }catch(syncError){console.error('[event] linked package sync failed',syncError);}
      if(!packageUpdated)return json({error:'Đã lưu lịch chuyên môn nhưng chưa đồng bộ được về gói. Hãy kiểm tra và đồng bộ lại ngay.',code:'PACKAGE_SYNC_RECONCILE',event:normaliseEvents([committed])[0]},409);
    }
    return json({success:true,id,version:saved.version,event:normaliseEvents([committed])[0]});
    };
    // Lock the destination date. The optimistic version check inside action protects stale reads.
    const targetDate=String((payload.changes as Record<string,unknown> | undefined)?.date||previous.value.date||'');
    const response=needsScheduleLock ? await withScheduleLock(action,targetDate) : await action();
    // Logging must not extend the scheduling lock duration. The record is already committed.
    if(committedForAudit)await audit('EVENT_UPDATED',user,committedForAudit,id,
      `Cập nhật lịch ${String(previous.value.name||'')} ngày ${String(previous.value.date||'')}`);
    return response;
  }catch(err){return fail(err);}
}
async function handleDELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireAdmin(request);if(user instanceof Response)return user;
  if(!isAdmin(user))return json({error:'Chỉ Admin được xóa lịch'},403);
  let body:unknown;try{body=await request.json();}catch{return json({error:'JSON không hợp lệ'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Dữ liệu không hợp lệ'},400);
  const {expectedVersion,confirmName}=body as Record<string,unknown>;
  if(!requireVersion(expectedVersion)||typeof confirmName!=='string')return json({error:'Cần mã phiên bản và tên lịch xác nhận xóa.'},400);
  try {
    const {id}=await params;const item=await findBooking(id);
    if(item.value.sourcePackageId)return json({error:'Lịch này thuộc Chọn gói. Hãy chuyển gói sang Đã hủy thay vì xóa lịch con.'},409);
    if(String(item.value.name)!==confirmName.trim())return json({error:'Tên lịch xác nhận không trùng khớp'},422);
    if(item.version!==expectedVersion)return json({error:'Lịch đã thay đổi. Tải lại trước khi xóa.'},409);
    if(await hasActiveWeddingEventLinks(id))return json({error:'Lịch đang liên kết mã trang phục. Hãy hủy các lượt giữ mã váy trước khi xóa lịch.',code:'WARDROBE_LINK_ACTIVE'},409);
    // Archive BEFORE removal. An archive error must never lead to destructive deletion.
    const archive=adminDatabase().ref('amorriStudioAdminArchive_v1/events').child(id);
    const opId=randomUUID();
    const encrypted=encryptBookingArchive(item.value);
    const backup=await archive.transaction(current=>current===null?({id,operationId:opId,originalKey:item.key,deletedAt:Date.now(),deletedBy:user.uid, ...encrypted}):undefined,undefined,false);
    if(!backup.committed)return json({error:'Đã có bản lưu lịch trong kho dự phòng; cần kiểm tra trước khi xóa lần nữa.'},409);
    // REST ETag delete avoids transient local-null Admin SDK transactions.
    try{await deleteBookingConditional({key:item.key,id,expectedVersion});}
    catch(err){
      // If deletion definitely did NOT run, release only this operation's
      // temporary archive so a fresh version can be archived next time.
      // An uncertain network result keeps the encrypted copy for recovery.
      if(err instanceof BookingCasError && err.code!=='BOOKING_DELETE_UNCERTAIN'){
        try{await archive.transaction(current=>current?.operationId===opId?null:undefined,undefined,false);}
        catch(rollbackError){console.error('[booking-manager] archive rollback failed',rollbackError);}
      }
      throw err;
    }
    await audit('EVENT_DELETED',user,item.value,id,`Đã xóa lịch ${String(item.value.name||'')} (đã lưu bản dự phòng cho admin)`);
    return json({success:true,archived:true});
  }catch(err){return fail(err);}
}

export async function GET(request:Request, context:{params:Promise<{id:string}>}){
  return withApiTrace('booking.get',()=>handleGET(request,context));
}
export async function PATCH(request:Request, context:{params:Promise<{id:string}>}){
  return withApiTrace('booking.patch',()=>handlePATCH(request,context));
}
export async function DELETE(request:Request, context:{params:Promise<{id:string}>}){
  return withApiTrace('booking.delete',()=>handleDELETE(request,context));
}
