import {randomUUID} from 'node:crypto';
import {adminDatabase} from './firebase-admin';
import {authenticatedOffice,type OfficeRole,type OfficeIdentity} from './office-auth';
import {MODULES,type EliaModule,validateModule,safeScheduleEdit} from '@/lib/domain/elia-operations';
const roleFor:Record<EliaModule,OfficeRole>={decor:'leader_decor',makeup:'leader_makeup',packages:'sale'};
export const validModule=(v:string):v is EliaModule=>MODULES.includes(v as EliaModule);
export const access=async(req:Request,module:EliaModule,write=false)=>{
 const allowed:OfficeRole[]=module==='packages'?['admin','sale']:['admin','sale',roleFor[module]];
 const actor=await authenticatedOffice(req,allowed);
 if(!actor)return null;
 if(write && actor.role!== 'admin'&&actor.role!=='sale')return null;
 return actor;
};
export const moduleRef=(module:EliaModule)=>adminDatabase().ref('studioPlanner_v1/eliaModules').child(module);
export function errorResponse(e:unknown){return {error:e instanceof Error?e.message:'Dữ liệu không hợp lệ'};}
export async function auditModule(actor:OfficeIdentity,action:string,module:EliaModule,id:string){
 try{
  const logId=randomUUID();await adminDatabase().ref('studioPlanner_v1/auditLogs').child(logId).set({id:logId,action,category:'elia-operations',severity:'info',actorId:actor.token.uid,actorName:actor.token.email||actor.role,actorRole:actor.role,timestamp:Date.now(),targetType:module,targetId:id,message:`${action} · ${module}`});
 }catch(e){console.error('[elia-module] audit unavailable',e instanceof Error?e.name:'unknown');}
}
export {validateModule,safeScheduleEdit,randomUUID,roleFor};
