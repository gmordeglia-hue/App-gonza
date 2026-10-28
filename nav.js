// Botón "volver" del celular: cierra la ventana abierta o el detalle, de una sección de Más
// vuelve a Más, de cualquier otra pestaña vuelve a Inicio, y desde Inicio sale de la app.
//
// El historial tiene una entrada por cada "volver" que falta para llegar a Inicio (nivel).
// Las entradas se agregan solo cuando tocás algo: Chrome en Android se saltea las que
// una página agrega sin que el usuario haya tocado la pantalla, y eso cerraba la app.
(function(){
const SUBTABS=['rendimientos','inversiones','tarjetas','ajustes'];
const TABS=['movimientos','analisis','mas'].concat(SUBTABS);
let cur=location.hash.replace('#',''), have=0, skip=false, queued=false;
history.replaceState({lvl:0},'',location.pathname+location.search);

// La app lee y cambia la pestaña con estas dos funciones en lugar de location.hash.
window.navHash=()=>cur?'#'+cur:'';
window.navGo=h=>{ cur=h||''; window.dispatchEvent(new HashChangeEvent('hashchange')); };

const $=s=>document.querySelector(s);
const modalOpen=()=>{ const m=$('#modal'); return !!(m&&m.firstElementChild); };
const backBtn=()=>{ const b=$('#backbtn'); return b&&!b.hidden?b:null; };
const inDetail=()=>{ const b=backBtn(); return !!b&&(b.dataset.act==='acc-back'||b.dataset.act==='hold-back'); };

// Cuántos "volver" faltan para llegar a Inicio.
function depth(){
  const tab=TABS.indexOf(cur)>-1?cur:'';
  return (SUBTABS.indexOf(tab)>-1?2:tab?1:0)+(inDetail()?1:0)+(modalOpen()?1:0);
}

// Sube un nivel, igual que la flecha de la app.
function up(){
  if(modalOpen()){ const o=$('#modal [data-overlay]'); if(o) o.click(); return; }
  const b=backBtn(); if(b){ b.click(); return; }
  navGo('');
}

// Ajusta el historial al nivel actual: agrega entradas al avanzar y las saca al retroceder.
function sync(){
  queued=false;
  const t=depth();
  while(have<t){ have++; history.pushState({lvl:have},''); }
  if(t<have){ skip=true; history.go(t-have); have=t; }
}
function later(){ if(!queued){ queued=true; setTimeout(sync,0); } }

// Botón volver: el historial ya bajó un nivel (o más); la app sube hasta ese nivel.
// Acá nunca se agregan entradas.
window.addEventListener('popstate',e=>{
  const lvl=(e.state&&e.state.lvl)||0;
  have=lvl;
  if(skip){ skip=false; return; }
  for(let i=0;i<6&&depth()>lvl;i++) up();
});

// Los enlaces internos (#pestaña) cambian de pestaña sin sumar historial por su cuenta.
document.addEventListener('click',e=>{
  const a=e.target.closest&&e.target.closest('a[href^="#"]'); if(!a) return;
  e.preventDefault(); navGo(a.getAttribute('href').slice(1));
},true);

// Solo después de un toque (o tecla) se ajusta el historial hacia adelante.
['click','keydown','submit','change'].forEach(t=>document.addEventListener(t,later,true));
window.addEventListener('hashchange',()=>{ if(depth()<have) later(); });
document.addEventListener('DOMContentLoaded',()=>{
  // Si algo se cierra solo (por ejemplo, al guardar), se sacan entradas sobrantes.
  const mo=new MutationObserver(()=>{ if(depth()<have) later(); });
  ['#view','#modal'].forEach(s=>{ const el=$(s); if(el) mo.observe(el,{childList:true}); });
});
})();
