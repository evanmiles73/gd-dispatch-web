"use client";
import {useEffect,useState} from "react";
const empty={date:"",time:"",name:"",phone:"",pickup:"",dropoff:"",flight:"",passengers:"",luggage:"",carryOn:"",vehicle:"",amount:"",notes:"",driver:"",driverPhone:"",payment:"未收",returnMoney:"待回金",region:"",carClass:"",service:"機場接送",childSeat:"0",booster:"0",airport:"",extraStops:"",extraKm:"",crossCounty:"否"};
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
 o.airport=match(t,[/(桃園(?:機場)?\s*T?[123]|松山(?:機場)?|清泉崗(?:機場)?|台中(?:機場)?|台南(?:機場)?|小港(?:機場)?|高雄(?:機場)?)/i]);
 const stops=t.match(/(?:第二(?:上|下)車|多點|加點|中途點|停靠點)[:\s]*([^\n]+)/g); if(stops)o.extraStops=stops.map(x=>x.replace(/^[^:：]*[:：]?/,"").trim()).join("；");
 if(!o.pickup||!o.dropoff){const m=t.match(/([^\n]{4,})\s*(?:→|->|➡️?)\s*([^\n]{4,})/);if(m){o.pickup||=clean(m[1]);o.dropoff||=clean(m[2])}}
 return o;
}
export default function Home(){
 const [raw,setRaw]=useState(""),[data,setData]=useState(empty),[status,setStatus]=useState("未派"),[trips,setTrips]=useState([]),[tab,setTab]=useState("總行程"),[editing,setEditing]=useState(null),[filters,setFilters]=useState({region:"",car:"",sort:"dateAsc"}),[drivers,setDrivers]=useState([]),[newDriver,setNewDriver]=useState({name:"",phone:"",car:""});
 useEffect(()=>{try{setTrips(JSON.parse(localStorage.getItem("gdTrips")||"[]"));setDrivers(JSON.parse(localStorage.getItem("gdDrivers")||"[]"))}catch{}},[]);
 const persist=n=>{setTrips(n);localStorage.setItem("gdTrips",JSON.stringify(n))};
 const save=()=>{const item={...data,baseAmount:data.amount,amount:String(finalFare),surcharge:String(extraFare),status,id:editing||Date.now()};const n=editing?trips.map(t=>t.id===editing?item:t):[item,...trips];persist(n);setRaw("");setData(empty);setEditing(null)};
 const edit=t=>{setData({...empty,...t});setStatus(t.status);setEditing(t.id);window.scrollTo({top:0,behavior:"smooth"})};
 const remove=id=>{if(confirm("確定刪除這筆車趟？"))persist(trips.filter(t=>t.id!==id))};
 const mapUrl=a=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(a||"");
 const saveDrivers=n=>{setDrivers(n);localStorage.setItem("gdDrivers",JSON.stringify(n))};
 const addDriver=()=>{if(!newDriver.name.trim())return;saveDrivers([...drivers,{...newDriver,id:Date.now()}]);setNewDriver({name:"",phone:"",car:""})};
 const pickDriver=e=>{const d=drivers.find(x=>String(x.id)===e.target.value);if(d)setData({...data,driver:d.name,driverPhone:d.phone,vehicle:data.vehicle||d.car})};
 const extraFare=(()=>{const km=Number(data.extraKm)||0;let d=km>40?700+Math.ceil((km-40)/10)*100:km>=31?700:km>=21?600:km>=12?400:km>=9?300:km>=5?200:km>0?100:0;return d+(data.crossCounty==="是"?300:0)+(Number(data.childSeat)||0)*100+(Number(data.booster)||0)*100})();
 const finalFare=(Number(String(data.amount||0).replace(/,/g,""))||0)+extraFare;
 const total=trips.reduce((s,t)=>s+(Number(String(t.amount||0).replace(/,/g,""))||0),0);
 const unpaid=trips.filter(t=>t.payment!=="已收").reduce((s,t)=>s+(Number(String(t.amount||0).replace(/,/g,""))||0),0);
 const pendingReturn=trips.filter(t=>t.returnMoney!=="已回金").reduce((s,t)=>s+(Number(String(t.amount||0).replace(/,/g,""))||0),0);
 const visible=(tab==="總行程"?trips:trips.filter(x=>x.status===tab)).filter(x=>(!filters.region||x.region===filters.region)&&(!filters.car||x.carClass===filters.car)).sort((a,b)=>{if(filters.sort==="amountDesc")return (Number(b.amount)||0)-(Number(a.amount)||0);if(filters.sort==="amountAsc")return (Number(a.amount)||0)-(Number(b.amount)||0);const A=(a.date||"")+" "+(a.time||""),B=(b.date||"")+" "+(b.time||"");return filters.sort==="dateDesc"?B.localeCompare(A):A.localeCompare(B)});
 const monthly=trips.reduce((m,t)=>{const k=(t.date||"未填日期").slice(0,7);m[k]=(m[k]||0)+(Number(t.amount)||0);return m},{});
 const field=(k,l,type="text")=><label style={{display:"grid",gap:5}}><b>{l}</b><input type={type} value={data[k]} onChange={e=>setData({...data,[k]:e.target.value})} style={inp}/></label>;
 return <main style={{maxWidth:980,margin:"20px auto",padding:16,fontFamily:"system-ui"}}>
  <h1>GD 車趟管理 <small style={{fontSize:14}}>v1.7</small></h1>
  <nav style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{["總行程","已接","已派","未派"].map(x=><button onClick={()=>setTab(x)} style={btn(tab===x)}>{x} ({x==="總行程"?trips.length:trips.filter(t=>t.status===x).length})</button>)}</nav>
  <section style={card}><h2>智慧貼單</h2><textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder="貼上 LINE／客戶完整車趟資料…" style={{...inp,width:"100%",height:150}}/><button onClick={()=>setData(parseTrip(raw))} style={{...btn(true),marginTop:10}}>自動分析填入</button></section>
  <section style={card}><h2>新增／確認車趟</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
   {field("date","日期","date")}{field("time","時間","time")}
   <label><b>服務類型</b><select value={data.service} onChange={e=>setData({...data,service:e.target.value})} style={inp}>{["機場接送","接機","送機","包車旅遊","登山接駁","單車補給"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label><b>地區</b><select value={data.region} onChange={e=>setData({...data,region:e.target.value})} style={inp}><option value="">請選擇</option>{["台北","新北","基隆","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","澎湖","金門","連江"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label><b>固定航點</b><select value={data.airport} onChange={e=>setData({...data,airport:e.target.value})} style={inp}><option value="">請選擇</option>{["桃園T1","桃園T2","桃園T3","松山機場","清泉崗機場","台南機場","小港機場"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label><b>車型分類</b><select value={data.carClass} onChange={e=>setData({...data,carClass:e.target.value})} style={inp}><option value="">請選擇</option>{["轎車","小車","大車","正七","假七","九人座"].map(x=><option key={x}>{x}</option>)}</select></label>{field("name","客人姓名")}{field("phone","電話")}{field("pickup","上車完整住址")}{field("dropoff","下車完整住址")}{field("extraStops","多點上下車／中途停靠")}{field("extraKm","多點額外距離 KM","number")}
   <label><b>跨縣市</b><select value={data.crossCounty} onChange={e=>setData({...data,crossCounty:e.target.value})} style={inp}><option>否</option><option>是</option></select></label>{field("flight","航班")}{field("passengers","人數","number")}
   <label><b>行李</b><select value={data.luggage} onChange={e=>setData({...data,luggage:e.target.value})} style={inp}><option value="">請選擇／可手動修改</option>{sizes.map(x=><option>{x}</option>)}</select></label>
   {field("carryOn","手提行李（件數）","number")}{field("vehicle","車型")}{field("amount","金額","number")}
   <label><b>派單司機</b><select onChange={pickDriver} style={inp}><option value="">從司機資料庫選擇</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}｜{d.car||"未填車型"}</option>)}</select></label>
   {field("driver","司機姓名")}{field("driverPhone","司機電話")}
   <label><b>兒童安全座椅</b><select value={data.childSeat} onChange={e=>setData({...data,childSeat:e.target.value})} style={inp}>{["0","1","2","3"].map(x=><option key={x} value={x}>{x} 個</option>)}</select></label>
   <label><b>增高墊</b><select value={data.booster} onChange={e=>setData({...data,booster:e.target.value})} style={inp}>{["0","1","2","3"].map(x=><option key={x} value={x}>{x} 個</option>)}</select></label>
   <label><b>收款狀態</b><select value={data.payment} onChange={e=>setData({...data,payment:e.target.value})} style={inp}><option>未收</option><option>已收</option><option>現金當場收款</option></select></label>
   <label><b>回金狀態</b><select value={data.returnMoney} onChange={e=>setData({...data,returnMoney:e.target.value})} style={inp}><option>待回金</option><option>已回金</option></select></label>{field("notes","備註")}
  </div><div style={{marginTop:14,padding:12,border:"1px dashed #aaa",borderRadius:8}}><b>自動加價：$ {extraFare.toLocaleString()}</b>　基本車資：$ {(Number(data.amount)||0).toLocaleString()}　<strong>預估總車資：$ {finalFare.toLocaleString()}</strong><div style={{fontSize:13,marginTop:5}}>跨縣市 +300｜安全座椅/增高墊每個 +100｜多點距離依級距自動加價</div></div>
  <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>{["已派","未派","已接"].map(x=><button onClick={()=>setStatus(x)} style={btn(status===x)}>{x}</button>)}<button onClick={save} style={{...btn(true),marginLeft:"auto"}}>{editing?"更新車趟":"儲存車趟"}</button></div></section>
  <section style={card}><h2>篩選／排序</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}><select value={filters.region} onChange={e=>setFilters({...filters,region:e.target.value})} style={inp}><option value="">全部地區</option>{["台北","新北","基隆","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","澎湖","金門","連江"].map(x=><option key={x}>{x}</option>)}</select><select value={filters.car} onChange={e=>setFilters({...filters,car:e.target.value})} style={inp}><option value="">全部車型</option>{["轎車","小車","大車","正七","假七","九人座"].map(x=><option key={x}>{x}</option>)}</select><select value={filters.sort} onChange={e=>setFilters({...filters,sort:e.target.value})} style={inp}><option value="dateAsc">日期時間：近→遠</option><option value="dateDesc">日期時間：遠→近</option><option value="amountDesc">金額：高→低</option><option value="amountAsc">金額：低→高</option></select></div></section>
  <section style={card}><h2>帳務摘要</h2><div style={{display:"flex",gap:20,flexWrap:"wrap"}}><b>應收：$ {total.toLocaleString()}</b><b>未收：$ {unpaid.toLocaleString()}</b><b>待轉回金：$ {pendingReturn.toLocaleString()}</b></div><div style={{marginTop:12}}><b>月收入統計：</b>{Object.entries(monthly).sort().reverse().map(([m,v])=><span key={m} style={{display:"inline-block",margin:"6px 12px 0 0"}}>{m}：$ {v.toLocaleString()}</span>)}</div></section>
  <section style={card}><h2>司機資料庫</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}><input placeholder="司機姓名" value={newDriver.name} onChange={e=>setNewDriver({...newDriver,name:e.target.value})} style={inp}/><input placeholder="電話" value={newDriver.phone} onChange={e=>setNewDriver({...newDriver,phone:e.target.value})} style={inp}/><input placeholder="車型／車牌" value={newDriver.car} onChange={e=>setNewDriver({...newDriver,car:e.target.value})} style={inp}/><button onClick={addDriver} style={btn(true)}>新增司機</button></div>{drivers.map(d=><div key={d.id} style={{padding:"8px 0",borderTop:"1px solid #eee"}}>{d.name}｜{d.phone||"-"}｜{d.car||"-"} <button onClick={()=>saveDrivers(drivers.filter(x=>x.id!==d.id))}>刪除</button></div>)}</section>
  <section style={card}><h2>{tab}</h2>{visible.length===0?<p>目前沒有資料</p>:visible.map(t=><div key={t.id} style={{borderTop:"1px solid #ddd",padding:"12px 0"}}><b>{t.date} {t.time}｜{t.name||"未填姓名"}｜{t.status}</b><div><a href={mapUrl(t.pickup)} target="_blank">📍 {t.pickup||"未填上車地"}</a> → <a href={mapUrl(t.dropoff)} target="_blank">📍 {t.dropoff||"未填下車地"}</a></div><div>類型：{t.service||"-"}　地區：{t.region||"-"}　航點：{t.airport||"-"}　車型：{t.carClass||t.vehicle||"-"}<br/>航班：{t.flight||"-"}　多點：{t.extraStops||"-"}<br/>行李：{t.luggage||"-"}　手提：{t.carryOn||"-"}　安全座椅：{t.childSeat||0}　增高墊：{t.booster||0}　跨縣市：{t.crossCounty||"否"}　多點KM：{t.extraKm||0}　基本：{t.baseAmount||t.amount||"-"}　加價：{t.surcharge||0}　<b>總額：{t.amount||"-"}</b>　收款：{t.payment||"未收"}　回金：{t.returnMoney||"待回金"}</div><div>司機：{t.driver||"未派"} {t.driverPhone||""}</div><div style={{display:"flex",gap:8,marginTop:8}}><button onClick={()=>edit(t)} style={btn(false)}>編輯</button><button onClick={()=>remove(t.id)} style={btn(false)}>刪除</button></div></div>)}</section>
 </main>
}
const inp={padding:10,fontSize:16,border:"1px solid #bbb",borderRadius:8,boxSizing:"border-box",width:"100%"};
const card={padding:16,border:"1px solid #ddd",borderRadius:12,marginBottom:16};
const btn=a=>({padding:"10px 16px",borderRadius:8,border:"1px solid #aaa",fontSize:15,fontWeight:a?700:400,cursor:"pointer"});
