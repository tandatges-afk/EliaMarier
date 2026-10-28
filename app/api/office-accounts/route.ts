import {NextResponse} from 'next/server';
import {getAuth} from 'firebase-admin/auth';
import {adminDatabase,firebaseAdminApp,authenticatedAdmin,publicAuthFailure} from '@/lib/server/firebase-admin';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const json=(o:object,status=200)=>NextResponse.json(o,{status,headers});
async function guard(request:Request){
 try{const actor=await authenticatedAdmin(request);return actor||json({error:'Chỉ admin được quản lý tài khoản nhân viên'},403);}
 catch(e){const failure=publicAuthFailure(e);return json({error:failure.error,code:failure.code},failure.status);}
}
function errStatus(e:unknown){const code=(e as {code?:string})?.code||'';
 if(code==='auth/email-already-exists')return json({error:'Email đã được sử dụng'},409);
 if(code==='auth/invalid-password'||code==='auth/invalid-email')return json({error:'Email hoặc mật khẩu không hợp lệ'},422);
 console.error('[office-accounts] action failed',{code});return json({error:'Không thể cập nhật tài khoản nhân viên'},503);
}
async function audit(actor:{uid:string;email?:string},action:string,uid:string){
 const id=randomUUID();await adminDatabase().ref('studioPlanner_v1/auditLogs').child(id).set({id,action,actionLabel:action,category:'account',severity:'info',actorId:actor.uid,actorName:actor.email||'Admin',actorRole:'admin',timestamp:Date.now(),targetType:'office-account',targetId:uid,message:action});
}
export async function GET(request:Request){
 const actor=await guard(request);if(actor instanceof Response)return actor;
 try {const snap=await adminDatabase().ref('studioPlanner_v1/officeAccounts').once('value');
 const accounts=Object.entries((snap.val()||{}) as Record<string,Record<string,unknown>>).map(([uid,v])=>({uid,name:String(v.name||''),email:String(v.email||''),role:'receptionist',active:v.active===true,createdAt:v.createdAt||null}));
 return json({accounts:accounts.sort((a,b)=>a.name.localeCompare(b.name,'vi'))});}
 catch(e){return errStatus(e);}
}
export async function POST(request:Request){
 const actor=await guard(request);if(actor instanceof Response)return actor;
 let body:Record<string,unknown>;try{body=await request.json();}catch{return json({error:'JSON không hợp lệ'},400);}
 const name=String(body?.name||'').trim(),email=String(body?.email||'').trim().toLowerCase(),password=String(body?.password||'');
 if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>128)return json({error:'Nhập họ tên, email và mật khẩu tối thiểu 8 ký tự'},422);
 let uid='';try{
  const user=await getAuth(firebaseAdminApp()).createUser({email,password,displayName:name,disabled:false});uid=user.uid;
  await adminDatabase().ref('studioPlanner_v1/officeAccounts').child(uid).set({uid,name,email,role:'receptionist',active:true,createdAt:Date.now(),createdBy:actor.uid});
  await audit(actor,'OFFICE_ACCOUNT_CREATED',uid).catch(()=>{});
  return json({success:true,uid},201);
 }catch(e){if(uid)await getAuth(firebaseAdminApp()).deleteUser(uid).catch(()=>{});return errStatus(e);}
}
