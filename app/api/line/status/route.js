import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../../lib/db";
import {auth} from "../../../../lib/auth/server";

async function userFrom(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
export async function GET(){
 const user=await userFrom();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const groups=await sql.query("SELECT group_id,group_name,enabled,last_event_at,updated_at FROM gd_line_groups ORDER BY enabled DESC,updated_at DESC LIMIT 100");
  const candidates=await sql.query("SELECT c.id,c.group_id,c.payload,c.status,c.created_at,g.group_name FROM gd_line_candidates c LEFT JOIN gd_line_groups g ON g.group_id=c.group_id WHERE c.status='candidate' ORDER BY c.created_at DESC LIMIT 100");
  return NextResponse.json({ok:true,mode:"silent",groups,candidates});
 }catch(e){console.error("LINE status GET",e);return NextResponse.json({ok:false,error:"unavailable"},{status:503})}
}
