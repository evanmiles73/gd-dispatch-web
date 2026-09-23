import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {sendApns} from "../../../lib/apns";

export async function POST(req){
 if(!process.env.PUSH_WORKER_SECRET||req.headers.get("authorization")!=="Bearer "+process.env.PUSH_WORKER_SECRET)
  return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const jobs=await sql.query("SELECT id,recipient_id,trip_id,title,body FROM gd_push_outbox WHERE status='pending' ORDER BY created_at ASC LIMIT 20");
  let sent=0,failed=0;
  for(const job of jobs){
   const devices=await sql.query("SELECT token FROM gd_device_registrations WHERE owner_id=$1 AND platform='ios' AND enabled=TRUE",[job.recipient_id]);
   if(!devices.length){await sql.query("UPDATE gd_push_outbox SET status='no_device' WHERE id=$1",[job.id]);continue}
   let delivered=false,lastError="send_failed";
   for(const d of devices){
    const result=await sendApns({token:d.token,title:job.title,body:job.body,tripId:job.trip_id});
    if(result.ok){delivered=true;sent++}
    else{lastError=result.error||lastError;failed++;if(result.disableToken)await sql.query("UPDATE gd_device_registrations SET enabled=FALSE,updated_at=NOW() WHERE token=$1",[d.token])}
   }
   await sql.query("UPDATE gd_push_outbox SET status=$1,sent_at=CASE WHEN $1='sent' THEN NOW() ELSE sent_at END,payload=payload||$2::jsonb WHERE id=$3",[delivered?"sent":"failed",JSON.stringify({lastError:delivered?null:lastError}),job.id]);
  }
  return NextResponse.json({ok:true,processed:jobs.length,sent,failed});
 }catch(e){console.error("push worker",e);return NextResponse.json({ok:false,error:"worker_failed"},{status:500})}
}
