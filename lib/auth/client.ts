'use client';
export type User={uid:string;email:string|null;getIdToken:(force?:boolean)=>Promise<string>};
type Listener=(user:User|null)=>void;
type Auth={currentUser:User|null;listeners:Set<Listener>;started:boolean};
const auth:Auth={currentUser:null,listeners:new Set(),started:false};
function setUser(value:{uid:string;email:string}|null){
 auth.currentUser=value?{uid:value.uid,email:value.email,getIdToken:async()=> 'local-cookie'}:null;
 for(const fn of auth.listeners)fn(auth.currentUser);
}
export function browserAuth(){
 if(!auth.started){auth.started=true;void refreshAuth();}
 return auth;
}
export async function refreshAuth(){
 try{
  const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();setUser(response.ok&&data.user?data.user:null);
 }catch{setUser(null);}
}
export function onAuthStateChanged(authInstance:Auth,callback:Listener,onError?:(error:unknown)=>void){
 authInstance.listeners.add(callback);if(authInstance.started){if(authInstance.currentUser)callback(authInstance.currentUser);else void refreshAuth().catch(onError);} else browserAuth();
 return ()=>authInstance.listeners.delete(callback);
}
export async function signInWithEmailAndPassword(_authInstance:Auth,email:string,password:string){
 const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),credentials:'same-origin',cache:'no-store'});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Đăng nhập thất bại');
 setUser(data.user);return {user:auth.currentUser};
}
export async function signOut(_authInstance:Auth){
 await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',cache:'no-store'});setUser(null);
}
