const EVENTS = window.SESSIONS;
const DAYS = [
  {key:"Wed", label:"Wednesday", date:"July 8"},
  {key:"Thu", label:"Thursday",  date:"July 9"},
  {key:"Fri", label:"Friday",    date:"July 10"},
  {key:"Sat", label:"Saturday",  date:"July 11"},
];
const CATS = ["Lecture (Research)","Lecture","Research Lecture","Research","Workshop","Abstract Podium Presentations","Abstract Poster Session (non-podium)","My Presentation"];
const CAT_SHORT = {
  "Lecture (Research)":"Lecture · Research",
  "Lecture":"Lecture",
  "Research Lecture":"Research Lecture",
  "Research":"Research",
  "Workshop":"Workshop",
  "Abstract Podium Presentations":"Podium",
  "Abstract Poster Session (non-podium)":"Poster",
  "My Presentation":"My Event",
};
const STORE_KEY = "nsca2026planner.v1";

let state = load();
let view = "Wed";           // Wed/Thu/Fri/Sat/plan
let activeCats = new Set(); // empty = all
let activePf = new Set();   // p1/p2/star
let query = "";

function load(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch(e){ return {}; }
}
function save(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}
function rec(id){ return state[id] || (state[id] = {prio:null, star:false, notes:""}); }

/* ---- time helpers ---- */
function toMin(t){
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i); if(!m) return 0;
  let h=+m[1], mn=+m[2]; const ap=m[3].toUpperCase();
  if(ap==="PM"&&h!==12)h+=12; if(ap==="AM"&&h===12)h=0;
  return h*60+mn;
}
function dur(s,e){ const d=toMin(e)-toMin(s); if(d<=0)return ""; return d>=60?`${Math.floor(d/60)}h${d%60?(" "+(d%60)+"m"):""}`:`${d}m`; }
function overlaps(a,b){ return a.date===b.date && toMin(a.start)<toMin(b.end) && toMin(b.start)<toMin(a.end); }

/* ---- selection of "in plan" ---- */
function inPlan(e){ const r=state[e.id]; return e.personal || (r && (r.prio||r.star)); }

/* ---- render scaffold ---- */
function renderTabs(){
  const wrap = document.getElementById('dayTabs');
  wrap.innerHTML = "";
  DAYS.forEach(d=>{
    const n = EVENTS.filter(e=>e.day===d.key).length;
    const planN = EVENTS.filter(e=>e.day===d.key && inPlan(e)).length;
    const b = document.createElement('button');
    b.className = 'daytab'+(view===d.key?' active':'');
    b.dataset.day = d.key;
    b.innerHTML = `<span class="dt-day"><span class="dot"></span>${d.label}</span>
      <span class="dt-date">${d.date}</span>
      <span class="dt-count">${n} sessions · ${planN} picked</span>`;
    b.onclick=()=>{view=d.key;renderAll();window.scrollTo({top:0});};
    wrap.appendChild(b);
  });
  const totalPlan = EVENTS.filter(inPlan).length;
  const p = document.createElement('button');
  p.className='daytab'+(view==='plan'?' active':'');
  p.dataset.day='plan';
  p.innerHTML=`<span class="dt-day"><span class="dot"></span>★ My Schedule</span>
    <span class="dt-date">All days</span>
    <span class="dt-count">${totalPlan} sessions</span>`;
  p.onclick=()=>{view='plan';renderAll();window.scrollTo({top:0});};
  wrap.appendChild(p);
}

function renderCatChips(){
  const wrap=document.getElementById('catChips'); wrap.innerHTML="";
  CATS.forEach(c=>{
    if(!EVENTS.some(e=>e.category===c)) return;
    const b=document.createElement('button');
    b.className='chip'+(activeCats.has(c)?' on':'');
    b.textContent=CAT_SHORT[c]||c;
    b.onclick=()=>{ activeCats.has(c)?activeCats.delete(c):activeCats.add(c); renderCatChips(); renderMain(); };
    wrap.appendChild(b);
  });
  document.querySelectorAll('.chip.pf').forEach(b=>{
    b.classList.toggle('on', activePf.has(b.dataset.pf));
    b.onclick=()=>{ const k=b.dataset.pf; activePf.has(k)?activePf.delete(k):activePf.add(k); renderCatChips(); renderMain(); };
  });
}

function passFilters(e){
  if(activeCats.size && !activeCats.has(e.category)) return false;
  if(activePf.size){
    const r=state[e.id]||{};
    let ok=false;
    if(activePf.has('p1') && r.prio==='p1') ok=true;
    if(activePf.has('p2') && r.prio==='p2') ok=true;
    if(activePf.has('star') && (r.star||e.personal)) ok=true;
    if(!ok) return false;
  }
  if(query){
    const hay=(e.title+" "+e.presenter+" "+e.topics+" "+e.category+" "+e.desc).toLowerCase();
    if(!hay.includes(query)) return false;
  }
  return true;
}

