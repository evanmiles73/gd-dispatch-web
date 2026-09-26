import {auth} from "./auth/server";

const ROOT_OWNERS=new Set(["delta198073@icloud.com","judehu100427@icloud.com"]);

export async function currentUser(){
 const r=await auth.getSession();
 return r?.user||r?.data?.user||null;
}

export function isRootOwner(user){
 const email=String(user?.email||"").trim().toLowerCase();
 const configured=(process.env.GD_OWNER_EMAIL||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 return ROOT_OWNERS.has(email)||configured.includes(email);
}

export async function accessFor(sql,user){
 if(!user?.id)return {role:"anonymous",canRead:false,canWrite:false,isOwner:false};
 if(isRootOwner(user))return {role:"owner",canRead:true,canWrite:true,isOwner:true,pricing:true};
 const rows=await sql.query("SELECT role,pricing_enabled,status,pro_expires_at FROM gd_access_control WHERE owner_id=$1",[String(user.id)]);
 const a=rows[0];
 if(!a||a.status==="suspended")return {role:a?.status==="suspended"?"suspended":"free",canRead:a?.status!=="suspended",canWrite:a?.status!=="suspended",isOwner:false,pricing:false};
 if(a.role==="pro"&&a.pro_expires_at&&new Date(a.pro_expires_at)<=new Date())return {role:"free",canRead:true,canWrite:true,isOwner:false,pricing:false,expired:true};
 const role=a.role||"free";
 const readOnly=role==="admin"||role==="admin_readonly";
 return {role,canRead:true,canWrite:!readOnly,isOwner:false,pricing:Boolean(a.pricing_enabled)&&["admin","admin_readonly","pro"].includes(role)};
}

export async function requireWrite(sql,user){
 const access=await accessFor(sql,user);
 if(!access.canWrite)return {ok:false,access,error:access.role==="suspended"?"account_suspended":"read_only"};
 return {ok:true,access};
}
