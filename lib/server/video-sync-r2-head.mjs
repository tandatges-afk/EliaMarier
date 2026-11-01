import {checkedFile} from './vps-media.mjs';
export async function headR2Video(key){
 try{const value=await checkedFile(key);return {IsDir:false,Size:value.size,MimeType:'video/mp4'};}
 catch(e){if(e.code==='ENOENT'||e.message==='MEDIA_NOT_FOUND')return null;throw e;}
}
