/**
 * Server-only wardrobe CAS path. In production this uses the Firebase Admin
 * service account. The literal emulator-owner token is limited to an exact
 * demo project, a loopback address and the presence of emulator variables.
 */
import {firebaseAdminApp} from './firebase-admin';
import {conditionalRtdbMutation,RtdbCasFailure} from '@/lib/domain/rtdb-etag-cas';
import {WeddingFault} from './wedding-wardrobe';
import {resolveDemoEmulatorAuth, type EmulatorAuth} from '@/lib/domain/rtdb-emulator-auth';
const DEMO='demo-elia-v7-qa08';
let authCheck:Promise<EmulatorAuth>|undefined;
function safeDatabaseUrl(){
 const url=String(process.env.FIREBASE_DATABASE_URL||'').replace(/\/+$/,'');
 if(!/^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)$/i.test(url))
  throw new WeddingFault(503,'Cấu hình Firebase Database không hợp lệ.','RTDB_CAS_CONFIG');
 return url;
}
async function credentials():Promise<{base:string;token:string}>{
 const db=safeDatabaseUrl();
 const host=String(process.env.FIREBASE_DATABASE_EMULATOR_HOST||'');
 if(host){
  if(!/^127\.0\.0\.1:(?:[1-9]\d{3,4})$/.test(host)||Number(host.split(':')[1])>65535||
    process.env.FIREBASE_PROJECT_ID!==DEMO||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!==DEMO||
    !db.includes(`${DEMO}-default-rtdb.`))
   throw new WeddingFault(503,'Cấu hình Firebase Emulator không an toàn.','RTDB_CAS_EMULATOR_CONFIG');
  return {base:`http://${host}/studioPlanner_v1`,token:''};
 }
 const credential=firebaseAdminApp().options.credential;
 if(!credential)throw new WeddingFault(503,'Thiếu Firebase Admin credentials.','RTDB_CAS_CREDENTIALS');
 let token:string|undefined;
 try{token=(await credential.getAccessToken()).access_token;}
 catch{throw new WeddingFault(503,'Không xác thực được Firebase Admin.','RTDB_CAS_CREDENTIALS');}
 if(!token)throw new WeddingFault(503,'Không lấy được Firebase Admin token.','RTDB_CAS_CREDENTIALS');
 return {base:`${db}/studioPlanner_v1`,token};
}
async function safeCasAtPath(relative:string,update:(raw:unknown)=>unknown|undefined){
 const {base,token}=await credentials();
 const host=process.env.FIREBASE_DATABASE_EMULATOR_HOST;
 let url=`${base}/${relative}.json`;
 let finalToken=token;
 if(host){
  const testUrl=`${base}/weddingWardrobe/items.json?ns=${DEMO}-default-rtdb`;
  // Read-only probe, exact demo project, before issuing any conditional writes.
  if(!authCheck){authCheck=resolveDemoEmulatorAuth(testUrl).catch(error=>{authCheck=undefined;throw error;});}
  let chosen:EmulatorAuth;
  try{chosen=await authCheck;}
  catch(error){throw new WeddingFault(503,'Firebase Emulator từ chối REST quản trị: '+(error instanceof Error?error.message:'Unknown'),'RTDB_CAS_EMULATOR_AUTH');}
  url+=`?ns=${DEMO}-default-rtdb`;
  if(chosen.mode==='access-token')url+='&access_token=owner';
  else finalToken='owner';
 }
 try{return await conditionalRtdbMutation({url,token:finalToken,update});}
 catch(error){if(error instanceof RtdbCasFailure)throw new WeddingFault(error.status,error.message,error.code);throw error;}
}
export async function weddingCas(
 kind:'items'|'folders',
 id:string|undefined,
 update:(raw:unknown)=>unknown|undefined
){
 if(id && !(/^[a-f0-9]{64}$/.test(id)||/^[a-f0-9-]{36}$/i.test(id)))
  throw new WeddingFault(422,'Mã trang phục/thư mục không hợp lệ.','INVALID_ID');
 const relative=`weddingWardrobe/${kind}`+(id?`/${encodeURIComponent(id)}`:'');
 return safeCasAtPath(relative,update);
}
/** The SAME authenticated server-side ETag CAS protects package edit locks.
 * Package IDs must be valid UUIDs; never allow arbitrary database paths.
 */
export async function packageLockCas(pkgId:string,update:(raw:unknown)=>unknown|undefined){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pkgId))
  throw new WeddingFault(422,'Mã gói không hợp lệ.','PACKAGE_LOCK_ID');
 return safeCasAtPath(`eliaPackageLocks/${encodeURIComponent(pkgId)}`,update);
}
export const weddingItemCas=(id:string,update:(raw:unknown)=>unknown|undefined)=>weddingCas('items',id,update);
export const weddingItemsCas=(update:(raw:unknown)=>unknown|undefined)=>weddingCas('items',undefined,update);
export const weddingFolderCas=(id:string,update:(raw:unknown)=>unknown|undefined)=>weddingCas('folders',id,update);
