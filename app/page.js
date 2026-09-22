"use client";
import {useState} from "react";

const empty={date:"",time:"",name:"",phone:"",pickup:"",dropoff:"",flight:"",passengers:"",luggage:"",carryOn:"",vehicle:"",amount:"",notes:""};

function clean(v=""){return v.replace(/^[：:\s]+|\s+$/g,"").trim()}
function match(text, regs){for(const r of regs){const m=text.match(r);if(m?.[1])return clean(m[1])}return ""}
function parseTrip(text){
 const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 const joined=lines.join("\n");
 const out={...empty};
 out.date=match(joined,[/(?:日期|用車日期|接送日期)[：:\s]*([^\n]+)/i,/(20\d{2}[\/-]\d{1,2}[\/-]\d{1,2})/]);
 out.time=match(joined,[/(?:時間|用車時間|接送時間)[：:\s]*([^\n]+)/i,/\b([01]?\d|2[0-3]):[0-5]\d\b/]);
 out.name=match(joined,[/(?:姓名|客人|乘客|聯絡人)[：:\s]*([^\n]+)/]);
 out.phone=match(joined,[/(?:電話|手機|聯絡電話)[：:\s]*([^\n]+)/,/(09\d{2}[- ]?\d{3}[- ]?\d{3})/]);
 out.pickup=match(joined,[/(?:上車(?:地點|地址)?|接送地點|出發地|起點|住址)[：:\s]*([^\n]+)/]);
 out.dropoff=match(joined,[/(?:下車(?:地點|地址)?|目的地|終點)[：:\s]*([^\n]+)/]);
 out.flight=match(joined,[/(?:航班|班機|航班號碼|班機號碼)[：:\s]*([A-Z]{1,3}\s?\d{2,4}|[^\n]+)/i,/\b([A-Z]{2,3}\s?\d{2,4})\b/i]);
 out.passengers=match(joined,[/(?:人數|乘客)[：:\s]*(\d+)/]);
 out.luggage=match(joined,[/(?:托運行李|行李)[：:\s]*([^\n]+)/,/(\d+\s*(?:吋|寸)?\s*(?:行李箱|箱)[^\n]*)/]);
 out.carryOn=match(joined,[/(?:手提行李|隨身行李)[：:\s]*([^\n]+)/]);
 out.vehicle=match(joined,[/(?:車型|車種)[：:\s]*([^\n]+)/]);
 out.amount=match(joined,[/(?:金額|車資|費用|價格)[：:\s]*\$?\s*([\d,]+)/]);
 out.notes=match(joined,[/(?:備註|其他)[：:\s]*([^\n]+)/]);
 // address fallback: labeled pickup/dropoff are preferred; then arrow syntax.
 if(!out.pickup||!out.dropoff){const m=joined.match(/([^\n]{4,})\s*(?:→|->|➡️?)\s*([^\n]{4,})/);if(m){out.pickup||=clean(m[1]);out.dropoff||=clean(m[2]);}}
 return out;
}
const labels=[["date","日期"],["time","時間"],["name","客人姓名"],["phone","電話"],["pickup","上車完整住址"],["dropoff","下車完整住址"],["flight","航班"],["passengers","人數"],["luggage","行李"],["carryOn","手提行李"],["vehicle","車型"],["amount","金額"],["notes","備註"]];
export default function Home(){
 const [raw,setRaw]=useState(""); const [data,setData]=useState(empty); const [status,setStatus]=useState("未派");
 function analyze(){setData(parseTrip(raw))}
 return <main style={{maxWidth:900,margin:"30px auto",padding:20,fontFamily:"system-ui"}}>
  <h1>GD 車趟管理</h1><p>貼上 LINE／客戶車趟文字，自動分析並填入欄位。</p>
  <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder="把整段車趟資料貼在這裡…" style={{width:"100%",height:180,padding:12,fontSize:16}}/>
  <button onClick={analyze} style={{margin:"12px 0",padding:"12px 22px",fontSize:16}}>自動分析填入</button>
  <div style={{display:"flex",gap:8,marginBottom:16}}>{["已派","未派","已接"].map(x=><button key={x} onClick={()=>setStatus(x)} style={{padding:"10px 18px",fontWeight:status===x?700:400}}>{x}</button>)}</div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
   {labels.map(([k,l])=><label key={k} style={{display:"grid",gap:5}}><b>{l}</b><input value={data[k]} onChange={e=>setData({...data,[k]:e.target.value})} style={{padding:10,fontSize:16}}/></label>)}
  </div>
  <p style={{marginTop:20}}>目前歸屬：<b>{status}</b></p>
 </main>
}