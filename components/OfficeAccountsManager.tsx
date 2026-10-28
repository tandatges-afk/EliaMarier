'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import type {User} from 'firebase/auth';
type Account={uid:string;name:string;email:string;role:'sale'|'receptionist';active:boolean};
const roleName=(r:string)=>r==='sale'?'Sale':'Lễ tân';
export function OfficeAccountsManager({user}:{user:User}){
 const [rows,setRows]=useState<Account[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[msg,setMsg]=useState('');
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState<'sale'|'receptionist'>('sale');
 const [editing,setEditing]=useState<string|null>(null);
 const fetchApi=useCallback(async(path:string,method='GET',body?:object)=>{
  const run=async(force=false)=>fetch(path,{method,cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken(force)}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let res=await run();if(res.status===401)res=await run(true);const data=await res.json();if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);return data;
 },[user]);
 const reload=useCallback(async()=>{try{const data=await fetchApi('/api/office-accounts');setRows(data.accounts||[]);}catch(e){setError(e instanceof Error?e.message:'Không tải được tài khoản');}},[fetchApi]);
 useEffect(()=>{void reload();},[reload]);
 const reset=()=>{setEditing(null);setName('');setEmail('');setPassword('');setRole('sale');};
 const select=(a:Account)=>{setEditing(a.uid);setName(a.name);setEmail(a.email);setRole(a.role);setPassword('');setError('');setMsg('');};
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMsg('');try{
  if(editing)await fetchApi(`/api/office-accounts/${encodeURIComponent(editing)}`,'PATCH',{name,email,role,...(password?{password}:{})});
  else await fetchApi('/api/office-accounts','POST',{name,email,password,role});
  setMsg(editing?'Đã cập nhật nhân viên':'Đã tạo tài khoản nhân viên');reset();await reload();
 }catch(e){setError(e instanceof Error?e.message:'Không lưu được');}finally{setBusy(false);}};
 const toggle=async(a:Account)=>{if(!window.confirm(`${a.active?'Khóa':'Mở lại'} tài khoản ${a.name}?`))return;setError('');setBusy(true);try{
   await fetchApi(`/api/office-accounts/${encodeURIComponent(a.uid)}`,'PATCH',{active:!a.active});await reload();setMsg(a.active?'Đã khóa đăng nhập':'Đã mở lại đăng nhập');
  }catch(e){setError(e instanceof Error?e.message:'Không cập nhật được');}finally{setBusy(false);}};
 const remove=async(a:Account)=>{if(!window.confirm(`Vô hiệu hóa tài khoản ${a.name}? Lịch sử thao tác vẫn được giữ.`))return;setBusy(true);setError('');try{await fetchApi(`/api/office-accounts/${encodeURIComponent(a.uid)}`,'DELETE');await reload();setMsg('Đã vô hiệu hóa tài khoản');}catch(e){setError(e instanceof Error?e.message:'Không xóa được');}finally{setBusy(false);}};
 const input='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';
 return <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
  <section className="surface p-5"><h3 className="mb-2 font-bold">{editing?'Sửa nhân viên':'Thêm tài khoản nhân viên'}</h3><p className="mb-4 text-xs text-slate-500">Admin tạo email/mật khẩu đăng nhập Firebase. Sale và lễ tân không truy cập báo cáo chi phí hoặc sửa phân công nhân sự.</p>
   <form onSubmit={save} className="grid gap-3">
    <label className="text-xs font-semibold">Họ tên<input className={input} required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label className="text-xs font-semibold">Email đăng nhập<input className={input} required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="text-xs font-semibold">Vị trí<select className={input} value={role} onChange={e=>setRole(e.target.value as 'sale'|'receptionist')}><option value="sale">Sale</option><option value="receptionist">Lễ tân</option></select></label>
    <label className="text-xs font-semibold">{editing?'Đổi mật khẩu (để trống nếu không đổi)':'Mật khẩu ban đầu'}<input className={input} type="password" minLength={8} required={!editing} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự"/></label>
    <div className="flex gap-2"><button type="submit" className="primary-button" disabled={busy}>{editing?'Lưu thay đổi':'Tạo tài khoản'}</button>{editing&&<button type="button" className="secondary-button" onClick={reset}>Hủy sửa</button>}</div>
    {msg&&<p role="status" className="text-xs text-emerald-700">{msg}</p>}{error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
   </form>
  </section>
  <section className="surface p-5"><h3 className="mb-4 font-bold">Tài khoản sale / lễ tân ({rows.length})</h3><div className="grid gap-2">{rows.map(a=><div key={a.uid} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3"><div className="min-w-0 flex-1"><strong className="text-sm">{a.name}</strong><p className="truncate text-xs text-slate-500">{a.email} · {roleName(a.role)} · {a.active?'Đang hoạt động':'Đã khóa'}</p></div><button type="button" className="secondary-button small" disabled={busy} onClick={()=>select(a)}>Sửa</button><button type="button" className="secondary-button small" disabled={busy} onClick={()=>void toggle(a)}>{a.active?'Khóa':'Mở'}</button>{a.active&&<button type="button" className="secondary-button small" disabled={busy} onClick={()=>void remove(a)}>Xóa</button>}</div>)}</div>{!rows.length&&<p className="text-xs text-slate-500">Chưa có tài khoản sale/lễ tân.</p>}</section>
 </div>;
}
