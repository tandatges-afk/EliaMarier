import type {DecodedIdToken} from 'firebase-admin/auth';
import {adminDatabase,authenticatedUser,isAdmin} from './firebase-admin';

/** Separate office accounts from the photographers in studioPlanner_v1/staff. */
export type OfficeRole='admin'|'sale'|'receptionist';
export type OfficeIdentity={token:DecodedIdToken;role:OfficeRole};
const ROLES=new Set(['sale','receptionist']);
export async function officeRole(token:DecodedIdToken):Promise<OfficeRole|null>{
 if(isAdmin(token))return 'admin';
 const record=(await adminDatabase().ref('studioPlanner_v1/officeAccounts').child(token.uid).once('value')).val();
 if(!record || record.active!==true || !ROLES.has(record.role))return null;
 return record.role as OfficeRole;
}
export async function authenticatedOffice(request:Request):Promise<OfficeIdentity|null>{
 const token=await authenticatedUser(request);const role=await officeRole(token);
 return role?{token,role}:null;
}
/** Never serialize staff assignment costs to non-admin users. */
export function safeOfficeEvent<T extends {assignments?:{cost?:number}[]}>(event:T,role:OfficeRole):T{
 if(role==='admin')return event;
 return {...event,assignments:Array.isArray(event.assignments)?event.assignments.map(({cost:_,...a})=>a):[]} as T;
}
