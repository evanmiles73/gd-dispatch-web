import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../../lib/db";
import {parseLineTrip,likelyTrip} from "../../../../lib/line-trip-parser";

export const runtime="nodejs";
export async function POST(req){
 if(process.env.CRON_SECRET&&req.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);
  const rows=await sql.query("SELECT id,payload FROM gd_line_inbox WHERE processed=false AND source='line_group' ORDER BY id ASC LIMIT 100");
  let matched=0;
  for(const row of rows){
   const parsed=parseLineTrip(row.payload?.text||"");
   if(likelyTrip(parsed)){
    await sql.query("INSERT INTO gd_line_candidates(inbox_id,group_id,payload,status) VALUES($1,$2,$3::jsonb,'candidate') ON CONFLICT(inbox_id) DO NOTHING",[row.id,String(row.payload?.groupId||""),JSON.stringify(parsed)]);
    matched++;
   }
   await sql.query("UPDATE gd_line_inbox SET processed=true WHERE id=$1",[row.id]);
  }
  return NextResponse.json({ok:true,processed:rows.length,matched});
 }catch(e){console.error("LINE inbox processor",e);return NextResponse.json({ok:false,error:"processor_failed"},{status:500})}
}
