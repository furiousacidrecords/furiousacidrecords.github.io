'use strict';

const $ = id => document.getElementById(id);

const MAX_SYNS_PER_WORD = 3;
const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)?(?:-[A-Za-z]+)*/g;
const STOP = new Set(`a an the i me my mine you your yours he him his she her hers it its we us our ours they them their theirs this that these those who whom whose which what am is are was were be been being do does did done have has had can could will would shall should may might must and or but nor for yet so if then than because since while of to in on at by from with without as into onto over under up down out off about before after between through during against among not no yes very too also just only even there here`.split(/\s+/));
const DATIVE_PREP = new Map([
  ['give','to'],['send','to'],['show','to'],['tell','to'],['offer','to'],['lend','to'],['loan','to'],['pass','to'],['hand','to'],['bring','to'],['write','to'],['read','to'],['throw','to'],['toss','to'],['teach','to'],['sell','to'],
  ['buy','for'],['purchase','for'],['get','for'],['make','for'],['build','for'],['cook','for'],['bake','for'],['find','for'],['save','for'],['order','for'],['choose','for']
]);

let state = {
  source: '',
  variants: [],
  index: 0,
  analysis: null,
  mode: 'formal',
  floor: 88,
  limit: 25
};

function normalize(s) {
  return String(s || '').replace(/\s+/g, ' ').replace(/\s+([,.;!?])/g, '$1').trim();
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function uncap(s) { return s ? s[0].toLowerCase() + s.slice(1) : s; }
function stripEnd(s) { return String(s).replace(/[.!?]+$/,'').trim(); }
function punct(s) { return (String(s).match(/[.!?]+$/)||['.'])[0]; }
function splitSentences(text) {
  return (normalize(text).match(/[^.!?]+(?:[.!?]+|$)/g)||[]).map(s=>s.trim()).filter(Boolean);
}
function uniqueByText(rows) {
  const seen = new Set();
  return rows.filter(r => {
    const k = normalize(r.text).toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });
}
function shuffle(a) {
  const out=[...a];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function preserveCase(from, to) {
  if (!to) return to;
  if (from === from.toUpperCase()) return to.toUpperCase();
  if (/^[A-Z]/.test(from)) return cap(to);
  return to.toLowerCase();
}
function isSingleWord(s) {
  return /^[A-Za-z]+(?:['’][A-Za-z]+)?(?:-[A-Za-z]+)*$/.test(String(s||'').trim());
}
function safeNlp(text) {
  if (typeof window.nlp !== 'function') throw new Error('The grammar engine did not load. Refresh and try again.');
  return window.nlp(text);
}

function broadPOSFromTags(tags=[]) {
  const set = new Set(tags);
  if (set.has('Verb')) return 'Verb';
  if (set.has('Noun')) return 'Noun';
  if (set.has('Adjective')) return 'Adjective';
  if (set.has('Adverb')) return 'Adverb';
  return null;
}
function termRecords(text) {
  const data = safeNlp(text).json();
  const out=[];
  let idx=0;
  for(const sentence of data){
    for(const t of (sentence.terms||[])){
      if(!/[A-Za-z]/.test(t.text||'')) continue;
      out.push({ index: idx++, text:t.text, normal:t.normal||String(t.text||'').toLowerCase(), tags:t.tags||[], pos:broadPOSFromTags(t.tags||[]) });
    }
  }
  return out;
}
function grammarSummary(text) {
  const doc = safeNlp(text);
  const clauses = doc.clauses().out('array');
  const chunks = doc.chunks().out('array');
  const terms = termRecords(text);
  const tags = terms.map(t => `${t.text}:${t.pos||'Other'}`).join(' · ');
  return { clauses, chunks, terms, tags };
}

function inflectLike(originalRecord, synonym) {
  let s = String(synonym).trim();
  if (!isSingleWord(s)) return null;
  const tags = new Set(originalRecord.tags||[]);
  try {
    let d = safeNlp(s);
    if (originalRecord.pos === 'Verb') {
      if (!d.has('#Verb')) return null;
      if (tags.has('Gerund')) d.verbs().toGerund();
      else if (tags.has('PastTense')) d.verbs().toPastTense();
      else if (tags.has('FutureTense')) d.verbs().toFutureTense();
      else if (tags.has('Infinitive')) d.verbs().toInfinitive();
      else if (tags.has('PresentTense')) d.verbs().toPresentTense();
      s = d.text().trim();
    } else if (originalRecord.pos === 'Noun') {
      if (!d.has('#Noun')) return null;
      if (tags.has('Plural')) d.nouns().toPlural();
      else if (tags.has('Singular')) d.nouns().toSingular();
      s = d.text().trim();
    } else if (originalRecord.pos === 'Adjective') {
      if (!d.has('#Adjective')) return null;
    } else if (originalRecord.pos === 'Adverb') {
      if (!d.has('#Adverb')) return null;
    } else return null;
  } catch (_) { return null; }
  if (!isSingleWord(s)) return null;
  return preserveCase(originalRecord.text, s);
}

async function fetchSynonyms(record) {
  if (!record.pos || STOP.has(record.normal) || record.text.length < 2) return [];
  const url = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(record.normal)}&max=18`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 5000);
    const r = await fetch(url, { signal: controller.signal, headers:{Accept:'application/json'} });
    clearTimeout(timer);
    if(!r.ok) return [];
    const rows = await r.json();
    const out=[]; const seen=new Set([record.normal]);
    for(const row of rows){
      const candidate = inflectLike(record, row.word);
      if(!candidate) continue;
      const key=candidate.toLowerCase();
      if(seen.has(key)) continue;
      seen.add(key); out.push(candidate);
      if(out.length>=MAX_SYNS_PER_WORD) break;
    }
    return out;
  } catch (_) { return []; }
}

function replaceNthWord(text, targetIndex, replacement) {
  let i=-1;
  return String(text).replace(WORD_RE, m => (++i === targetIndex ? replacement : m));
}

function contractionVariants(source) {
  const out=[];
  try {
    let d=safeNlp(source); d.contractions().expand();
    const expanded=normalize(d.text());
    if(expanded.toLowerCase()!==normalize(source).toLowerCase()) out.push({text:expanded,rule:'C-EXPAND',score:100,note:'Expanded contractions using the grammar engine.',formula:'CONTRACTION → expanded form'});
  } catch(_){ }
  try {
    let d=safeNlp(source); d.contractions().contract();
    const contracted=normalize(d.text());
    if(contracted.toLowerCase()!==normalize(source).toLowerCase()) out.push({text:contracted,rule:'C-CONTRACT',score:100,note:'Contracted compatible forms using the grammar engine.',formula:'expanded form → CONTRACTION'});
  } catch(_){ }
  return out;
}

function clauseMovementVariants(source) {
  const out=[];
  const sents=splitSentences(source);
  if(sents.length===2){
    out.push({text:`${sents[1]} ${sents[0]}`,rule:'S-SWAP',score:95,note:'Swapped two complete sentences without changing either sentence internally.',formula:'S₁ + S₂ → S₂ + S₁'});
    out.push({text:`${stripEnd(sents[0])}; ${uncap(stripEnd(sents[1]))}${punct(sents[1])}`,rule:'S-JOIN',score:98,note:'Joined two complete statements with punctuation only.',formula:'S₁ . S₂ → S₁ ; S₂'});
  }
  const one=sents.length===1?stripEnd(sents[0]):null;
  if(one){
    const m=one.match(/^(Because|Since|Although|While|When|If|As)\s+([^,]+),\s+(.+)$/i);
    if(m){
      out.push({text:`${cap(m[3])} ${m[1].toLowerCase()} ${m[2]}.`,rule:'S-SUBORD',score:99,note:'Moved a dependent clause without deleting its relationship word.',formula:'REL + DEP, MAIN → MAIN + REL + DEP'});
    }
    const n=one.match(/^(.+?)\s+(because|since|although|while|when|if|as)\s+(.+)$/i);
    if(n){
      out.push({text:`${cap(n[2])} ${n[3]}, ${uncap(n[1])}.`,rule:'S-SUBORD-BACK',score:99,note:'Moved the dependent clause to the front while keeping the same relation.',formula:'MAIN + REL + DEP → REL + DEP, MAIN'});
    }
  }
  return out;
}

function gerundOf(v) {
  try { const d=safeNlp(v); d.verbs().toGerund(); return d.text().trim() || v; } catch(_) { return v; }
}
function infinitiveOf(v) {
  try { const d=safeNlp(v); d.verbs().toInfinitive(); return d.text().trim() || v; } catch(_) { return v; }
}

function infinitiveGerundVariants(source) {
  const out=[]; const sents=splitSentences(source);
  for(const sentence of sents){
    const x=stripEnd(sentence);
    let m=x.match(/^(It|This|That)\s+(is|was)\s+(.+?)\s+to\s+([A-Za-z]+)(.*)$/i);
    if(m){
      const g=gerundOf(m[4]);
      const replacement=`${cap(g)}${m[5]} ${m[2].toLowerCase()} ${m[3]}.`;
      out.push({text:normalize(source.replace(sentence,replacement)),rule:'S-INF-GER',score:96,note:'Changed an infinitive event into a gerund subject.',formula:'REF + BE + DESC + TO V → V-ing + BE + DESC'});
    }
    m=x.match(/^([A-Za-z]+ing)(.*)\s+(is|was)\s+(.+)$/i);
    if(m){
      const v=infinitiveOf(m[1]);
      const replacement=`It ${m[3].toLowerCase()} ${m[4]} to ${v}${m[2]}.`;
      out.push({text:normalize(source.replace(sentence,replacement)),rule:'S-GER-INF',score:95,note:'Changed a gerund subject into an infinitive complement.',formula:'V-ing + BE + DESC → REF + BE + DESC + TO V'});
    }
  }
  if(sents.length===2){
    const a=stripEnd(sents[0]), b=stripEnd(sents[1]);
    const m=a.match(/^(.+?)\s+(can|could)\s+([A-Za-z]+)(.*)$/i);
    const n=b.match(/^(it|this|that)\s+(is|was)\s+(.+)$/i);
    if(m&&n){
      const v=infinitiveOf(m[3]); const tail=m[4].trim(); const desc=n[3].trim();
      out.push({text:`${cap(n[1])} ${n[2].toLowerCase()} ${desc} to ${v}${tail?' '+tail:''}.`,rule:'S-CAN-INF',score:90,note:'Compressed a capability statement plus description into an infinitive construction. This is accepted conservatively because “it” must refer to the action.',formula:'[S + MODAL + V] + [REF + BE + DESC] → REF + BE + DESC + TO V'});
      const g=gerundOf(v);
      out.push({text:`${cap(g)}${tail?' '+tail:''} ${n[2].toLowerCase()} ${desc}.`,rule:'S-CAN-GER',score:88,note:'Compressed the two statements into an event/description sentence.',formula:'[S + MODAL + V] + [REF + BE + DESC] → V-ing + BE + DESC'});
    }
  }
  return out;
}

function dativeVariants(source) {
  const out=[];
  const records=termRecords(source);
  for(let i=0;i<records.length-2;i++){
    const v=records[i];
    if(v.pos!=='Verb') continue;
    let root=v.normal;
    try {
      const d=safeNlp(v.text); const c=d.verbs().conjugate();
      if(Array.isArray(c) && c[0] && c[0].Infinitive) root=String(c[0].Infinitive).toLowerCase();
    } catch(_){ }
    const prep=DATIVE_PREP.get(root);
    if(!prep) continue;
    const r=records[i+1], t=records[i+2];
    if(r.pos!=='Noun' || t.pos!=='Noun') continue;
    const around = normalize(source);
    if(new RegExp(`\\b${r.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}['’]\\s+${t.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(around)) continue;
    const phrase=`${v.text} ${r.text} ${t.text}`;
    if(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(source)){
      const replacement=`${v.text} ${t.text} ${prep} ${r.text}`;
      out.push({text:normalize(source.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i'),replacement)),rule:'S-DATIVE',score:99,note:`Moved recipient and theme using the English ${prep}-dative alternation.`,formula:`V + RECIPIENT + THEME → V + THEME + ${prep.toUpperCase()} + RECIPIENT`});
    }
  }
  const rx=/\b([A-Za-z]+(?:ing|ed|s)?)\s+([A-Za-z]+)\s+(to|for)\s+([A-Za-z]+)\b/gi;
  let m;
  while((m=rx.exec(source))){
    const verbRec=termRecords(m[1])[0]; if(!verbRec || verbRec.pos!=='Verb') continue;
    let root=verbRec.normal;
    try { const c=safeNlp(m[1]).verbs().conjugate(); if(c?.[0]?.Infinitive) root=String(c[0].Infinitive).toLowerCase(); } catch(_){ }
    const prep=DATIVE_PREP.get(root); if(!prep || prep!==m[3].toLowerCase()) continue;
    const replacement=`${m[1]} ${m[4]} ${m[2]}`;
    out.push({text:normalize(source.slice(0,m.index)+replacement+source.slice(m.index+m[0].length)),rule:'S-DATIVE-BACK',score:99,note:'Changed a prepositional dative back into a double-object order.',formula:`V + THEME + ${prep.toUpperCase()} + RECIPIENT → V + RECIPIENT + THEME`});
  }
  return out;
}

function transitionVariants(source, mode) {
  if(mode==='off') return [];
  const s=splitSentences(source); if(s.length!==2) return [];
  const a=stripEnd(s[0]), b=uncap(stripEnd(s[1]));
  const out=[
    {text:`${a}, and ${b}.`,rule:'T-AND',score:94,note:'Joined two existing statements with a neutral additive connector.',formula:'S₁ + S₂ → S₁ AND S₂'},
    {text:`${a}; moreover, ${b}.`,rule:'T-MORE',score:88,note:'Added an additive transition; meaning is usually close but emphasis changes.',formula:'S₁ + S₂ → S₁ ; MOREOVER S₂'}
  ];
  if(mode==='expressive'){
    out.push({text:`${a}; therefore, ${b}.`,rule:'T-THEREFORE',score:72,note:'Adds a result relation that the source may not explicitly state.',formula:'S₁ + S₂ → S₁ ⇒ S₂'});
  }
  return out;
}

async function lexicalVariants(base, mode) {
  const records=termRecords(base.text);
  const eligible=records.filter(r=>r.pos && !STOP.has(r.normal) && r.text.length>2);
  const synMap=new Map();
  await Promise.all(eligible.map(async r=>synMap.set(r.index, await fetchSynonyms(r))));
  const out=[];
  for(const r of eligible){
    for(const syn of (synMap.get(r.index)||[])){
      const text=replaceNthWord(base.text,r.index,syn);
      let ok=false;
      try { const d=safeNlp(text); ok = r.pos==='Verb'?d.has(`#Verb ${syn}`)||d.has(`${syn} #Verb`)||safeNlp(syn).has('#Verb') : r.pos==='Noun'?safeNlp(syn).has('#Noun') : r.pos==='Adjective'?safeNlp(syn).has('#Adjective') : r.pos==='Adverb'?safeNlp(syn).has('#Adverb') : false; } catch(_){ }
      if(!ok) continue;
      out.push({text,rule:`L-${r.pos.toUpperCase()}`,score:base.score-5,note:`Grammar-aware substitution: ${r.text} → ${syn} (${r.pos}).`,formula:`${r.pos.toUpperCase()} → compatible ${r.pos.toUpperCase()}`});
    }
  }
  if(mode==='west'){
    const slots=eligible.filter(r=>(synMap.get(r.index)||[]).length).slice(0,6);
    for(let a=0;a<slots.length;a++) for(let b=a+1;b<slots.length;b++){
      const sa=(synMap.get(slots[a].index)||[])[0], sb=(synMap.get(slots[b].index)||[])[0];
      if(!sa||!sb) continue;
      let text=replaceNthWord(base.text,slots[a].index,sa);
      text=replaceNthWord(text,slots[b].index,sb);
      out.push({text,rule:'L-DOUBLE',score:base.score-9,note:'Two grammar-aware lexical substitutions were combined.',formula:'LEGAL SYNTAX × LEX₁ × LEX₂'});
    }
  }
  return out;
}

async function buildVariants(source, mode, transitionMode, floor, limit) {
  const base=[{text:source,rule:'R00',score:100,note:'Original sentence.',formula:'INPUT'}];
  base.push(...contractionVariants(source));
  base.push(...clauseMovementVariants(source));
  base.push(...infinitiveGerundVariants(source));
  base.push(...dativeVariants(source));
  base.push(...transitionVariants(source, transitionMode));
  let structural=uniqueByText(base).filter(x=>x.score>=floor);
  const lex=[];
  const lexBases = mode==='west' ? structural : structural.filter(x=>x.score>=94).slice(0,8);
  for(const b of lexBases){
    const rows=await lexicalVariants(b, mode);
    lex.push(...rows);
    if(lex.length>limit*4) break;
  }
  let all=uniqueByText([...structural,...lex]).filter(x=>x.score>=floor);
  const original=all.find(x=>x.rule==='R00');
  let rest=all.filter(x=>x!==original);
  if(mode==='formal') rest.sort((a,b)=>b.score-a.score || a.rule.localeCompare(b.rule));
  else rest=shuffle(rest);
  all=[...(original?[original]:[]),...rest].slice(0,limit);
  return all;
}

function renderAnalysis(source) {
  const a=grammarSummary(source); state.analysis=a;
  $('formula').textContent = a.chunks.length ? `CHUNKS = [${a.chunks.join('] [')}]` : 'No chunks found.';
  $('why').innerHTML = `<span class="badge">Compromise POS/grammar</span><span class="badge">${a.clauses.length} clause${a.clauses.length===1?'':'s'}</span><br>${escapeHtml(a.tags || 'No tagged words')}`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function renderVariant(i) {
  if(!state.variants.length) return;
  const n=((i%state.variants.length)+state.variants.length)%state.variants.length;
  state.index=n; const v=state.variants[n];
  $('out').textContent=v.text;
  $('variant').textContent=`${n+1}/${state.variants.length}`;
  $('total').textContent=String(state.variants.length);
  $('score').textContent=`${Math.round(v.score)}%`;
  $('key').value=`E3-${v.rule}-${String(n+1).padStart(2,'0')}`;
  $('formula').textContent=v.formula;
  $('why').innerHTML=`<span class="badge">${escapeHtml(v.rule)}</span> ${escapeHtml(v.note)}`;
  $('regen').disabled=state.variants.length<2;
  $('back').disabled=state.variants.length<2;
  $('copy').disabled=false;
  $('apply').disabled=false;
  $('status').className='status';
  $('status').textContent = n===state.variants.length-1 ? 'Last accepted rewrite. Next REGENERATE wraps to the first.' : '';
}

async function load() {
  const source=normalize($('source').value);
  if(!source) return;
  state.source=source;
  state.mode=$('mode').value;
  state.floor=Number($('floor').value);
  state.limit=Number($('limit').value);
  $('load').disabled=true; $('regen').disabled=true; $('back').disabled=true; $('apply').disabled=true;
  $('status').className='status'; $('status').textContent='Parsing English rules and building legal candidates…';
  try {
    renderAnalysis(source);
    state.variants=await buildVariants(source,state.mode,$('transitions').value,state.floor,state.limit);
    state.index=0;
    if(!state.variants.length) throw new Error('No candidate passed the current effect floor.');
    renderVariant(0);
    $('status').textContent=`Ready. ${state.variants.length} accepted variant${state.variants.length===1?'':'s'}; cap ${state.limit}.`;
  } catch(err) {
    $('status').className='status err'; $('status').textContent=`Could not build: ${err.message}`;
    $('out').textContent='—'; $('variant').textContent='—'; $('total').textContent='—'; $('score').textContent='—';
  } finally { $('load').disabled=false; }
}

function applyKey(){
  const raw=$('applyKey').value.trim();
  const m=raw.match(/^E3-(.+)-(\d{2})$/i);
  if(!m){alert('Use an E3 key like E3-S-DATIVE-02.');return;}
  const n=Number(m[2])-1;
  if(n<0||n>=state.variants.length){alert('That key is outside this build.');return;}
  const v=state.variants[n];
  if(v.rule.toLowerCase()!==m[1].toLowerCase()){alert('The rule code does not match this variant list.');return;}
  renderVariant(n);
}

async function copyKey(){
  const value=$('key').value;
  try{await navigator.clipboard.writeText(value);}catch(_){$('key').focus();$('key').select();document.execCommand('copy');}
  $('status').className='status'; $('status').textContent='Key copied.';
}

$('floor').addEventListener('input',()=>{$('floorValue').textContent=$('floor').value+'%';});
$('load').addEventListener('click',load);
$('regen').addEventListener('click',()=>renderVariant(state.index+1));
$('back').addEventListener('click',()=>renderVariant(state.index-1));
$('copy').addEventListener('click',copyKey);
$('apply').addEventListener('click',applyKey);
$('source').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')load();});
