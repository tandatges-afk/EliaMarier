'use client';
import {useCallback,useEffect,useState} from 'react';
import type {User} from '@/lib/auth/client';
import {HardDrive,RefreshCw,AlertTriangle,Copy} from 'lucide-react';
type OldVideo={fileId:string;bytes:number;objects:number;latest:number;oldest:number};
type Usage={totalBytes:number;videoBytes:number;videoObjects:number;objectCount:number;videoFiles:number;partial:boolean;oldestVideos:OldVideo[];checkedAt:string;limit:number};
const fmt=(n:number)=>n>=1e9?`${(n/1e9).toFixed(2)} GB`:n>=1e6?`${(n/1e6).toFixed(1)} MB`:`${(n/1e3).toFixed(0)} KB`;
export function R2StorageHealth({user}:{user:User}){
  const [usage,setUsage]=useState<Usage|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[guide,setGuide]=useState(false);
  const refresh=useCallback(async()=>{
    setBusy(true);setError('');
    try{
      const ask=async(force=false)=>fetch('/api/system/r2-storage',{headers:{Authorization:`Bearer ${await user.getIdToken(force)}`},cache:'no-store'});
      let res=await ask();if(res.status===401)res=await ask(true);
      const info=await res.json();if(!res.ok)throw Error(info.error||`HTTP ${res.status}`);
      setUsage(info as Usage);
    }catch(e){setError(e instanceof Error?e.message:'Không thể kiểm tra ổ lưu trữ VPS');}
    finally{setBusy(false);}
  },[user]);
  useEffect(()=>{void refresh();},[refresh]);
  return <section className="surface" style={{marginTop:16,padding:18}} aria-label="Dung lượng VPS">
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
      <div><h3 style={{display:'flex',alignItems:'center',gap:8}}><HardDrive size={19}/> Dung lượng VPS</h3>
        <p style={{fontSize:12,opacity:.75}}>Đếm file trực tiếp trên ổ đĩa VPS; không dựa vào database.</p></div>
      <button type="button" className="secondary-button" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16} className={busy?'spin':''}/>{busy?'Đang quét…':'Kiểm tra ổ đĩa'}</button>
    </div>
    {error&&<p role="alert" style={{color:'#b42318',marginTop:12}}>{error} — Kiểm tra quyền đọc thư mục media.</p>}
    {usage&&<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:10,marginTop:14}}>
        {[["Dung lượng đã quét",fmt(usage.totalBytes)],["Video trên VPS",fmt(usage.videoBytes)],["Video Drive",String(usage.videoFiles)],["Số object video",String(usage.videoObjects)]].map(([key,val])=><div key={key} style={{padding:13,background:'#f6f8fb',borderRadius:10}}><strong style={{display:'block',fontSize:20}}>{val}</strong><small>{key}</small></div>)}
      </div>
      {usage.partial&&<p style={{color:'#92400e',fontSize:12,marginTop:9}}><AlertTriangle size={14} style={{display:'inline'}}/> Có hơn {usage.limit} object. Đây là số liệu một phần, không phải tổng dung lượng bucket.</p>}
      <p style={{fontSize:12,marginTop:9}}>Đã kiểm tra: {new Date(usage.checkedAt).toLocaleString('vi-VN')}. Chỉ số này là dung lượng file được quét tại thời điểm kiểm tra.</p>
      <details style={{marginTop:14}}><summary style={{cursor:'pointer',fontWeight:700}}>Danh sách nhóm video cũ nhất (tối đa 30)</summary>
        <div style={{overflowX:'auto',marginTop:8}}><table className="data-table"><thead><tr><th>Drive File ID</th><th>Dung lượng</th><th>Số phiên bản/object</th><th>Object cũ nhất</th><th/></tr></thead><tbody>
          {usage.oldestVideos.map(v=><tr key={v.fileId}><td><code>{v.fileId}</code></td><td>{fmt(v.bytes)}</td><td>{v.objects}</td><td>{new Date(v.oldest).toLocaleDateString('vi-VN')}</td><td><button type="button" className="secondary-button" onClick={()=>void navigator.clipboard.writeText(v.fileId)} aria-label="Copy Drive File ID"><Copy size={14}/></button></td></tr>)}
        </tbody></table></div>
      </details>
    </>}
    <button type="button" className="secondary-button" style={{marginTop:12}} onClick={()=>setGuide(s=>!s)}>{guide?'Ẩn hướng dẫn':'Cách dọn video cũ an toàn'}</button>
    {guide&&<div style={{fontSize:12,marginTop:9,lineHeight:1.75}}>
      <p><strong>Không xóa trực tiếp các file đang dùng.</strong> Cần gỡ link bàn giao, xác nhận không còn khách đang xem và sao lưu video nếu cần.</p>
      <p>Chỉ dọn bản video cũ trên VPS sau khi đối chiếu các link đang hoạt động, xác nhận bản hiện tại và tạo bản sao lưu an toàn.</p>
      <p>Muốn dọn các file đã xóa khỏi Drive hoặc không còn liên kết với khách, hãy kiểm tra thủ công trước khi xóa. Việc xóa trên VPS không xóa video gốc trên Drive.</p>
    </div>}
  </section>;
}
