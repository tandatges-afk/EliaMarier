#!/usr/bin/env node
/** Process at most 10 jobs sequentially. Use flock in systemd ExecStart to prevent overlaps. */
import {readdir,readFile,unlink,mkdir,rename} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
const dir=process.env.ELIA_SYNC_QUEUE||'/srv/elia/sync-queue';
await mkdir(dir,{recursive:true,mode:0o700});
const files=(await readdir(dir)).filter(x=>/^\d+-[0-9a-f-]+\.json$/.test(x)).sort().slice(0,10);
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
for(const file of files){
 const filename=path.join(dir,file);let job;
 try{job=JSON.parse(await readFile(filename,'utf8'));}catch{console.error('Invalid job',file);continue;}
 if(!/^[A-Za-z0-9_-]{10,200}$/.test(job?.id)||!['file','folder'].includes(job?.type))continue;
 const args=['scripts/sync-drive-to-local.mjs',job.type==='file'?'--id':'--folder',job.id,'--copy-1080'];
 const ok=await new Promise(resolve=>{
  const p=spawn(process.execPath,args,{cwd:process.cwd(),env:process.env,stdio:'inherit'});
  p.on('error',()=>resolve(false));p.on('close',code=>resolve(code===0));
 });
 const state=ok?'completed':'error';
 try{
  const id=randomUUID(),value={state,sourceId:job.id,sourceType:job.type,updatedAt:Date.now()};
  await pool.query(`INSERT INTO elia_nodes(path,data) VALUES($1,$2::jsonb) ON CONFLICT(path) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,
   [`studioPlanner_v1/videoSync_v1/status/${id}`,JSON.stringify(value)]);
 }catch(e){console.warn('Could not write sync status',e.message);}
 if(ok){await unlink(filename);console.log('Synced',job.type,job.id);}
 else{const failed=path.join(dir,'failed');await mkdir(failed,{recursive:true});await rename(filename,path.join(failed,file));console.error('Sync failed, moved to failed/',file);}
}
await pool.end();
