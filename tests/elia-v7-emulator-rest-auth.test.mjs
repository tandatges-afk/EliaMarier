import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDemoEmulatorAuth} from '../lib/domain/rtdb-emulator-auth.ts';
const base='http://127.0.0.1:54330/studioPlanner_v1/weddingWardrobe/items.json?ns=demo-elia-v7-qa08-default-rtdb';
const ok=()=>new Response('null',{status:200,headers:{etag:'"123"'}});
const denied=()=>new Response('{"error":"Permission denied"}',{status:401});
test('REST Emulator prefers verified Bearer owner without opening security rules',async()=>{
 const requests=[];
 const fake=async(url,opts)=>{
  requests.push({url,opts});
  if(opts.headers.Authorization==='Bearer owner')return ok();
  return denied();
 };
 assert.deepEqual(await resolveDemoEmulatorAuth(base,fake),{mode:'bearer'});
 assert.equal(requests.length,1);
 assert.equal(requests[0].opts.method,'GET');
 assert.equal(requests[0].opts.headers['X-Firebase-ETag'],'true');
});
test('REST Emulator falls back only to scoped access_token if Bearer fails',async()=>{
 const requests=[];
 const fake=async(url,opts)=>{
  requests.push({url,opts});
  return url.endsWith('&access_token=owner')?ok():denied();
 };
 assert.deepEqual(await resolveDemoEmulatorAuth(base,fake),{mode:'access-token'});
 assert.equal(requests.length,2);
 assert.equal(requests[1].opts.headers.Authorization,undefined);
});
test('REST Emulator fails closed if both methods rejected',async()=>{
 await assert.rejects(resolveDemoEmulatorAuth(base,async()=>denied()),/bearer:HTTP-401, access-token:HTTP-401/);
});
test('REST Emulator fails closed when no ETag is returned',async()=>{
 await assert.rejects(resolveDemoEmulatorAuth(base,async()=>new Response('null',{status:200})),/no-etag/);
});
test('REST Emulator refuses public host, fake project or unrelated paths',async()=>{
 for(const addr of [
  base.replace('127.0.0.1','firebaseio.com'),
  base.replace('demo-elia-v7-qa08-default-rtdb','production-project'),
  base.replace('/weddingWardrobe/items.json','/other.json'),
  base.replace('http:','https:'),
  base+'&auth=owner'
 ])await assert.rejects(resolveDemoEmulatorAuth(addr,async()=>ok()),/Invalid synthetic/);
});
