import {NextResponse} from 'next/server';
import {authenticatedOffice} from '@/lib/server/office-auth';
import {adminDatabase} from '@/lib/server/firebase-admin';
import {normaliseEvents} from '@/lib/domain/studio';
import {safeOfficeEvent} from '@/lib/server/office-auth';
import {asWeddingItem} from '@/lib/server/wedding-wardrobe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const response=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const norm=(s:unknown)=>String(s||'').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ');
const phone=(v:unknown)=>String(v||'').replace(/\D/g,'').replace(/^84(?=\d{9}$)/,'0');
export async function GET(req:Request){
 try{
  const actor=await authenticatedOffice(req);if(!actor)return response({error:'Không có quyền truy cập khách hàng'},403);
  const id=new URL(req.url).searchParams.get('eventId')||'';
  if(!/^[A-Za-z0-9_-]{1,160}$/.test(id))return response({error:'Mã lịch không hợp lệ'},422);
  const base=adminDatabase().ref('studioPlanner_v1');
  const [e,p,w,d,m]=await Promise.all([base.child('events').once('value'),base.child('eliaModules/packages').once('value'),base.child('weddingWardrobe/items').once('value'),base.child('eliaModules/decor').once('value'),base.child('eliaModules/makeup').once('value')]);
  const events=normaliseEvents(e.val()),picked=events.find(x=>x.id===id);
  if(!picked)return response({error:'Không tìm thấy lịch của khách'},404);
  const raw=Object.values((e.val()||{}) as Record<string,Record<string,unknown>>).find(x=>x.id===id);
  const customerPhone=phone(raw?.phone)||phone(raw?.phoneGai)||phone(raw?.phoneTrai),customerName=norm(picked.name);
  const matches=(v:Record<string,unknown>,n:unknown,t:unknown)=>customerPhone?[
    v.phone,v.contactPhone,v.bridePhone,v.groomPhone,v.customerPhone,v.phoneGai,v.phoneTrai
   ].some(x=>phone(x)===customerPhone):Boolean(customerName)&&norm(n)===customerName;
  const rawEvents=Object.values((e.val()||{}) as Record<string,Record<string,unknown>>);
  const fullEvents=events.filter(x=>{const item=rawEvents.find(y=>y.id===x.id)||{};return matches(item,x.name,item.phone);}).map(x=>{
    const row=rawEvents.find(y=>y.id===x.id)||{};return {...safeOfficeEvent(x,actor.role),phone:String(row.phone||''),note:String(row.note||''),brideAddress:String(row.locGai||''),groomAddress:String(row.locTrai||''),bridePhone:String(row.phoneGai||''),groomPhone:String(row.phoneTrai||'')};
  });
  const packages=Object.values((p.val()||{}) as Record<string,Record<string,unknown>>).filter(x=>matches(x,[x.brideName,x.groomName].filter(Boolean).join(' & '),x.contactPhone));
  const decor=Object.values((d.val()||{}) as Record<string,Record<string,unknown>>).filter(x=>matches(x,[x.brideName,x.groomName].filter(Boolean).join(' & '),x.contactPhone));
  const makeup=Object.values((m.val()||{}) as Record<string,Record<string,unknown>>).filter(x=>matches(x,x.customerName,x.phone));
  const wardrobe=Object.values((w.val()||{}) as Record<string,unknown>).map(asWeddingItem).filter(x=>x!==null).flatMap(x=>Object.values(x.bookings).filter(b=>b.status!=='cancelled'&&(customerPhone?phone(b.customerPhone)===customerPhone:norm(b.customerName)===customerName)).map(b=>({...b,itemCode:x.code})));
  return response({customer:{name:picked.name,phone:customerPhone,location:picked.location},events:fullEvents,packages,decor,makeup,wardrobe});
 }catch(e){console.error('[customer-profile] error',e instanceof Error?e.name:'unknown');return response({error:'Không tải được hồ sơ khách hàng'},503);}
}
