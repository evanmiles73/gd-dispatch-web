import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../../lib/db";
import {parseLineTrip,likelyTrip} from "../../../../lib/line-trip-parser";
export const runtime="nodejs";
export async function POST(req){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({ok:false,error:"database_not_configured"},{status:503});
 try{
  await ensureSchema(sql);const rows=await sql.query("SELECT id,payload FROM gd_line_inbox WHERE processed=false AND source='line_group' ORDER BY id ASC LIMIT 100");let matched=0,queued=0;
  const prefs=await sql.query("SELECT owner_id,regions,airports,min_amount,keywords FROM gd_grab_preferences WHERE enabled=true");
  for(const row of rows){
   const parsed=parseLineTrip(row.payload?.text||"");
   if(likelyTrip(parsed)){
    const cand=await sql.query("INSERT INTO gd_line_candidates(inbox_id,group_id,payload,status) VALUES($1,$2,$3::jsonb,'candidate') ON CONFLICT(inbox_id) DO UPDATE SET payload=EXCLUDED.payload RETURNING id",[row.id,String(row.payload?.groupId||""),JSON.stringify(parsed)]);matched++;
    const candidateId=cand[0]?.id;
    for(const p of prefs){
     const regions=Array.isArray(p.regions)?p.regions:[],airports=Array.isArray(p.airports)?p.airports:[],keywords=Array.isArray(p.keywords)?p.keywords:[];
     const ok=(!regions.length||regions.some(x=>parsed.areas.includes(String(x))))&&(!airports.length||airports.some(x=>parsed.raw.includes(String(x))))&&(Number(parsed.amount||0)>=Number(p.min_amount||0))&&(!keywords.length||keywords.some(x=>parsed.raw.includes(String(x))));
     if(ok&&candidateId){
      const once=await sql.query("INSERT INTO gd_line_candidate_notifications(candidate_id,owner_id) VALUES($1,$2) ON CONFLICT(candidate_id,owner_id) DO NOTHING RETURNING candidate_id",[candidateId,String(p.owner_id)]);
      if(once.length){const summary=(parsed.date+" "+parsed.time+" "+parsed.areas.join("→")+" "+parsed.airport+(parsed.amount?" $"+parsed.amount:"")).trim();await sql.query("INSERT INTO gd_push_outbox(recipient_id,event_type,title,body,payload) VALUES($1,'line_grab_match','GD Car 發現符合車趟',$2,$3::jsonb)",[String(p.owner_id),summary||"LINE 群組有新的符合車趟",JSON.stringify({source:"line_group",candidateId,groupId:row.payload?.groupId||null})]);queued++}
     }
    }
   }
   await sql.query("UPDATE gd_line_inbox SET processed=true WHERE id=$1",[row.id]);
  }
  return NextResponse.json({ok:true,processed:rows.length,matched,queued});
 }catch(e){console.error("LINE inbox processor",e);return NextResponse.json({ok:false,error:"processor_failed"},{status:500})}
}
