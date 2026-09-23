import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";

export const dynamicParams=false;
export function generateStaticParams(){return Object.values(authViewPaths).map(path=>({path}))}

const zh={
 "sign-in":{title:"登入 GD 車趟管理",subtitle:"請輸入電子郵件與密碼登入",email:"電子郵件",password:"密碼",submit:"登入",switchText:"還沒有帳號？",switchLabel:"註冊帳號"},
 "sign-up":{title:"建立 GD 車趟管理帳號",subtitle:"建立帳號後即可同步你的車趟資料",email:"電子郵件",password:"密碼",submit:"建立帳號",switchText:"已經有帳號？",switchLabel:"登入"},
};

export default async function AuthPage({params}){
 const {path}=await params;
 const t=zh[path];
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f4f7f3",padding:20}}>
  <section style={{width:"min(520px,100%)"}}>
   <div style={{textAlign:"center",marginBottom:18}}>
    <div style={{letterSpacing:4,fontSize:12,color:"#748078"}}>GD OPERATIONS</div>
    <h1 style={{margin:"8px 0 4px",fontSize:30}}>GD 車趟管理</h1>
    {t&&<><h2 style={{margin:"8px 0"}}>{t.title}</h2><p style={{color:"#657068"}}>{t.subtitle}</p></>}
   </div>
   <AuthView path={path}/>
   {t&&<div style={{marginTop:14,textAlign:"center",color:"#526159",fontSize:14}}>介面中的 Email＝{t.email}｜Password＝{t.password}｜Login＝登入｜Sign Up＝註冊帳號｜Forgot your password?＝忘記密碼</div>}
  </section>
 </main>;
}
