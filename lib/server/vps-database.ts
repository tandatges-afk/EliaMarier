/**
 * Élia VPS PostgreSQL-backed compatibility layer for the existing RTDB data model.
 * All writes use one PostgreSQL advisory transaction lock to preserve atomic
 * transactions on parents and children. Never connect this from a browser.
 */
import {Pool, type PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';

const pool = new Pool({connectionString:process.env.DATABASE_URL,max:Number(process.env.ELIA_PG_POOL_MAX||5),idleTimeoutMillis:30000,connectionTimeoutMillis:5000});
const WRITE_LOCK=342160825;
export type JsonValue = unknown;
const parts=(p:string)=>String(p||'').split('/').filter(Boolean);
const keyFor=(path:string):string=>{
 const p=parts(path);
 if(p.length===0)return '';
 if(p[0]==='studioPlanner_v1'){
   if(['events','auditLogs','deliveryState','deliveryProductState','schedulingWriteLocks_v3','conceptPhotos'].includes(p[1]) && p.length>=3)return p.slice(0,3).join('/');
   if(p[1]==='weddingWardrobe'&&p.length>=3)return p.slice(0,3).join('/');
   if(p[1]==='videoSync_v1'&&p[2]==='status'&&p.length>=4)return p.slice(0,4).join('/');
   return p.slice(0,Math.min(p.length,2)).join('/');
 }
 if(p[0]==='amorriStudioAdminArchive_v1'&&p[1]==='events'&&p.length>=3)return p.slice(0,3).join('/');
 return p.slice(0,Math.min(p.length,2)).join('/');
};
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const at=(val:unknown,trail:string[]):unknown=>trail.reduce((v,k)=>v!=null&&(Array.isArray(v)||obj(v))?(v as Record<string,unknown>)[k]:null,val);
function modified(original:unknown,trail:string[],v:unknown):unknown{
 if(!trail.length)return v;
 const [head,...rest]=trail;
 const next=Array.isArray(original)?Object.assign({},original):obj(original)?{...original}:{};
 const child=modified((next as Record<string,unknown>)[head],rest,v);
 if(child===null||child===undefined)delete (next as Record<string,unknown>)[head];
 else (next as Record<string,unknown>)[head]=child;
 return Object.keys(next).length?next:null;
}
function buildAt(target:Record<string,unknown>,trail:string[],value:unknown){
 if(!trail.length){if(obj(value))Object.assign(target,value);return;}
 let parent:Record<string,unknown>=target;
 for(const name of trail.slice(0,-1)){
   if(!obj(parent[name]))parent[name]={};
   parent=parent[name] as Record<string,unknown>;
 }
 parent[trail.at(-1)!]=value;
}
async function getRow(c:PoolClient,path:string,lock=false):Promise<unknown>{
 const r=await c.query(`SELECT data FROM elia_nodes WHERE path=$1 ${lock?'FOR UPDATE':''}`,[path]);
 return r.rows.length?r.rows[0].data:null;
}
async function getAt(c:PoolClient,path:string):Promise<unknown>{
 const names=parts(path),shard=keyFor(path),shardParts=parts(shard);
 const isParent=names.length<2 || (names[0]==='studioPlanner_v1' && ['events','auditLogs','deliveryState','deliveryProductState','schedulingWriteLocks_v3','conceptPhotos'].includes(names[1]) && names.length===2) || (names[0]==='studioPlanner_v1' && names[1]==='weddingWardrobe' && names.length===2) || (names[0]==='studioPlanner_v1'&&names[1]==='videoSync_v1'&&names.length<=3) || (names[0]==='amorriStudioAdminArchive_v1'&&names[1]==='events'&&names.length===2);
 if(!isParent && shard && shardParts.length<=names.length && shardParts.every((x,i)=>names[i]===x)){
   const base=await getRow(c,shard);
   return at(base,names.slice(shardParts.length))??null;
 }
 // Parent reads combine independently sharded records; used for whole collections.
 const prefix=path?`${path}/`:'';
 const r=await c.query(`SELECT path,data FROM elia_nodes WHERE ($1='' OR path=$1 OR left(path,length($2))=$2) ORDER BY path`,[path,prefix]);
 const result:Record<string,unknown>={};
 for(const row of r.rows){
   if(row.path===path){if(obj(row.data))Object.assign(result,row.data);continue;}
   const trail=parts(row.path).slice(names.length);
   if(trail.length)buildAt(result,trail,row.data);
 }
 return Object.keys(result).length?result:null;
}
async function writeAt(c:PoolClient,path:string,data:unknown):Promise<void>{
 const shard=keyFor(path),shardParts=parts(shard),trail=parts(path).slice(shardParts.length);
 if(!shard)throw new Error('DATABASE_ROOT_WRITES_NOT_ALLOWED');
 const current=trail.length?await getRow(c,shard):null;
 const result=trail.length?modified(current,trail,data):data;
 if(result==null){await c.query('DELETE FROM elia_nodes WHERE path=$1',[shard]);return;}
 await c.query(`INSERT INTO elia_nodes(path,data,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(path) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()`,[shard,JSON.stringify(result)]);
}
async function serial<T>(operation:(c:PoolClient)=>Promise<T>):Promise<T>{
 const c=await pool.connect();
 try {await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock($1)',[WRITE_LOCK]);const result=await operation(c);await c.query('COMMIT');return result;}
 catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
 finally{c.release();}
}
export async function readVpsPath(path:string){const c=await pool.connect();try{return await getAt(c,path);}finally{c.release();}}
export async function transactionVpsPath<T=unknown>(path:string,update:(value:T|null)=>T|undefined|null):Promise<{committed:boolean;value:T|null}>{
 return serial(async c=>{
  const before=(await getAt(c,path)) as T|null;
  const after=update(before);
  if(after===undefined)return {committed:false,value:before};
  await writeAt(c,path,after);
  return {committed:true,value:after??null};
 });
}
export async function writeVpsPath(path:string,value:unknown){return serial(c=>writeAt(c,path,value));}
export async function updateVpsPath(path:string,values:Record<string,unknown>){return serial(async c=>{
 for(const [key,value] of Object.entries(values))await writeAt(c,[path,key].filter(Boolean).join('/'),value);
});}
function entries(v:unknown):Array<[string,unknown]>{
 if(Array.isArray(v))return v.map((x,i)=>[String(i),x]);
 return obj(v)?Object.entries(v):[];
}
function compare(a:unknown,b:unknown){
 if(a===b)return 0;
 if(a===undefined||a===null)return -1;if(b===undefined||b===null)return 1;
 const rank=(v:unknown)=>typeof v==='boolean'?1:typeof v==='number'?2:typeof v==='string'?3:4;
 if(rank(a)!==rank(b))return rank(a)-rank(b);
 if(typeof a==='number'&&typeof b==='number')return a-b;
 if(typeof a==='boolean'&&typeof b==='boolean')return Number(a)-Number(b);
 return String(a).localeCompare(String(b),'en');
}
export class VpsSnapshot<T=any>{
 constructor(public readonly key:string|null,private readonly data:T,private readonly ordered?:Array<[string,unknown]>){ }
 val():T{return this.data;}
 exists(){return this.data!==null && this.data!==undefined;}
 numChildren(){return entries(this.data).length;}
 forEach(callback:(snapshot:VpsSnapshot)=>unknown):boolean{
   const all=this.ordered??entries(this.data);
   for(const [key,val] of all){if(callback(new VpsSnapshot(key,val))===true)return true;}
   return false;
 }
}
export class VpsReference {
 constructor(public readonly path:string,private readonly constraints:{order?:string;start?:unknown;end?:unknown;equal?:unknown;first?:number;last?:number}={}){}
 get key(){return parts(this.path).at(-1)??null;}
 child(key:string){if(!key||key.includes('..')||key.startsWith('/'))throw Error('DATABASE_BAD_CHILD');return new VpsReference([this.path,key].filter(Boolean).join('/'));}
 orderByChild(key:string){return new VpsReference(this.path,{...this.constraints,order:key});}
 orderByKey(){return new VpsReference(this.path,{...this.constraints,order:'$key'});}
 equalTo(value:unknown){return new VpsReference(this.path,{...this.constraints,equal:value});}
 startAt(value:unknown){return new VpsReference(this.path,{...this.constraints,start:value});}
 endAt(value:unknown){return new VpsReference(this.path,{...this.constraints,end:value});}
 limitToFirst(num:number){return new VpsReference(this.path,{...this.constraints,first:num});}
 limitToLast(num:number){return new VpsReference(this.path,{...this.constraints,last:num});}
 async once(event:'value'){
  if(event!=='value')throw Error('DATABASE_BAD_EVENT');
  const raw=await readVpsPath(this.path);
  const q=this.constraints;
  if(!Object.keys(q).length)return new VpsSnapshot(this.key,raw);
  const field=(key:string,value:unknown)=>q.order==='$key'?key:q.order?at(value,String(q.order).split('/')):key;
  let ordered=entries(raw).sort(([ka,va],[kb,vb])=>compare(field(ka,va),field(kb,vb))||compare(ka,kb));
  if(Object.hasOwn(q,'equal'))ordered=ordered.filter(([k,v])=>compare(field(k,v),q.equal)===0);
  if(Object.hasOwn(q,'start'))ordered=ordered.filter(([k,v])=>compare(field(k,v),q.start)>=0);
  if(Object.hasOwn(q,'end'))ordered=ordered.filter(([k,v])=>compare(field(k,v),q.end)<=0);
  if(q.first!==undefined)ordered=ordered.slice(0,q.first);
  if(q.last!==undefined)ordered=ordered.slice(-q.last);
  const result=ordered.length?Object.fromEntries(ordered):null;
  return new VpsSnapshot(this.key,result,ordered);
 }
 async set(value:unknown){await writeVpsPath(this.path,value);}
 async update(values:Record<string,unknown>){await updateVpsPath(this.path,values);}
 async remove(){await writeVpsPath(this.path,null);}
 push(){return this.child(randomUUID());}
 async transaction(update:(value:any)=>any,_complete?:unknown,_applyLocally?:boolean){
  const result=await transactionVpsPath<any>(this.path,update);
  return {committed:result.committed,snapshot:new VpsSnapshot<any>(this.key,result.value)};
 }
}
export function adminDatabase(){return {ref:(path:string)=>new VpsReference(path)};}
export {pool as vpsPool};
