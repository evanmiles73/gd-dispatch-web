import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {auth} from "../../../lib/auth/server";
async function ownerFrom(){const r=await auth.getSession();const u=r?.user||r?.data?.user;return u?.id||null}
const okKind=k=>["grab_profiles","support_reports","drivers","preferences"].includes(k);
export async function GET(req){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const kind=new URL(req.url).searchParams.get("kind");if(!okKind(kind))return NextResponse.json({error:"invalid_kind"},{status:400});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const rows=await sql.query("SELECT payload FROM gd_user_data WHERE owner_id=$1 AND kind=$2",[owner,kind]);return NextResponse.json({cloud:true,data:rows[0]?.payload||[]})}catch(e){console.error("GD user data GET failed",e);return NextResponse.json({error:"database_unavailable"},{status:503})}
}
export async function PUT(req){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const body=await req.json();const kind=body.kind;if(!okKind(kind))return NextResponse.json({error:"invalid_kind"},{status:400});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);await sql.query("INSERT INTO gd_user_data(owner_id,kind,payload,updated_at) VALUES($1,$2,$3::jsonb,NOW()) ON CONFLICT(owner_id,kind) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()",[owner,kind,JSON.stringify(body.data??[])]);return NextResponse.json({cloud:true,kind})}catch(e){console.error("GD user data PUT failed",e);return NextResponse.json({error:"sync_failed"},{status:500})}
}