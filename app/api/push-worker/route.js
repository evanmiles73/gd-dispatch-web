import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {sendApns} from "../../../lib/apns";

async function run(){
 const sql=getDb();if(!sql)return {ok:false,error:"database_not_configured",status:503};
 try{
  await ensureSchema(sql);
  await sql.query("UPDATE gd_push_outbox SET status='retry',next_attempt_at=NOW(),payload=payload||$1::jsonb WHERE status='processing' AND next_attempt_at<=NOW()",[JSON.stringify({lastError:"stale_processing_recovered"})]);
  const jobs=await sql.query("WITH picked AS (SELECT id FROM gd_push_outbox WHERE status IN ('pending','retry') AND (next_attempt_at IS NULL OR next_attempt_at<=NOW()) ORDER BY created_at ASC LIMIT 20 FOR UPDATE SKIP LOCKED) UPDATE gd_push_outbox q SET status='processing',next_attempt_at=NOW()+INTERVAL '10 minutes' FROM picked WHERE q.id=picked.id RETURNING q.id,q.recipient_id,q.trip_id,q.title,q.body,q.attempts");
  let sent=0,failed=0,disabled=0;
  for(const job of jobs){
   const devices=await sql.query("SELECT token FROM gd_device_registrations WHERE owner_id=$1 AND platform='ios' AND enabled=TRUE",[job.recipient_id]);
   if(!devices.length){
    await sql.query("UPDATE gd_push_outbox SET status='no_device',next_attempt_at=NULL,payload=payload||$2::jsonb WHERE id=$1",[job.id,JSON.stringify({lastError:"no_active_ios_device"})]);
    await sql.query("INSERT INTO gd_system_alerts(owner_id,trip_id,alert_type,severity,message,payload) VALUES($1,$2,'push_no_device','critical',$3,$4::jsonb) ON CONFLICT DO NOTHING",[job.recipient_id,job.trip_id,"通知對象沒有可用的 iOS 推播裝置",JSON.stringify({outboxId:job.id,title:job.title})]);
    const admins=await sql.query("SELECT owner_id FROM gd_admin_notification_bindings WHERE push_enabled=TRUE AND owner_id<>$1",[job.recipient_id]);for(const admin of admins){const recipient=String(admin.owner_id||"").trim();if(!recipient)continue;const eventType="critical_push_no_device";const dup=await sql.query("SELECT id FROM gd_push_outbox WHERE recipient_id=$1 AND trip_id IS NOT DISTINCT FROM $2 AND event_type=$3 AND payload->>'sourceOutboxId'=$4 AND status IN ('pending','processing','retry','sent') LIMIT 1",[recipient,job.trip_id,eventType,String(job.id)]);if(!dup.length)await sql.query("INSERT INTO gd_push_outbox(recipient_id,trip_id,event_type,title,body,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[recipient,job.trip_id,eventType,"GD Car 最高權限異常通知","通知對象沒有可用的 iOS 推播裝置｜"+job.title,JSON.stringify({sourceOutboxId:String(job.id),failedRecipient:job.recipient_id,lastError:"no_active_ios_device",severity:"critical"})]);}
    continue
   }
   let delivered=false,lastError="send_failed";
   for(const d of devices){
    const result=await sendApns({token:d.token,title:job.title,body:job.body,tripId:job.trip_id});
    if(result.ok){delivered=true;sent++}else{lastError=result.error||lastError;failed++;if(result.disableToken){await sql.query("UPDATE gd_device_registrations SET enabled=FALSE,updated_at=NOW() WHERE token=$1",[d.token]);disabled++}}
   }
   const attempts=Number(job.attempts||0)+1;const state=delivered?"sent":attempts>=3?"failed":"retry";
   await sql.query("UPDATE gd_push_outbox SET status=$1,attempts=$2,next_attempt_at=CASE WHEN $1='retry' THEN NOW()+($3*INTERVAL '1 minute') ELSE NULL END,sent_at=CASE WHEN $1='sent' THEN NOW() ELSE sent_at END,payload=payload||$4::jsonb WHERE id=$5",[state,attempts,Math.min(30,attempts*5),JSON.stringify({lastError:delivered?null:lastError}),job.id]);
   if(state==="failed"){await sql.query("INSERT INTO gd_system_alerts(owner_id,trip_id,alert_type,severity,message,payload) VALUES($1,$2,'push_delivery_failed','critical',$3,$4::jsonb) ON CONFLICT DO NOTHING",[job.recipient_id,job.trip_id,"推播通知重試 3 次仍失敗",JSON.stringify({outboxId:job.id,lastError,title:job.title})]);const admins=await sql.query("SELECT owner_id FROM gd_admin_notification_bindings WHERE push_enabled=TRUE AND owner_id<>$1",[job.recipient_id]);for(const admin of admins){const recipient=String(admin.owner_id||"").trim();if(!recipient)continue;const eventType="critical_push_delivery_failed";const dup=await sql.query("SELECT id FROM gd_push_outbox WHERE recipient_id=$1 AND trip_id IS NOT DISTINCT FROM $2 AND event_type=$3 AND payload->>'sourceOutboxId'=$4 AND status IN ('pending','processing','retry','sent') LIMIT 1",[recipient,job.trip_id,eventType,String(job.id)]);if(!dup.length)await sql.query("INSERT INTO gd_push_outbox(recipient_id,trip_id,event_type,title,body,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[recipient,job.trip_id,eventType,"GD Car 最高權限異常通知","推播通知重試 3 次仍失敗｜"+job.title,JSON.stringify({sourceOutboxId:String(job.id),failedRecipient:job.recipient_id,lastError,severity:"critical"})]);}}
  }
  return {ok:true,processed:jobs.length,sent,failed,disabled,status:200};
 }catch(e){console.error("push worker",e);return {ok:false,error:"worker_failed",status:500}}
}
function authorized(req){
 const secret=process.env.PUSH_WORKER_SECRET||process.env.CRON_SECRET;
 return !!secret&&req.headers.get("authorization")==="Bearer "+secret;
}
export async function POST(req){if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const r=await run();return NextResponse.json(r,{status:r.status})}
export async function GET(req){if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const r=await run();return NextResponse.json(r,{status:r.status})}
