import {NextResponse} from "next/server";
import {auth} from "../../../lib/auth/server";
import {getDb,ensureSchema} from "../../../lib/db";

async function userFrom(){const r=await auth.getSession();return r?.user||r?.data?.user||null}

export async function GET(){
 const user=await userFrom();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const rows=await sql.query("SELECT driver_id,line_user_id,enabled,updated_at FROM gd_driver_line_bindings WHERE owner_id=$1 ORDER BY updated_at DESC",[String(user.id)]);return NextResponse.json({ok:true,bindings:rows})}
 catch(e){console.error("driver LINE bindings GET",e);return NextResponse.json({ok:false,error:"unavailable"},{status:503})}
}

export async function PUT(req){
 const user=await userFrom();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  const b=await req.json(),driverId=String(b.driverId||"").trim(),lineUserId=String(b.lineUserId||"").trim();
  if(!driverId||!/^U[0-9A-Za-z_-]{20,}$/.test(lineUserId))return NextResponse.json({ok:false,error:"invalid_binding"},{status:400});
  await ensureSchema(sql);
  await sql.query("INSERT INTO gd_driver_line_bindings(owner_id,driver_id,line_user_id,enabled,updated_at) VALUES($1,$2,$3,true,NOW()) ON CONFLICT(owner_id,driver_id) DO UPDATE SET line_user_id=EXCLUDED.line_user_id,enabled=true,updated_at=NOW()",[String(user.id),driverId,lineUserId]);
  return NextResponse.json({ok:true,driverId,enabled:true});
 }catch(e){console.error("driver LINE bindings PUT",e);return NextResponse.json({ok:false,error:"save_failed"},{status:500})}
}

export async function DELETE(req){
 const user=await userFrom();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  const b=await req.json(),driverId=String(b.driverId||"").trim();if(!driverId)return NextResponse.json({ok:false,error:"missing_driver"},{status:400});
  await ensureSchema(sql);await sql.query("UPDATE gd_driver_line_bindings SET enabled=false,updated_at=NOW() WHERE owner_id=$1 AND driver_id=$2",[String(user.id),driverId]);
  return NextResponse.json({ok:true,driverId,enabled:false});
 }catch(e){console.error("driver LINE bindings DELETE",e);return NextResponse.json({ok:false,error:"save_failed"},{status:500})}
}
