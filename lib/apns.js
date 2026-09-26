import {SignJWT,importPKCS8} from "jose";

const APNS_HOST="https://api.push.apple.com";
const TOPIC=process.env.APNS_BUNDLE_ID||"tw.gd.dispatch.ios";

function configured(){
 return !!(process.env.APNS_KEY_ID&&process.env.APNS_TEAM_ID&&process.env.APNS_PRIVATE_KEY&&TOPIC);
}

async function bearer(){
 const key=await importPKCS8(process.env.APNS_PRIVATE_KEY.replace(/\\n/g,"\n"),"ES256");
 return new SignJWT({}).setProtectedHeader({alg:"ES256",kid:process.env.APNS_KEY_ID})
  .setIssuer(process.env.APNS_TEAM_ID).setIssuedAt().sign(key);
}

export async function sendApns({token,title,body,tripId}){
 if(!configured())return {ok:false,error:"apns_not_configured"};
 try{
  const jwt=await bearer();
  const payload={aps:{alert:{title,body},sound:"default",badge:1},tripId:String(tripId||"")};
  const res=await fetch(APNS_HOST+"/3/device/"+encodeURIComponent(token),{
   method:"POST",
   headers:{authorization:"bearer "+jwt,"apns-topic":TOPIC,"apns-push-type":"alert","apns-priority":"10","content-type":"application/json"},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)
  });
  if(res.ok)return {ok:true,status:res.status};
  let reason="apns_failed";try{const j=await res.json();reason=j.reason||reason}catch{}
  return {ok:false,status:res.status,error:reason,disableToken:res.status===410||reason==="BadDeviceToken"||reason==="Unregistered"};
 }catch(e){
  console.error("APNs send",e);
  return {ok:false,error:e?.name==="TimeoutError"?"apns_timeout":"apns_request_failed"};
 }
}
