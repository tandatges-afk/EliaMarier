import {NextResponse} from 'next/server';
import {savePackage,PackageFault} from '@/lib/server/elia-package-sync';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {access,moduleRef,validModule,validateModule,safeScheduleEdit,errorResponse,roleFor,auditModule} from '@/lib/server/elia-operations';
export const runtime='nodejs';export const dynamic='force-dynamic';
const send=(v:object,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const uuid=/^(?:[0-9a-f-]{36}|pk[a-f0-9]{32})$/i; // Linked makeup schedule IDs are deterministic 'pk' keys.
type Ctx={params:Promise<{module:string;id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 try{const {module,id}=await params;if(!validModule(module)||!uuid.test(id))return send({error:'Mã lịch không hợp lệ'},422);
  const actor=await authenticatedOffice(req,['admin','sale',...(module==='packages'?[]:[roleFor[module]])]);
  if(!actor)return send({error:'Không có quyền sửa lịch'},403);
  if(Number(req.headers.get('content-length')||0)>16384)return send({error:'Dữ liệu quá lớn'},413);
  const request=await req.json() as Record<string,unknown>,expectedUpdatedAt=Number(request.expectedUpdatedAt);
  if(!Number.isSafeInteger(expectedUpdatedAt))return send({error:'Thiếu phiên bản lịch'},422);
  const proposed=request.data as Record<string,unknown>;
  // Linked specialist schedules route timeline edits back through the source package.
  // The package save projects the updated schedule to all linked branches.
  if(module!=='packages'){
   const current=(await moduleRef(module).child(id).once('value')).val() as Record<string,any>|null;
   if(current?.sourcePackageId){
    if(current.updatedAt!==expectedUpdatedAt)return send({error:'Lịch vừa thay đổi. Vui lòng tải lại.'},409);
    if(!proposed||typeof proposed!=='object')return send({error:'Dữ liệu lịch không hợp lệ'},422);
    const restricted=actor.role!=='admin'&&actor.role!=='sale';
    if(restricted){
     const allowed=module==='decor'?['events']:['makeupDate','makeupTime'];
     if(Object.keys(proposed).some(key=>!allowed.includes(key))||!safeScheduleEdit(module,current,proposed))return send({error:'Leader chỉ được chỉnh ngày giờ, không đổi dịch vụ, thông tin hoặc chi phí.'},403);
    }
    const pkgId=String(current.sourcePackageId),parent=(await moduleRef('packages').child(pkgId).once('value')).val() as Record<string,any>|null;
    if(!parent||parent.sourceVersion!==2)return send({error:'Không tìm thấy gói đã đồng bộ hoặc gói còn ở phiên bản cũ.'},409);
    const updated=validateModule(module,{...current,...proposed});
    const services=structuredClone(parent.services) as Record<string,any>;
    if(module==='decor'){
     if(!services.decor)return send({error:'Gói không còn dịch vụ Decor.'},409);
     services.decor.entries=updated.events;
    }else{
     if(!services.makeup)return send({error:'Gói không còn dịch vụ Makeup.'},409);
     const entry=services.makeup.entries.find((x:{id:string})=>x.id===current.sourceEntryId);
     if(!entry)return send({error:'Lịch Makeup không còn liên kết với gói.'},409);
     entry.date=updated.makeupDate;entry.time=updated.makeupTime;
     if(!restricted)entry.notes=updated.notes;
    }
    const sharedNames=['brideName','groomName','brideAddress','groomAddress','bridePhone','groomPhone','contactPhone'];
    const sharedUpdates:Record<string,unknown>={};
    if(module==='decor'&&!restricted)for(const key of sharedNames)sharedUpdates[key]=updated[key];
    await savePackage(actor,{...parent,...sharedUpdates,services},{id:pkgId,expectedUpdatedAt:parent.updatedAt});
    const latest=(await moduleRef(module).child(id).once('value')).val();
    // Makeup layout and photos are specialist-only details and are not part of package timelines.
    if(module==='makeup'&&!restricted&&typeof updated.layout==='string'&&updated.layout!==current.layout){
     await moduleRef('makeup').child(id).update({layout:updated.layout,updatedAt:Date.now()});
    }
    await auditModule(actor,'MODULE_UPDATED_LINKED',module,id);
    return send({record:latest,linked:true});
   }
  }
  if(module==='packages'){
   if(!proposed||typeof proposed!=='object')return send({error:'Dữ liệu gói không hợp lệ'},422);
   const result=await savePackage(actor,proposed,{id,expectedUpdatedAt});
   await auditModule(actor,'MODULE_UPDATED',module,id);return send({record:result});
  }
  let reason='';
  const tx=await moduleRef(module).child(id).transaction(raw=>{
   if(!raw){reason='Không tìm thấy lịch';return;}
   if(raw.updatedAt!==expectedUpdatedAt){reason='Lịch vừa được người khác chỉnh sửa. Tải lại trước khi lưu.';return;}
   if(actor.role!=='admin'&&actor.role!=='sale'){
    const allowed=module==='decor'?['events']:module==='makeup'?['makeupDate','makeupTime']:[];
    if(!proposed||Object.keys(proposed).some(k=>!allowed.includes(k))){reason='Leader chỉ được chỉnh ngày, giờ trong chuyên môn';return;}
   }
   try{
    const data=validateModule(module,{...raw,...proposed});
    if(actor.role!=='admin'&&actor.role!=='sale'&&!safeScheduleEdit(module,raw,proposed)){reason='Leader chỉ được chỉnh ngày, giờ';return;}
    return {...raw,...data,updatedAt:Date.now()};
   }catch(e){reason=errorResponse(e).error;return;}
  },undefined,false);
  if(!tx.committed)return send({error:reason||'Không thể cập nhật'},reason.includes('người khác')?409:422);
  await auditModule(actor,'MODULE_UPDATED',module,id);
  return send({record:tx.snapshot.val()});
 }catch(e){return send(errorResponse(e),e instanceof PackageFault?e.status:422);}
}
export async function DELETE(req:Request,{params}:Ctx){
 try{const {module,id}=await params;if(!validModule(module)||!uuid.test(id))return send({error:'Mã lịch không hợp lệ'},422);
  const actor=await access(req,module,true);if(!actor)return send({error:'Không có quyền xóa lịch'},403);
  // Makeup records containing photos must be emptied by authorized users before deletion.
  const ref=moduleRef(module).child(id),raw=(await ref.once('value')).val() as Record<string,unknown>|null;
  if(!raw)return send({error:'Không tìm thấy lịch'},404);
  if(module==='packages')return send({error:'Gói đã liên kết các lịch chuyên môn. Hãy chuyển trạng thái sang Đã hủy để giải phóng lịch và trang phục, không xóa cứng.'},409);
  if(raw.sourcePackageId)return send({error:'Lịch thuộc gói dịch vụ. Hãy chỉnh sửa hoặc hủy trong Chọn gói để tránh mất đồng bộ.'},409);
  if(module==='makeup'&&Array.isArray(raw.photos)&&raw.photos.length)return send({error:'Xóa ảnh makeup trước khi xóa lịch để tránh file tồn đọng'},409);
  await ref.remove();await auditModule(actor,'MODULE_DELETED',module,id);return send({success:true});
 }catch{return send({error:'Không thể xóa lịch'},503);}
}
