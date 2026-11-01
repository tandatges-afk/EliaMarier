/** Queue synchronizations on local VPS rather than GitHub Actions. */
import 'server-only';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
export type Source={type:'file'|'folder';id:string};
export type DispatchResult={queued:boolean;reason:string};
const ID=/^[A-Za-z0-9_-]{10,200}$/;
export async function dispatchR2Sync(source:Source):Promise<DispatchResult>{
 if(!ID.test(source.id)||!['file','folder'].includes(source.type))return {queued:false,reason:'invalid-source'};
 const folder=process.env.ELIA_SYNC_QUEUE||'/srv/elia/sync-queue';
 try{
  await mkdir(folder,{recursive:true,mode:0o700});
  const name=`${Date.now()}-${randomUUID()}.json`;
  await writeFile(path.join(folder,name),JSON.stringify({...source,createdAt:Date.now()}),{mode:0o600,flag:'wx'});
  return {queued:true,reason:'local-vps-queue'};
 }catch{return {queued:false,reason:'local-queue-unavailable'};}
}
