import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {access,moduleRef,validModule,validateModule,safeScheduleEdit,errorResponse,roleFor,auditModule} from '@/lib/server/elia-operations';
export const runtime='nodejs';export const dynamic='force-dynamic';
const send=(v:object,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const uuid=/^[0-9a-f-]{36}$/i;
type Ctx={params:Promise<{module:string;id:string}>};
export async function PATCH(req:Request,{params}:Ctx){
 try{const {module,id}=await params;if(!validModule(module)||!uuid.test(id))return send({error:'Mã lịch không hợp lệ'},422);
  const actor=await authenticatedOffice(req,['admin','sale',...(module==='packages'?[]:[roleFor[module]])]);
  if(!actor)return send({error:'Không có quyền sửa lịch'},403);
  if(Number(req.headers.get('content-length')||0)>16384)return send({error:'Dữ liệu quá lớn'},413);
  const request=await req.json() as Record<string,unknown>,expectedUpdatedAt=Number(request.expectedUpdatedAt);
  if(!Number.isSafeInteger(expectedUpdatedAt))return send({error:'Thiếu phiên bản lịch'},422);
  const proposed=request.data as Record<string,unknown>;
  let reason='';
  const tx=await moduleRef(module).child(id).transaction(raw=>{
   if(!raw){reason='Không tìm thấy lịch';return;}
   if(raw.updatedAt!==expectedUpdatedAt){reason='Lịch vừa được người khác chỉnh sửa. Tải lại trước khi lưu.';return;}
   if(actor.role!=='admin'&&actor.role!=='sale'){
    const allowed=module==='decor'?['partyDate','installDate','pickupDate']:module==='makeup'?['makeupDate','makeupTime']:[];
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
 }catch(e){return send(errorResponse(e),422);}
}
export async function DELETE(req:Request,{params}:Ctx){
 try{const {module,id}=await params;if(!validModule(module)||!uuid.test(id))return send({error:'Mã lịch không hợp lệ'},422);
  const actor=await access(req,module,true);if(!actor)return send({error:'Không có quyền xóa lịch'},403);
  // Makeup records containing photos must be emptied by authorized users before deletion.
  const ref=moduleRef(module).child(id),raw=(await ref.once('value')).val() as Record<string,unknown>|null;
  if(!raw)return send({error:'Không tìm thấy lịch'},404);
  if(module==='makeup'&&Array.isArray(raw.photos)&&raw.photos.length)return send({error:'Xóa ảnh makeup trước khi xóa lịch để tránh file tồn đọng'},409);
  await ref.remove();await auditModule(actor,'MODULE_DELETED',module,id);return send({success:true});
 }catch{return send({error:'Không thể xóa lịch'},503);}
}
