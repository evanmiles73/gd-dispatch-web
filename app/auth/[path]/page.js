"use client";
import Link from "next/link";
import {useParams,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {authClient} from "../../../lib/auth/client";

export default function AuthPage(){
 const {path}=useParams(),router=useRouter();
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const signup=path==="sign-up",forgot=path==="forgot-password",reset=path==="reset-password";
 const title=signup?"註冊帳號":forgot?"忘記密碼":reset?"設定新密碼":"登入";
 useEffect(()=>{
  const productionHost="gd-dispatch-web-xi.vercel.app";
  if(location.hostname.endsWith(".vercel.app")&&location.hostname!==productionHost){
   location.replace("https://"+productionHost+location.pathname+location.search);
  }
 },[]);
 const desc=signup?"建立帳號後即可安全同步你的車趟資料":forgot?"輸入電子郵件，我們會寄送密碼重設連結":reset?"請輸入新的登入密碼":"請輸入電子郵件與密碼登入";
 async function submit(e){
  e.preventDefault();setMsg("");
  if(!reset&&!email){setMsg("請輸入電子郵件");return}
  if(!forgot&&!password){setMsg("請輸入密碼");return}
  if((signup||reset)&&password!==confirm){setMsg("兩次輸入的密碼不相同");return}
  if((signup||reset)&&password.length<8){setMsg("密碼至少需要 8 個字元，並請注意英文大小寫。");return}
  setBusy(true);
  try{
   let r;
   if(signup)r=await authClient.signUp.email({email,password,name:email.split("@")[0],callbackURL:"/"});
   else if(forgot)r=await authClient.requestPasswordReset({email,redirectTo:"/auth/reset-password"});
   else if(reset)r=await authClient.resetPassword({newPassword:password});
   else r=await authClient.signIn.email({email,password,callbackURL:"/"});
   if(r?.error){setMsg("操作失敗："+(r.error.message||"請稍後再試"));return}
   if(forgot){setMsg("已送出。如果此信箱有帳號，請到信箱查看重設密碼郵件。");return}
   if(reset){setMsg("密碼已更新，正在返回登入頁…");setTimeout(()=>router.push("/auth/sign-in"),900);return}
   router.push("/");router.refresh();
  }catch(e){
   console.error("[gd-auth-ui]",e);
   const detail=e?.message||e?.cause?.message||String(e||"unknown error");
   setMsg("登入系統錯誤："+detail);
  }
  finally{setBusy(false)}
 }
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f4f7f3",padding:20,fontFamily:"system-ui"}}>
  <section style={{width:"min(460px,100%)"}}>
   <div style={{textAlign:"center",marginBottom:18,color:"#16231d"}}><div style={{letterSpacing:5,fontSize:12,color:"#748078"}}>GD OPERATIONS</div><h1 style={{fontSize:32,margin:"10px 0 24px"}}>GD 車趟管理</h1></div>
   <form onSubmit={submit} style={{background:"#16231d",color:"#fff",borderRadius:24,padding:"28px 24px",boxShadow:"0 12px 35px rgba(0,0,0,.12)"}}>
    <h2 style={{fontSize:28,margin:"0 0 8px"}}>{title}</h2><p style={{color:"#c8d0cb",margin:"0 0 24px"}}>{desc}</p>
    {!reset&&<label style={label}>電子郵件<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="請輸入電子郵件" style={input}/></label>}
    {!forgot&&<><label style={label}>{reset?"新密碼":"密碼"}<input type="password" autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={reset?"請輸入新密碼":"請輸入密碼"} style={input}/></label><div style={{background:"#2a332e",border:"1px solid #56615b",color:"#e8eee9",padding:"10px 12px",borderRadius:10,margin:"-6px 0 16px",fontSize:14,lineHeight:1.55}}>⚠️ 密碼有分英文大寫與小寫，登入時必須與設定時完全相同。</div></>}
    {(signup||reset)&&<label style={label}>再次輸入密碼<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="請再次輸入密碼" style={input}/></label>}
    {msg&&<div style={{background:"#fff4d6",color:"#563f00",padding:12,borderRadius:12,marginBottom:14,lineHeight:1.5}}>{msg}</div>}
    <button disabled={busy} style={button}>{busy?"處理中…":signup?"建立帳號":forgot?"寄送重設連結":reset?"更新密碼":"登入"}</button>
    <div style={{textAlign:"center",marginTop:20,lineHeight:2}}>
     {forgot||reset?<Link href="/auth/sign-in" style={link}>← 返回登入</Link>:signup?<><span style={{color:"#aeb8b2"}}>已經有帳號？ </span><Link href="/auth/sign-in" style={link}>登入</Link></>:<><Link href="/auth/forgot-password" style={link}>忘記密碼？</Link><br/><span style={{color:"#aeb8b2"}}>還沒有帳號？ </span><Link href="/auth/sign-up" style={link}>註冊帳號</Link></>}
    </div>
   </form>
  </section>
 </main>
}
const label={display:"grid",gap:8,fontSize:16,fontWeight:700,marginBottom:16};
const input={width:"100%",boxSizing:"border-box",padding:"14px 16px",borderRadius:12,border:"1px solid #56615b",background:"#222925",color:"#fff",fontSize:16,outline:"none"};
const button={width:"100%",padding:14,border:0,borderRadius:12,fontSize:17,fontWeight:800,cursor:"pointer",background:"#fff",color:"#16231d"};
const link={color:"#fff",textDecoration:"underline",textUnderlineOffset:4};
