import {NextResponse} from "next/server";
import {auth} from "../../../lib/auth/server";
import {getDb,ensureSchema} from "../../../lib/db";

const ALLOWED=new Set(["出發","客上","客下"]);
async function currentUser(){const r=await auth.getSession();return r?.user||r?.data?.user||null}

export async function POST(req){
 const user=await currentUser();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  const b=await req.json(),tripId=String(b.tripId||"").trim(),status=String(b.status||"").trim();
  if(!tripId||!ALLOWED.has(status))return NextResponse.json({ok:false,error:"invalid_status"},{status:400});
  await ensureSchema(sql);
  const rows=await sql.query("SELECT owner_id,payload FROM gd_trips WHERE id=$1",[tripId]);
  if(!rows.length)return NextResponse.json({ok:false,error:"trip_not_found"},{status:404});
  const trip=rows[0],p=trip.payload||{},driverId=String(p.driverId||p.grabClaimedBy||"");
  if(driverId&&driverId!==String(user.id)&&trip.owner_id!==String(user.id))return NextResponse.json({ok:false,error:"forbidden"},{status:403});
  const managerId=String(p.dispatchManagerId||p.fleetManagerId||trip.owner_id||"");
  if(!managerId){
   await sql.query("INSERT INTO gd_system_alerts(owner_id,trip_id,alert_type,severity,message,payload) VALUES($1,$2,'dispatch_manager_missing','critical',$3,$4::jsonb) ON CONFLICT DO NOTHING",[trip.owner_id,tripId,"車趟狀態 "+status+" 無法找到派單管理員",JSON.stringify({status,driverId})]);
   return NextResponse.json({ok:false,error:"dispatch_manager_missing"},{status:409});
  }
  const title="GD Car 車趟回報｜"+status;
  const body=[status,"時間："+new Date().toLocaleString("zh-TW",{timeZone:"Asia/Taipei",hour12:false}),"司機："+String(p.driver||p.driverName||driverId||"未填"),"出發："+String(p.pickup||p.pickupAddress||""),"目的："+String(p.dropoff||p.dropoffAddress||"")].join("\n");
  const existing=await sql.query("SELECT id,status FROM gd_push_outbox WHERE recipient_id=$1 AND trip_id=$2 AND event_type=$3 AND status IN ('pending','processing','retry','sent') LIMIT 1",[managerId,tripId,"trip_status_"+status]);
  if(existing.length)return NextResponse.json({ok:true,deduplicated:true,outboxId:existing[0].id});
  const q=await sql.query("INSERT INTO gd_push_outbox(recipient_id,trip_id,event_type,title,body,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id",[managerId,tripId,"trip_status_"+status,title,body,JSON.stringify({tripId,status,driverId,dispatchManagerId:managerId})]);
  return NextResponse.json({ok:true,status,dispatchManagerId:managerId,outboxId:q[0]?.id||null});
 }catch(e){console.error("trip status report",e);return NextResponse.json({ok:false,error:"status_report_failed"},{status:500})}
}
