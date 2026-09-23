import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {auth} from "../../../lib/auth/server";
async function userFrom(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
const ROOT_OWNERS=new Set(["delta198073@icloud.com","judehu100427@icloud.com"]);
async function accessFor(sql,u){const id=u?.id;if(!id)return {role:"free",pricing:false};const email=String(u.email||"").trim().toLowerCase();const configured=(process.env.GD_OWNER_EMAIL||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);if(ROOT_OWNERS.has(email)||configured.includes(email))return {role:"owner",pricing:true};const rows=await sql.query("SELECT role,pricing_enabled FROM gd_access_control WHERE owner_id=$1",[id]);const role=rows[0]?.role||"free";return {role,pricing:Boolean(rows[0]?.pricing_enabled)||["owner","admin","pro"].includes(role)}}
const okKind=k=>["grab_profiles","support_reports","drivers","preferences","pricing_rules"].includes(k);
export async function GET(req){
 const u=await userFrom();const owner=u?.id;if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const kind=new URL(req.url).searchParams.get("kind");if(!okKind(kind))return NextResponse.json({error:"invalid_kind"},{status:400});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const access=await accessFor(sql,u);if(kind==="pricing_rules"&&!access.pricing)return NextResponse.json({error:"pricing_forbidden",role:access.role},{status:403});const rows=await sql.query("SELECT payload FROM gd_user_data WHERE owner_id=$1 AND kind=$2",[owner,kind]);return NextResponse.json({cloud:true,data:rows[0]?.payload||[],access})}catch(e){console.error("GD user data GET failed",e);return NextResponse.json({error:"database_unavailable"},{status:503})}
}
export async function PUT(req){
 const u=await userFrom();const owner=u?.id;if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const body=await req.json();const kind=body.kind;if(!okKind(kind))return NextResponse.json({error:"invalid_kind"},{status:400});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const access=await accessFor(sql,u);if(kind==="pricing_rules"&&!access.pricing)return NextResponse.json({error:"pricing_forbidden",role:access.role},{status:403});await sql.query("INSERT INTO gd_user_data(owner_id,kind,payload,updated_at) VALUES($1,$2,$3::jsonb,NOW()) ON CONFLICT(owner_id,kind) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()",[owner,kind,JSON.stringify(body.data??[])]);return NextResponse.json({cloud:true,kind})}catch(e){console.error("GD user data PUT failed",e);return NextResponse.json({error:"sync_failed"},{status:500})}
}