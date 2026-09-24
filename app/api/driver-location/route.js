import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {auth} from "../../../lib/auth/server";
async function ownerFrom(){const r=await auth.getSession();const u=r?.user||r?.data?.user;return u?.id||null}
export async function GET(){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);await sql.query("DELETE FROM gd_driver_locations WHERE owner_id=$1 AND updated_at < NOW()-INTERVAL '3 hours'",[owner]);const rows=await sql.query("SELECT driver_id,lat,lng,accuracy,trip_id,updated_at FROM gd_driver_locations WHERE owner_id=$1 ORDER BY updated_at DESC",[owner]);return NextResponse.json({cloud:true,locations:rows})}catch(e){return NextResponse.json({error:"database_unavailable"},{status:503})}
}
export async function PUT(req){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const b=await req.json();if(!b.driverId||!Number.isFinite(Number(b.lat))||!Number.isFinite(Number(b.lng)))return NextResponse.json({error:"invalid_location"},{status:400});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);await sql.query("INSERT INTO gd_driver_locations(owner_id,driver_id,lat,lng,accuracy,trip_id,updated_at) VALUES($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT(owner_id,driver_id) DO UPDATE SET lat=EXCLUDED.lat,lng=EXCLUDED.lng,accuracy=EXCLUDED.accuracy,trip_id=EXCLUDED.trip_id,updated_at=NOW()",[owner,String(b.driverId),Number(b.lat),Number(b.lng),Number(b.accuracy)||null,b.tripId?String(b.tripId):null]);return NextResponse.json({cloud:true})}catch(e){return NextResponse.json({error:"sync_failed"},{status:500})}
}
export async function DELETE(req){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const tripId=new URL(req.url).searchParams.get("tripId");if(!tripId)return NextResponse.json({error:"missing_trip_id"},{status:400});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);await sql.query("DELETE FROM gd_driver_locations WHERE owner_id=$1 AND trip_id=$2",[owner,String(tripId)]);return NextResponse.json({cloud:true,tripId:String(tripId)})}catch(e){return NextResponse.json({error:"delete_failed"},{status:500})}
}
