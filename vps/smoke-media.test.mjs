import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {localSignedUrl,verifySignedUrl,checkedFile} from '../lib/server/vps-media.mjs';

const key='videos/abcdefghij/0123456789abcdef01234567/1080p.mp4';
test('private VPS media uses expiring tamper-resistant signed URLs',()=>{
 process.env.ELIA_MEDIA_SIGNING_KEY='1234567890123456789012345678901234567890123456789012345678901234';
 const now=Date.now();const u=new URL(localSignedUrl(key,now), 'https://staging.example');
 assert.equal(verifySignedUrl(u.searchParams.get('key'),u.searchParams.get('expires'),u.searchParams.get('sig'),now),true);
 assert.equal(verifySignedUrl(key,u.searchParams.get('expires'), '0'.repeat(64),now),false);
 assert.equal(verifySignedUrl(key,1,u.searchParams.get('sig'),now),false);
 assert.throws(()=>localSignedUrl('../etc/shadow'),/MEDIA_KEY_INVALID/);
});
test('filesystem key does not escape private storage',async()=>{
 const base=await mkdtemp(path.join(os.tmpdir(),'elia-media-smoke-'));
 process.env.ELIA_MEDIA_ROOT=base;
 try{
  const file=path.join(base,...key.split('/'));
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file,Buffer.from('test'));
  assert.equal((await checkedFile(key)).size,4);
  await assert.rejects(checkedFile('../etc/shadow'),/MEDIA_KEY_INVALID/);
 }finally{await rm(base,{recursive:true,force:true});}
});
