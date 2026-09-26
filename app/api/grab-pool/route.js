import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {auth} from "../../../lib/auth/server";

async function userFrom(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
const ROOT_OWNERS=new Set(["delta198073@icloud.com","judehu100427@icloud.com"]);
async function canGrab(sql,u){const email=String(u?.email||"").trim().toLowerCase();const configured=(process.env.GD_OWNER_EMAIL||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);if(ROOT_OWNERS.has(email)||configured.includes(email))return true;const rows=await sql.query("SELECT role,status,pro_expires_at FROM gd_access_control WHERE owner_id=$1",[u.id]);const a=rows[0];if(!a||a.status==="suspended")return false;if(a.role==="pro"&&a.pro_expires_at&&new Date(a.pro_expires_at)<=new Date())return false;return ["pro","admin"].includes(a.role)}
const safeTrip=t=>({id:t.id,date:t.date,time:t.time,service:t.service,region:t.region,airport:t.airport,carClass:t.carClass||t.vehicle||"",amount:t.amount||"",pickupArea:t.region||"",dropoffArea:t.airport||"",luggage:t.luggage||"",carryOn:t.carryOn||"",childSeat:t.childSeat||0,booster:t.booster||0,notes:t.notes||""});

export async function GET(){
 const user=await userFrom();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);if(!await canGrab(sql,user))return NextResponse.json({ok:false,error:"feature_forbidden",feature:"grab"},{status:403});const rows=await sql.query("SELECT t.payload FROM gd_trips t LEFT JOIN gd_grab_claims c ON c.trip_id=t.id WHERE COALESCE((t.payload->>'grabPublished')::boolean,false)=true AND c.trip_id IS NULL AND COALESCE(t.payload->>'status','') NOT IN ('已接','已派','已完成') ORDER BY t.updated_at DESC LIMIT 100");return NextResponse.json({ok:true,trips:rows.map(r=>safeTrip(r.payload))})}catch(e){console.error("grab pool GET",e);return NextResponse.json({ok:false,error:"unavailable"},{status:503})}
}
export async function POST(req){
 const user=await userFrom();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);if(!await canGrab(sql,user))return NextResponse.json({ok:false,error:"feature_forbidden",feature:"grab"},{status:403});const body=await req.json();const id=String(body.tripId||"");if(!id)return NextResponse.json({ok:false,error:"missing_trip"},{status:400});
 const rows=await sql.query("SELECT owner_id,payload FROM gd_trips WHERE id=$1",[id]);const row=rows[0];if(!row||row.payload?.grabPublished!==true||['已接','已派','已完成'].includes(row.payload?.status))return NextResponse.json({ok:false,error:"not_available"},{status:409});
 const name=String(body.driverName||user.name||user.email||"司機").slice(0,80),phone=String(body.driverPhone||"").slice(0,30);
 const claim=await sql.query("INSERT INTO gd_grab_claims(trip_id,owner_id,driver_id,driver_name,driver_phone) VALUES($1,$2,$3,$4,$5) ON CONFLICT(trip_id) DO NOTHING RETURNING trip_id",[id,row.owner_id,String(user.id),name,phone]);
 if(!claim.length)return NextResponse.json({ok:false,error:"already_claimed"},{status:409});
 const now=new Date().toISOString();const p={...row.payload,status:"已接",driver:name,driverPhone:phone,grabPublished:false,grabClaimedBy:String(user.id),grabClaimedAt:now,_updatedAt:now};delete p._baseUpdatedAt;
 const updated=await sql.query("UPDATE gd_trips SET payload=$1::jsonb,updated_at=NOW() WHERE id=$2 AND owner_id=$3 RETURNING id",[JSON.stringify(p),id,row.owner_id]);
 if(!updated.length){await sql.query("DELETE FROM gd_grab_claims WHERE trip_id=$1 AND driver_id=$2",[id,String(user.id)]);return NextResponse.json({ok:false,error:"claim_update_failed"},{status:409});}
 try{await sql.query("INSERT INTO gd_push_outbox(recipient_id,trip_id,event_type,title,body,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[String(user.id),id,"trip_claimed","GD Car 接單成功","你已成功接下 "+(p.date||"")+" "+(p.time||"")+" 的車趟",JSON.stringify({tripId:id,eventType:"trip_claimed"})])}catch(pushError){console.error("grab claim push queue",pushError)}
 return NextResponse.json({ok:true,trip:safeTrip(p)});
 }catch(e){console.error("grab pool POST",e);return NextResponse.json({ok:false,error:"claim_failed"},{status:500})}
}