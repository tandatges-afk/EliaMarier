/** Historical module path preserved; reads VPS private filesystem, never R2. */
import {createHash} from 'node:crypto';
import {localSignedUrl,checkedFile,ttlSeconds} from './vps-media.mjs';
const FILE=/^[A-Za-z0-9_-]{10,200}$/;
export const getPrivateVideoMode=()=> 'vps-private';
export function driveRevision(id,meta){
 if(!FILE.test(String(id))||!Number.isSafeInteger(Number(meta?.size))||Number(meta.size)<=0||typeof meta.modifiedTime!=='string')throw Error('VIDEO_REVISION_INVALID');
 return createHash('sha256').update(`${id}\0${meta.size}\0${meta.md5Checksum||''}\0${meta.modifiedTime}`).digest('hex').slice(0,24);
}
export function videoObjectKeys(id,meta){const revision=driveRevision(id,meta);return [{quality:'1080p',key:`videos/${id}/${revision}/1080p.mp4`}];}
export function r2PlaybackTtl(){return ttlSeconds();}
export async function findR2Video(id,meta){
 const key=videoObjectKeys(id,meta)[0].key;
 try{await checkedFile(key);return {key,quality:'1080p',url:localSignedUrl(key)};}catch(e){if(e.code==='ENOENT'||e.message==='MEDIA_NOT_FOUND')return null;throw e;}
}
