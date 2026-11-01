import {NextResponse} from 'next/server';
import {authenticatedUser} from '@/lib/server/vps-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const u=await authenticatedUser(request);return NextResponse.json({user:{uid:u.uid,email:u.email||''}},{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({user:null},{status:401,headers:{'Cache-Control':'no-store'}});}
}
