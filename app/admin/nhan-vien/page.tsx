'use client';
import '@/components/elia-luxe.css';
import {useEffect,useState} from 'react';
import {onAuthStateChanged,type User} from 'firebase/auth';
import {browserAuth} from '@/lib/firebase/client';
import {OfficeAccountsManager} from '@/components/OfficeAccountsManager';

type AccessState='checking'|'sign-in'|'admin'|'denied'|'error';

/** Dedicated account-management entrypoint: does not depend on sidebar navigation. */
export default function OfficeAccountsPage(){
 const [user,setUser]=useState<User|null>(null);
 const [access,setAccess]=useState<AccessState>('checking');
 const [role,setRole]=useState('');
 const [error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  const auth=browserAuth();
  const unsubscribe=onAuthStateChanged(auth,current=>{
   if(!alive)return;
   setUser(current);setError('');setRole('');
   if(!current){setAccess('sign-in');return;}
   setAccess('checking');
   void (async()=>{
    try{
     const request=async(refresh=false)=>fetch('/api/access/me',{
      headers:{Authorization:`Bearer ${await current.getIdToken(refresh)}`},cache:'no-store'});
     let response=await request();
     if(response.status===401)response=await request(true);
     const payload=await response.json();
     if(!response.ok)throw Error(payload?.error||`HTTP ${response.status}`);
     if(!alive)return;
     const detectedRole=String(payload.role||'guest');
     setRole(detectedRole);
     setAccess(detectedRole==='admin'?'admin':'denied');
    }catch(e){if(alive){setAccess('error');setError(e instanceof Error?e.message:'Không xác minh được quyền Admin');}}
   })();
  },e=>{if(alive){setAccess('error');setError(e.message||'Lỗi đăng nhập Firebase');}});
  return()=>{alive=false;unsubscribe();};
 },[]);
 return <main className="elia-admin-accounts-page">
  <header className="elia-admin-page-header">
   <div><div className="elia-kicker">ÉLIA MARIER / ADMIN</div>
    <h1>Tài khoản lễ tân</h1>
    <p>Thêm, cập nhật và khóa tài khoản lễ tân</p></div>
   <a href="/" className="secondary-button" style={{display:'inline-flex',padding:'10px 14px',borderRadius:10}}>Về trang quản trị</a>
  </header>
  {access==='checking'&&<section className="surface" style={{padding:24}}>Đang kiểm tra quyền quản trị…</section>}
  {access==='sign-in'&&<section className="surface" style={{padding:24}}>Bạn chưa đăng nhập. <a href="/" style={{textDecoration:'underline'}}>Đăng nhập Admin ở trang chủ</a>, sau đó mở lại trang này.</section>}
  {access==='denied'&&<section className="surface" style={{padding:24}} role="alert">
    <strong>Không có quyền quản lý tài khoản nhân viên.</strong>
    <p>API xác định vai trò đang đăng nhập: <code>{role}</code>. Để hiển thị trang này, UID Admin phải có trong biến Vercel <code>AMORRI_ADMIN_UIDS</code> hoặc có custom claim <code>admin=true</code>.</p>
    <p>Nếu đây là tài khoản Admin, kiểm tra biến môi trường Production, Redeploy, rồi đăng xuất/đăng nhập lại.</p>
  </section>}
  {access==='error'&&<section className="surface" style={{padding:24}} role="alert"><strong>Không kiểm tra được quyền đăng nhập.</strong><p>{error}</p></section>}
  {access==='admin'&&user&&<OfficeAccountsManager user={user}/>}
 </main>;
}
