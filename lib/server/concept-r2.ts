/** Historic module name: self-hosted concept images, no Cloudflare dependency. */
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {localSignedUrl,root,MEDIA_KEY} from './vps-media.mjs';
const EVENT=/^[A-Za-z0-9_-]{12,100}$/;
const PHOTO=/^[a-f0-9-]{36}$/i;
export function conceptKey(eventId:string,photoId:string,ext:'jpg'|'png'|'webp'){
 if(!EVENT.test(eventId)||!PHOTO.test(photoId)||!['jpg','png','webp'].includes(ext))throw Error('CONCEPT_KEY_INVALID');
 return `concepts/${eventId}/${photoId}.${ext}`;
}
const full=(key:string)=>{if(!MEDIA_KEY.test(key)||!key.startsWith('concepts/'))throw Error('CONCEPT_KEY_INVALID');return path.join(root(),...key.split('/'));};
export const signConceptRead=(key:string)=>localSignedUrl(key);
export async function uploadConcept(key:string,_type:string,bytes:Buffer){
 if(bytes.length>20*1024*1024)throw Error('CONCEPT_FILE_TOO_LARGE');
 const filename=full(key);await mkdir(path.dirname(filename),{recursive:true});
 await writeFile(filename,bytes,{flag:'wx',mode:0o640});
}
export async function deleteConcept(key:string){await unlink(full(key));}
