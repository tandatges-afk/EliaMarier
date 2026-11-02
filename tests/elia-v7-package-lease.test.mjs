import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acquirePackageLease,releasePackageLease} from '../lib/domain/package-lease.ts';
import {conditionalRtdbMutation} from '../lib/domain/rtdb-etag-cas.ts';

const lease=(token,now=1000)=>({uid:'test-user',token,expiresAt:now+90000});
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('package lease new acquire, release, reacquire at server value',()=>{
 const first=acquirePackageLease(null,lease('one'),1000);
 assert.deepEqual(first,lease('one'));
 assert.equal(releasePackageLease(first,'one'),null);
 assert.deepEqual(acquirePackageLease(null,lease('two'),1001),lease('two'));
});
test('lease cannot be released or replaced by a different owner',()=>{
 const existing=lease('one');
 assert.equal(acquirePackageLease(existing,lease('two'),1001),undefined);
 assert.equal(releasePackageLease(existing,'two'),undefined);
 assert.equal(releasePackageLease({uid:'a',token:'one',expiresAt:'invalid'},'one'),undefined);
 assert.equal(acquirePackageLease({garbage:1},lease('two'),1001),undefined);
});
test('expired lease may be atomically replaced, old owner cannot release it',()=>{
 const expired=lease('one');
 const newcomer=lease('two',expired.expiresAt);
 const acquired=acquirePackageLease(expired,newcomer,expired.expiresAt);
 assert.deepEqual(acquired,newcomer);
 assert.equal(releasePackageLease(acquired,'one'),undefined);
 assert.equal(releasePackageLease(acquired,'two'),null);
});
function fakeFirebase(initial=null){
 let value=initial,version=0;
 const captured=[];
 const fetcher=async(url,opt)=>{
  captured.push({method:opt.method,etag:opt.headers['If-Match']});
  if(opt.method==='GET')return new Response(JSON.stringify(value),{status:200,headers:{ETag:`etag-${version}`}});
  if(opt.headers['If-Match']!==`etag-${version}`)return new Response(JSON.stringify(value),{status:412,headers:{ETag:`etag-${version}`}});
  value=JSON.parse(opt.body);version++;
  return new Response(JSON.stringify(value),{status:200});
 };
 return {fetcher,read:()=>value,captured};
}
const url='http://127.0.0.1:19000/studioPlanner_v1/eliaPackageLocks/11111111-1111-1111-1111-111111111111.json';
test('concurrent package lease CAS gives one winner, winner releases, next acquires',async()=>{
 const db=fakeFirebase();
 const t1=lease('alpha'),t2=lease('beta');
 const [first,second]=await Promise.all([
  conditionalRtdbMutation({url,fetcher:db.fetcher,update:cur=>acquirePackageLease(cur,t1,1000)}),
  conditionalRtdbMutation({url,fetcher:db.fetcher,update:cur=>acquirePackageLease(cur,t2,1000)})
 ]);
 assert.deepEqual([first.committed,second.committed].sort(),[false,true]);
 const winner=first.committed?t1:t2;
 const lost=first.committed?t2:t1;
 assert.deepEqual(db.read(),winner);
 const denied=await conditionalRtdbMutation({url,fetcher:db.fetcher,update:cur=>releasePackageLease(cur,lost.token)});
 assert.equal(denied.committed,false);
 assert.deepEqual(db.read(),winner);
 const released=await conditionalRtdbMutation({url,fetcher:db.fetcher,update:cur=>releasePackageLease(cur,winner.token)});
 assert.equal(released.committed,true);
 assert.equal(db.read(),null);
 const reacquired=await conditionalRtdbMutation({url,fetcher:db.fetcher,update:cur=>acquirePackageLease(cur,lease('gamma'),1001)});
 assert.equal(reacquired.committed,true);
});
test('package server uses CAS for BOTH acquire and unlock; no raw lock transactions',()=>{
 const backend=source('lib/server/elia-package-sync.ts');
 const gateway=source('lib/server/wedding-etag-cas.ts');
 assert.match(backend,/acquired=await packageLockCas\(pkgId,current=>/);
 assert.match(backend,/await packageLockCas\(pkgId,current=>releasePackageLease\(current,token\)\)/);
 assert.doesNotMatch(backend,/lock\.transaction\(/);
 assert.match(gateway,/eliaPackageLocks\/\$\{encodeURIComponent\(pkgId\)\}/);
 assert.match(gateway,/conditionalRtdbMutation/);
});
