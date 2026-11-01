import {randomBytes,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {vpsPool} from './vps-database';
const scrypt=promisify(scryptCallback);
export type DecodedIdToken={uid:string;email?:string;admin?:boolean};
export type AdminAuthCode='AUTH_TOKEN_MISSING'|'AUTH_TOKEN_INVALID'|'AUTH_TOKEN_EXPIRED'|'AUTH_TOKEN_REVOKED'|'AUTH_CONFIG_MISSING'|'AUTH_CONFIG_INVALID'|'AUTH_PROJECT_MISMATCH'|'AUTH_SERVICE_UNAVAILABLE';
export class AdminAuthFailure extends Error{
 constructor(public readonly code:AdminAuthCode,public readonly status:401|503,message:string){super(message);this.name='AdminAuthFailure';}
}
export const publicAuthFailure=(err:unknown)=>err instanceof AdminAuthFailure?
 {code:err.code,status:err.status,error:err.message}:
 {code:'AUTH_SERVICE_UNAVAILABLE' as const,status:503 as const,error:'Không xác minh được tài khoản trên máy chủ. Kiểm tra PostgreSQL.'};
const cname=()=>process.env.NODE_ENV==='production'?'__Host-elia_sid':'elia_sid';
const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
const days=7*24*60*60;
const email=(e:string)=>String(e||'').trim().toLowerCase();
export async function passwordHash(password:string,salt:string){return (await scrypt(password,salt,64)) as Buffer;}
export async function createPasswordHash(password:string){
 if(password.length<12||Buffer.byteLength(password,'utf8')>1024)throw new Error('Mật khẩu phải có ít nhất 12 ký tự');
 const salt=randomBytes(24).toString('hex');return {salt,hash:(await passwordHash(password,salt)).toString('hex')};
}
async function validPassword(password:string,stored:{password_salt:string|null;password_hash:string|null}){
 if(!stored.password_hash||!stored.password_salt)return false;
 const expected=Buffer.from(stored.password_hash,'hex');
 const actual=await passwordHash(password,stored.password_salt);
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
export async function loginLocal(emailInput:string,password:string){
 const result=await vpsPool.query('SELECT * FROM elia_users WHERE lower(email)=$1',[email(emailInput)]);
 const user=result.rows[0];
 if(!user||user.disabled||!await validPassword(password,user))return null;
 const token=randomBytes(48).toString('base64url');
 await vpsPool.query(`INSERT INTO elia_sessions(token_hash,uid,session_version,expires_at) VALUES($1,$2,$3,now()+interval '7 days')`,[digest(token),user.uid,user.session_version]);
 return {token,uid:user.uid,email:user.email,admin:!!user.admin};
}
export function sessionCookie(token:string){return `${cname()}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${days}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
export function expiredSessionCookie(){return `${cname()}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV==='production'?'; Secure':''}`;}
function extractCookie(request:Request){
 const v=request.headers.get('cookie')||'';
 for(const part of v.split(';')){
  const i=part.indexOf('=');if(i<0)continue;
  if(part.slice(0,i).trim()===cname())return decodeURIComponent(part.slice(i+1).trim());
 }
 return '';
}
function requestToken(request:Request){
 const token=/^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1]||'';
 return token&&token!=='local-cookie'?token:extractCookie(request);
}
export async function verifiedSession(request:Request):Promise<DecodedIdToken>{
 const token=requestToken(request);
 if(!token||token.length>300)throw new AdminAuthFailure('AUTH_TOKEN_MISSING',401,'Chưa đăng nhập hoặc phiên đã hết hạn.');
 const data=await vpsPool.query(`SELECT u.uid,u.email,u.admin,u.disabled,s.session_version,u.session_version AS actual_version,s.expires_at
  FROM elia_sessions s JOIN elia_users u ON s.uid=u.uid WHERE s.token_hash=$1 LIMIT 1`,[digest(token)]);
 if(!data.rows.length)throw new AdminAuthFailure('AUTH_TOKEN_INVALID',401,'Phiên đăng nhập không hợp lệ.');
 const item=data.rows[0];
 if(item.disabled||item.session_version!==item.actual_version)throw new AdminAuthFailure('AUTH_TOKEN_REVOKED',401,'Tài khoản hoặc phiên đã bị thu hồi.');
 if(new Date(item.expires_at).getTime()<=Date.now())throw new AdminAuthFailure('AUTH_TOKEN_EXPIRED',401,'Phiên đăng nhập hết hạn.');
 // Defense in depth for cookie-authenticated mutations.
 if(!['GET','HEAD','OPTIONS'].includes(request.method.toUpperCase()) && request.headers.get('origin')){
  const origin=new URL(request.headers.get('origin')!);
  const host=request.headers.get('x-forwarded-host')||request.headers.get('host');
  if(!host||origin.host!==host)throw new AdminAuthFailure('AUTH_TOKEN_INVALID',401,'Nguồn gửi yêu cầu không hợp lệ.');
 }
 return {uid:item.uid,email:item.email,admin:!!item.admin};
}
export function isAdmin(token:DecodedIdToken){return token.admin===true||(process.env.AMORRI_ADMIN_UIDS||'').split(',').map(v=>v.trim()).includes(token.uid);}
export async function authenticatedUser(request:Request){try{return await verifiedSession(request);}catch(e){if(e instanceof AdminAuthFailure)throw e;throw new AdminAuthFailure('AUTH_SERVICE_UNAVAILABLE',503,'Máy chủ đăng nhập tạm thời không phản hồi.');}}
export async function authenticatedAdmin(request:Request){const user=await authenticatedUser(request);return isAdmin(user)?user:null;}
export async function logoutSession(request:Request){const token=requestToken(request);if(token)await vpsPool.query('DELETE FROM elia_sessions WHERE token_hash=$1',[digest(token)]);}
export function localAccountAdmin(){
 return {
  async getUser(uid:string){const r=await vpsPool.query('SELECT uid,email,display_name,disabled,admin FROM elia_users WHERE uid=$1',[uid]);if(!r.rows.length)throw Object.assign(new Error('Không tìm thấy tài khoản'),{code:'auth/user-not-found'});return {uid:r.rows[0].uid,email:r.rows[0].email,displayName:r.rows[0].display_name,disabled:r.rows[0].disabled,customClaims:{admin:r.rows[0].admin}};},
  async createUser(input:{email:string;password:string;displayName?:string;disabled?:boolean}){
   const password=await createPasswordHash(input.password);const uid=randomUUID();
   await vpsPool.query(`INSERT INTO elia_users(uid,email,display_name,password_salt,password_hash,disabled) VALUES($1,$2,$3,$4,$5,$6)`,[uid,email(input.email),input.displayName||'',password.salt,password.hash,!!input.disabled]);return {uid};
  },
  async updateUser(uid:string,input:{email?:string;password?:string;displayName?:string;disabled?:boolean}){
   const hash=input.password?await createPasswordHash(input.password):null;
   await vpsPool.query(`UPDATE elia_users SET email=COALESCE($2,email), display_name=COALESCE($3,display_name),
    disabled=COALESCE($4,disabled),password_salt=COALESCE($5,password_salt),password_hash=COALESCE($6,password_hash) WHERE uid=$1`,
    [uid,input.email?email(input.email):null,input.displayName??null,input.disabled??null,hash?.salt??null,hash?.hash??null]);
   return this.getUser(uid);
  },
  async deleteUser(uid:string){await vpsPool.query('DELETE FROM elia_users WHERE uid=$1',[uid]);},
  async revokeRefreshTokens(uid:string){await vpsPool.query('UPDATE elia_users SET session_version=session_version+1 WHERE uid=$1',[uid]);await vpsPool.query('DELETE FROM elia_sessions WHERE uid=$1',[uid]);}
 };
}
