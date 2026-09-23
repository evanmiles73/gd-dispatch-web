import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {auth} from "../../../lib/auth/server";
async function userFrom(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
async function roleFor(sql,u){const configured=(process.env.GD_OWNER_EMAIL||"").trim().toLowerCase();if(configured&&String(u?.email||"").toLowerCase()===configured)return "owner";const rows=await sql.query("SELECT role FROM gd_access_control WHERE owner_id=$1",[u.id]);return rows[0]?.role||"free"}
export async function GET(){
 const u=await userFrom();if(!u?.id)return NextResponse.json({error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const role=await roleFor(sql,u);if(role!=="owner")return NextResponse.json({error:"owner_only"},{status:403});const rows=await sql.query("SELECT owner_id,email,role,pricing_enabled,updated_at FROM gd_access_control ORDER BY updated_at DESC");return NextResponse.json({role,users:rows})}catch(e){console.error("GD access GET failed",e);return NextResponse.json({error:"database_unavailable"},{status:503})}
}
export async function PUT(req){
 const u=await userFrom();if(!u?.id)return NextResponse.json({error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const role=await roleFor(sql,u);if(role!=="owner")return NextResponse.json({error:"owner_only"},{status:403});const b=await req.json();const target=String(b.ownerId||"").trim(),nextRole=["admin","pro","free"].includes(b.role)?b.role:null;if(!target||!nextRole)return NextResponse.json({error:"invalid_request"},{status:400});await sql.query("INSERT INTO gd_access_control(owner_id,email,role,pricing_enabled,updated_at) VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(owner_id) DO UPDATE SET email=EXCLUDED.email,role=EXCLUDED.role,pricing_enabled=EXCLUDED.pricing_enabled,updated_at=NOW()",[target,String(b.email||""),nextRole,nextRole==="admin"||nextRole==="pro"]);return NextResponse.json({ok:true,role:nextRole})}catch(e){console.error("GD access PUT failed",e);return NextResponse.json({error:"update_failed"},{status:500})}
}