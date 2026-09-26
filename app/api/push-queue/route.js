import {NextResponse} from "next/server";
import {auth} from "../../../lib/auth/server";
import {getDb,ensureSchema} from "../../../lib/db";

async function currentUser(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
async function ensurePushSchema(sql){
 await ensureSchema(sql);
 await sql.query(`CREATE TABLE IF NOT EXISTS gd_device_registrations (
  token TEXT PRIMARY KEY, owner_id TEXT NOT NULL, platform TEXT NOT NULL,
  device_name TEXT, enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
 await sql.query(`CREATE TABLE IF NOT EXISTS gd_push_outbox (
  id BIGSERIAL PRIMARY KEY, recipient_id TEXT NOT NULL, trip_id TEXT,
  event_type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ
 )`);
 await sql.query("CREATE INDEX IF NOT EXISTS gd_push_outbox_recipient_idx ON gd_push_outbox(recipient_id,status,created_at)");
}

export async function POST(req){
 const user=await currentUser();
 if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  const b=await req.json(),tripId=String(b.tripId||""),recipientId=String(b.recipientId||"");
  const eventType=String(b.eventType||"trip_notice").slice(0,60);
  const title=String(b.title||"GD Car 車趟通知").slice(0,120);
  const body=String(b.body||"你有新的車趟通知").slice(0,500);
  if(!tripId||!recipientId)return NextResponse.json({ok:false,error:"missing_target"},{status:400});
  await ensurePushSchema(sql);
  const owned=await sql.query("SELECT 1 FROM gd_trips WHERE id=$1 AND owner_id=$2",[tripId,String(user.id)]);
  if(!owned.length)return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  const tripRows=await sql.query("SELECT payload FROM gd_trips WHERE id=$1 AND owner_id=$2",[tripId,String(user.id)]);
  const trip=tripRows[0]?.payload||{};
  const claim=await sql.query("SELECT 1 FROM gd_grab_claims WHERE trip_id=$1 AND driver_id=$2",[tripId,recipientId]);
  const assignedIds=[trip.driverId,trip.driverPhone,trip.driver,trip.driverLineUserId].filter(Boolean).map(v=>String(v).trim()).filter(Boolean);
  const normalizedRecipientId=recipientId.trim();
  const isAssigned=claim.length>0||assignedIds.includes(normalizedRecipientId);
  if(!isAssigned)return NextResponse.json({ok:false,error:"recipient_not_assigned"},{status:409});
  const devices=await sql.query("SELECT token,platform FROM gd_device_registrations WHERE owner_id=$1 AND enabled=TRUE",[recipientId]);
  const existing=await sql.query("SELECT id,status FROM gd_push_outbox WHERE recipient_id=$1 AND trip_id=$2 AND event_type=$3 AND status IN ('pending','processing','retry','sent') ORDER BY created_at DESC LIMIT 1",[recipientId,tripId,eventType]);
  if(existing.length)return NextResponse.json({ok:true,outboxId:existing[0].id,registeredDevices:devices.length,status:existing[0].status,deduplicated:true});
  const q=await sql.query(
   "INSERT INTO gd_push_outbox(recipient_id,trip_id,event_type,title,body,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id",
   [recipientId,tripId,eventType,title,body,JSON.stringify({tripId,eventType})]
  );
  return NextResponse.json({ok:true,outboxId:q[0]?.id||null,registeredDevices:devices.length,status:"queued",deduplicated:false});
 }catch(e){console.error("push queue POST",e);return NextResponse.json({ok:false,error:"queue_failed"},{status:500})}
}
