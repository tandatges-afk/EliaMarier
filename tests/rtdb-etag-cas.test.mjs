import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionalRtdbMutation,RtdbCasFailure} from '../lib/domain/rtdb-etag-cas.ts';

/** Offline fake Firebase REST server with atomic ETag contract. */
function fake(initial){
 let value=structuredClone(initial),version=0,requests=[];
 const fetcher=async (url,opts={})=>{
  requests.push({url,method:opts.method,headers:opts.headers});
  assert.equal(opts.headers.Authorization,'Bearer QA-only-test-token');
  if(opts.method==='GET')return new Response(JSON.stringify(value),{status:200,headers:{etag:`"${version}"`}});
  assert.equal(opts.method,'PUT');
  assert.equal(opts.headers['Content-Type'],'application/json');
  if(opts.headers['If-Match']!==`"${version}"`)return new Response('{}',{status:412});
  await new Promise(r=>setImmediate(r));
  if(opts.headers['If-Match']!==`"${version}"`)return new Response('{}',{status:412});
  value=JSON.parse(opts.body);version++;
  return new Response(JSON.stringify(value),{status:200});
 };
 return {fetcher,get:()=>structuredClone(value),requests};
}
const run=(server,update,opts={})=>conditionalRtdbMutation({url:'https://qa-test.firebaseio.com/test.json',token:'QA-only-test-token',fetcher:server.fetcher,update,...opts});

test('ETag CAS reads authoritative existing dress; no false missing due local cache',async()=>{
 const db=fake({id:'dress',bookings:{}});
 const r=await run(db,raw=>({...raw,bookings:{a:{start:'2026-12-01'}}}));
 assert.equal(r.committed,true);
 assert.deepEqual(Object.keys(db.get().bookings),['a']);
 assert.equal(r.snapshot.val().id,'dress');
 assert.equal(db.requests[1].headers['If-Match'],'"0"');
});

test('concurrent same-dress reservations yield exactly one success and one denied by updated server value',async()=>{
 const db=fake({id:'dress',bookings:{}});
 const reserve=id=>run(db,raw=>Object.keys(raw.bookings).length?undefined:{...raw,bookings:{[id]:{start:'2026-12-01'}}});
 const res=await Promise.all([reserve('a'),reserve('b')]);
 assert.deepEqual(res.map(x=>x.committed).sort(),[false,true]);
 assert.equal(Object.keys(db.get().bookings).length,1);
 assert.ok(db.requests.filter(x=>x.method==='PUT').length>=2);
});

test('deletion during read never resurrects missing item',async()=>{
 const db=fake(null);
 const result=await run(db,raw=>raw?{...raw,bookings:{}}:undefined);
 assert.equal(result.committed,false);
 assert.equal(db.get(),null);
});

test('ETag missing fails closed before PUT',async()=>{
 const server={fetcher:async()=>new Response('{}',{status:200})};
 await assert.rejects(run(server,()=>({id:'x'})),e=>e instanceof RtdbCasFailure&&e.code==='RTDB_CAS_ETAG');
});

test('ambiguous PUT network failure is never automatically retried',async()=>{
 let writes=0;
 const server={fetcher:async(url,opts)=>{
  if(opts.method==='GET')return new Response('{"id":"dress"}',{status:200,headers:{etag:'"a"'}});
  writes++;throw Error('connection lost');
 }};
 await assert.rejects(run(server,raw=>({...raw,bookings:{a:1}})),e=>e instanceof RtdbCasFailure&&e.code==='RTDB_CAS_UNCERTAIN');
 assert.equal(writes,1);
});

test('bounded 412 conflict rejects rather than clobbering',async()=>{
 let writes=0;
 const server={fetcher:async(url,opts)=>{
  if(opts.method==='GET')return new Response('{"id":"dress"}',{status:200,headers:{etag:'"a"'}});
  writes++;return new Response('{}',{status:412});
 }};
 await assert.rejects(run(server,raw=>({...raw,bookings:{a:1}}),{maxAttempts:3}),e=>e instanceof RtdbCasFailure&&e.code==='RTDB_CAS_BUSY');
 assert.equal(writes,3);
});

test('CAS allows conditional delete of empty dress and never treats null as failure',async()=>{
 const db=fake({id:'dress',bookings:{}});
 const result=await run(db,raw=>raw&&Object.keys(raw.bookings).length===0?null:undefined);
 assert.equal(result.committed,true);assert.equal(db.get(),null);
});
