import {NextResponse} from "next/server";
import {auth} from "../../../lib/auth/server";
import {getDb,ensureSchema} from "../../../lib/db";

async function currentUser(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
export async function GET(){
 const user=await currentUser();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const rows=await sql.query("SELECT id,trip_id,alert_type,severity,status,message,payload,created_at,resolved_at FROM gd_system_alerts WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100",[String(user.id)]);return NextResponse.json({ok:true,alerts:rows})}
 catch(e){console.error("system alerts GET",e);return NextResponse.json({ok:false,error:"unavailable"},{status:503})}
}
export async function POST(req){
 const user=await currentUser();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  const b=await req.json(),id=Number(b.id);if(!id)return NextResponse.json({ok:false,error:"missing_alert"},{status:400});
  await ensureSchema(sql);
  const rows=await sql.query("UPDATE gd_system_alerts SET status='resolved',resolved_at=NOW() WHERE id=$1 AND owner_id=$2 RETURNING id",[id,String(user.id)]);
  if(!rows.length)return NextResponse.json({ok:false,error:"not_found"},{status:404});
  return NextResponse.json({ok:true,id,status:"resolved"});
 }catch(e){console.error("system alerts POST",e);return NextResponse.json({ok:false,error:"resolve_failed"},{status:500})}
}
