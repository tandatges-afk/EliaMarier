/** Client-only downscale for temporary media storage. Server validates the original bytes again. */
export async function optimizeOfficePhoto(file:File):Promise<File>{
 if(typeof createImageBitmap!=='function'||typeof document==='undefined')return file;
 let bitmap:ImageBitmap|null=null;
 try{
  bitmap=await createImageBitmap(file);
  const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*ratio));
  canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  const ctx=canvas.getContext('2d');if(!ctx)return file;
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const result=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.8));
  if(!result||result.type!=='image/webp'||result.size===0||result.size>=file.size)return file;
  return new File([result],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'});
 }catch{return file;}finally{bitmap?.close();}
}
