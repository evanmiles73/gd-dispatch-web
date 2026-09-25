const MONEY_RE=/(?:\$|＄|NT\$?|金額[:：]?\s*)(\d{3,6})/i;
const AIRPORTS=["桃園","桃機","T1","T2","T3","松山","清泉崗","台中機場","台南機場","小港","高雄機場"];
const AREAS=["台北","新北","基隆","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東"];
export function parseLineTrip(text=""){
 const s=String(text).replace(/\r/g,"").trim();
 const amount=s.match(MONEY_RE)?.[1]||"";
 const airport=AIRPORTS.find(x=>s.includes(x))||"";
 const areas=AREAS.filter(x=>s.includes(x));
 const date=s.match(/(?:20\d{2}[\/.-])?(\d{1,2})[\/.-](\d{1,2})/)?.[0]||"";
 const time=s.match(/(?:^|\s)([01]?\d|2[0-3])[:：]([0-5]\d)(?:\s|$)/)?.[0]?.trim()||"";
 const flight=s.match(/\b[A-Z]{2,3}\s?\d{2,4}\b/i)?.[0]||"";
 const people=s.match(/(\d{1,2})\s*(?:人|位)/)?.[1]||"";
 const luggage=s.match(/(\d{1,2})\s*(?:件行李|件大行李|咖|個行李)/)?.[1]||"";
 return {raw:s,date,time,amount,airport,areas,flight,people,luggage};
}
export function likelyTrip(p){return Boolean(p.raw&&((p.areas.length&&p.airport)||(p.date&&p.time)||(p.amount&&p.areas.length)))}
