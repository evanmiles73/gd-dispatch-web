import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";

export const dynamicParams=false;
export function generateStaticParams(){return Object.values(authViewPaths).map(path=>({path}))}

const copy={
 "sign-in":{title:"登入",desc:"請輸入電子郵件與密碼登入你的帳號",note:"電子郵件｜密碼｜登入｜忘記密碼｜還沒有帳號？註冊帳號"},
 "sign-up":{title:"註冊帳號",desc:"建立帳號後即可安全同步你的車趟資料",note:"電子郵件｜密碼｜確認密碼｜建立帳號｜已經有帳號？登入"},
 "forgot-password":{title:"忘記密碼",desc:"輸入電子郵件，我們會寄送密碼重設連結",note:"電子郵件｜寄送重設連結｜返回登入"},
 "reset-password":{title:"重設密碼",desc:"請設定新的登入密碼",note:"新密碼｜確認新密碼｜重設密碼"},
 "magic-link":{title:"電子郵件快速登入",desc:"輸入電子郵件取得登入連結",note:"電子郵件｜寄送登入連結｜返回登入"},
 "two-factor":{title:"雙重驗證",desc:"請輸入驗證碼完成登入",note:"驗證碼｜確認"},
 "sign-out":{title:"登出",desc:"正在安全登出你的帳號",note:""},
 "callback":{title:"登入驗證中",desc:"正在完成登入，請稍候",note:""}
};

export default async function AuthPage({params}){
 const {path}=await params; const t=copy[path]||{title:"帳號驗證",desc:"請完成帳號驗證",note:""};
 return <main className="gd-auth-zh" style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f4f7f3",padding:20}}>
  <section style={{width:"min(520px,100%)"}}>
   <div style={{textAlign:"center",marginBottom:16,color:"#16231d"}}>
    <div style={{letterSpacing:4,fontSize:12,color:"#748078"}}>GD OPERATIONS</div>
    <h1 style={{margin:"8px 0 18px",fontSize:30}}>GD 車趟管理</h1>
    <h2 style={{margin:"0 0 6px",fontSize:24}}>{t.title}</h2>
    <p style={{margin:"0 0 14px",color:"#657068"}}>{t.desc}</p>
   </div>
   <style>{`
    .gd-auth-zh [data-slot="card-title"],.gd-auth-zh [data-slot="card-description"]{font-size:0!important}
    .gd-auth-zh label{font-size:0}
    .gd-auth-zh label[for*="email"]::after{content:"電子郵件";font-size:16px}
    .gd-auth-zh label[for*="password"]::after{content:"密碼";font-size:16px}
    .gd-auth-zh input[type="email"]::placeholder{color:transparent}
    .gd-auth-zh input[type="password"]::placeholder{color:transparent}
    .gd-auth-zh button[type="submit"]{font-size:0}
    .gd-auth-zh button[type="submit"]::after{content:"確認送出";font-size:16px}
   `}</style>
   <AuthView path={path}/>
   {t.note&&<div style={{marginTop:12,padding:"12px 14px",borderRadius:12,background:"#fff",color:"#526159",fontSize:14,textAlign:"center",lineHeight:1.7}}>中文操作：{t.note}</div>}
  </section>
 </main>;
}
