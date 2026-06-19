// ============================================
// 기자야 내가 간다 기본 템플릿 v1.0
// 확정일: 2026-06-19
// 섹션: 전쟁상황요약 | 핵심수치카드 | 타임라인
//       차트 | 한국경제파급 | D코드분석
//       핵심GAP | 다층분석프레임워크 | 푸터
// ============================================
async function callAI(openaiKey, sys, user, maxTokens=2000) {
  const r=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},
    body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:sys},{role:'user',content:user}],max_tokens:maxTokens}),
    signal:AbortSignal.timeout(30000)
  });
  const d=await r.json();
  return d.choices?.[0]?.message?.content||"no response";
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
function isEconomicContent(text){return /금리|환율|주식|채권|경제|금융|GDP|물가|인플레|부동산|증권|코스피|달러|수출|수입|무역|통화|재정|예산|세금|세율|투자|기업|산업|소비|고용|취업|실업|임금|소득|성장|긴축|적자|흑자|은행|보험|연금|ETF|통화정책|기준금리|국고채|외환/.test(text);}
function defaultClassify(){return{category:'기타',has_bsli:false,has_eta:false,has_ecos:false,d_codes:[]};}
function detectDCodesKeyword(corpus){const c=corpus;const codes=[];if(/인권|언론자유|집회금지|표현의\s*자유|검열/.test(c))codes.push('D1-BRI');if(/시위|파업|폭동|사회불안|갈등|분규/.test(c))codes.push('D2-SSI');if(/전쟁|외교|지정학|미중|동맹|북핵|안보|군사협력/.test(c))codes.push('D3-GPI');if(/혁명|봉기|쿠데타|정권붕괴|내전/.test(c))codes.push('D4-EPI');if(/법안|개혁|탄핵|위헌|입법|제도개선/.test(c))codes.push('D5-IGI');if(/대통령|국무총리|지도자|리더십|통치/.test(c))codes.push('D6-LPI');if(/자본도주|외환위기|달러부족|환율방어|자본통제/.test(c))codes.push('D7-CFD');if(/계엄|군사작전|진압|무력충돌|병력/.test(c))codes.push('D8-MFI');if(/의료개혁|교육혁신|기술혁신|회복력|재건/.test(c))codes.push('D9-RHC');if(/이민|난민|인구감소|이민자|외국인노동/.test(c))codes.push('D10-DCI');if(/재벌|독점|담합|과두|반독점/.test(c))codes.push('D11-OLI');if(/여론조작|가짜뉴스|언론편향|미디어장악|담론/.test(c))codes.push('D12-ADI');return codes.slice(0,4);}
async function classifyArticle(openaiKey,title,text){
  const sys='기사 분류 전문가. 반드시 JSON만 반환. 다른 텍스트 금지.';
  const user=`아래 기사를 분석해 JSON 하나만 반환하라.\n\n제목: ${title}\n본문: ${text.slice(0,600)}\n\n반환:\n{"category":"경제|사회|지정학|정치|환경|기타","has_bsli":true/false,"has_eta":true/false,"has_ecos":true/false,"d_codes":["최대 4개"]}\n\n기준:\nhas_bsli: 서민·민생·복지·주거·의료비·임금 관련이면 true\nhas_eta: 정책대책·처방·지원방안이 기사에 명시되면 true\nhas_ecos: 금리·환율·채권·주가 등 경제지표가 필요하면 true\nd_codes: D1=인권/자유/언론 D2=갈등/시위/파업 D3=전쟁/외교/지정학 D4=혁명/위기 D5=법안/제도/개혁 D6=대통령/지도자 D7=투자/자본/외환 D8=군/계엄/진압 D9=교육/의료/혁신 D10=인구/이민/난민 D11=재벌/독점 D12=여론/미디어`;
  try{
    const r=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},
      body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:sys},{role:'user',content:user}],max_tokens:150,temperature:0,response_format:{type:'json_object'}}),
      signal:AbortSignal.timeout(8000)
    });
    const d=await r.json();
    const raw=d.choices?.[0]?.message?.content?.trim()||'{}';
    let p;try{p=JSON.parse(raw);}catch{const m=raw.match(/\{[\s\S]*?\}/);if(!m)return defaultClassify();try{p=JSON.parse(m[0]);}catch{return defaultClassify();}}
    return{category:p.category||'기타',has_bsli:!!p.has_bsli,has_eta:!!p.has_eta,has_ecos:!!p.has_ecos,d_codes:Array.isArray(p.d_codes)?p.d_codes.slice(0,4):[]};
  }catch{return defaultClassify();}
}
function extractTitle(html){const og=html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);if(og)return og[1];const t=html.match(/<title[^>]*>([^<]+)<\/title>/i);if(t)return t[1].replace(/\s*[-|].*$/,'').trim();return'제목 없음';}
function extractText(html){return html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,3000);}
function extractPressName(url){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}}
function detectScope(url){try{return /\.(kr|co\.kr)$/.test(new URL(url).hostname)?'국내':'국제';}catch{return '국내';}}
function parseStructured(text){const m=text.match(/##\s*JSON_STRUCTURED[:\s]*({[\s\S]*?})/);if(!m)return{keywords:[],gaps:[],category:'기타'};try{const r=JSON.parse(m[1]);return{keywords:r.keywords||[],gaps:r.gaps||[],category:r.category||'기타'};}catch{return{keywords:[],gaps:[],category:'기타'};}}
async function saveToD1(db,data){if(!db)return;try{await db.prepare('INSERT INTO article_analysis (url,press_name,keywords,gaps,analyzed_at,scope,category) VALUES (?,?,?,?,?,?,?)').bind(data.url,data.press_name,JSON.stringify(data.keywords),JSON.stringify(data.gaps),data.analyzed_at,data.scope,data.category).run();}catch(e){console.error('D1 save error:',e.message);}}
async function fetchStats(db){if(!db)return null;try{const[cat,today,total,press,fb]=await db.batch([db.prepare("SELECT category,COUNT(*) as cnt FROM article_analysis GROUP BY category"),db.prepare("SELECT COUNT(*) as cnt FROM article_analysis WHERE date(analyzed_at)=date('now')"),db.prepare("SELECT COUNT(*) as cnt FROM article_analysis"),db.prepare("SELECT COUNT(DISTINCT press_name) as cnt FROM article_analysis WHERE press_name!=''"),db.prepare("SELECT feedback_type,SUM(count) as total FROM feedback GROUP BY feedback_type")]);const cats={};for(const r of cat.results)cats[r.category]=r.cnt;const fbc={trust:0,neutral:0,distrust:0};for(const r of fb.results)fbc[r.feedback_type]=r.total;return{cats,today:today.results[0]?.cnt||0,total:total.results[0]?.cnt||0,presses:press.results[0]?.cnt||0,fbc};}catch(e){console.error('D1 stats error:',e.message);return null;}}
async function fetchArticleFeedback(db,url){if(!db)return{trust:0,neutral:0,distrust:0};try{const rows=await db.prepare("SELECT feedback_type,SUM(count) as total FROM feedback WHERE url=? GROUP BY feedback_type").bind(url).all();const c={trust:0,neutral:0,distrust:0};for(const r of rows.results)c[r.feedback_type]=Number(r.total)||0;return c;}catch{return{trust:0,neutral:0,distrust:0};}}
function formatStats(stats){if(!stats)return'';const ORDER=['경제·금융','정치·외교','사회·복지','국제·지정학','환경·기후','기타'];const lines=ORDER.map(c=>`  - ${c}: ${stats.cats[c]||0}건`).join('\n');const fb=stats.fbc||{trust:0,neutral:0,distrust:0};return`\n\n---\n📊 **기자야, 내가 간다 — 누적 분석 현황**\n${lines}\n  오늘 분석: ${stats.today}건 | 총 누적: ${stats.total}건 | 참여 언론사: ${stats.presses}곳\n  신뢰도 피드백 👍 ${fb.trust}건 🤔 ${fb.neutral}건 👎 ${fb.distrust}건`;}

const TOOLS=[
  {
    name:"analyze_article",
    description:"[필수] 항상 find_gaps·get_public_data와 동시에 호출하세요. Analyzes a news article URL and generates an in-depth briefing using 기자야 내가 간다(Gijaya Naega Ganda) engine. Retrieves missing public data from Bank of Korea ECOS API, Wikipedia, and applies the Lambda-12 social dynamics framework, BSLI index, and eta prescription-matching score.",
    inputSchema:{type:"object",properties:{url:{type:"string",description:"News article URL to analyze"}},required:["url"]},
    annotations:{title:"기사 심층 분석 (Article Deep Analysis)",readOnlyHint:true,destructiveHint:false,openWorldHint:true,idempotentHint:true}
  },
  {
    name:"find_gaps",
    description:"[필수] 항상 analyze_article·get_public_data와 동시에 호출하세요. Finds up to 5 key public data points and context that the journalist missed, using 기자야 내가 간다(Gijaya Naega Ganda) engine with Bank of Korea ECOS real-time data.",
    inputSchema:{type:"object",properties:{article_text:{type:"string",description:"Article body text to analyze"}},required:["article_text"]},
    annotations:{title:"기사 공백 분석 (Find Article Gaps)",readOnlyHint:true,destructiveHint:false,openWorldHint:true,idempotentHint:true}
  },
  {
    name:"get_public_data",
    description:"[필수] 항상 analyze_article·find_gaps와 동시에 호출하세요. Retrieves real-time public data tailored to the topic using 기자야 내가 간다(Gijaya Naega Ganda) engine. 경제/금융 topics → ECOS (금리·환율·국고채) + Wikipedia. 국제/지정학/사회/환경 topics → Wikipedia context only (ECOS not used).",
    inputSchema:{type:"object",properties:{topic:{type:"string",description:"Topic to look up (Korean)"},region:{type:"string",description:"Country or region name (optional)"}},required:["topic"]},
    annotations:{title:"공공 데이터 조회 (Get Public Data)",readOnlyHint:true,destructiveHint:false,openWorldHint:true,idempotentHint:true}
  },
  {
    name:"submit_feedback",
    description:"기사 분석 결과에 대한 신뢰도 피드백을 제출합니다. feedback 값: 'trust'(신뢰) | 'neutral'(중립) | 'distrust'(불신). 누적 카운트를 반환합니다.",
    inputSchema:{type:"object",properties:{url:{type:"string",description:"피드백을 남길 기사 URL"},feedback:{type:"string",enum:["trust","neutral","distrust"],description:"신뢰도 피드백: trust(신뢰) | neutral(중립) | distrust(불신)"}},required:["url","feedback"]},
    annotations:{title:"신뢰도 피드백 (Submit Feedback)",readOnlyHint:false,destructiveHint:false,openWorldHint:false,idempotentHint:false}
  }
];

async function handleAnalyze({url},env){
  const ecosKey=env.ECOS_API_KEY||'RVE8ZH17L6IACFDWVCH6';
  let title='',text='';
  try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},signal:AbortSignal.timeout(8000)});const html=await r.text();title=extractTitle(html);text=extractText(html);}catch(e){return{isError:true,content:[{type:"text",text:`기사 접근 오류: ${e.message}`}]};}
  if(text.length<100)return{isError:true,content:[{type:"text",text:"본문 추출 실패. 원본 URL을 확인하거나 본문을 직접 붙여넣어 주세요."}]};
  // 1단계: 기사 맥락 분류 + 위키 병렬 호출
  const [cls,wiki]=await Promise.all([classifyArticle(env.OPENAI_API_KEY,title,text),fetchWiki(title.slice(0,20))]);
  // 2단계 준비: 분류 결과 기반 조건부 데이터 로드
  const ecos=cls.has_ecos?await fetchEcos(ecosKey):{};
  const econCtx=Object.keys(ecos).length>0?Object.entries(ecos).map(([k,v])=>`${k}: ${v}`).join(' | '):'';
  // LLM d_codes 미반환 시 키워드 폴백
  const corpus=(title+' '+text).slice(0,1000);
  const rawDCodes=(cls.d_codes||[]).length>0?cls.d_codes:detectDCodesKeyword(corpus);
  const dList=rawDCodes.join(' ');
  const sys=`Λ¹² 사회동역학 분석엔진. 한국어 답변. 아래 사용자 메시지의 각 ## 섹션 헤더 아래에 반드시 내용을 채워 완성된 분석 문서를 반환하라. 섹션 생략 금지.
D코드: D1-BRI기본권 D2-SSI사회불안 D3-GPI지정학 D4-EPI폭발근접 D5-IGI제도역수 D6-LPI지도자역수 D7-CFD자본도주 D8-MFI군사화 D9-RHC복원력 D10-DCI인구균열 D11-OLI과두역수 D12-ADI담론왜곡 범위0~1.${cls.has_bsli?'\nBSLI=0.40*F_ML+0.60*H-D-Hs(ML층30~50%).':''}${cls.has_eta?' η=처방매칭도0~1.':''}${econCtx?`\nECOS실측: ${econCtx}`:''}
분석 D코드: ${dList||'없음'}. 관찰자 중립 원칙.`;
  const sects=[
    '## 핵심 요약\n[2~3문장]',
    '## 공공 데이터 대조\n[수치·통계 대조]',
    ...(dList?[`## D코드 분석 (${dList})\n[D코드별 수치(0~1)와 근거]`]:[]),
    ...(cls.has_bsli?['## BSLI 함의\n[BSLI 방향 및 근거]']:[]),
    ...(cls.has_eta?['## η 처방 매칭\n[처방 적절성 0~1]']:[]),
    '## 관찰자 시각(기사가 다루지 않은 것 3가지)\n[1. 2. 3.]',
    `## ENGINE: Lambda=[실수]${cls.has_bsli?', BsliDir=[하락압력/안정/상승압력]':''}${cls.has_eta?', Eta=[실수]':''}, Triggered=[${dList||'없음'}]`,
    '## JSON_STRUCTURED: {"keywords":["주제키워드1","주제키워드2","주제키워드3"],"gaps":["누락갭1","누락갭2","누락갭3"],"category":"경제·금융|정치·외교|사회·복지|국제·지정학|환경·기후|기타 중 하나"}'
  ];
  const user=`제목:${title}\n${wiki?`위키:${wiki}\n`:''}본문:${text.slice(0,2000)}\n\n${sects.join('\n\n')}`;
  try{const a=await callAI(env.OPENAI_API_KEY,sys,user,2300);const structured=parseStructured(a);const display=a.replace(/##\s*JSON_STRUCTURED[\s\S]*$/,'').trim();await saveToD1(env.DB,{url,press_name:extractPressName(url),keywords:structured.keywords,gaps:structured.gaps,analyzed_at:new Date().toISOString(),scope:detectScope(url),category:structured.category});const[stats,fb]=await Promise.all([fetchStats(env.DB),fetchArticleFeedback(env.DB,url)]);const feedbackBlock=`\n\n---\n📊 **이 기사 신뢰도 피드백**\n👍 신뢰 ${fb.trust}건 | 🤔 중립 ${fb.neutral}건 | 👎 불신 ${fb.distrust}건\n\n피드백을 남기시겠어요? 아래 중 하나를 말씀해주세요:\n• **"👍 신뢰해요"** — 신뢰\n• **"🤔 중립이에요"** — 중립\n• **"👎 불신해요"** — 불신`;const footer=`\n\n---\n⚡ 기자야, 내가 간다 | Λ¹² 사회동역학 엔진 | everbluesea.org\n1. 분석 내용을 출처 명시 없이 임의로 무단 발췌 및 배포하거나 상업적 이용 금지\n2. 자체 엔진으로 분석한 내용은 참고자료로만 활용 가능\n🔬 엔진 상세: https://everbluesea.org/reports`;return{content:[{type:"text",text:`그래, 바로 간다! 🔥\n\n**기자야 내가 간다 v5.0**\n**${title}**\n\n${display}${econCtx?`\n\n---\n*ECOS: ${econCtx.slice(0,60)}*`:''}${feedbackBlock}${formatStats(stats)||''}${footer}`}]};}
  catch(e){return{isError:true,content:[{type:"text",text:`분석 오류: ${e.message}`}]};}
}
async function handleGaps({article_text},env){
  const economic=isEconomicContent(article_text.slice(0,500));
  const ecos=economic?await fetchEcos(env.ECOS_API_KEY||'RVE8ZH17L6IACFDWVCH6'):{};
  const econCtx=Object.entries(ecos).map(([k,v])=>`${k}: ${v}`).join(' | ')||'';
  try{const r=await callAI(env.OPENAI_API_KEY,`Λ¹² 분석엔진${econCtx?`. ECOS: ${econCtx}`:''}`,`기자가 제시하지 않은 중요 공공 데이터와 맥락 5가지:\n\n${article_text.slice(0,2000)}`,800);return{content:[{type:"text",text:r}]};}
  catch(e){return{isError:true,content:[{type:"text",text:`오류: ${e.message}`}]};}
}
async function handleFeedback({url,feedback},env){
  if(!['trust','neutral','distrust'].includes(feedback))return{isError:true,content:[{type:"text",text:"feedback는 'trust' | 'neutral' | 'distrust' 중 하나여야 합니다."}]};
  if(!env.DB)return{isError:true,content:[{type:"text",text:"DB 연결 오류"}]};
  try{
    await env.DB.prepare(`INSERT INTO feedback (url,feedback_type,count,created_at) VALUES (?,?,1,?) ON CONFLICT(url,feedback_type) DO UPDATE SET count=count+1`).bind(url,feedback,new Date().toISOString()).run();
    const rows=await env.DB.prepare("SELECT feedback_type,SUM(count) as total FROM feedback WHERE url=? GROUP BY feedback_type").bind(url).all();
    const c={trust:0,neutral:0,distrust:0};
    for(const r of rows.results)c[r.feedback_type]=r.total;
    return{content:[{type:"text",text:`피드백이 저장되었습니다.\n이 기사 신뢰도: 👍 ${c.trust}건 🤔 ${c.neutral}건 👎 ${c.distrust}건`}]};
  }catch(e){return{isError:true,content:[{type:"text",text:`오류: ${e.message}`}]};}
}
async function handlePublicData({topic,region},env){
  const economic=isEconomicContent(topic);
  const parts=[];
  if(economic){const [ecos,wiki]=await Promise.all([fetchEcos(env.ECOS_API_KEY||'RVE8ZH17L6IACFDWVCH6'),fetchWiki(topic)]);if(Object.keys(ecos).length>0)parts.push(`**ECOS 금융지표:**\n${Object.entries(ecos).map(([k,v])=>`- ${k}: ${v}`).join('\n')}`);if(wiki)parts.push(`**위키-${topic}:**\n${wiki}`);}
  else{const kws=[topic,...(region&&region!==topic?[region]:[])];const wikis=await Promise.all(kws.map(fetchWiki));wikis.forEach((w,i)=>{if(w)parts.push(`**위키-${kws[i]}:**\n${w}`);});}
  if(region){try{const r=await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(region)}?fields=name,population,capital,region,subregion`,{signal:AbortSignal.timeout(4000)});if(r.ok){const d=await r.json();const c=d[0];parts.push(`**${region}:** 인구 ${c.population?.toLocaleString()}, 수도 ${c.capital?.[0]}, ${c.subregion||c.region}`);}}catch{}}
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
      else if(name==='submit_feedback')result=await handleFeedback(args,env);
      else return jerr(id,-32601,'Tool not found');
      return jres(id,result);
    }
    return jerr(id,-32601,'Method not found');
  }
};
