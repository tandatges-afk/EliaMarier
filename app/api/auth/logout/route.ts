import {NextResponse} from 'next/server';
import {logoutSession,expiredSessionCookie} from '@/lib/server/vps-auth';
export const runtime='nodejs';
export async function POST(request:Request){
 await logoutSession(request).catch(()=>{});
 const res=NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}});
 res.headers.set('Set-Cookie',expiredSessionCookie());return res;
}
