import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {sendApns} from "../../../lib/apns";

async function run(){
 const sql=getDb();if(!sql)return {ok:false,error:"database_not_configured",status:503};
 try{
  await ensureSchema(sql);
  const jobs=await sql.query("SELECT id,recipient_id,trip_id,title,body,attempts FROM gd_push_outbox WHERE status IN ('pending','retry') AND (next_attempt_at IS NULL OR next_attempt_at<=NOW()) ORDER BY created_at ASC LIMIT 20");
  let sent=0,failed=0;
  for(const job of jobs){
   const devices=await sql.query("SELECT token FROM gd_device_registrations WHERE owner_id=$1 AND platform='ios' AND enabled=TRUE",[job.recipient_id]);
   if(!devices.length){await sql.query("UPDATE gd_push_outbox SET status='no_device' WHERE id=$1",[job.id]);continue}
   let delivered=false,lastError="send_failed";
   for(const d of devices){
    const result=await sendApns({token:d.token,title:job.title,body:job.body,tripId:job.trip_id});
    if(result.ok){delivered=true;sent++}else{lastError=result.error||lastError;failed++;if(result.disableToken)await sql.query("UPDATE gd_device_registrations SET enabled=FALSE,updated_at=NOW() WHERE token=$1",[d.token])}
   }
   const attempts=Number(job.attempts||0)+1;const state=delivered?"sent":attempts>=3?"failed":"retry";
   await sql.query("UPDATE gd_push_outbox SET status=$1,attempts=$2,next_attempt_at=CASE WHEN $1='retry' THEN NOW()+($3*INTERVAL '1 minute') ELSE NULL END,sent_at=CASE WHEN $1='sent' THEN NOW() ELSE sent_at END,payload=payload||$4::jsonb WHERE id=$5",[state,attempts,Math.min(30,attempts*5),JSON.stringify({lastError:delivered?null:lastError}),job.id]);
  }
  return {ok:true,processed:jobs.length,sent,failed,status:200};
 }catch(e){console.error("push worker",e);return {ok:false,error:"worker_failed",status:500}}
}
function authorized(req){
 const secret=process.env.PUSH_WORKER_SECRET;
 return !!secret&&(req.headers.get("authorization")==="Bearer "+secret||req.headers.get("x-vercel-cron")==="1");
}
export async function POST(req){if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const r=await run();return NextResponse.json(r,{status:r.status})}
export async function GET(req){if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const r=await run();return NextResponse.json(r,{status:r.status})}
