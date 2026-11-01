import type {DecodedIdToken} from 'firebase-admin/auth';
import {adminDatabase,authenticatedUser,isAdmin} from './firebase-admin';

export type OfficeRole='admin'|'sale'|'leader_makeup'|'leader_photo'|'leader_decor';
export type OfficeIdentity={token:DecodedIdToken;role:OfficeRole};
export const OFFICE_ROLES:OfficeRole[]=['admin','sale','leader_makeup','leader_photo','leader_decor'];
export const ROLE_LABELS:Record<OfficeRole,string>={admin:'Admin',sale:'Sale',leader_makeup:'Leader Makeup',leader_photo:'Leader Quay chụp',leader_decor:'Leader Decor'};
export async function officeRole(token:DecodedIdToken):Promise<OfficeRole|null>{
 if(isAdmin(token))return 'admin';
 const record=(await adminDatabase().ref('studioPlanner_v1/officeAccounts').child(token.uid).once('value')).val() as {active?:boolean;role?:string}|null;
 if(!record||record.active!==true)return null;
 // Migration compatibility: old receptionist accounts retain their former sale abilities.
 const role=record.role==='receptionist'?'sale':record.role;
 return OFFICE_ROLES.includes(role as OfficeRole)?role as OfficeRole:null;
}
/** Default deny for limited leaders: existing office endpoints remain Admin/Sale only. */
export async function authenticatedOffice(request:Request,allowed:readonly OfficeRole[]=['admin','sale']):Promise<OfficeIdentity|null>{
 const token=await authenticatedUser(request);const role=await officeRole(token);
 return role&&allowed.includes(role)?{token,role}:null;
}
export function safeOfficeEvent<T extends {assignments?:{cost?:number}[]}>(event:T,role:OfficeRole):T{
 if(role==='admin')return event;
 return {...event,assignments:Array.isArray(event.assignments)?event.assignments.map(({cost:_,...a})=>a):[]} as T;
}
