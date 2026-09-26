import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";

export const runtime="nodejs";

function text(v){return String(v??"").trim()}
function special(p){
 const items=[];
 const seat=Number(p.childSeat||p.childSeats||0),booster=Number(p.booster||p.boosterSeat||0);
 if(seat)items.push("安全座椅×"+seat);
 if(booster)items.push("增高墊×"+booster);
 if(p.notes)items.push(text(p.notes).slice(0,80));
 return items.join("、")||"無";
}
function tripDateTime(p){
 const d=text(p.date),t=text(p.time);
 if(!d||!t)return null;
 const normalized=d.replace(/\//g,"-");
 const dt=new Date(normalized+"T"+t+":00+08:00");
 return Number.isNaN(dt.getTime())?null:dt;
}
async function sendLine(to,message){
 const token=process.env.LINE_CHANNEL_ACCESS_TOKEN;
 if(!token)throw new Error("line_token_missing");
 const r=await fetch("https://api.line.me/v2/bot/message/push",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({to,messages:[{type:"text",text:message}]})});
 if(!r.ok)throw new Error("line_push_"+r.status);
}
async function run(req){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const rows=await sql.query("SELECT t.id,t.owner_id,t.payload,b.line_user_id FROM gd_trips t LEFT JOIN gd_driver_line_bindings b ON b.owner_id=t.owner_id AND b.enabled=TRUE AND (b.driver_id=t.payload->>'driverId' OR b.driver_id=t.payload->>'grabClaimedBy') LEFT JOIN gd_reminder_log r ON r.owner_id=t.owner_id AND r.trip_id=t.id AND r.reminder_type='two_hour' AND r.channel='line' WHERE r.trip_id IS NULL AND COALESCE(t.payload->>'status','') IN ('已接','已派') LIMIT 100");
  const now=Date.now();let sent=0,skipped=0,failed=0;
  for(const row of rows){
   const p=row.payload||{},dt=tripDateTime(p);if(!dt){skipped++;continue}
   const mins=(dt.getTime()-now)/60000;const configured=Number(p.driverReminderMinutes??p.reminderMinutes??120);const reminderMinutes=Number.isFinite(configured)?Math.max(15,Math.min(1440,configured)):120;const windowStart=Math.max(0,reminderMinutes-10),windowEnd=reminderMinutes+10;if(mins<windowStart||mins>windowEnd){skipped++;continue}
   const service=text(p.service)||"接送";
   if(!row.line_user_id){
    const driver=text(p.driver||p.driverName||p.driverId||p.grabClaimedBy)||"未指定司機";
    await sql.query("INSERT INTO gd_system_alerts(owner_id,trip_id,alert_type,severity,message,payload) VALUES($1,$2,\'driver_line_unbound\',\'critical\',$3,$4::jsonb) ON CONFLICT DO NOTHING",[row.owner_id,row.id,`司機 ${driver} 未綁定 LINE，無法發送行前提醒`,JSON.stringify({driver,service,time:text(p.time)})]);
    failed++;continue;
   }
   const msg=["GD Car 行前提醒","11/"+service,"時間："+text(p.time),"出發："+text(p.pickup||p.pickupAddress||p.from||p.startAddress),"目的："+text(p.dropoff||p.dropoffAddress||p.to||p.destinationAddress),"特殊需求："+special(p)].join("\n");
   try{await sendLine(row.line_user_id,msg);await sql.query("INSERT INTO gd_reminder_log(owner_id,trip_id,reminder_type,channel,payload) VALUES($1,$2,'two_hour','line',$3::jsonb) ON CONFLICT DO NOTHING",[row.owner_id,row.id,JSON.stringify({message:msg,reminderMinutes})]);sent++}catch(e){failed++;console.error("two-hour LINE reminder",row.id,e);await sql.query("INSERT INTO gd_system_alerts(owner_id,trip_id,alert_type,severity,message,payload) VALUES($1,$2,\'driver_line_send_failed\',\'critical\',$3,$4::jsonb) ON CONFLICT DO NOTHING",[row.owner_id,row.id,"司機行前 LINE 提醒發送失敗",JSON.stringify({error:String(e?.message||e),service,time:text(p.time)})])}
  }
  return NextResponse.json({ok:true,checked:rows.length,sent,skipped,failed});
 }catch(e){console.error("two-hour reminders",e);return NextResponse.json({ok:false,error:"reminder_failed"},{status:500})}
}
export async function POST(req){return run(req)}
export async function GET(req){return run(req)}
