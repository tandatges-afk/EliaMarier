'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {User} from 'firebase/auth';
import {CheckCircle2, KeyRound, LockKeyhole, Mail, Pencil, ShieldCheck, UnlockKeyhole, UserPlus, Users, X} from 'lucide-react';

type Account={uid:string;name:string;email:string;active:boolean};
export function OfficeAccountsManager({user}:{user:User}){
 const [rows,setRows]=useState<Account[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[msg,setMsg]=useState('');
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const fetchApi=useCallback(async(path:string,method='GET',body?:object)=>{
  const run=async(force=false)=>fetch(path,{method,cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken(force)}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let res=await run();if(res.status===401)res=await run(true);const data=await res.json();if(!res.ok)throw Error(data.error||`HTTP ${res.status}`);return data;
 },[user]);
 const reload=useCallback(async()=>{try{const data=await fetchApi('/api/office-accounts');setRows(data.accounts||[]);}catch(e){setError(e instanceof Error?e.message:'Không tải được tài khoản');}},[fetchApi]);
 useEffect(()=>{void reload();},[reload]);
 const activeCount=useMemo(()=>rows.filter(a=>a.active).length,[rows]);
 const reset=()=>{setEditing(null);setName('');setEmail('');setPassword('');};
 const select=(a:Account)=>{setEditing(a.uid);setName(a.name);setEmail(a.email);setPassword('');setError('');setMsg('');};
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMsg('');try{
  if(editing)await fetchApi(`/api/office-accounts/${encodeURIComponent(editing)}`,'PATCH',{name,email,...(password?{password}:{})});
  else await fetchApi('/api/office-accounts','POST',{name,email,password});
  setMsg(editing?'Đã cập nhật thông tin lễ tân':'Đã tạo tài khoản lễ tân');reset();await reload();
 }catch(e){setError(e instanceof Error?e.message:'Không lưu được');}finally{setBusy(false);}};
 const toggle=async(a:Account)=>{if(!window.confirm(`${a.active?'Khóa':'Mở lại'} tài khoản ${a.name}?`))return;setError('');setBusy(true);try{
   await fetchApi(`/api/office-accounts/${encodeURIComponent(a.uid)}`,'PATCH',{active:!a.active});await reload();setMsg(a.active?'Đã khóa đăng nhập':'Đã mở lại đăng nhập');
  }catch(e){setError(e instanceof Error?e.message:'Không cập nhật được');}finally{setBusy(false);}};
 const remove=async(a:Account)=>{if(!window.confirm(`Vô hiệu hóa tài khoản ${a.name}? Lịch sử thao tác vẫn được giữ.`))return;setBusy(true);setError('');try{await fetchApi(`/api/office-accounts/${encodeURIComponent(a.uid)}`,'DELETE');await reload();setMsg('Đã vô hiệu hóa tài khoản');}catch(e){setError(e instanceof Error?e.message:'Không xóa được');}finally{setBusy(false);}};
 return <div className="elia-accounts">
  <section className="elia-accounts-intro"><div><span className="elia-kicker">QUẢN LÝ TÀI KHOẢN</span><h2>Đội ngũ lễ tân</h2><p>Admin cấp tài khoản để nhân viên chăm sóc khách, quản lý lịch và bàn giao. Báo cáo chi phí và phân công nhân sự chỉ dành cho Admin.</p></div><div className="elia-account-stats"><Users size={22}/><strong>{activeCount}<span> / {rows.length}</span></strong><small>Tài khoản đang hoạt động</small></div></section>
  <div className="elia-accounts-grid">
   <section className="elia-form-card"><div className="elia-section-heading"><div className="elia-section-icon"><UserPlus size={21}/></div><div><span className="elia-kicker">TÀI KHOẢN NỘI BỘ</span><h3>{editing?'Cập nhật lễ tân':'Tạo tài khoản lễ tân'}</h3></div></div>
    <p className="elia-help">Chỉ có một loại tài khoản nhân viên là <strong>Lễ tân</strong>. Không cần chọn vai trò.</p>
    <form onSubmit={save} className="elia-account-form">
     <label>Họ và tên<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Nhập họ tên nhân viên"/></label>
     <label>Email đăng nhập<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nhanvien@studio.vn"/></label>
     <label>{editing?'Mật khẩu mới (nếu muốn thay đổi)':'Mật khẩu ban đầu'}<input type="password" required={!editing} minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={editing?'Để trống nếu giữ nguyên':'Tối thiểu 8 ký tự'}/></label>
     <div className="elia-permission-note"><ShieldCheck size={17}/><span>Vai trò mặc định: <strong>Lễ tân</strong> · Không truy cập chi phí nhân sự</span></div>
     <div className="elia-form-actions"><button type="submit" className="primary-button" disabled={busy}><UserPlus size={17}/>{busy?'Đang xử lý…':editing?'Lưu thay đổi':'Tạo tài khoản'}</button>{editing&&<button type="button" className="secondary-button" onClick={reset} disabled={busy}><X size={16}/> Hủy sửa</button>}</div>
     {msg&&<p role="status" className="elia-success"><CheckCircle2 size={16}/>{msg}</p>}{error&&<p role="alert" className="elia-error">{error}</p>}
    </form>
   </section>
   <section className="elia-list-card"><div className="elia-section-heading"><div className="elia-section-icon"><Users size={21}/></div><div><span className="elia-kicker">DANH SÁCH</span><h3>Tài khoản lễ tân <span className="elia-count">{rows.length}</span></h3></div></div>
    <div className="elia-account-list">{rows.map(a=><article className="elia-person" key={a.uid}><div className="elia-person-avatar" aria-hidden="true">{(a.name||'L').slice(0,1).toLocaleUpperCase('vi')}</div><div className="elia-person-info"><strong>{a.name}</strong><span className="elia-mail"><Mail size={13}/>{a.email}</span><span className={a.active?'elia-account-active':'elia-account-locked'}><i/>{a.active?'Đang hoạt động':'Đã khóa'}</span></div><div className="elia-person-actions"><button type="button" onClick={()=>select(a)} disabled={busy} title="Sửa lễ tân"><Pencil size={15}/> Sửa</button><button type="button" onClick={()=>void toggle(a)} disabled={busy} title={a.active?'Khóa':'Mở'}>{a.active?<LockKeyhole size={15}/>:<UnlockKeyhole size={15}/>} {a.active?'Khóa':'Mở'}</button>{a.active&&<button type="button" className="elia-delete" onClick={()=>void remove(a)} disabled={busy} title="Vô hiệu hóa tài khoản"><X size={15}/></button>}</div></article>)}</div>
    {!rows.length&&<div className="elia-account-empty"><KeyRound size={28}/><strong>Chưa có tài khoản lễ tân</strong><p>Tạo tài khoản đầu tiên bằng biểu mẫu bên trái.</p></div>}
   </section>
  </div>
 </div>;
}
