/**
 * Only for local Firebase Emulator with the exact synthetic Élia QA project.
 * Select a REST admin method by verified read+ETag, never by optimistic guessing.
 * Production must use Firebase Admin OAuth credentials instead of this helper.
 */
const PROJECT='demo-elia-v7-qa08';
const DATABASE=`${PROJECT}-default-rtdb`;
export type EmulatorAuth={mode:'bearer'|'access-token'};

export async function resolveDemoEmulatorAuth(url:string,fetcher:typeof fetch=fetch):Promise<EmulatorAuth>{
 const parsed=new URL(url);
 if(parsed.protocol!=='http:'||parsed.hostname!=='127.0.0.1'||
    !parsed.port||Number(parsed.port)<1024||Number(parsed.port)>65535||
    parsed.pathname!== '/studioPlanner_v1/weddingWardrobe/items.json'||
    parsed.searchParams.get('ns')!==DATABASE||parsed.searchParams.size!==1)
  throw new Error('Invalid synthetic emulator REST probe URL');
 const attempts:[EmulatorAuth['mode'],string,string|undefined][]=[
  ['bearer',parsed.toString(),'owner'],
  ['access-token',`${parsed.toString()}&access_token=owner`,undefined]
 ];
 const outcomes:string[]=[];
 for(const [mode,target,token] of attempts){
  try{
   const response=await fetcher(target,{
    method:'GET',
    headers:{'X-Firebase-ETag':'true',...(token?{Authorization:`Bearer ${token}`}:{})},
    cache:'no-store',signal:AbortSignal.timeout(10000)
   });
   if(response.ok && response.headers.get('etag'))return {mode};
   outcomes.push(`${mode}:HTTP-${response.status}${response.ok?'-no-etag':''}`);
  }catch{
   outcomes.push(`${mode}:network-error`);
  }
 }
 throw new Error(`REST ETag owner check failed (${outcomes.join(', ')}). Rules are unchanged.`);
}
