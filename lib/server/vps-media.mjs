import {createHmac,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {stat,realpath} from 'node:fs/promises';
export const MEDIA_KEY=/^(?:videos\/[A-Za-z0-9_-]{10,200}\/[a-f0-9]{24}\/1080p\.mp4|concepts\/[A-Za-z0-9_-]{12,100}\/[0-9a-f-]{36}\.(?:jpg|png|webp))$/i;
export const root=()=>process.env.ELIA_MEDIA_ROOT||'/srv/elia/media';
const secret=()=>{const v=process.env.ELIA_MEDIA_SIGNING_KEY||'';if(v.length<32)throw Error('MEDIA_SIGNING_KEY_REQUIRED');return v;};
const sig=(key,expire)=>createHmac('sha256',secret()).update(`${key}\n${expire}`).digest('hex');
export const ttlSeconds=()=>Math.min(7200,Math.max(60,Number(process.env.ELIA_MEDIA_URL_TTL_SECONDS||3600)));
export function localSignedUrl(key,now=Date.now(),ttl=ttlSeconds()){
 if(!MEDIA_KEY.test(key))throw Error('MEDIA_KEY_INVALID');
 const expires=Math.floor(now/1000)+ttl;
 return `/api/media/file?key=${encodeURIComponent(key)}&expires=${expires}&sig=${sig(key,expires)}`;
}
export function verifySignedUrl(key,expires,signature,now=Date.now()){
 if(!MEDIA_KEY.test(key)||!Number.isSafeInteger(Number(expires))||Number(expires)<Math.floor(now/1000)||Number(expires)>Math.floor(now/1000)+7300||!(/^[a-f0-9]{64}$/.test(signature)))return false;
 const actual=Buffer.from(signature,'hex'),expected=Buffer.from(sig(key,Number(expires)),'hex');
 return timingSafeEqual(actual,expected);
}
export async function checkedFile(key){
 if(!MEDIA_KEY.test(key))throw Error('MEDIA_KEY_INVALID');
 const mediaRoot=root();
 const base=await realpath(/* turbopackIgnore: true */ mediaRoot);
 const candidate=path.join(base,...key.split('/'));
 const full=await realpath(/* turbopackIgnore: true */ candidate);
 if(!full.startsWith(base+path.sep))throw Error('MEDIA_PATH_ESCAPE');
 const st=await stat(/* turbopackIgnore: true */ full);
 if(!st.isFile()||st.size<1)throw Error('MEDIA_NOT_FOUND');
 return {full,size:st.size,mtime:st.mtime};
}
export function expectedMime(key){return key.endsWith('.mp4')?'video/mp4':key.endsWith('.png')?'image/png':key.endsWith('.webp')?'image/webp':'image/jpeg';}
