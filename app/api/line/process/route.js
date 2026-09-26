import {NextResponse} from "next/server";
import {processPendingLineInbox} from "../../../../lib/line-inbox-processor";

export const runtime="nodejs";

export async function POST(req){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 try{
  const result=await processPendingLineInbox(100);
  return NextResponse.json({ok:true,...result});
 }catch(e){
  console.error("LINE inbox processor",e);
  return NextResponse.json({ok:false,error:"processor_failed"},{status:500});
 }
}