function cardHTML(e, planContext){
  const r=rec(e.id);
  const planEvents = EVENTS.filter(inPlan).filter(x=>x.id!==e.id);
  const conflicts = (inPlan(e)?planEvents.filter(x=>overlaps(e,x)):[]);
  const conflictHTML = conflicts.length
    ? `<span class="conflict" title="${conflicts.map(c=>c.title).join(' · ')}">⚠ Overlaps ${conflicts.length} pick${conflicts.length>1?'s':''}</span>` : "";
  const catBadge = e.personal
    ? `<span class="badge b-personal">★ My Event</span>`
    : `<span class="badge b-cat">${CAT_SHORT[e.category]||e.category}</span>`;
  const handsBadge = (e.sponsor && /hands-on/i.test(e.sponsor)) ? `<span class="badge b-hands">Hands-on</span>` : "";
  const cls = ['card','day-'+e.day];
  if(e.personal) cls.push('personal');
  if(r.prio==='p1') cls.push('is-p1');
  if(r.prio==='p2') cls.push('is-p2');
  return `<article class="${cls.join(' ')}" data-id="${e.id}">
    <div class="crow">
      <div class="ctime">
        <span class="s">${e.start}</span>
        <span class="e">to ${e.end}</span>
        <span class="dur">${dur(e.start,e.end)}</span>
      </div>
      <div class="cmain">
        <div class="badges">${catBadge}${handsBadge}${conflictHTML}</div>
        <h3 class="ctitle">${esc(e.title)}</h3>
        <div class="cpres">${esc(e.presenter)}</div>
        ${e.topics?`<div class="ctopics">${esc(e.topics)}</div>`:""}
        <div class="cactions">
          <button class="prio ${r.prio==='p1'?'on-p1':''}" data-prio="p1">P1</button>
          <button class="prio ${r.prio==='p2'?'on-p2':''}" data-prio="p2">P2</button>
          <button class="star ${(r.star||e.personal)?'on':''}" data-star title="Star / favourite">${(r.star||e.personal)?'★':'☆'}</button>
          <button class="linkbtn" data-toggle>
            <span class="lbl">${(r.notes||planContext)?'Notes &amp; details':'Add notes / details'}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="cexpand ${planContext?'open':''}">
      ${e.desc?`<h5>Session details</h5><p class="cdesc">${esc(e.desc)}</p>`:""}
      ${e.sponsor?`<p class="csponsor">${esc(e.sponsor)}</p>`:""}
      <h5>My session notes</h5>
      <div class="notes-wrap">
        <textarea placeholder="Key takeaways, questions to ask, follow-ups, references to chase…">${esc(r.notes||"")}</textarea>
        <span class="saved">Saved ✓</span>
      </div>
    </div>
  </article>`;
}

function renderMain(){
  const main=document.getElementById('main');
  if(view==='plan'){ renderPlan(main); bindCards(); return; }
  const list = EVENTS.filter(e=>e.day===view && passFilters(e))
    .sort((a,b)=>toMin(a.start)-toMin(b.start));
  const d = DAYS.find(x=>x.key===view);
  let html = `<div class="dayhead"><span class="dh-bar dh-${view}"></span>
    <span class="dh-title">${d.label}</span><span class="dh-date">${d.date}, 2026 · ${list.length} session${list.length!==1?'s':''}</span></div>`;
  if(!list.length){
    html += `<div class="empty"><div class="big">Nothing matches your filters</div>
      <div class="sub">Try clearing a type or priority filter, or your search term.</div></div>`;
  } else {
    html += list.map(e=>cardHTML(e,false)).join("");
  }
  main.innerHTML=html;
  bindCards();
}

function renderPlan(main){
  const picks = EVENTS.filter(inPlan);
  const p1=picks.filter(e=>(state[e.id]||{}).prio==='p1').length;
  const p2=picks.filter(e=>(state[e.id]||{}).prio==='p2').length;
  const st=picks.filter(e=>(state[e.id]||{}).star||e.personal).length;
  let html = `<div class="plan-summary">
    <div class="stat p1"><span class="n">${p1}</span><span class="l">Priority 1</span></div>
    <div class="stat p2"><span class="n">${p2}</span><span class="l">Priority 2</span></div>
    <div class="stat star"><span class="n">${st}</span><span class="l">Starred</span></div>
    <div class="stat"><span class="n">${picks.length}</span><span class="l">Total in plan</span></div>
    <div class="ps-note">Notes are expanded here for quick review. Overlapping picks show a ⚠ flag — the conference runs concurrent sessions.</div>
  </div>`;
  if(!picks.length){
    html += `<div class="empty"><div class="big">Your schedule is empty</div>
      <div class="sub">Browse a day and tap <b>P1</b>, <b>P2</b>, or <b>★</b> on the sessions you want. They'll gather here, grouped by day, with your notes and any time conflicts.</div></div>`;
    main.innerHTML=html; return;
  }
  DAYS.forEach(d=>{
    const dayPicks = picks.filter(e=>e.day===d.key).sort((a,b)=>toMin(a.start)-toMin(b.start));
    if(!dayPicks.length) return;
    html += `<div class="dayhead"><span class="dh-bar dh-${d.key}"></span>
      <span class="dh-title">${d.label}</span><span class="dh-date">${d.date} · ${dayPicks.length} picked</span></div>`;
    html += dayPicks.map(e=>cardHTML(e,true)).join("");
  });
  main.innerHTML=html;
}

