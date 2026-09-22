"use client";
import {useEffect,useState} from "react";
const empty={date:"",time:"",name:"",phone:"",pickup:"",dropoff:"",flight:"",passengers:"",luggage:"",carryOn:"",vehicle:"",amount:"",notes:""};
const sizes=["32吋","30吋","28吋","26吋","24吋","22吋","20吋","胖胖箱"];
const clean=(v="")=>v.replace(/^[：:\s]+|\s+$/g,"").trim();
function match(t,rs){for(const r of rs){const m=t.match(r);if(m?.[1])return clean(m[1])}return ""}
function parseTrip(text){
 const t=text.replace(/：/g,":").split(/\n+/).map(x=>x.trim()).filter(Boolean).join("\n"),o={...empty};
 o.date=match(t,[/(?:日期|用車日期|接送日期)[:\s]*([^\n]+)/i,/(20\d{2}[\/-]\d{1,2}[\/-]\d{1,2})/]);
 o.time=match(t,[/(?:時間|用車時間|接送時間)[:\s]*([^\n]+)/i,/\b((?:[01]?\d|2[0-3]):[0-5]\d)\b/]);
 o.name=match(t,[/(?:姓名|客人|乘客姓名|聯絡人)[:\s]*([^\n]+)/]);
 o.phone=match(t,[/(?:電話|手機|聯絡電話)[:\s]*([^\n]+)/,/(09\d{2}[- ]?\d{3}[- ]?\d{3})/]);
 o.pickup=match(t,[/(?:上車(?:地點|地址)?|接送地點|出發地|起點|住址)[:\s]*([^\n]+)/]);
 o.dropoff=match(t,[/(?:下車(?:地點|地址)?|目的地|終點)[:\s]*([^\n]+)/]);
 o.flight=match(t,[/(?:航班(?:號碼)?|班機(?:號碼)?)[:\s]*([A-Z]{1,3}\s?\d{2,4}|[^\n]+)/i,/\b([A-Z]{2,3}\s?\d{2,4})\b/i]);
 o.passengers=match(t,[/(?:人數|乘客人數)[:\s]*(\d+)/]);
 o.luggage=match(t,[/(?:托運行李|行李)[:\s]*([^\n]+)/]);
 o.carryOn=match(t,[/(?:手提行李|隨身行李)[:\s]*([^\n]+)/]);
 o.vehicle=match(t,[/(?:車型|車種)[:\s]*([^\n]+)/]);
 o.amount=match(t,[/(?:金額|車資|費用|價格)[:\s]*\$?\s*([\d,]+)/]);
 o.notes=match(t,[/(?:備註|其他)[:\s]*([^\n]+)/]);
 if(!o.pickup||!o.dropoff){const m=t.match(/([^\n]{4,})\s*(?:→|->|➡️?)\s*([^\n]{4,})/);if(m){o.pickup||=clean(m[1]);o.dropoff||=clean(m[2])}}
 return o;
}
export default function Home(){
 const [raw,setRaw]=useState(""),[data,setData]=useState(empty),[status,setStatus]=useState("未派"),[trips,setTrips]=useState([]),[tab,setTab]=useState("總行程");
 useEffect(()=>{try{setTrips(JSON.parse(localStorage.getItem("gdTrips")||"[]"))}catch{}},[]);
 const save=()=>{const n=[{...data,status,id:Date.now()},...trips];setTrips(n);localStorage.setItem("gdTrips",JSON.stringify(n));setRaw("");setData(empty)};
 const visible=tab==="總行程"?trips:trips.filter(x=>x.status===tab);
 const field=(k,l,type="text")=><label style={{display:"grid",gap:5}}><b>{l}</b><input type={type} value={data[k]} onChange={e=>setData({...data,[k]:e.target.value})} style={inp}/></label>;
 return <main style={{maxWidth:980,margin:"20px auto",padding:16,fontFamily:"system-ui"}}>
  <h1>GD 車趟管理 <small style={{fontSize:14}}>v1.1</small></h1>
  <nav style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{["總行程","已接","已派","未派"].map(x=><button onClick={()=>setTab(x)} style={btn(tab===x)}>{x} ({x==="總行程"?trips.length:trips.filter(t=>t.status===x).length})</button>)}</nav>
  <section style={card}><h2>智慧貼單</h2><textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder="貼上 LINE／客戶完整車趟資料…" style={{...inp,width:"100%",height:150}}/><button onClick={()=>setData(parseTrip(raw))} style={{...btn(true),marginTop:10}}>自動分析填入</button></section>
  <section style={card}><h2>新增／確認車趟</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
   {field("date","日期","date")}{field("time","時間","time")}{field("name","客人姓名")}{field("phone","電話")}{field("pickup","上車完整住址")}{field("dropoff","下車完整住址")}{field("flight","航班")}{field("passengers","人數","number")}
   <label><b>行李</b><select value={data.luggage} onChange={e=>setData({...data,luggage:e.target.value})} style={inp}><option value="">請選擇／可手動修改</option>{sizes.map(x=><option>{x}</option>)}</select></label>
   {field("carryOn","手提行李（件數）","number")}{field("vehicle","車型")}{field("amount","金額","number")}{field("notes","備註")}
  </div><div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>{["已派","未派","已接"].map(x=><button onClick={()=>setStatus(x)} style={btn(status===x)}>{x}</button>)}<button onClick={save} style={{...btn(true),marginLeft:"auto"}}>儲存車趟</button></div></section>
  <section style={card}><h2>{tab}</h2>{visible.length===0?<p>目前沒有資料</p>:visible.map(t=><div key={t.id} style={{borderTop:"1px solid #ddd",padding:"12px 0"}}><b>{t.date} {t.time}｜{t.name||"未填姓名"}｜{t.status}</b><div>{t.pickup||"未填上車地"} → {t.dropoff||"未填下車地"}</div><div>航班：{t.flight||"-"}　行李：{t.luggage||"-"}　手提：{t.carryOn||"-"}　金額：{t.amount||"-"}</div></div>)}</section>
 </main>
}
const inp={padding:10,fontSize:16,border:"1px solid #bbb",borderRadius:8,boxSizing:"border-box",width:"100%"};
const card={padding:16,border:"1px solid #ddd",borderRadius:12,marginBottom:16};
const btn=a=>({padding:"10px 16px",borderRadius:8,border:"1px solid #aaa",fontSize:15,fontWeight:a?700:400,cursor:"pointer"});
