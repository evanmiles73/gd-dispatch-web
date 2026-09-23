import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";

export async function GET(){
 const sql=getDb();
 if(!sql)return NextResponse.json({cloud:false,trips:[],error:"database_not_configured"},{status:503});
 try{
   await ensureSchema(sql);
   const rows=await sql.query("SELECT payload FROM gd_trips ORDER BY updated_at DESC");
   return NextResponse.json({cloud:true,trips:rows.map(r=>r.payload)});
 }catch(e){
   console.error("GD trips GET failed",e);
   return NextResponse.json({cloud:false,trips:[],error:"database_unavailable"},{status:503});
 }
}

export async function PUT(req){
 const sql=getDb();
 if(!sql)return NextResponse.json({cloud:false,error:"database_not_configured"},{status:503});
 try{
   await ensureSchema(sql);
   const body=await req.json();
   const trips=Array.isArray(body.trips)?body.trips:(body.trip?[body.trip]:[]);
   for(const t of trips){
     if(t?.id==null)continue;
     await sql.query(
       "INSERT INTO gd_trips(id,payload,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()",
       [String(t.id),JSON.stringify(t)]
     );
   }
   return NextResponse.json({cloud:true,count:trips.length});
 }catch(e){
   console.error("GD trips PUT failed",e);
   return NextResponse.json({cloud:false,error:"sync_failed"},{status:500});
 }
}

export async function DELETE(req){
 const sql=getDb();
 if(!sql)return NextResponse.json({cloud:false,error:"database_not_configured"},{status:503});
 try{
   await ensureSchema(sql);
   const id=new URL(req.url).searchParams.get("id");
   if(!id)return NextResponse.json({cloud:false,error:"missing_id"},{status:400});
   await sql.query("DELETE FROM gd_trips WHERE id = $1",[String(id)]);
   return NextResponse.json({cloud:true,id:String(id)});
 }catch(e){
   console.error("GD trips DELETE failed",e);
   return NextResponse.json({cloud:false,error:"delete_failed"},{status:500});
 }
}
