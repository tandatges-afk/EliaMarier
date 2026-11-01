/** Local ETag-compatible adapter for the existing booking/product CAS algorithms. */
import {createHash} from 'node:crypto';
import {readVpsPath,transactionVpsPath} from './vps-database';
const checksum=(value:unknown)=>`"${createHash('sha256').update(JSON.stringify(value??null)).digest('hex')}"`;
export async function localCasFetch(uri:string,options:RequestInit):Promise<Response>{
 const url=new URL(uri);
 if(url.protocol!=='http:'||url.hostname!=='elia-local-cas')throw new Error('LOCAL_CAS_URL_INVALID');
 const path=decodeURIComponent(url.pathname.replace(/^\//,'').replace(/\.json$/,''));
 if(!/^studioPlanner_v1\/events\/[A-Za-z0-9_-]{1,160}$/.test(path))throw new Error('LOCAL_CAS_PATH_INVALID');
 const method=String(options.method||'GET').toUpperCase();
 if(method==='GET'){
  const value=await readVpsPath(path);
  return new Response(JSON.stringify(value??null),{status:200,headers:{'Content-Type':'application/json','etag':checksum(value)}});
 }
 if(method!=='PUT'&&method!=='DELETE')return new Response(null,{status:405});
 const headers=new Headers(options.headers);
 const expected=headers.get('if-match');
 if(!expected)return new Response(null,{status:428});
 const data=method==='DELETE'?null:JSON.parse(String(options.body||'null'));
 const tx=await transactionVpsPath(path,previous=>checksum(previous)===expected?data:undefined);
 return new Response(tx.committed?JSON.stringify(data):'null',{status:tx.committed?200:412});
}
