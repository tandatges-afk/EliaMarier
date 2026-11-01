#!/usr/bin/env node
/** Hourly discovery of Drive sources in existing bookings. No R2/Firebase calls. */
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import pg from 'pg';
const folder=process.env.ELIA_SYNC_QUEUE||'/srv/elia/sync-queue';
await mkdir(folder,{recursive:true,mode:0o700});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const result=await pool.query("SELECT data FROM elia_nodes WHERE path LIKE 'studioPlanner_v1/events/%'");
const sources=new Map();
for(const row of result.rows){
 const products=row.data?.products||[];
 for(const item of Array.isArray(products)?products:Object.values(products)){
  if(!item||item.mediaType==='image')continue;
  const url=String(item.url||'');let parsed;try{parsed=new URL(url);}catch{continue;}
  if(!['drive.google.com','www.drive.google.com'].includes(parsed.hostname))continue;
  let match=/\/folders\/([A-Za-z0-9_-]{10,200})/.exec(parsed.pathname);
  let type=match?'folder':'file';
  if(!match)match=/\/file\/d\/([A-Za-z0-9_-]{10,200})/.exec(parsed.pathname);
  const id=match?.[1]||(!match?parsed.searchParams.get('id'):null);
  if(id&&/^[A-Za-z0-9_-]{10,200}$/.test(id))sources.set(`${type}:${id}`,{type,id});
 }
}
const existing=new Set(await readdir(folder));
let count=0;
for(const [id,source] of sources){
 const filename=`scan-${createHash('sha256').update(id).digest('hex')}.json`;
 // Worker handles timestamped files only: enqueue as a normal item.
 const queue=path.join(folder,`9-${createHash('sha256').update(id).digest('hex').slice(0,32)}.json`);
 try{await writeFile(queue,JSON.stringify(source),{flag:'wx',mode:0o600});count++;}catch(e){if(e.code!=='EEXIST')throw e;}
}
console.log('Existing Drive sources:',sources.size,'New queue entries:',count);
await pool.end();
