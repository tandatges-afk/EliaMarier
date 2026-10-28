import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {AdminAuthFailure,publicAuthFailure} from '@/lib/server/firebase-admin';
import {asWeddingFolder,publicWeddingError,weddingAudit,weddingFoldersRef,WeddingFault} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 try{if(!await authenticatedOffice(req))return json({error:'Không có quyền truy cập.'},403);
  const snapshot=await weddingFoldersRef().once('value');const folders=Object.values(snapshot.val()||{}).map(asWeddingFolder).filter(x=>x!==null).sort((a,b)=>a.name.localeCompare(b.name,'vi'));return json({folders});
 }catch(e){if(e instanceof AdminAuthFailure){const f=publicAuthFailure(e);return json(f,f.status);}const w=publicWeddingError(e);return json(w,w.status);}
}
export async function POST(req:Request){
 try{const actor=await authenticatedOffice(req);if(actor?.role!=='admin')return json({error:'Chỉ Admin được tạo thư mục.'},403);
  const body=await req.json();const name=String(body?.name||'').trim();if(!name||name.length>60)throw new WeddingFault(422,'Tên thư mục từ 1 đến 60 ký tự.','INVALID_FOLDER');
  const id=randomUUID(),folder={id,name,createdAt:Date.now(),createdBy:actor.token.uid};
  await weddingFoldersRef().child(id).set(folder);
  await weddingAudit(actor.token,'WEDDING_FOLDER_CREATED',id,`Thêm thư mục ${name}`);return json({folder},201);
 }catch(e){const f=publicWeddingError(e);return json(f,f.status);}
}
