import {NextResponse} from "next/server";
import {auth} from "../../../lib/auth/server";
import {getDb,ensureSchema} from "../../../lib/db";
async function ownerFrom(){const r=await auth.getSession();const u=r?.user||r?.data?.user;return u?.id||null}
export async function POST(req){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const b=await req.json();if(!b.to||!b.message)return NextResponse.json({error:"missing_recipient_or_message"},{status:400});
 const token=(process.env.LINE_CHANNEL_ACCESS_TOKEN||"").trim();if(!token)return NextResponse.json({error:"line_not_configured",needs:"LINE_CHANNEL_ACCESS_TOKEN"},{status:503});
 try{const lr=await fetch("https://api.line.me/v2/bot/message/push",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({to:b.to,messages:[{type:"text",text:String(b.message).slice(0,5000)}]})});if(!lr.ok)return NextResponse.json({error:"line_send_failed",status:lr.status},{status:502});
 const sql=getDb();if(sql&&b.tripId&&b.type){await ensureSchema(sql);await sql.query("INSERT INTO gd_reminder_log(owner_id,trip_id,reminder_type,channel,payload) VALUES($1,$2,$3,'line',$4::jsonb) ON CONFLICT DO NOTHING",[owner,String(b.tripId),String(b.type),JSON.stringify({to:b.to})])}
 return NextResponse.json({sent:true})}catch(e){return NextResponse.json({error:"line_unavailable"},{status:502})}
}