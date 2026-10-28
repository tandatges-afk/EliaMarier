import {NextResponse} from 'next/server';
import {getAuth} from 'firebase-admin/auth';
import {adminDatabase,authenticatedAdmin,firebaseAdminApp,publicAuthFailure} from '@/lib/server/firebase-admin';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const UID=/^[a-zA-Z0-9_-]{1,128}$/;
// Protect both admin UIDs configured in Vercel and Firebase admin custom claims.
// A target UID is not an authenticated DecodedIdToken; never cast it into one.
async function isProtectedAdminAccount(uid:string):Promise<boolean>{
  const allowlist=(process.env.AMORRI_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(allowlist.includes(uid))return true;
  const user=await getAuth(firebaseAdminApp()).getUser(uid);
  return user.customClaims?.admin===true;
}
async function adminTargetGuard(uid:string,message:string):Promise<Response|null>{
  try{
    return (await isProtectedAdminAccount(uid))?json({error:message},403):null;
  }catch(e){
    console.error('[office-account] target admin verification failed',{code:(e as {code?:string})?.code});
    return json({error:'Không thể xác minh quyền của tài khoản. Vui lòng thử lại.'},503);
  }
}

async function auth(request:Request){try{const actor=await authenticatedAdmin(request);return actor||json({error:'Chỉ admin được quản lý nhân viên'},403);}catch(e){const f=publicAuthFailure(e);return json({error:f.error,code:f.code},f.status);}}
async function audit(actor:{uid:string;email?:string},action:string,uid:string){const id=randomUUID();await adminDatabase().ref('studioPlanner_v1/auditLogs').child(id).set({id,action,actorId:actor.uid,actorName:actor.email||'Admin',actorRole:'admin',category:'account',timestamp:Date.now(),targetId:uid,message:action});}
export async function PATCH(request:Request,{params}:{params:Promise<{uid:string}>}){
 const actor=await auth(request);if(actor instanceof Response)return actor;
 const {uid}=await params;if(!UID.test(uid)||uid===actor.uid)return json({error:'UID không hợp lệ'},400);
 let data:Record<string,unknown>;try{data=await request.json();}catch{return json({error:'JSON không hợp lệ'},400);}
 const db=adminDatabase().ref('studioPlanner_v1/officeAccounts').child(uid);
 const old=(await db.once('value')).val();if(!old)return json({error:'Không tìm thấy tài khoản'},404);
 const guard=await adminTargetGuard(uid,'Không thể thay đổi tài khoản Admin');if(guard)return guard;
 const role=data.role===undefined?old.role:data.role;
 const name=data.name===undefined?old.name:String(data.name||'').trim();
 const email=data.email===undefined?String(old.email):String(data.email||'').trim().toLowerCase();
 const active=data.active===undefined?old.active===true:data.active===true;
 const password=data.password===undefined?'':String(data.password);
 if(!['sale','receptionist'].includes(role)||typeof name!=='string'||name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||(password&&password.length<8))return json({error:'Thông tin không hợp lệ'},422);
 try{
   await getAuth(firebaseAdminApp()).updateUser(uid,{displayName:name,email,disabled:!active,...(password?{password}:{})});
   await db.update({name,email,role,active,updatedAt:Date.now(),updatedBy:actor.uid});
   if(!active||password||email!==old.email)await getAuth(firebaseAdminApp()).revokeRefreshTokens(uid);
   await audit(actor,'OFFICE_ACCOUNT_UPDATED',uid).catch(()=>{});
   return json({success:true});
 }catch(e){console.error('[office-account] patch failed',{code:(e as {code?:string})?.code});return json({error:'Không thể cập nhật tài khoản'},503);}
}
/** Soft delete: disable Firebase Auth + access record to keep audit history. */
export async function DELETE(request:Request,{params}:{params:Promise<{uid:string}>}){
 const actor=await auth(request);if(actor instanceof Response)return actor;
 const {uid}=await params;if(!UID.test(uid)||uid===actor.uid)return json({error:'UID không hợp lệ'},400);
 const db=adminDatabase().ref('studioPlanner_v1/officeAccounts').child(uid);
 const old=(await db.once('value')).val();if(!old)return json({error:'Không tìm thấy tài khoản'},404);
 const guard=await adminTargetGuard(uid,'Không thể khóa tài khoản Admin');if(guard)return guard;
 try{await db.update({active:false,deletedAt:Date.now(),deletedBy:actor.uid});
 await getAuth(firebaseAdminApp()).updateUser(uid,{disabled:true});
 await getAuth(firebaseAdminApp()).revokeRefreshTokens(uid);
 await audit(actor,'OFFICE_ACCOUNT_DISABLED',uid).catch(()=>{});
 return json({success:true,disabled:true});
 }catch(e){console.error('[office-account] disable failed',{code:(e as {code?:string})?.code});return json({error:'Không thể khóa tài khoản'},503);}
}
