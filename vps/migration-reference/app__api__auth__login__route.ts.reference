import {NextResponse} from 'next/server';
import {loginLocal,sessionCookie} from '@/lib/server/vps-auth';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  const raw=await request.text();if(raw.length>2048)return NextResponse.json({error:'Yêu cầu quá lớn'},{status:413});
  const {email,password}=JSON.parse(raw);
  if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>1024)return NextResponse.json({error:'Thông tin đăng nhập không hợp lệ'},{status:400});
  const login=await loginLocal(email,password);
  if(!login)return NextResponse.json({error:'Email hoặc mật khẩu không đúng'},{status:401,headers:{'Cache-Control':'no-store'}});
  const response=NextResponse.json({user:{uid:login.uid,email:login.email}},{headers:{'Cache-Control':'no-store'}});
  response.headers.set('Set-Cookie',sessionCookie(login.token));return response;
 }catch{return NextResponse.json({error:'Không thể đăng nhập. Kiểm tra máy chủ.'},{status:503});}
}
