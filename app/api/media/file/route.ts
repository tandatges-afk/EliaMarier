import {NextResponse} from 'next/server';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {checkedFile,expectedMime,verifySignedUrl} from '@/lib/server/vps-media.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function serve(request:Request,head=false){
 try{
  const u=new URL(request.url),key=u.searchParams.get('key')||'',expires=u.searchParams.get('expires')||'',sig=u.searchParams.get('sig')||'';
  if(!verifySignedUrl(key,expires,sig))return NextResponse.json({error:'Link media đã hết hạn hoặc không hợp lệ'},{status:403});
  const file=await checkedFile(key);
  const headers:Record<string,string>={'Cache-Control':'private, no-store','Content-Type':expectedMime(key),'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':'inline','Referrer-Policy':'no-referrer'};
  // NGINX serves Range requests directly from disk; Node never buffers the video.
  if(process.env.ELIA_USE_X_ACCEL!=='false'){
   headers['X-Accel-Redirect']='/_elia_internal/'+key.split('/').map(encodeURIComponent).join('/');
   return new Response(null,{status:200,headers});
  }
  // Development-only Node fallback with single-byte range support.
  const range=request.headers.get('range');let start=0,end=file.size-1,status=200;
  if(range){
   const m=/^bytes=(\d*)-(\d*)$/.exec(range);
   if(!m)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${file.size}`}});
   if(!m[1]&&!m[2])return new Response(null,{status:416});
   if(!m[1]){const count=Number(m[2]);start=Math.max(0,file.size-count);}else start=Number(m[1]);
   end=m[1]&&m[2]?Number(m[2]):file.size-1;
   if(start>=file.size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${file.size}`}});
   end=Math.min(end,file.size-1);status=206;headers['Content-Range']=`bytes ${start}-${end}/${file.size}`;
  }
  headers['Content-Length']=String(end-start+1);
  if(head)return new Response(null,{status,headers});
  const stream=Readable.toWeb(createReadStream(file.full,{start,end})) as ReadableStream;
  return new Response(stream,{status,headers});
 }catch(e){return NextResponse.json({error:'Không tìm thấy media trên VPS'},{status:404,headers:{'Cache-Control':'no-store'}});}
}
export async function GET(request:Request){return serve(request);}
export async function HEAD(request:Request){return serve(request,true);}
