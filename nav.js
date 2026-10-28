// Botón "volver" del celular: cierra la ventana abierta o el detalle, de una sección de Más
// vuelve a Más, de cualquier otra pestaña vuelve a Inicio, y desde Inicio sale de la app.
// Las pestañas ya no se apilan en el historial: hay una sola entrada extra (la "trampa")
// mientras no estás en Inicio, y el botón volver la consume.
(function(){
let cur=location.hash.replace('#',''), trap=false, skip=0, queued=false;
history.replaceState(null,'',location.pathname+location.search);

// La app lee y cambia la pestaña con estas dos funciones en lugar de location.hash.
window.navHash=()=>cur?'#'+cur:'';
window.navGo=h=>{ cur=h||''; window.dispatchEvent(new HashChangeEvent('hashchange')); };

const $=s=>document.querySelector(s);
const modalOpen=()=>{ const m=$('#modal'); return !!(m&&m.firstElementChild); };
const backBtn=()=>{ const b=$('#backbtn'); return b&&!b.hidden?b:null; };
const onInicio=()=>{ const a=$('#bnav [aria-current="page"]'); return !a||a.dataset.tab==='resumen'; };
const atRoot=()=>onInicio()&&!backBtn()&&!modalOpen();

function sync(){
  queued=false;
  const root=atRoot();
  if(!root&&!trap){ history.pushState({trap:1},''); trap=true; }
  else if(root&&trap){ trap=false; skip++; history.back(); }
}
function later(){ if(!queued){ queued=true; setTimeout(sync,0); } }

function goBack(){
  if(modalOpen()){ const o=$('#modal [data-overlay]'); if(o) o.click(); return; }
  const b=backBtn(); if(b){ b.click(); return; }
  navGo('');
}

window.addEventListener('popstate',()=>{
  if(skip){ skip--; return; }
  trap=false; goBack(); later();
});

// Los enlaces internos (#pestaña) cambian de pestaña sin sumar historial.
document.addEventListener('click',e=>{
  const a=e.target.closest&&e.target.closest('a[href^="#"]'); if(!a) return;
  e.preventDefault(); navGo(a.getAttribute('href').slice(1));
},true);

window.addEventListener('hashchange',later);
document.addEventListener('DOMContentLoaded',()=>{
  const mo=new MutationObserver(later);
  ['#view','#modal'].forEach(s=>{ const el=$(s); if(el) mo.observe(el,{childList:true}); });
  later();
});
})();