function bindCards(){
  document.querySelectorAll('.card').forEach(card=>{
    const id=card.dataset.id; const r=rec(id);
    card.querySelectorAll('.prio').forEach(btn=>{
      btn.onclick=()=>{ const v=btn.dataset.prio; r.prio = (r.prio===v?null:v); save(); refreshLight(); };
    });
    const star=card.querySelector('[data-star]');
    if(star) star.onclick=()=>{ r.star=!r.star; save(); refreshLight(); };
    const toggle=card.querySelector('[data-toggle]');
    const exp=card.querySelector('.cexpand');
    if(toggle&&exp) toggle.onclick=()=>{ exp.classList.toggle('open'); };
    const ta=card.querySelector('textarea');
    if(ta){
      const saved=card.querySelector('.saved');
      let t;
      ta.addEventListener('input',()=>{
        r.notes=ta.value; save();
        if(saved){saved.classList.add('show'); clearTimeout(t); t=setTimeout(()=>saved.classList.remove('show'),1200);}
      });
    }
  });
}

/* light refresh = re-render current view + tabs without losing scroll much */
function refreshLight(){ renderTabs(); renderMain(); }
function renderAll(){ renderTabs(); renderCatChips(); renderMain(); }

function esc(s){ return String(s||"").replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ---------- export / import ---------- */
function download(name, text, type){
  const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}
function exportJSON(){
  download('nsca2026-plan-backup.json', JSON.stringify({_meta:"NSCA2026 planner backup",saved:new Date().toISOString(),data:state},null,2),'application/json');
}
function exportCSV(){
  const rows=[["Day","Date","Start","End","Priority","Starred","Category","Title","Presenter","Notes"]];
  EVENTS.filter(inPlan).sort((a,b)=>a.date.localeCompare(b.date)||toMin(a.start)-toMin(b.start)).forEach(e=>{
    const r=state[e.id]||{};
    rows.push([e.day,e.date,e.start,e.end,(r.prio||"").toUpperCase(),(r.star||e.personal)?"Yes":"",e.category,e.title,e.presenter,(r.notes||"").replace(/\n/g,' ')]);
  });
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  download('nsca2026-my-plan.csv', csv, 'text/csv');
}
function doImport(file){
  const fr=new FileReader();
  fr.onload=()=>{ try{ const o=JSON.parse(fr.result); state=o.data||o; save(); renderAll(); alert('Backup restored.'); }catch(e){ alert('Could not read that file.'); } };
  fr.readAsText(file);
}

/* ---------- wiring ---------- */
document.getElementById('search').addEventListener('input',e=>{ query=e.target.value.toLowerCase().trim(); renderMain(); });

const themeBtn=document.getElementById('themeBtn');
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('themeIcon').textContent = t==='dark'?'☀':'☾';
  document.getElementById('themeTxt').textContent = t==='dark'?'Light':'Dark';
  try{localStorage.setItem('nsca2026.theme',t);}catch(e){}
}
themeBtn.onclick=()=>applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
applyTheme((()=>{try{return localStorage.getItem('nsca2026.theme')||'light';}catch(e){return 'light';}})());

const exportBtn=document.getElementById('exportBtn'), pop=document.getElementById('exportPop');
exportBtn.onclick=(e)=>{e.stopPropagation();pop.classList.toggle('open');};
document.addEventListener('click',()=>pop.classList.remove('open'));
pop.addEventListener('click',e=>e.stopPropagation());
pop.querySelectorAll('button[data-act]').forEach(b=>{
  b.onclick=()=>{
    const a=b.dataset.act; pop.classList.remove('open');
    if(a==='json')exportJSON();
    if(a==='csv')exportCSV();
    if(a==='print')window.print();
    if(a==='import')document.getElementById('importFile').click();
    if(a==='clear'){ if(confirm('Clear all your priorities, stars, and notes on this device? This cannot be undone.')){ state={}; save(); renderAll(); } }
  };
});
document.getElementById('importFile').addEventListener('change',e=>{ if(e.target.files[0])doImport(e.target.files[0]); e.target.value=""; });

renderAll();