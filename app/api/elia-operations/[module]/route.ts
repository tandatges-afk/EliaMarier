import {NextResponse} from 'next/server';
import {access,moduleRef,validModule,validateModule,randomUUID,errorResponse,auditModule} from '@/lib/server/elia-operations';
export const runtime='nodejs';export const dynamic='force-dynamic';
const send=(v:object,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
type Ctx={params:Promise<{module:string}>};
export async function GET(req:Request,{params}:Ctx){
 try{const {module}=await params;if(!validModule(module))return send({error:'Chức năng không hợp lệ'},404);
  if(!await access(req,module))return send({error:'Không có quyền xem lịch'},403);
  const raw=(await moduleRef(module).once('value')).val()||{};
  const records=Object.values(raw as Record<string,Record<string,unknown>>).filter(r=>r&&typeof r.id==='string').sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
  return send({records});
 }catch{return send({error:'Không thể tải dữ liệu'},503);}
}
export async function POST(req:Request,{params}:Ctx){
 try{const {module}=await params;if(!validModule(module))return send({error:'Chức năng không hợp lệ'},404);
  const actor=await access(req,module,true);if(!actor)return send({error:'Chỉ Admin/Sale có thể tạo lịch'},403);
  if(Number(req.headers.get('content-length')||0)>16384)return send({error:'Dữ liệu quá lớn'},413);
  const data=validateModule(module,await req.json()),now=Date.now(),id=randomUUID();
  const record={...data,id,createdAt:now,updatedAt:now,createdBy:actor.token.uid,...(module==='makeup'?{photos:[]}: {})};
  await moduleRef(module).child(id).set(record);await auditModule(actor,'MODULE_CREATED',module,id);return send({record},201);
 }catch(e){const error=errorResponse(e);return send(error,e instanceof SyntaxError?400:422);}
}
