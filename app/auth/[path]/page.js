import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";

export const dynamicParams=false;
export function generateStaticParams(){return Object.values(authViewPaths).map(path=>({path}))}
export default async function AuthPage({params}){
 const {path}=await params;
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f4f7f3",padding:20}}><AuthView path={path}/></main>;
}
