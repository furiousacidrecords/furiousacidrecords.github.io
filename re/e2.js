'use strict';
const $=id=>document.getElementById(id);
const Engine=(()=>{
  const DET=new Set(['a','an','the','some','this','that','these','those','my','your','his','her','our','their','its','any','each','every']);
  const DATIVES=new Set(['give','send','throw','toss','show','tell','offer','lend','pass','hand','bring','write','read']);
  const PREPS=new Set(['over','under','through','across','around','into','onto','out','in','on','at','by','from','with','without','before','after','between','among','near','past']);
  const IRREG_PP={ate:'eaten',wrote:'written',saw:'seen',made:'made',built:'built',gave:'given',sent:'sent',threw:'thrown',told:'told',brought:'brought',read:'read',bought:'bought',took:'taken',found:'found',left:'left',kept:'kept',held:'held',thought:'thought',caught:'caught',drove:'driven',spoke:'spoken',chose:'chosen'};
  const PP_TO_PAST={eaten:'ate',written:'wrote',seen:'saw',made:'made',built:'built',given:'gave',sent:'sent',thrown:'threw',told:'told',brought:'brought',read:'read',bought:'bought',taken:'took',found:'found',left:'left',kept:'kept',held:'held',thought:'thought',caught:'caught',driven:'drove',spoken:'spoke',chosen:'chose'};
  const GERUND_TO_BASE={reading:'read',writing:'write',making:'make',taking:'take',giving:'give',having:'have',coming:'come',using:'use',moving:'move',loving:'love',liking:'like',hating:'hate',hoping:'hope',seeing:'see',being:'be',lying:'lie',dying:'die',running:'run',sitting:'sit',getting:'get',putting:'put'};
  const normalize=s=>String(s).replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
  const cap=s=>s? s[0].toUpperCase()+s.slice(1):s;
  const uncap=s=>s? s[0].toLowerCase()+s.slice(1):s;
  const stripEnd=s=>s.replace(/[.!?]+$/,'').trim();
  const punct=s=>(s.match(/[.!?]+$/)||['.'])[0];
  const splitSentences=text=>(normalize(text).match(/[^.!?]+(?:[.!?]+|$)/g)||[]).map(s=>s.trim()).filter(Boolean);
  const words=s=>(s.match(/[A-Za-z]+(?:['’][A-Za-z]+)?(?:-[A-Za-z]+)*/g)||[]);
  function toGerund(v){let x=v.toLowerCase();if(x.endsWith('ie'))return x.slice(0,-2)+'ying';if(/[^aeiou]e$/.test(x)&&!x.endsWith('ee'))return x.slice(0,-1)+'ing';if(x.length<=4&&/[^aeiou][aeiou][^aeiouwxy]$/.test(x))return x+x.at(-1)+'ing';return x+'ing';}
  function fromGerund(g){const low=g.toLowerCase();if(GERUND_TO_BASE[low])return GERUND_TO_BASE[low];if(!low.endsWith('ing')||low.length<5)return null;let stem=low.slice(0,-3);if(stem.length>2&&stem.at(-1)===stem.at(-2)&&!/ss$/.test(stem))stem=stem.slice(0,-1);return stem;}
  function pastParticiple(v){const low=v.toLowerCase();if(IRREG_PP[low])return IRREG_PP[low];if(low.endsWith('ed'))return low;if(low.endsWith('e'))return low+'d';return low+'ed';}
  function permute(a){if(a.length<=1)return [a];const out=[];for(let i=0;i<a.length;i++){const rest=[...a.slice(0,i),...a.slice(i+1)];for(const p of permute(rest))out.push([a[i],...p]);}return out;}
  function roleMap(text){
    const s=splitSentences(text);
    if(s.length===2){
      const a=stripEnd(s[0]),b=stripEnd(s[1]);
      let m=a.match(/^(.+?)\s+(can|could)\s+([A-Za-z]+)(.*)$/i),n=b.match(/^(it|this|that)\s+(is|was)\s+(.+)$/i);
      if(m&&n)return `SUBJECT(${m[1]}) + MODAL(${m[2]}) + ACTION(${m[3]}${m[4]})  |  REFERENCE(${n[1]}) + COPULA(${n[2]}) + DESCRIPTION(${n[3]})`;
    }
    if(s.length===1){
      const x=stripEnd(s[0]);
      const d=parseDativeImperative(x);if(d)return `ACTION(${d.verb}) + RECIPIENT(${d.recipient})${d.path?` + PATH(${d.path})`:''} + THEME(${d.theme})`;
      const inf=x.match(/^(it|this|that)\s+(is|was)\s+(.+?)\s+to\s+([A-Za-z]+)(.*)$/i);if(inf)return `REFERENCE(${inf[1]}) + COPULA(${inf[2]}) + DESCRIPTION(${inf[3]}) + INFINITIVE(${inf[4]}${inf[5]})`;
      const ger=x.match(/^([A-Za-z]+ing(?:\s+.*)?)\s+(is|was)\s+(.+)$/i);if(ger)return `EVENT(${ger[1]}) + COPULA(${ger[2]}) + DESCRIPTION(${ger[3]})`;
    }
    return s.map((x,i)=>`CLAUSE${i+1}(${stripEnd(x)})`).join(' + ');
  }
  function parseDativeImperative(x){
    const toks=words(x);if(toks.length<4)return null;const verb=toks[0].toLowerCase();if(!DATIVES.has(verb))return null;
    const lower=toks.map(t=>t.toLowerCase());
    const toIdx=lower.lastIndexOf('to');
    if(toIdx>1&&toIdx<toks.length-1){
      const before=toks.slice(1,toIdx);let p=-1;for(let i=1;i<before.length;i++){if(PREPS.has(before[i].toLowerCase())){p=i;break;}}
      const theme=(p<0?before:before.slice(0,p)).join(' ');const path=(p<0?[]:before.slice(p)).join(' ');const recipient=toks.slice(toIdx+1).join(' ');
      if(theme&&recipient)return {verb:toks[0],recipient,theme,path,direction:'to'};
    }
    let themeIdx=-1;for(let i=2;i<toks.length;i++){if(DET.has(lower[i]))themeIdx=i;}
    if(themeIdx<0)return null;
    let prepIdx=-1;for(let i=1;i<themeIdx;i++){if(PREPS.has(lower[i])){prepIdx=i;break;}}
    const recipient=toks.slice(1,prepIdx>0?prepIdx:themeIdx).join(' ');const path=prepIdx>0?toks.slice(prepIdx,themeIdx).join(' '):'';const theme=toks.slice(themeIdx).join(' ');
    if(!recipient||!theme)return null;return {verb:toks[0],recipient,theme,path,direction:'double'};
  }
  function build(source,transitionMode='off'){
    source=normalize(source);const all=[];const seen=new Set();
    function add(text,rule,score,note,formula){text=normalize(text);if(!text)return;const k=text.toLowerCase();if(seen.has(k))return;seen.add(k);all.push({text,rule,score,note,formula});}
    add(source,'R00',1.00,'Original wording.','M + G₀ → original');
    const sents=splitSentences(source);
    if(sents.length>1&&sents.length<=4){
      const ps=permute(sents);for(const p of ps){const t=p.join(' ');if(normalize(t)!==source)add(t,'R01',.98,'The complete clauses changed order; the clauses themselves stayed intact.','CLAUSE ORDER: C₁…Cₙ → permutation(C)');}
      for(let i=0;i<sents.length-1;i++){
        const joined=[...sents];joined.splice(i,2,stripEnd(sents[i])+'; '+uncap(stripEnd(sents[i+1]))+punct(sents[i+1]));add(joined.join(' '),'R02',.99,'Two neighboring clauses were joined with punctuation only.','C₁ . C₂ → C₁ ; C₂');
      }
    }
    if(sents.length===2){
      const a=stripEnd(sents[0]),b=stripEnd(sents[1]);
      let m=a.match(/^(.+?)\s+(can|could)\s+([A-Za-z]+)(.*)$/i),n=b.match(/^(it|this|that)\s+(is|was)\s+(.+)$/i);
      if(m&&n){const v=m[3],tail=m[4].trim(),desc=n[3].trim(),cop=n[2].toLowerCase();const inf=`${cap(n[1])} ${cop} ${desc} to ${v}${tail?' '+tail:''}.`;add(inf,'R10',.94,'The event became an infinitive complement; the core action and description stayed anchored.',`[S + ${m[2]} + V] + [REF + BE + DESC] → REF + BE + DESC + TO + V`);
        const ger=cap(toGerund(v))+(tail?' '+tail:'')+` ${cop} ${desc}.`;add(ger,'R11',.92,'The action became an event noun (gerund), preserving the action/description relationship.','ACTION(V) → EVENT(V-ing); EVENT + BE + DESCRIPTION');
        const toForm=`To ${v}${tail?' '+tail:''} ${cop} ${desc}.`;add(toForm,'R12',.90,'The action became an infinitive subject.','ACTION(V) → TO + V; [TO V] + BE + DESCRIPTION');
      }
      if(transitionMode!=='off'){
        const a0=stripEnd(sents[0]),b0=uncap(stripEnd(sents[1]));add(`${a0}, and ${b0}.`,'T01',.96,'A neutral additive connector joined the existing clauses.','C₁ + C₂ → C₁ AND C₂');
        add(`${a0}; moreover, ${b0}.`,'T02',.90,'“Moreover” adds emphasis but does not claim causation.','C₁ + C₂ → C₁ ; MOREOVER C₂');
        add(`${a0}; in addition, ${b0}.`,'T03',.90,'“In addition” marks the second clause as additive.','C₁ + C₂ → C₁ ; IN-ADDITION C₂');
        if(transitionMode==='expressive'){
          add(`${a0}; therefore, ${b0}.`,'T10',.78,'“Therefore” adds a result/causal relation not guaranteed by the source.','C₁ + C₂ → C₁ ⇒ C₂');
          add(`${a0}, so ${b0}.`,'T11',.78,'“So” adds a result relation not guaranteed by the source.','C₁ + C₂ → C₁ ⇒ C₂');
          add(`${cap(b0)} since ${uncap(a0)}.`,'T12',.74,'“Since” interprets the first clause as a cause; effect may drift.','C₁ + C₂ → C₂ BECAUSE C₁');
          add(`${a0}; thus, ${b0}.`,'T13',.77,'“Thus” adds an inference/result relation.','C₁ + C₂ → C₁ ⇒ C₂');
        }
      }
    }
    for(const original of sents){const x=stripEnd(original),end=punct(original);
      let m=x.match(/^(it|this|that)\s+(is|was)\s+(.+?)\s+to\s+([A-Za-z]+)(.*)$/i);
      if(m){const ger=cap(toGerund(m[4]))+(m[5].trim()?' '+m[5].trim():'')+` ${m[2].toLowerCase()} ${m[3]}.`;add(source.replace(original,ger),'R13',.96,'Infinitive event became a gerund event.','REF + BE + DESC + TO V → V-ing + BE + DESC');}
      m=x.match(/^([A-Za-z]+ing)(.*)\s+(is|was)\s+(.+)$/i);
      if(m){const base=fromGerund(m[1]);if(base){const rest=m[2].trim();const t=`It ${m[3].toLowerCase()} ${m[4]} to ${base}${rest?' '+rest:''}.`;add(source.replace(original,t),'R14',.94,'Gerund event became an infinitive complement.','V-ing + BE + DESC → REF + BE + DESC + TO V');}}
      const d=parseDativeImperative(x);if(d){if(d.direction==='double'){const t=`${d.verb} ${d.theme}${d.path?' '+d.path:''} to ${d.recipient}${end}`;add(source.replace(original,t),'R30',.99,'Recipient/theme order changed using the English dative alternation.','ACTION + RECIPIENT + PATH + THEME → ACTION + THEME + PATH + TO + RECIPIENT');}else{const t=`${d.verb} ${d.recipient}${d.path?' '+d.path:''} ${d.theme}${end}`;add(source.replace(original,t),'R31',.99,'The “to” dative changed back to a double-object order.','ACTION + THEME + PATH + TO + RECIPIENT → ACTION + RECIPIENT + PATH + THEME');}}
      const toks=words(x);let vi=-1;for(let i=1;i<toks.length-1;i++){const low=toks[i].toLowerCase();if(low.endsWith('ed')||IRREG_PP[low]){vi=i;break;}}
      if(vi>0){const subj=toks.slice(0,vi).join(' '),verb=toks[vi],obj=toks.slice(vi+1).join(' ');if(obj&&!/^(was|were|is|are|be|been)$/i.test(verb)){const pp=pastParticiple(verb),be=/s$/i.test(obj.split(' ').at(-1))?'were':'was';const t=`${cap(obj)} ${be} ${pp} by ${uncap(subj)}${end}`;add(source.replace(original,t),'R20',.97,'Active voice changed to passive while keeping agent, action, and patient roles.','AGENT + V + PATIENT → PATIENT + BE + Vpp + BY + AGENT');}}
      m=x.match(/^(.+?)\s+(was|were)\s+([A-Za-z]+)\s+by\s+(.+)$/i);if(m){const past=PP_TO_PAST[m[3].toLowerCase()]||(m[3].toLowerCase().endsWith('ed')?m[3].toLowerCase():null);if(past){const t=`${cap(m[4])} ${past} ${uncap(m[1])}${end}`;add(source.replace(original,t),'R21',.97,'Passive voice changed to active while preserving semantic roles.','PATIENT + BE + Vpp + BY + AGENT → AGENT + V + PATIENT');}}
      m=x.match(/^(In|On|At|During|After|Before|With|Without|Under|Over|Through|By|For)\s+([^,]+),\s+(.+)$/i);if(m){const t=`${cap(m[3])} ${m[1].toLowerCase()} ${m[2]}${end}`;add(source.replace(original,t),'R40',.97,'An introductory prepositional modifier moved to the end of its clause.','MODIFIER + CLAUSE → CLAUSE + MODIFIER');}
      m=x.match(/^(.+?)\s+([A-Za-z]+ly)\s+([A-Za-z]+)(\s+.+)?$/i);if(m){const t=`${m[1]} ${m[3]}${m[4]||''} ${m[2]}${end}`;add(source.replace(original,t),'R41',.91,'An adverb moved within the clause; scope is usually similar but can vary.','S + ADV + V + X → S + V + X + ADV');}
      const pairs=[[/\bit is\b/i,(m)=>m[0][0]==='I'?"It's":"it's"],[/\bit's\b/i,'it is'],[/\bI am\b/,'I\'m'],[/\bI'm\b/,'I am'],[/\bdo not\b/i,"don't"],[/\bdon't\b/i,'do not'],[/\bcannot\b/i,"can't"],[/\bcan't\b/i,'cannot'],[/\bwill not\b/i,"won't"],[/\bwon't\b/i,'will not']];
      for(const [re,rep] of pairs){if(re.test(original)){const t=original.replace(re,rep);add(source.replace(original,t),'R50',1.00,'Only contraction/expansion changed; proposition and syntax roles stayed the same.','SURFACE FORM ↔ CONTRACTION');}}
    }
    const counts={};for(const c of all){counts[c.rule]=(counts[c.rule]||0)+1;c.key=`E2-${c.rule}-${String(counts[c.rule]).padStart(2,'0')}`;c.roleMap=roleMap(source);}return all;
  }
  return {build,roleMap};
})();

let allCandidates=[],accepted=[],pos=0;
function show(i){if(!accepted.length)return;pos=Math.max(0,Math.min(i,accepted.length-1));const c=accepted[pos];$('out').textContent=c.text;$('variant').textContent=`${pos+1} / ${accepted.length}`;$('total').textContent=String(accepted.length);$('score').textContent=Math.round(c.score*100)+'%';$('key').value=c.key;$('formula').textContent=`${c.roleMap}   ⟶   ${c.formula}`;$('why').innerHTML=`<span class="badge">${c.rule}</span>${escapeHtml(c.note)}`;$('back').disabled=pos===0;$('regen').disabled=pos===accepted.length-1;$('copy').disabled=false;$('apply').disabled=false;$('status').className='status';$('status').textContent=pos===accepted.length-1?'That is the last accepted rewrite at this effect floor.':'';}
function rebuild(){const src=$('source').value.trim();if(!src){$('status').className='status err';$('status').textContent='Enter something first.';return;}const floor=Number($('floor').value)/100;allCandidates=Engine.build(src,$('transitions').value);accepted=allCandidates.filter(c=>c.score>=floor);pos=0;if(!accepted.length){$('status').className='status err';$('status').textContent='No candidates passed the effect floor.';return;}show(0);$('status').textContent=`Built ${allCandidates.length} legal candidate${allCandidates.length===1?'':'s'}; ${accepted.length} passed the ${Math.round(floor*100)}% effect floor.`;}
function applyKey(){const k=$('applyKey').value.trim().toUpperCase();const i=accepted.findIndex(c=>c.key.toUpperCase()===k);if(i>=0){show(i);return;}const any=allCandidates.find(c=>c.key.toUpperCase()===k);if(any){$('status').className='status warning';$('status').textContent=`That key exists, but its ${Math.round(any.score*100)}% effect confidence is below the current floor.`;return;}$('status').className='status err';$('status').textContent='That key does not match this E2 input.';}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('load').addEventListener('click',rebuild);$('regen').addEventListener('click',()=>show(pos+1));$('back').addEventListener('click',()=>show(pos-1));$('apply').addEventListener('click',applyKey);$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('key').value);$('status').textContent='Key copied.';}catch(_){$('key').select();document.execCommand('copy');}});$('floor').addEventListener('input',()=>{$('floorValue').textContent=$('floor').value+'%';});$('floor').addEventListener('change',()=>{if(allCandidates.length){accepted=allCandidates.filter(c=>c.score>=Number($('floor').value)/100);show(0);}});$('transitions').addEventListener('change',()=>{if($('source').value.trim())rebuild();});$('source').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')rebuild();});
rebuild();
