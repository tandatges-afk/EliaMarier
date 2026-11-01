/** VPS storage report: reads local files only (historical file/API name). */
import {readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {root} from './vps-media.mjs';
const MATCH=/^videos\/([A-Za-z0-9_-]{10,200})\/([a-f0-9]{24})\/(1080p|original)\.mp4$/;
export async function readR2Storage(){
 const base=root(),queue=[''];const objects=[];let partial=false;
 while(queue.length){
  const current=queue.shift();
  let items;try{items=await readdir(path.join(base,current),{withFileTypes:true});}catch(e){if(e.code==='ENOENT')continue;throw e;}
  for(const entry of items){
   const rel=[current,entry.name].filter(Boolean).join('/');
   if(entry.isSymbolicLink())continue;
   if(entry.isDirectory()){queue.push(rel);continue;}
   if(!entry.isFile())continue;
   const info=await lstat(path.join(base,rel));objects.push({key:rel,size:info.size,lastModified:info.mtime.toISOString()});
   if(objects.length>=50000){partial=true;queue.length=0;break;}
  }
 }
 let totalBytes=0,videoBytes=0,videoObjects=0;const groups=new Map();
 for(const file of objects){
  totalBytes+=file.size;const m=MATCH.exec(file.key);if(!m)continue;
  videoBytes+=file.size;videoObjects++;const id=m[1],timestamp=Date.parse(file.lastModified);
  const prev=groups.get(id)||{fileId:id,bytes:0,objects:0,latest:0,oldest:Infinity};
  prev.bytes+=file.size;prev.objects++;prev.latest=Math.max(prev.latest,timestamp);prev.oldest=Math.min(prev.oldest,timestamp);groups.set(id,prev);
 }
 return {totalBytes,videoBytes,videoObjects,objectCount:objects.length,videoFiles:groups.size,partial,
 oldestVideos:[...groups.values()].sort((a,b)=>a.oldest-b.oldest).slice(0,30),checkedAt:new Date().toISOString(),limit:50000};
}
