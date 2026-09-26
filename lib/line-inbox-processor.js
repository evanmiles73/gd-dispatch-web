import {getDb,ensureSchema} from "./db";
import {parseLineTrip,likelyTrip} from "./line-trip-parser";

export async function processLineInboxRow(sql,row){
 const parsed=parseLineTrip(row.payload?.text||"");
 console.log("[GD LINE] parsed",{inboxId:row.id,groupId:row.payload?.groupId||null,parsed});
 if(!likelyTrip(parsed)){await sql.query("UPDATE gd_line_inbox SET processed=true WHERE id=$1",[row.id]);console.log("[GD LINE] ignored non-trip",{inboxId:row.id});return {matched:0,queued:0}}
 const cand=await sql.query("INSERT INTO gd_line_candidates(inbox_id,group_id,payload,status) VALUES($1,$2,$3::jsonb,'candidate') ON CONFLICT(inbox_id) DO UPDATE SET payload=EXCLUDED.payload RETURNING id",[row.id,String(row.payload?.groupId||""),JSON.stringify(parsed)]);
 const candidateId=cand[0]?.id;let queued=0;
 let prefs=await sql.query("SELECT owner_id,regions,airports,min_amount,keywords FROM gd_grab_preferences WHERE enabled=true");
 if(!prefs.length){
  try{
   // Seed from GD Car-owned tables. Neon Auth users are not stored in a local "user" table.
   // Device registrations/user data cover signed-in app users; access control covers managed accounts.
   await sql.query("INSERT INTO gd_grab_preferences(owner_id,enabled,regions,airports,min_amount,keywords,updated_at) SELECT DISTINCT owner_id,true,'[]'::jsonb,'[]'::jsonb,0,'[]'::jsonb,NOW() FROM (SELECT owner_id FROM gd_access_control WHERE status<>'suspended' UNION SELECT owner_id FROM gd_device_registrations WHERE enabled=true UNION SELECT owner_id FROM gd_user_data) owners WHERE owner_id IS NOT NULL AND owner_id<>'' ON CONFLICT(owner_id) DO NOTHING");
   prefs=await sql.query("SELECT owner_id,regions,airports,min_amount,keywords FROM gd_grab_preferences WHERE enabled=true");
   console.log("[GD LINE] seeded default grab preferences",{preferenceCount:prefs.length});
  }catch(e){console.error("[GD LINE] default preference seed failed",e)}
 }
 console.log("[GD LINE] candidate",{inboxId:row.id,candidateId,preferenceCount:prefs.length});
 for(const p of prefs){
  const regions=Array.isArray(p.regions)?p.regions:[],airports=Array.isArray(p.airports)?p.airports:[],keywords=Array.isArray(p.keywords)?p.keywords:[];
  const ok=(!regions.length||regions.some(x=>parsed.areas.includes(String(x))))&&(!airports.length||airports.some(x=>parsed.raw.includes(String(x))))&&(Number(parsed.amount||0)>=Number(p.min_amount||0))&&(!keywords.length||keywords.some(x=>parsed.raw.includes(String(x))));
  if(ok&&candidateId){
   const once=await sql.query("INSERT INTO gd_line_candidate_notifications(candidate_id,owner_id) VALUES($1,$2) ON CONFLICT(candidate_id,owner_id) DO NOTHING RETURNING candidate_id",[candidateId,String(p.owner_id)]);
   if(once.length){const summary=(parsed.date+" "+parsed.time+" "+parsed.areas.join("→")+" "+parsed.airport+(parsed.amount?" $"+parsed.amount:"")).trim();await sql.query("INSERT INTO gd_push_outbox(recipient_id,event_type,title,body,payload) VALUES($1,'line_grab_match','GD Car 發現符合車趟',$2,$3::jsonb)",[String(p.owner_id),summary||"LINE 群組有新的符合車趟",JSON.stringify({source:"line_group",candidateId,groupId:row.payload?.groupId||null})]);queued++}
  }
 }
 await sql.query("UPDATE gd_line_inbox SET processed=true WHERE id=$1",[row.id]);console.log("[GD LINE] candidate complete",{inboxId:row.id,candidateId,queued});return {matched:1,queued};
}
export async function processPendingLineInbox(limit=100){
 const sql=getDb();if(!sql)throw new Error("database_not_configured");await ensureSchema(sql);
 const safeLimit=Math.max(1,Math.min(100,Number(limit)||100));
 const rows=await sql.query("SELECT id,payload FROM gd_line_inbox WHERE processed=false AND source='line_group' ORDER BY id ASC LIMIT $1",[safeLimit]);let matched=0,queued=0,processed=0,failed=0;
 for(const row of rows){try{const r=await processLineInboxRow(sql,row);matched+=r.matched;queued+=r.queued;processed++}catch(e){failed++;console.error("LINE inbox row",row.id,e);await sql.query("UPDATE gd_line_inbox SET processed=false WHERE id=$1",[row.id])}}
 return {processed,failed,matched,queued};
}
// Production sync marker: keeps Git/Vercel deployment aligned without changing runtime behavior.
