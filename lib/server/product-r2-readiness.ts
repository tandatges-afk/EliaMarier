/** Validate VPS media availability for an authenticated Admin delivery product.
 * Green badge only after a current Drive revision AND a readable VPS media file.
 * No signed URLs or secrets are sent to the browser. */
import {readCurrentDriveR2Metadata} from './delivery-media';
import {checkDrive1080} from './video-1080-policy.mjs';
import {videoObjectKeys} from './r2-private-video.mjs';
import {headR2Video} from './video-sync-r2-head.mjs';
import {summarizeVPSProduct} from './r2-product-summary.mjs';

export type R2ProductStatus={
  state:'ready'|'pending'|'invalid'|'error'|'none';
  readyCount:number;totalCount:number;message:string;checkedAt:number;
};
type FileState='ready'|'pending'|'invalid'|'error';

async function checkFile(id:string):Promise<FileState>{
  try{
    const meta=await readCurrentDriveR2Metadata(id);
    if(!checkDrive1080(meta).ok)return 'invalid';
    const key=videoObjectKeys(id,meta)[0]?.key;
    if(!key)return 'error';
    const video=await headR2Video(key);
    return video?'ready':'pending';
  }catch(error){
    // Fail closed: a Drive/VPS outage must never produce a green badge.
    console.warn('[delivery-r2-status] file check unavailable',error instanceof Error?error.name:'unknown');
    return 'error';
  }
}
export async function getProductR2Readiness(videos:Array<{id:string}>):Promise<R2ProductStatus>{
  const checkedAt=Date.now();
  if(videos.length===0)return {state:'none',readyCount:0,totalCount:0,message:'Sản phẩm không có video',checkedAt};
  // Bounded work per Admin request; never call Drive/VPS in an unbounded loop.
  if(videos.length>24)return {state:'error',readyCount:0,totalCount:videos.length,checkedAt,
    message:'Quá 24 clip trong một sản phẩm. Hãy chia nhỏ để kiểm tra đầy đủ.'};
  const checks:FileState[]=[];
  for(let i=0;i<videos.length;i+=3){
    checks.push(...await Promise.all(videos.slice(i,i+3).map(video=>checkFile(video.id))));
  }
  const result=summarizeVPSProduct(checks);
  return {state:result.state as R2ProductStatus['state'],readyCount:result.readyCount,
    totalCount:result.totalCount,message:result.message,checkedAt};
}
