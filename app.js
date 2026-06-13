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
const VIEW_MODE_KEY = "nsca2026.dayViewMode";
const APP_ROUTE_KEY = "nsca2026.appRoute";

let state = load();
const routeState = loadAppRoute();
let appScreen = routeState.screen; // landing | app
let view = routeState.view;        // Wed/Thu/Fri/Sat/plan
let activeCats = new Set(); // empty = all
let activePf = new Set();   // p1/p2/star
let query = "";
let dayViewMode = loadViewMode(); // list | timeline
let timelineSelectedId = null;

function load(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch(e){ return {}; }
}
function save(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}
function rec(id){ return state[id] || (state[id] = {prio:null, star:false, notes:""}); }

function loadViewMode(){
  try{ const v = localStorage.getItem(VIEW_MODE_KEY); return v === "timeline" ? "timeline" : "list"; }
  catch(e){ return "list"; }
}
function saveViewMode(mode){
  try{ localStorage.setItem(VIEW_MODE_KEY, mode); }catch(e){}
}

function loadAppRoute(){
  try{
    const raw = localStorage.getItem(APP_ROUTE_KEY);
    if(!raw) return {screen:"landing", view:"Wed"};
    const o = JSON.parse(raw);
    if(o.screen === "app" && (DAYS.some(d=>d.key===o.view) || o.view === "plan"))
      return {screen:"app", view:o.view};
    if(o.screen === "landing") return {screen:"landing", view:"Wed"};
    return {screen:"landing", view:"Wed"};
  }catch(e){ return {screen:"landing", view:"Wed"}; }
}
function saveAppRoute(){
  try{ localStorage.setItem(APP_ROUTE_KEY, JSON.stringify({screen:appScreen, view})); }catch(e){}
}
function updateAppVisibility(){
  const landing = document.getElementById("landing");
  const shell = document.getElementById("appShell");
  const onLanding = appScreen === "landing";
  landing.hidden = !onLanding;
  shell.hidden = onLanding;
}
function goToLanding(){
  appScreen = "landing";
  saveAppRoute();
  updateAppVisibility();
  window.scrollTo({top:0});
}
function enterApp(targetView){
  appScreen = "app";
  if(targetView === "plan") view = "plan";
  else if(DAYS.some(d=>d.key===view)) { /* keep last day */ }
  else view = "Wed";
  timelineSelectedId = null;
  saveAppRoute();
  updateAppVisibility();
  renderAll();
  window.scrollTo({top:0});
}
function setDayViewMode(mode){
  dayViewMode = mode === "timeline" ? "timeline" : "list";
  timelineSelectedId = null;
  saveViewMode(dayViewMode);
  renderMain();
}

/* ---- time helpers ---- */
function toMin(t){
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i); if(!m) return 0;
  let h=+m[1], mn=+m[2]; const ap=m[3].toUpperCase();
  if(ap==="PM"&&h!==12)h+=12; if(ap==="AM"&&h===12)h=0;
  return h*60+mn;
}
function dur(s,e){ const d=toMin(e)-toMin(s); if(d<=0)return ""; return d>=60?`${Math.floor(d/60)}h${d%60?(" "+(d%60)+"m"):""}`:`${d}m`; }
function overlaps(a,b){ return a.date===b.date && toMin(a.start)<toMin(b.end) && toMin(b.start)<toMin(a.end); }
function formatTimeMin(m){
  const h=Math.floor(m/60), mn=m%60, ap=h>=12?"PM":"AM", h12=h%12||12;
  return `${h12}:${mn<10?"0":""}${mn} ${ap}`;
}

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
    b.onclick=()=>{view=d.key;timelineSelectedId=null;saveAppRoute();renderAll();window.scrollTo({top:0});};
    wrap.appendChild(b);
  });
  const totalPlan = EVENTS.filter(inPlan).length;
  const p = document.createElement('button');
  p.className='daytab'+(view==='plan'?' active':'');
  p.dataset.day='plan';
  p.innerHTML=`<span class="dt-day"><span class="dot"></span>★ My Schedule</span>
    <span class="dt-date">All days</span>
    <span class="dt-count">${totalPlan} sessions</span>`;
  p.onclick=()=>{view='plan';timelineSelectedId=null;saveAppRoute();renderAll();window.scrollTo({top:0});};
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

