import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {auth} from "../../../lib/auth/server";

async function ownerFrom(){
 const result=await auth.getSession();
 const user=result?.user||result?.data?.user;
 return user?.id||null;
}
const unauthorized=()=>NextResponse.json({cloud:false,error:"unauthorized"},{status:401});

export async function GET(){
 const owner=await ownerFrom(); if(!owner)return unauthorized();
 const sql=getDb(); if(!sql)return NextResponse.json({cloud:false,trips:[],error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const rows=await sql.query("SELECT payload FROM gd_trips WHERE owner_id=$1 ORDER BY updated_at DESC",[owner]);
  return NextResponse.json({cloud:true,trips:rows.map(r=>r.payload)});
 }catch(e){console.error("GD trips GET failed",e);return NextResponse.json({cloud:false,trips:[],error:"database_unavailable"},{status:503})}
}

export async function PUT(req){
 const owner=await ownerFrom(); if(!owner)return unauthorized();
 const sql=getDb(); if(!sql)return NextResponse.json({cloud:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const body=await req.json();
  const trips=Array.isArray(body.trips)?body.trips:(body.trip?[body.trip]:[]);
  for(const t of trips){
   if(t?.id==null)continue;
   if(t._baseUpdatedAt){
    const current=await sql.query("SELECT payload FROM gd_trips WHERE id=$1 AND owner_id=$2",[String(t.id),owner]);
    const currentStamp=current[0]?.payload?._updatedAt||"";
    if(currentStamp&&currentStamp!==t._baseUpdatedAt)return NextResponse.json({cloud:false,error:"conflict",id:String(t.id)},{status:409});
   }
   const payload={...t}; delete payload._baseUpdatedAt;
   await sql.query("INSERT INTO gd_trips(id,payload,updated_at,owner_id) VALUES ($1,$2::jsonb,NOW(),$3) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW() WHERE gd_trips.owner_id=EXCLUDED.owner_id",[String(t.id),JSON.stringify(payload),owner]);
  }
  return NextResponse.json({cloud:true,count:trips.length});
 }catch(e){console.error("GD trips PUT failed",e);return NextResponse.json({cloud:false,error:"sync_failed"},{status:500})}
}

export async function DELETE(req){
 const owner=await ownerFrom(); if(!owner)return unauthorized();
 const sql=getDb(); if(!sql)return NextResponse.json({cloud:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const id=new URL(req.url).searchParams.get("id");
  if(!id)return NextResponse.json({cloud:false,error:"missing_id"},{status:400});
  await sql.query("DELETE FROM gd_trips WHERE id=$1 AND owner_id=$2",[String(id),owner]);
  return NextResponse.json({cloud:true,id:String(id)});
 }catch(e){console.error("GD trips DELETE failed",e);return NextResponse.json({cloud:false,error:"delete_failed"},{status:500})}
}
