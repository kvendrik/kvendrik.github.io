(function(){
const T = window.T.sort((a,b)=>a.n-b.n);
const byId = Object.fromEntries(T.map(t=>[t.id,t]));
const FAM = {east:"east",greek:"west",west:"west",other:"west",psych:"psych",therapy:"psych"};
const FAMS = [["east","Eastern"],["west","Western & world"],["psych","Psychology"]];
const GLYPH = {
  east:'<svg width="14" height="14" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3a12 12 0 1 1-10.4 6" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>',
  west:'<svg width="14" height="14" viewBox="0 0 30 30" aria-hidden="true"><path d="M4 26h22M5 4h20M9 7v17M15 7v17M21 7v17" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
  psych:'<svg width="14" height="14" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="12" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="15" cy="18" r="5" fill="currentColor"/></svg>'
};
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $ = s => document.querySelector(s);
let current = "taoism";

/* threads */
(function(){
  const svg=$("#threads"), N=T.length; let s='';
  const Y=i=>14+i*(272/(N-1));
  s+=`<path class="trunk" pathLength="1" d="M0 150 H200" fill="none" stroke="var(--ink)" stroke-width="1.4"/>`;
  T.forEach((t,i)=>{
    const d=`M200 150 C${270+(i%5)*12} 150 ${330-(i%3)*16} ${Y(i)} 560 ${Y(i)}`;
    s+=`<path class="th" data-i="${i}" pathLength="1" d="${d}" fill="none" stroke="var(--ink)" stroke-width=".9" style="animation-delay:${(.7+i*.022).toFixed(3)}s,${(2.6+((i*7)%N)/N*7).toFixed(2)}s"/>`;
    s+=`<path class="hit" data-i="${i}" d="${d}"><title>${esc(t.name)}</title></path>`;
  });
  s+=`<circle cx="200" cy="150" r="3" fill="var(--ink)"/>`;
  s+=`<text id="thlabel" x="596" y="0" text-anchor="end" opacity="0"></text>`;
  svg.innerHTML=s;
  const ths=svg.querySelectorAll('.th'), lab=svg.querySelector('#thlabel');
  const on=i=>{ths.forEach(p=>p.classList.toggle('on',+p.dataset.i===i));lab.textContent=T[i].name;lab.setAttribute('y',Math.max(22,Y(i)-8));lab.setAttribute('opacity',1);};
  svg.addEventListener('pointerover',e=>{const h=e.target.closest('.hit');if(h)on(+h.dataset.i);});
  svg.addEventListener('pointerleave',()=>{ths.forEach(p=>p.classList.remove('on'));lab.setAttribute('opacity',0);});
  svg.addEventListener('click',e=>{const h=e.target.closest('.hit');if(!h)return;show(T[+h.dataset.i].id);$("#traditions").scrollIntoView();});
})();

/* picker */
$("#groups").innerHTML = FAMS.map(([f,l])=>`<div><div class="mono">${GLYPH[f]}${l}</div><ul>${T.filter(t=>FAM[t.grp]===f).map(t=>`<li><button class="pick" data-id="${t.id}">${esc(t.name.replace(/^Existentialism: /,""))}</button></li>`).join("")}</ul></div>`).join("");
const mq=matchMedia("(max-width:700px)");
const syncBrowse=()=>{$("#browse").open=!mq.matches;};
syncBrowse(); mq.addEventListener("change",syncBrowse);
$("#groups").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(!b)return;show(b.dataset.id);
  if(mq.matches){$("#browse").open=false;$("#browse").scrollIntoView({block:"start"});}else $("#card").scrollIntoView({block:"nearest"});});

let cardSeen=false;
if("IntersectionObserver" in window){
  new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&!cardSeen){cardSeen=true;const art=$("#card .slide:not(.peek) .art");if(art)art.classList.add("go");}});},{threshold:.15}).observe($("#card"));
} else cardSeen=true;
function topHTML(t){
  const i=T.indexOf(t);
  return `<div class="top"><span class="mono count" style="display:flex;gap:8px;align-items:center;color:var(--ink)">${GLYPH[FAM[t.grp]]}${i+1} / ${T.length}<span class="swipe">· swipe</span></span>
      <div class="nav"><button class="ib" data-step="-1" aria-label="Previous tradition">←</button><button class="ib" data-rand aria-label="Random tradition">⁂</button><button class="ib" data-step="1" aria-label="Next tradition">→</button></div></div>`;
}
function slideHTML(t,cls){
  return `<div class="slide ${cls}" data-id="${t.id}">
    <svg class="art" viewBox="0 0 120 80" aria-hidden="true">${(window.ART||{})[t.id]||""}</svg>
    <h3 class="name">${esc(t.name)}</h3>
    <p class="who">${esc(t.who)}</p>
    <p class="insight">${esc(t.insight)}</p>
    <div class="two"><div><span class="mono">The real problem</span><p>${esc(t.cause)}</p></div>
      <div><span class="mono">What to do</span><ul>${t.advice.slice(0,3).map(a=>`<li>${esc(a)}</li>`).join("")}</ul></div></div>
    <div class="voice"><p>${esc(t.voice)}</p><span class="mono">The inner voice · a paraphrase</span></div>
    <details><summary class="mono">More: the full reading, the goal, sources</summary><div class="more">
      <p>${esc(t.interp)}</p><p><b>The goal.</b> ${esc(t.aim)}</p><p><b>How it differs.</b> ${esc(t.diff)}</p><p>${t.deep}</p>
      <ul>${t.refs.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></div></details></div>`;
}
/* mode: undefined = rise in, 1/-1 = slide in from that side, "still" = already in place (after a swipe) */
function show(id,mode){
  const t=byId[id]; if(!t) return; current=id;
  const c=$("#card");
  const cls=mode==="still"?"still":mode?(mode>0?"from-r":"from-l"):"anim";
  c.innerHTML=topHTML(t)+slideHTML(t,cls);
  c.querySelectorAll(".slide .art > *").forEach((el,k)=>{ if(el.hasAttribute("stroke-dasharray")){el.classList.add("fd");return;}
    el.setAttribute("pathLength","1"); el.classList.add("dr"); el.style.animationDelay=(0.15+k*0.12).toFixed(2)+"s"; });
  const art=c.querySelector(".slide .art"); if(art&&cardSeen) art.classList.add("go");
  $("#cur").textContent=t.name;
  document.querySelectorAll(".pick").forEach(p=>p.setAttribute("aria-current",p.dataset.id===id));
  if(location.hash!=="#t-"+id) history.replaceState(null,"","#t-"+id);
}
$("#card").addEventListener("click",e=>{
  const s=e.target.closest("[data-step]"); if(s){step(+s.dataset.step);return;}
  if(e.target.closest("[data-rand]")){let r;do{r=T[Math.floor(Math.random()*T.length)].id}while(r===current);show(r);}
});
document.addEventListener("keydown",e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  const r=$("#traditions").getBoundingClientRect(); if(r.top>innerHeight||r.bottom<0)return;
  if(e.key==="ArrowRight"||e.key==="ArrowLeft") step(e.key==="ArrowRight"?1:-1);
});


