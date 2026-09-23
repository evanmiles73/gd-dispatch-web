import {NextResponse} from "next/server";
import {getDb,ensureSchema} from "../../../lib/db";
import {auth} from "../../../lib/auth/server";
async function ownerFrom(){const r=await auth.getSession();const u=r?.user||r?.data?.user;return u?.id||null}
const start=t=>new Date(`${t.date||""}T${t.time||"00:00"}:00+08:00`);
const map=a=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(a||"");
const text=t=>{const special=[Number(t.childSeat)>0?`安全座椅 × ${t.childSeat}`:"",Number(t.booster)>0?`增高墊 × ${t.booster}`:""].filter(Boolean).join("、");return `【GD Car 出車提醒】\n${(t.date||"").replace(/-/g,"/")} ${t.service||"車趟"}｜${t.time||"未填時間"} 出發\n出發：${t.pickup||"未填"}\n地圖：${map(t.pickup)}\n目的：${t.dropoff||"未填"}\n地圖：${map(t.dropoff)}${special?`\n特殊需求：${special}`:""}`}
export async function GET(){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});
 try{await ensureSchema(sql);const rows=await sql.query("SELECT payload FROM gd_trips WHERE owner_id=$1",[owner]);const due=[];for(const r of rows){const t=r.payload;if(!["已接","已派"].includes(t.status))continue;const h=(start(t)-Date.now())/36e5;let type=null;if(h>0&&h<=2)type="2h";else if(h>2&&h<=24&&t.reminder24h!=="否")type="24h";if(!type)continue;const sent=await sql.query("SELECT 1 FROM gd_reminder_log WHERE owner_id=$1 AND trip_id=$2 AND reminder_type=$3 AND channel='app'",[owner,String(t.id),type]);if(!sent.length)due.push({tripId:t.id,type,mandatory:type==="2h",driver:t.driver||"",driverLine:t.driverLine||"",driverLineUserId:t.driverLineUserId||"",message:text(t)})}return NextResponse.json({cloud:true,due})}catch(e){return NextResponse.json({error:"database_unavailable"},{status:503})}
}
export async function POST(req){
 const owner=await ownerFrom();if(!owner)return NextResponse.json({error:"unauthorized"},{status:401});const b=await req.json();if(!b.tripId||!["2h","24h"].includes(b.type))return NextResponse.json({error:"invalid"},{status:400});
 const sql=getDb();if(!sql)return NextResponse.json({error:"database_not_configured"},{status:503});try{await ensureSchema(sql);await sql.query("INSERT INTO gd_reminder_log(owner_id,trip_id,reminder_type,channel,payload) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING",[owner,String(b.tripId),b.type,b.channel||"app",JSON.stringify(b.payload||{})]);return NextResponse.json({cloud:true})}catch(e){return NextResponse.json({error:"log_failed"},{status:500})}
}