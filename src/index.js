async function callGroq(apiKey, sys, user, maxTokens=2000) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:"system",content:sys},{role:"user",content:user}],max_tokens:maxTokens,temperature:0.3})});
  if(!r.ok){const e=await r.text();throw new Error(`Groq ${r.status}: ${e}`);}
  const d=await r.json();return d.choices?.[0]?.message?.content||"no response";
}
async function fetchEcos(key) {
  const now=new Date(),end=now.toISOString().slice(0,10).replace(/-/g,''),start=new Date(now-30*86400000).toISOString().slice(0,10).replace(/-/g,'');
  const specs=[{stat:'722Y001',item:'0101000',lbl:'기준금리',unit:'%'},{stat:'731Y001',item:'0000001',lbl:'원/달러',unit:'원'},{stat:'817Y002',item:'010200000',lbl:'국고채3년',unit:'%'},{stat:'817Y002',item:'010210000',lbl:'국고채10년',unit:'%'}];
  const res={};
  await Promise.all(specs.map(async s=>{try{const r=await fetch(`https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/5/${s.stat}/D/${start}/${end}/${s.item}`,{signal:AbortSignal.timeout(5000)});const d=await r.json();const rows=d?.StatisticSearch?.row;if(rows?.length>0){const last=rows[rows.length-1];res[s.lbl]=`${last.DATA_VALUE}${s.unit}(${last.TIME})`;}}catch{}}));
  return res;
}
async function fetchWiki(kw) {
  try{const r=await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(kw)}`,{signal:AbortSignal.timeout(4000)});if(r.ok){const d=await r.json();return d.extract?.slice(0,200)||'';}}catch{}return'';
}
function extractTitle(html){const og=html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);if(og)return og[1];const t=html.match(/<title[^>]*>([^<]+)<\/title>/i);if(t)return t[1].replace(/\s*[-|].*$/,'').trim();return'제목 없음';}
function extractText(html){return html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,3000);}

const TOOLS=[
  {
    name:"analyze_article",
    description:"Analyzes a news article URL and generates an in-depth briefing using 기자야 내가 간다(Gijaya Naega Ganda) engine. Retrieves missing public data from Bank of Korea ECOS API, Wikipedia, and applies the Lambda-12 social dynamics framework, BSLI index, and eta prescription-matching score.",
    inputSchema:{type:"object",properties:{url:{type:"string",description:"News article URL to analyze"}},required:["url"]},
    annotations:{title:"기사 심층 분석 (Article Deep Analysis)",readOnlyHint:true,destructiveHint:false,openWorldHint:true,idempotentHint:true}
  },
  {
    name:"find_gaps",
    description:"Finds up to 5 key public data points and context that the journalist missed, using 기자야 내가 간다(Gijaya Naega Ganda) engine with Bank of Korea ECOS real-time data.",
    inputSchema:{type:"object",properties:{article_text:{type:"string",description:"Article body text to analyze"}},required:["article_text"]},
    annotations:{title:"기사 공백 분석 (Find Article Gaps)",readOnlyHint:true,destructiveHint:false,openWorldHint:true,idempotentHint:true}
  },
  {
    name:"get_public_data",
    description:"Retrieves real-time public data for a given topic using 기자야 내가 간다(Gijaya Naega Ganda) engine. Sources include Bank of Korea ECOS (interest rates, exchange rates, bonds) and Wikipedia context.",
    inputSchema:{type:"object",properties:{topic:{type:"string",description:"Topic to look up (Korean)"},region:{type:"string",description:"Country or region name (optional)"}},required:["topic"]},
    annotations:{title:"공공 데이터 조회 (Get Public Data)",readOnlyHint:true,destructiveHint:false,openWorldHint:true,idempotentHint:true}
  }
];

async function handleAnalyze({url},env){
  const groqKey=env.GROQ_API_KEY,ecosKey=env.ECOS_API_KEY||'RVE8ZH17L6IACFDWVCH6';
  let title='',text='';
  try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},signal:AbortSignal.timeout(8000)});const html=await r.text();title=extractTitle(html);text=extractText(html);}catch(e){return{isError:true,content:[{type:"text",text:`기사 접근 오류: ${e.message}`}]};}
  if(text.length<100)return{isError:true,content:[{type:"text",text:"본문 추출 실패. 원본 URL을 확인하거나 본문을 직접 붙여넣어 주세요."}]};
  const [ecos,wiki]=await Promise.all([fetchEcos(ecosKey),fetchWiki(title.slice(0,20))]);
  const econCtx=Object.keys(ecos).length>0?Object.entries(ecos).map(([k,v])=>`${k}: ${v}`).join(' | '):'ECOS 미연결';
  const sys=`Λ¹² 사회동역학 분석엔진. 한국어 답변.
Λ¹²: D1-BRI기본권 D2-SSI사회불안 D3-GPI지정학 D4-EPI폭발근접 D5-IGI제도역수 D6-LPI지도자역수 D7-CFD자본도주 D8-MFI군사화 D9-RHC복원력(역방향) D10-DCI인구균열 D11-OLI과두역수 D12-ADI담론왜곡 범위0~1.
BSLI=0.40*F_ML+0.60*H-D-Hs(ML층30~50%). η=처방매칭도0~1.
ECOS실측: ${econCtx}
원칙: 관찰자 중립, 편향점수 없음`;
  const user=`제목:${title}\n${wiki?`위키:${wiki}\n`:''}본문:${text.slice(0,2000)}\n\n## 핵심 요약\n## 공공 데이터 대조\n## Λ¹² 연관 변수\n## BSLI 함의\n## η 처방 매칭\n## 관찰자 시각(기사가 다루지 않은 것 3가지)\n## ENGINE: Lambda=[0~1], BsliDir=[하락압력/안정/상승압력], Eta=[0~1], Triggered=[D코드]`;
  try{const a=await callGroq(groqKey,sys,user,2000);return{content:[{type:"text",text:`**기자야 내가 간다 v4.0**\n**${title}**\n\n${a}\n\n---\n*ECOS: ${econCtx.slice(0,60)}*`}]};}
  catch(e){return{isError:true,content:[{type:"text",text:`분석 오류: ${e.message}`}]};}
}
async function handleGaps({article_text},env){
  const ecos=await fetchEcos(env.ECOS_API_KEY||'RVE8ZH17L6IACFDWVCH6');
  const econCtx=Object.entries(ecos).map(([k,v])=>`${k}: ${v}`).join(' | ')||'미연결';
  try{const r=await callGroq(env.GROQ_API_KEY,`Λ¹² 분석엔진. ECOS: ${econCtx}`,`기자가 제시하지 않은 중요 공공 데이터와 맥락 5가지:\n\n${article_text.slice(0,2000)}`,800);return{content:[{type:"text",text:r}]};}
  catch(e){return{isError:true,content:[{type:"text",text:`오류: ${e.message}`}]};}
}
async function handlePublicData({topic,region},env){
  const [ecos,wiki]=await Promise.all([fetchEcos(env.ECOS_API_KEY||'RVE8ZH17L6IACFDWVCH6'),fetchWiki(topic)]);
  const parts=[];
  if(Object.keys(ecos).length>0)parts.push(`**ECOS:**\n${Object.entries(ecos).map(([k,v])=>`- ${k}: ${v}`).join('\n')}`);
  if(wiki)parts.push(`**위키-${topic}:**\n${wiki}`);
  if(region){try{const r=await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(region)}?fields=name,population,capital,region`,{signal:AbortSignal.timeout(4000)});if(r.ok){const d=await r.json();const c=d[0];parts.push(`**${region}:** 인구 ${c.population?.toLocaleString()}, 수도 ${c.capital?.[0]}, ${c.region}`);}}catch{}}
  return{content:[{type:"text",text:parts.join('\n\n')||'데이터 없음'}]};
}

function jres(id,result){return new Response(JSON.stringify({jsonrpc:'2.0',id,result}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}
function jerr(id,code,msg){return new Response(JSON.stringify({jsonrpc:'2.0',id,error:{code,message:msg}}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==='OPTIONS'){return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'86400'}});}
    if(url.pathname!=='/mcp')return new Response(JSON.stringify({service:'기자야 내가 간다',version:'4.0.0',status:'ok'}),{headers:{'Content-Type':'application/json'}});
    if(request.method==='GET'){return jres(null,{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'gijaya-naega-ganda',version:'4.0.0'}});}
    if(request.method!=='POST')return new Response('Method not allowed',{status:405});
    let body;
    try{body=await request.json();}catch{return jerr(null,-32700,'Parse error');}
    const{id,method,params}=body;
    if(method==='initialize')return jres(id,{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'gijaya-naega-ganda',version:'4.0.0'}});
    if(method==='notifications/initialized')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*'}});
    if(method==='ping')return jres(id,{});
    if(method==='tools/list')return jres(id,{tools:TOOLS});
    if(method==='tools/call'){
      const{name,arguments:args}=params;
      let result;
      if(name==='analyze_article')result=await handleAnalyze(args,env);
      else if(name==='find_gaps')result=await handleGaps(args,env);
      else if(name==='get_public_data')result=await handlePublicData(args,env);
      else return jerr(id,-32601,'Tool not found');
      return jres(id,result);
    }
    return jerr(id,-32601,'Method not found');
  }
};
