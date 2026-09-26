import crypto from "crypto";
import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../../lib/db";
import {processPendingLineInbox} from "../../../../lib/line-inbox-processor";

export const runtime="nodejs";

function validSignature(raw,signature){
 const secret=process.env.LINE_CHANNEL_SECRET||"";
 if(!secret||!signature)return false;
 const expected=crypto.createHmac("sha256",secret).update(raw).digest("base64");
 const a=Buffer.from(expected),b=Buffer.from(signature);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

async function groupName(groupId){
 const token=process.env.LINE_CHANNEL_ACCESS_TOKEN;
 if(!token||!groupId)return "";
 try{
  const r=await fetch("https://api.line.me/v2/bot/group/"+encodeURIComponent(groupId)+"/summary",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  if(!r.ok)return "";
  return String((await r.json())?.groupName||"").slice(0,160);
 }catch{return ""}
}

export async function POST(req){
 const raw=await req.text();
 if(!validSignature(raw,req.headers.get("x-line-signature")))return NextResponse.json({ok:false,error:"invalid_signature"},{status:401});
 let body;try{body=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"invalid_json"},{status:400})}

 // LINE console verification sends a signed POST with an empty events array.
 // Acknowledge it immediately; no database work is required for this ping.
 const events=Array.isArray(body?.events)?body.events:[];
 if(events.length===0)return NextResponse.json({ok:true},{status:200});

 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  for(const event of events){
   const source=event?.source||{};
   if(source.type!=="group"||!source.groupId)continue;
   const groupId=String(source.groupId);
   if(event.type==="join"){
    const name=await groupName(groupId);
    await sql.query("INSERT INTO gd_line_groups(group_id,group_name,enabled,last_event_at) VALUES($1,$2,true,NOW()) ON CONFLICT(group_id) DO UPDATE SET group_name=COALESCE(NULLIF(EXCLUDED.group_name,''),gd_line_groups.group_name),enabled=true,last_event_at=NOW(),updated_at=NOW()",[groupId,name]);
    continue;
   }
   if(event.type==="leave"){
    await sql.query("UPDATE gd_line_groups SET enabled=false,last_event_at=NOW(),updated_at=NOW() WHERE group_id=$1",[groupId]);
    continue;
   }
   if(event.type==="message"){
    await sql.query("INSERT INTO gd_line_groups(group_id,enabled,last_event_at) VALUES($1,true,NOW()) ON CONFLICT(group_id) DO UPDATE SET enabled=true,last_event_at=NOW(),updated_at=NOW()",[groupId]);
    if(event.message?.type==="text"){
     const eventId=event.webhookEventId||event.message.id||null;
     const duplicate=eventId?await sql.query("SELECT 1 FROM gd_line_inbox WHERE source='line_group' AND (payload->>'webhookEventId'=$1 OR payload->>'messageId'=$1) LIMIT 1",[String(eventId)]):[];
     if(!duplicate.length)await sql.query("INSERT INTO gd_line_inbox(source,payload) VALUES('line_group',$1::jsonb)",[JSON.stringify({mode:"silent",groupId,userId:source.userId||null,messageId:event.message.id||null,text:event.message.text||"",timestamp:event.timestamp||Date.now(),webhookEventId:event.webhookEventId||null})]);
    }
   }
  }
  try{await processPendingLineInbox(100)}catch(e){console.error("LINE silent auto process",e)}
  return NextResponse.json({ok:true});
 }catch(e){console.error("LINE silent webhook",e);return NextResponse.json({ok:false,error:"webhook_failed"},{status:500})}
}