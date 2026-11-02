/**
 * Firebase RTDB REST compare-and-set, bounded retries on verified 412 only.
 * The update function is called with the *server* value, never a local
 * transaction-cache guess. This prevents cold-cache false missing records.
 * A lost response to a conditional PUT is UNCERTAIN, not an automatic retry.
 */
export class RtdbCasFailure extends Error {
  readonly status:409|503;
  readonly code:string;
  constructor(status:409|503,code:string,message:string){
    super(message);this.name='RtdbCasFailure';this.status=status;this.code=code;
  }
}
export type CasResult = {committed:boolean;snapshot:{val:()=>unknown}};
const snapshot=(value:unknown)=>({val:()=>value});
export async function conditionalRtdbMutation(input:{
  url:string;
  token?:string;
  update:(current:unknown)=>unknown|undefined;
  fetcher?:typeof fetch;
  maxAttempts?:number;
}):Promise<CasResult>{
  const fetcher=input.fetcher??fetch;
  const maxAttempts=input.maxAttempts??8;
  if(maxAttempts<1||maxAttempts>16)throw new RtdbCasFailure(503,'RTDB_CAS_CONFIG','Giới hạn cập nhật không hợp lệ.');
  for(let attempt=0;attempt<maxAttempts;attempt++){
    let read:Response;
    try{read=await fetcher(input.url,{method:'GET',headers:{...(input.token?{Authorization:`Bearer ${input.token}`}:{}),'X-Firebase-ETag':'true'},cache:'no-store',signal:AbortSignal.timeout(15000)});}
    catch{throw new RtdbCasFailure(503,'RTDB_CAS_READ','Không đọc được trạng thái trang phục. Hãy thử lại.');}
    if(!read.ok)throw new RtdbCasFailure(503,'RTDB_CAS_READ','Firebase từ chối kiểm tra phiên bản trang phục.');
    const etag=read.headers.get('etag');
    if(!etag)throw new RtdbCasFailure(503,'RTDB_CAS_ETAG','Firebase không trả về ETag; không thể cập nhật an toàn.');
    let current:unknown;
    try{current=await read.json();}
    catch{throw new RtdbCasFailure(503,'RTDB_CAS_READ','Dữ liệu Firebase không hợp lệ.');}
    const desired=input.update(current);
    if(desired===undefined)return {committed:false,snapshot:snapshot(current)};
    let written:Response;
    try{
      written=await fetcher(input.url,{method:'PUT',headers:{...(input.token?{Authorization:`Bearer ${input.token}`}:{}),'If-Match':etag,'Content-Type':'application/json'},body:JSON.stringify(desired),cache:'no-store',signal:AbortSignal.timeout(15000)});
    }catch{
      // Server may have committed before the network failed. Never retry blindly.
      throw new RtdbCasFailure(503,'RTDB_CAS_UNCERTAIN','Chưa xác định được kết quả lưu. Hãy tải lại lịch trước khi thao tác tiếp.');
    }
    if(written.status===412)continue;
    if(!written.ok)throw new RtdbCasFailure(503,'RTDB_CAS_WRITE','Firebase không cho phép lưu trang phục.');
    return {committed:true,snapshot:snapshot(desired)};
  }
  throw new RtdbCasFailure(409,'RTDB_CAS_BUSY','Trang phục đang được cập nhật đồng thời. Vui lòng thử lại.');
}
