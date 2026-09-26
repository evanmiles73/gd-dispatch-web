import {NextResponse} from "next/server";
import {auth} from "../../../../lib/auth/server";
import {getDb,ensureSchema} from "../../../../lib/db";
async function user(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
const arr=v=>Array.isArray(v)?v.map(x=>String(x).trim()).filter(Boolean).slice(0,50):[];
export async function GET(){
 const u=await user();if(!u?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);const rows=await sql.query("SELECT enabled,regions,airports,min_amount,keywords FROM gd_grab_preferences WHERE owner_id=$1",[String(u.id)]);
  return NextResponse.json({ok:true,preferences:rows[0]||{enabled:true,regions:[],airports:[],min_amount:0,keywords:[]}});
 }catch(e){console.error("grab preferences GET",e);return NextResponse.json({ok:false,error:"load_failed"},{status:500})}
}
export async function PUT(req){
 const u=await user();if(!u?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const b=await req.json();const enabled=b.enabled!==false,regions=arr(b.regions),airports=arr(b.airports),keywords=arr(b.keywords),min=Math.max(0,Math.min(999999,Number(b.minAmount||0)||0));
 await sql.query("INSERT INTO gd_grab_preferences(owner_id,enabled,regions,airports,min_amount,keywords,updated_at) VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb,NOW()) ON CONFLICT(owner_id) DO UPDATE SET enabled=EXCLUDED.enabled,regions=EXCLUDED.regions,airports=EXCLUDED.airports,min_amount=EXCLUDED.min_amount,keywords=EXCLUDED.keywords,updated_at=NOW()",[String(u.id),enabled,JSON.stringify(regions),JSON.stringify(airports),min,JSON.stringify(keywords)]);
 return NextResponse.json({ok:true});}catch(e){console.error("grab preferences PUT",e);return NextResponse.json({ok:false,error:"save_failed"},{status:500})}
}
