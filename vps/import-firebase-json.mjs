#!/usr/bin/env node
/** Import Firebase Realtime Database JSON without altering the source export.
 * Deliberately refuses any existing Élia data. Requires --apply to write.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
const {Pool}=pg;
const args=process.argv.slice(2),filename=args.find(x=>!x.startsWith('--'));
const apply=args.includes('--apply');
if(!filename){console.error('Usage: node vps/import-firebase-json.mjs export.json [--apply]');process.exit(2);}
if(!process.env.DATABASE_URL){console.error('DATABASE_URL required');process.exit(2);}
const bytes=await readFile(filename),data=JSON.parse(bytes.toString('utf8'));
if(!data||typeof data!=='object'||Array.isArray(data)){console.error('Firebase root must be JSON object');process.exit(2);}
const rows=[];
const push=(path,value)=>{if(value!==null&&value!==undefined)rows.push([path,value]);};
const values=x=>x&&typeof x==='object'&&!Array.isArray(x)?Object.entries(x):[];
for(const [namespace,value] of values(data)){
 if(namespace==='studioPlanner_v1'){
  for(const [key,part] of values(value)){
   if(['events','auditLogs','deliveryState','deliveryProductState','schedulingWriteLocks_v3','conceptPhotos'].includes(key)){
    for(const [id,record] of values(part))push(`${namespace}/${key}/${id}`,record);
   }else if(key==='weddingWardrobe'){
    for(const [type,list] of values(part))push(`${namespace}/${key}/${type}`,list);
   }else if(key==='videoSync_v1'){
    for(const [sub,inner] of values(part)){
      if(sub==='status'){for(const [id,record] of values(inner))push(`${namespace}/${key}/${sub}/${id}`,record);}
      else push(`${namespace}/${key}/${sub}`,inner);
    }
   }else push(`${namespace}/${key}`,part);
  }
 }else if(namespace==='amorriStudioAdminArchive_v1'){
  for(const [coll,group] of values(value)){
   if(coll==='events'){for(const [id,item] of values(group))push(`${namespace}/${coll}/${id}`,item);}
   else push(`${namespace}/${coll}`,group);
  }
 }else{
  for(const [key,part] of values(value))push(`${namespace}/${key}`,part);
 }
}
const summary={sourceSha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,namespaces:Object.keys(data),rows:rows.length,
 events:rows.filter(([p])=>p.startsWith('studioPlanner_v1/events/')).length,
 wardrobeItems:Object.keys(data.studioPlanner_v1?.weddingWardrobe?.items||{}).length,
 staff:Object.keys(data.studioPlanner_v1?.staff||{}).length};
console.log(JSON.stringify(summary,null,2));
if(!apply){console.log('DRY RUN only. Use --apply after reviewing counts and backing up.');process.exit(0);}
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:2});const client=await pool.connect();
try{
 await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(342160825)");
 const existing=await client.query('SELECT count(*)::int AS n FROM elia_nodes');
 if(Number(existing.rows[0].n)>0)throw Error('REFUSED: elia_nodes is not empty');
 for(let i=0;i<rows.length;i++){
  await client.query('INSERT INTO elia_nodes(path,data) VALUES($1,$2::jsonb)',[rows[i][0],JSON.stringify(rows[i][1])]);
  if((i+1)%500===0)console.log(`Imported ${i+1}/${rows.length}`);
 }
 const check=await client.query('SELECT count(*)::int AS n FROM elia_nodes');
 if(Number(check.rows[0].n)!==rows.length)throw Error('Import counts mismatch');
 await client.query('COMMIT');console.log('IMPORT COMMITTED:',rows.length,'rows. Preserve original source JSON.');
}catch(e){await client.query('ROLLBACK');console.error('IMPORT ABORTED:',e.message);process.exitCode=1;}
finally{client.release();await pool.end();}