function step(d){const i=(T.indexOf(byId[current])+d+T.length)%T.length;show(T[i].id,d);}
/* swipe between traditions: a carousel. The neighbour card rides alongside; the frame stays put. */
(function(){
  const c=$("#card"); const GAP=40;
  let x0=0,y0=0,dx=0,mode=null,lastX=0,lastT=0,vx=0,raf=0,busy=false,cur=null,peek=null,side=0;
  const W=()=>c.clientWidth||360;
  const neighbour=d=>T[(T.indexOf(byId[current])+d+T.length)%T.length];
  function ensurePeek(d){
    if(side===d&&peek)return; if(peek)peek.remove();
    side=d; c.insertAdjacentHTML("beforeend",slideHTML(neighbour(d),"peek"));
    peek=c.lastElementChild; peek.style.top=cur.offsetTop+"px";
    peek.querySelectorAll(".art > *").forEach(el=>{if(!el.hasAttribute("stroke-dasharray"))el.setAttribute("pathLength","1");});
  }
  function place(x,anim){
    const w=W()+GAP, p=Math.min(Math.abs(x)/w,1);
    cur.style.transform=`translate3d(${x}px,0,0)`; cur.style.opacity=String(1-p*.6);
    if(peek){peek.style.transform=`translate3d(${x+side*w}px,0,0)`; peek.style.opacity=String(.4+p*.6);}
  }
  const paint=()=>{raf=0; if(!cur)return; const d=dx<0?1:-1; if(dx!==0) ensurePeek(d); place(dx);};
  c.addEventListener("touchstart",e=>{if(busy||e.touches.length!==1)return;const t=e.touches[0];
    x0=lastX=t.clientX;y0=t.clientY;lastT=performance.now();dx=0;vx=0;mode=null;side=0;
    cur=c.querySelector(".slide:not(.peek)"); if(cur){cur.classList.remove("anim","from-r","from-l");cur.style.transition="none";}},{passive:true});
  c.addEventListener("touchmove",e=>{if(busy||mode==="v"||!cur)return;const t=e.touches[0];const ddx=t.clientX-x0,dy=t.clientY-y0;
    if(!mode){if(Math.abs(ddx)<10&&Math.abs(dy)<10)return;mode=Math.abs(ddx)>Math.abs(dy)*1.2?"h":"v";if(mode==="v")return;x0=t.clientX;}
    dx=t.clientX-x0;const now=performance.now();vx=.8*((t.clientX-lastX)/Math.max(1,now-lastT))+.2*vx;lastX=t.clientX;lastT=now;
    if(!raf)raf=requestAnimationFrame(paint);},{passive:true});
  function settle(x,ms,done){
    const ease=`cubic-bezier(.2,.75,.25,1)`;
    [cur,peek].forEach(el=>{if(el)el.style.transition=`transform ${ms}ms ${ease},opacity ${ms}ms ${ease}`;});
    place(x); setTimeout(done,ms);
  }
  const end=()=>{if(mode!=="h"){mode=null;return;}mode=null;if(raf){cancelAnimationFrame(raf);raf=0;paint();}
    if(!cur)return; busy=true;
    const w=W()+GAP, go=peek&&(Math.abs(dx)>W()*.22||(Math.abs(vx)>.4&&Math.abs(dx)>16));
    if(go){
      const remaining=w-Math.abs(dx), ms=Math.round(Math.max(160,Math.min(380,remaining/Math.max(Math.abs(vx),.9))));
      const target=neighbour(side).id, d=side;
      try{navigator.vibrate&&navigator.vibrate(6)}catch(_){}
      settle(-d*w,ms,()=>{show(target,"still");cur=peek=null;side=0;busy=false;dx=0;
        if(c.getBoundingClientRect().top<0)c.scrollIntoView({behavior:"smooth",block:"start"});});
    }else{
      settle(0,320,()=>{if(peek)peek.remove();cur.style.cssText="";cur=peek=null;side=0;busy=false;dx=0;});
    }};
  c.addEventListener("touchend",end);c.addEventListener("touchcancel",end);
})();

/* boot */
const h=location.hash.slice(3);
show(byId[h]?h:"taoism");
if(!byId[h]) history.replaceState(null,"",location.pathname+location.search);
window.addEventListener("hashchange",()=>{const id=location.hash.slice(3);if(byId[id])show(id);});
})();
