import {NextResponse} from "next/server";
import {runPushWorker} from "../../../lib/push-worker";

function authorized(req){
 const secret=process.env.PUSH_WORKER_SECRET||process.env.CRON_SECRET;
 return !!secret&&req.headers.get("authorization")==="Bearer "+secret;
}
export async function POST(req){if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const r=await runPushWorker();return NextResponse.json(r,{status:r.status})}
export async function GET(req){if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const r=await runPushWorker();return NextResponse.json(r,{status:r.status})}