function cardHTML(e, planContext, detailOpen){
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
  const expandOpen = planContext || detailOpen;
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
            <span class="lbl">${(r.notes||planContext||detailOpen)?'Notes &amp; details':'Add notes / details'}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
    <div class="cexpand ${expandOpen?'open':''}">
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

function viewToggleHTML(){
  return `<div class="viewtoggle" role="group" aria-label="Day layout">
    <button type="button" class="chip vt${dayViewMode==='list'?' on':''}" data-vt="list">List</button>
    <button type="button" class="chip vt${dayViewMode==='timeline'?' on':''}" data-vt="timeline">Timeline</button>
  </div>`;
}

function layoutDayTimeline(events){
  const sorted=[...events].sort((a,b)=>toMin(a.start)-toMin(b.start)||toMin(a.end)-toMin(b.end));
  if(!sorted.length) return {rangeStart:0,rangeEnd:0,span:1,items:[]};
  const rangeStart=Math.min(...sorted.map(e=>toMin(e.start)));
  const rangeEnd=Math.max(...sorted.map(e=>toMin(e.end)));
  const span=Math.max(rangeEnd-rangeStart,1);
  const clusters=[];
  sorted.forEach(e=>{
    const idx=clusters.findIndex(c=>c.some(x=>overlaps(e,x)));
    if(idx>=0) clusters[idx].push(e); else clusters.push([e]);
  });
  let merged=true;
  while(merged){
    merged=false;
    for(let i=0;i<clusters.length;i++){
      for(let j=i+1;j<clusters.length;j++){
        if(clusters[i].some(a=>clusters[j].some(b=>overlaps(a,b)))){
          clusters[i]=clusters[i].concat(clusters[j]); clusters.splice(j,1); merged=true; break;
        }
      }
      if(merged) break;
    }
  }
  const items=[];
  clusters.forEach(cluster=>{
    const cols=[], cs=[...cluster].sort((a,b)=>toMin(a.start)-toMin(b.start));
    const placement=new Map();
    cs.forEach(e=>{
      let col=0;
      while(cols[col]&&cols[col].some(x=>overlaps(e,x))) col++;
      if(!cols[col]) cols[col]=[];
      cols[col].push(e);
      placement.set(e.id,col);
    });
    const numCols=cols.length;
    cs.forEach(e=>{
      const col=placement.get(e.id);
      items.push({
        event:e,
        top:((toMin(e.start)-rangeStart)/span)*100,
        height:Math.max(((toMin(e.end)-toMin(e.start))/span)*100,3),
        left:(col/numCols)*100,
        width:(1/numCols)*100,
      });
    });
  });
  return {rangeStart,rangeEnd,span,items};
}

function timelineBlockHTML(e, layout){
  const r=rec(e.id);
  const planEvents=EVENTS.filter(inPlan).filter(x=>x.id!==e.id);
  const conflicts=(inPlan(e)?planEvents.filter(x=>overlaps(e,x)):[]);
  const catBadge=e.personal
    ? `<span class="badge b-personal">★ My Event</span>`
    : `<span class="badge b-cat">${CAT_SHORT[e.category]||e.category}</span>`;
  const cls=['tl-block','day-'+e.day];
  if(e.personal) cls.push('personal');
  if(r.prio==='p1') cls.push('is-p1');
  if(r.prio==='p2') cls.push('is-p2');
  if(conflicts.length) cls.push('tl-has-conflict');
  if(timelineSelectedId===e.id) cls.push('tl-selected');
  const gap=4;
  return `<button type="button" class="${cls.join(' ')}" data-id="${e.id}"
    style="top:${layout.top}%;height:${layout.height}%;left:calc(${layout.left}% + ${gap/2}px);width:calc(${layout.width}% - ${gap}px);"
    aria-pressed="${timelineSelectedId===e.id?'true':'false'}"
    title="${esc(e.title)} — ${esc(e.presenter)}">
    <span class="tl-time mono">${e.start}</span>
    <span class="tl-badges">${catBadge}${conflicts.length?`<span class="tl-warn" title="Overlaps ${conflicts.length} pick${conflicts.length>1?'s':''}">⚠</span>`:""}</span>
    <span class="tl-title">${esc(e.title)}</span>
    <span class="tl-pres">${esc(e.presenter)}</span>
  </button>`;
}

function renderTimelineHTML(list){
  const layout=layoutDayTimeline(list);
  const ticks=[];
  const startHour=Math.floor(layout.rangeStart/60)*60;
  for(let m=startHour;m<=layout.rangeEnd;m+=60){
    if(m>=layout.rangeStart-1){
      ticks.push({pct:((m-layout.rangeStart)/layout.span)*100,label:formatTimeMin(m)});
    }
  }
  const axisHtml=ticks.map(t=>`<span class="tl-tick" style="top:${t.pct}%">${t.label}</span>`).join("");
  const blocksHtml=layout.items.map(item=>timelineBlockHTML(item.event,item)).join("");
  const pxPerMin=Math.max(layout.span/60*2.8, 2.8);
  const gridMinH=Math.max(Math.round(layout.span*pxPerMin),320);
  return `<div class="timeline-wrap">
    <div class="timeline-axis" aria-hidden="true">${axisHtml}</div>
    <div class="timeline-grid" style="min-height:${gridMinH}px">${blocksHtml}</div>
  </div>`;
}

function bindViewToggle(){
  document.querySelectorAll('.viewtoggle .vt').forEach(btn=>{
    btn.onclick=()=>{ if(btn.dataset.vt!==dayViewMode) setDayViewMode(btn.dataset.vt); };
  });
}

function bindTimeline(){
  document.querySelectorAll('.tl-block').forEach(btn=>{
    btn.onclick=()=>{
      timelineSelectedId = timelineSelectedId===btn.dataset.id ? null : btn.dataset.id;
      renderMain();
      if(timelineSelectedId){
        const card=document.querySelector('.card[data-id="'+timelineSelectedId+'"]');
        if(card) card.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    };
  });
}

function renderMain(){
  const main=document.getElementById('main');
  if(view==='plan'){ renderPlan(main); bindCards(); return; }
  const list = EVENTS.filter(e=>e.day===view && passFilters(e))
    .sort((a,b)=>toMin(a.start)-toMin(b.start));
  const d = DAYS.find(x=>x.key===view);
  let html = `<div class="dayhead"><span class="dh-bar dh-${view}"></span>
    <span class="dh-title">${d.label}</span><span class="dh-date">${d.date}, 2026 · ${list.length} session${list.length!==1?'s':''}</span>
    <span class="dayhead-spacer"></span>${viewToggleHTML()}</div>`;
  if(!list.length){
    html += `<div class="empty"><div class="big">Nothing matches your filters</div>
      <div class="sub">Try clearing a type or priority filter, or your search term.</div></div>`;
  } else if(dayViewMode==='timeline'){
    html += renderTimelineHTML(list);
    const sel=list.find(e=>e.id===timelineSelectedId);
    if(sel) html += cardHTML(sel,false,true);
    else timelineSelectedId=null;
  } else {
    html += list.map(e=>cardHTML(e,false)).join("");
  }
  main.innerHTML=html;
  bindViewToggle();
  if(dayViewMode==='timeline') bindTimeline();
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
function syncThemeIcons(t){
  const dark = t === 'dark';
  document.getElementById('themeIcon').textContent = dark ? '☀' : '☾';
  document.getElementById('themeTxt').textContent = dark ? 'Light' : 'Dark';
  const lti = document.getElementById('landingThemeIcon');
  if(lti) lti.textContent = dark ? '☀' : '☾';
}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  syncThemeIcons(t);
  try{localStorage.setItem('nsca2026.theme',t);}catch(e){}
}
themeBtn.onclick=()=>applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
applyTheme((()=>{try{return localStorage.getItem('nsca2026.theme')||'light';}catch(e){return 'light';}})());

const landingThemeBtn=document.getElementById('landingThemeBtn');
if(landingThemeBtn) landingThemeBtn.onclick=()=>applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');

document.querySelectorAll('.landing-entry').forEach(btn=>{
  btn.onclick=()=>enterApp(btn.dataset.enter);
});

const brandHome=document.getElementById('brandHome');
if(brandHome){
  brandHome.onclick=()=>goToLanding();
  brandHome.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); goToLanding(); } };
}

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

updateAppVisibility();
if(appScreen === 'app') renderAll();