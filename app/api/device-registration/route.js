import {NextResponse} from "next/server";
import {auth} from "../../../lib/auth/server";
import {getDb,ensureSchema} from "../../../lib/db";

async function currentUser(){
  const r=await auth.getSession();
  return r?.user||r?.data?.user||null;
}

async function ensureDeviceSchema(sql){
  await ensureSchema(sql);
  await sql.query(`CREATE TABLE IF NOT EXISTS gd_device_registrations (
    token TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    device_name TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await sql.query("CREATE INDEX IF NOT EXISTS gd_device_registrations_owner_idx ON gd_device_registrations(owner_id)");
}

export async function PUT(req){
  const user=await currentUser();
  if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
  const sql=getDb();
  if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
  try{
    const body=await req.json();
    const token=String(body.token||"").trim();
    const platform=String(body.platform||"").toLowerCase();
    const deviceName=String(body.deviceName||"").slice(0,120);
    if(!token||token.length>512||!["ios","android"].includes(platform))
      return NextResponse.json({ok:false,error:"invalid_device"},{status:400});
    if(platform==="ios"&&!/^[a-fA-F0-9]{64,512}$/.test(token))
      return NextResponse.json({ok:false,error:"invalid_ios_token"},{status:400});
    await ensureDeviceSchema(sql);
    await sql.query(
      `INSERT INTO gd_device_registrations(token,owner_id,platform,device_name,enabled,updated_at)
       VALUES($1,$2,$3,$4,TRUE,NOW())
       ON CONFLICT(token) DO UPDATE SET owner_id=EXCLUDED.owner_id,platform=EXCLUDED.platform,
       device_name=EXCLUDED.device_name,enabled=TRUE,updated_at=NOW()`,
      [token,String(user.id),platform,deviceName]
    );
    return NextResponse.json({ok:true});
  }catch(e){
    console.error("device registration PUT",e);
    return NextResponse.json({ok:false,error:"registration_failed"},{status:500});
  }
}

export async function DELETE(req){
  const user=await currentUser();
  if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
  const sql=getDb();
  if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
  try{
    const body=await req.json();
    const token=String(body.token||"").trim();
    if(!token)return NextResponse.json({ok:false,error:"invalid_device"},{status:400});
    await ensureDeviceSchema(sql);
    await sql.query("UPDATE gd_device_registrations SET enabled=FALSE,updated_at=NOW() WHERE token=$1 AND owner_id=$2",[token,String(user.id)]);
    return NextResponse.json({ok:true});
  }catch(e){
    console.error("device registration DELETE",e);
    return NextResponse.json({ok:false,error:"unregister_failed"},{status:500});
  }
}
