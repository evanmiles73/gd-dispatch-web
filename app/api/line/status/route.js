import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../../lib/db";
import {auth} from "../../../../lib/auth/server";

async function userFrom(){const r=await auth.getSession();return r?.user||r?.data?.user||null}
export async function GET(){
 const user=await userFrom();if(!user?.id)return NextResponse.json({ok:false,error:"login_required"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const owner=String(user.id);
  const groups=await sql.query("SELECT DISTINCT g.group_id,g.group_name,g.enabled,g.last_event_at,g.updated_at FROM gd_line_groups g JOIN gd_line_candidates c ON c.group_id=g.group_id JOIN gd_line_candidate_notifications n ON n.candidate_id=c.id WHERE n.owner_id=$1 ORDER BY g.enabled DESC,g.updated_at DESC LIMIT 100",[owner]);
  const candidates=await sql.query("SELECT c.id,c.group_id,c.payload,c.status,c.created_at,g.group_name FROM gd_line_candidates c JOIN gd_line_candidate_notifications n ON n.candidate_id=c.id LEFT JOIN gd_line_groups g ON g.group_id=c.group_id WHERE c.status='candidate' AND n.owner_id=$1 ORDER BY c.created_at DESC LIMIT 100",[owner]);
  return NextResponse.json({ok:true,mode:"silent",groups,candidates});
 }catch(e){console.error("LINE status GET",e);return NextResponse.json({ok:false,error:"unavailable"},{status:503})}
}
