import {NextResponse} from "next/server";
import {auth} from "../../../lib/auth/server";

const SUPPORT_TO="judehu100427@icloud.com";
async function userFrom(){const r=await auth.getSession();return r?.user||r?.data?.user||null}

export async function POST(req){
 const u=await userFrom();
 if(!u?.id)return NextResponse.json({error:"unauthorized"},{status:401});
 const body=await req.json().catch(()=>({}));
 const type=String(body.type||"其他").slice(0,80);
 const message=String(body.text||"").trim().slice(0,5000);
 if(!message)return NextResponse.json({error:"empty_message"},{status:400});
 const key=process.env.RESEND_API_KEY;
 if(!key)return NextResponse.json({error:"email_not_configured",saved:true},{status:503});
 try{
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.GD_SUPPORT_FROM||"GD Car <onboarding@resend.dev>",to:[SUPPORT_TO],subject:`[GD 車趟管理] ${type}`,text:`GD 車趟管理客服回報\n\n類型：${type}\n會員：${u.email||u.id}\n時間：${new Date().toISOString()}\n\n內容：\n${message}`})});
  if(!r.ok){console.error("support email failed",r.status,await r.text());return NextResponse.json({error:"email_failed",saved:true},{status:502})}
  return NextResponse.json({sent:true});
 }catch(e){console.error("support email exception",e);return NextResponse.json({error:"email_failed",saved:true},{status:502})}
}