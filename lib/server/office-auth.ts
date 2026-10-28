import type {DecodedIdToken} from 'firebase-admin/auth';
import {adminDatabase,authenticatedUser,isAdmin} from './firebase-admin';

/** Office users only have one permission profile: receptionist. */
export type OfficeRole='admin'|'receptionist';
export type OfficeIdentity={token:DecodedIdToken;role:OfficeRole};
export async function officeRole(token:DecodedIdToken):Promise<OfficeRole|null>{
 if(isAdmin(token))return 'admin';
 const record=(await adminDatabase().ref('studioPlanner_v1/officeAccounts').child(token.uid).once('value')).val();
 if(!record || record.active!==true)return null;
 // Existing sale accounts from previous releases remain usable as receptionists.
 if(record.role!=='receptionist'&&record.role!=='sale')return null;
 return 'receptionist';
}
export async function authenticatedOffice(request:Request):Promise<OfficeIdentity|null>{
 const token=await authenticatedUser(request);const role=await officeRole(token);
 return role?{token,role}:null;
}
/** Never serialize crew assignment costs to receptionists. */
export function safeOfficeEvent<T extends {assignments?:{cost?:number}[]}>(event:T,role:OfficeRole):T{
 if(role==='admin')return event;
 return {...event,assignments:Array.isArray(event.assignments)?event.assignments.map(({cost:_,...a})=>a):[]} as T;
}
