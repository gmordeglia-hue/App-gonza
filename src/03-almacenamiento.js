/* ---------- Almacenamiento en el celular ---------- */
const KEY='mis-cuentas-v1', BK='mis-cuentas-copia';
/* Copia interna de cómo estaba todo antes de restaurar: una sola, se borra sola a los ANTES_DIAS días
   o cuando se baja una copia nueva a mano. */
const KEY_ANTES='mis-cuentas-antes-de-restaurar', ANTES_DIAS=30;
/* Lista única de lo que se guarda (la usan el guardado en el celular y la copia de seguridad). */
const DATA_KEYS=['accounts','movs','owners','cards','cats','rules','stmts','exp','hlds','ops','claims','plans','fixed','budgets','goals','closed'];
function dataSnap(head){ const o=Object.assign({},head); DATA_KEYS.forEach(k=>{o[k]=S[k]}); o.pc=1; return o; }
let storeOK=true;
function persist(){
  try{
    localStorage.setItem(KEY,JSON.stringify(dataSnap({v:5})));
    storeOK=true; return true;
  }catch(_){ storeOK=false; return false; }
}
function normalizeData(d,fresh){
  const arr=x=>Array.isArray(x)?x:[];
  const str=x=>typeof x==='string';
  const o={};
  o.accounts=arr(d.accounts).filter(a=>a&&str(a.id)&&str(a.name));
  if(fresh) o.accounts=SEED.map(seedAcc);
  else if(!(d.v>=3)){
    SEED.filter(x=>SEED_V3.indexOf(x[0])>-1).forEach(x=>{ if(!o.accounts.some(a=>a.id===x[0])) o.accounts.push(seedAcc(x)); });
    if(!(d.v>=2)) migrateV2();
  }
  function migrateV2(){
    SEED.filter(x=>SEED_V2.indexOf(x[0])>-1).forEach(x=>{ if(!o.accounts.some(a=>a.id===x[0])) o.accounts.push(seedAcc(x)); });
    o.accounts=o.accounts.map(a=>(a.id==='mercado-pago'&&a.name==='Mercado Pago')?Object.assign({},a,{name:'Cuenta'}):a);
  }
  o.accounts=o.accounts.map(a=>a.cur==='USD'?a:Object.assign({},a,{cur:'ARS'}));
  const mig4=!fresh&&!(d.v>=4);
  if(mig4){
    SEED.filter(x=>SEED_V4.indexOf(x[0])>-1).forEach(x=>{ if(!o.accounts.some(a=>a.id===x[0])) o.accounts.push(seedAcc(x)); });
    o.accounts=o.accounts.map(a=>{
      if(a.id==='mercado-pago-reservas') return Object.assign({},a,{yields:true,name:a.name==='Reservas'?'Reserva':a.name});
      if(a.id==='naranja-x'&&a.name==='Naranja X') return Object.assign({},a,{name:'Cuenta'});
      return a;
    });
  }
  o.movs=arr(d.movs).filter(m=>m&&str(m.id)&&str(m.date)&&typeof m.cents==='number'&&str(m.type)&&str(m.account));
  o.accounts=o.accounts.filter(a=>!(a.id==='mercado-pago-fondo'&&!a.initial&&!o.movs.some(m=>m.account===a.id||m.to===a.id)));
  o.owners=arr(d.owners).filter(x=>x&&str(x.id)&&str(x.name));
  if(!o.owners.length) o.owners=DEFAULT_OWNERS.map(x=>Object.assign({},x));
  if(!o.owners.some(x=>x.id==='yo')) o.owners.unshift({id:'yo',name:'Gonzalo'});
  if(mig4||fresh){
    o.owners=o.owners.map(x=>(x.id==='yo'&&x.name==='Mío')?Object.assign({},x,{name:'Gonzalo'}):x);
    DEFAULT_OWNERS.forEach(x=>{ if(!o.owners.some(y=>y.id===x.id||y.name.toLowerCase()===x.name.toLowerCase())) o.owners.push(Object.assign({},x)); });
  }
  o.cards=arr(d.cards).filter(x=>x&&str(x.id)&&str(x.name));
  o.cats=arr(d.cats).filter(x=>x&&str(x.id)&&str(x.name));
  if(!o.cats.length) o.cats=DEFAULT_CATS.map(x=>({id:x[0],name:x[1]}));
  if(!d.pc) PARISH_CATS.forEach(c=>{ if(o.cats.some(x=>x.id===c[0]||String(x.name).toLowerCase()===c[1].toLowerCase())) return; const k=o.cats.findIndex(x=>x.id==='otros'||x.id==='sin'); o.cats.splice(k<0?o.cats.length:k,0,{id:c[0],name:c[1]}); });
  o.pc=1;
  if(!o.cats.some(x=>x.id==='sin')) o.cats.push({id:'sin',name:'Sin categorizar'});
  o.rules=arr(d.rules).filter(x=>x&&str(x.k)&&str(x.cat));
  o.stmts=arr(d.stmts).filter(x=>x&&str(x.id)&&str(x.card)&&str(x.period));
  o.exp=arr(d.exp).filter(x=>x&&str(x.id)&&str(x.date)&&typeof x.cents==='number'&&str(x.period));
  o.hlds=Array.isArray(d.hlds)?d.hlds.filter(x=>x&&str(x.id)&&str(x.name)).map(x=>Object.assign({initial:0,kind:'nom',cur:'USD',px:[]},x)):[];
  o.claims=arr(d.claims).filter(x=>x&&str(x.id)&&str(x.from)&&str(x.to)&&typeof x.cents==='number').map(x=>str(x.date)&&x.date?x:Object.assign({},x,{date:todayStr()}));
  o.plans=arr(d.plans).filter(x=>x&&str(x.id)&&str(x.start)&&x.data&&typeof x.n==='number'&&typeof x.done==='number'&&typeof x.data.cents==='number'&&str(x.data.account));
  o.fixed=arr(d.fixed).filter(x=>x&&str(x.id)&&str(x.last)&&typeof x.day==='number'&&x.data&&typeof x.data.cents==='number'&&str(x.data.account));
  o.budgets=arr(d.budgets).filter(x=>x&&str(x.id)&&str(x.cat)&&typeof x.cents==='number');
  o.goals=arr(d.goals).filter(x=>x&&str(x.id)&&str(x.name)&&typeof x.target==='number');
  o.closed=arr(d.closed).filter(str);
  o.loans=arr(d.loans).filter(x=>x&&str(x.id)&&str(x.owner)&&str(x.date)&&typeof x.cents==='number');
  o.ops=arr(d.ops).filter(x=>x&&str(x.id)&&str(x.hold)&&str(x.date)&&typeof x.qty==='number'&&(x.type==='buy'||x.type==='sell'));
  return o;
}
function applyData(o){ Object.keys(o).forEach(k=>{S[k]=o[k]}); }
/* v4 → v5: las deudas dejan de salir de los saldos en negativo. Lo que hoy figura como deuda se anota
   de forma explícita: lo que un dueño usó de otro dentro de una cuenta pasa a ser un préstamo entre dueños
   en esa cuenta, y los gastos pagados con tarjeta para otro pasan a ser deudas anotadas. */
function migrateV5(){
  const today=todayStr(); S.claims=S.claims||[];
  S.accounts.forEach(a=>{
    legacyPairs(ownerBalances(a)).forEach(p=>{
      S.movs.push({id:newId(),type:'transfer',account:a.id,to:a.id,cents:p.v,date:today,note:'Pasaje de datos: '+ownerName(p.from)+' usó plata de '+ownerName(p.to),owner:p.to,toOwner:p.from,kind:'loan',createdAt:Date.now()});
    });
  });
  const ln=loanNet();
  ['ARS','USD'].forEach(c=>{
    for(const k in ln[c]){ const v=ln[c][k]; if(k==='yo'||!v) continue;
      S.claims.push(v>0?{id:newId(),from:k,to:'yo',cur:c,cents:v,date:today,note:'Gastos pagados por otros (datos anteriores)',src:'migracion',createdAt:Date.now()}:{id:newId(),from:'yo',to:k,cur:c,cents:-v,date:today,note:'Datos anteriores',src:'migracion',createdAt:Date.now()}); }
  });
  S.loans=[]; persist();
}
function loadStore(){
  let raw=null;
  try{ raw=localStorage.getItem(KEY); localStorage.setItem(KEY+'-t','1'); localStorage.removeItem(KEY+'-t'); }catch(_){ storeOK=false; }
  if(raw){
    let d=null;
    try{ d=JSON.parse(raw); }catch(_){ fail('Los datos guardados en este celular están dañados. No borres nada y avisale a Claude para recuperarlos.'); return false; }
    if(d&&!(d.v>=4)){ try{ localStorage.setItem(KEY+'-v3',raw); }catch(_){} }
    if(d&&!(d.v>=5)){ try{ localStorage.setItem(KEY+'-v4',raw); }catch(_){} }
    applyData(normalizeData(d||{},false));
    if(d&&!(d.v>=5)) migrateV5();
    persist();
    return true;
  }
  applyData(normalizeData({},true)); persist(); return true;
}
const storeWarn=()=>storeOK?'':'<div class="note warn"><strong>Este navegador no está guardando los datos.</strong> Lo que cargues se pierde al cerrar la página. Abrí el archivo desde Chrome o guardá una copia seguido.</div>';
function lastBackup(){ try{ return localStorage.getItem(BK); }catch(_){ return null; } }
function backupNote(){
  if(!S.movs.length&&!S.exp.length) return '';
  const l=lastBackup(), d=l?daysBetween(l,todayStr()):null;
  if(l&&d<AUTO_BK_DAYS) return '';
  return '<div class="notice warn"><span>'+(l?'Hace '+d+' días que no se guarda una copia.':'Todavía no guardaste ninguna copia.')+'</span>'+(canShareFile()?'<button class="btn sm" data-act="share-bk">Enviar a Drive</button>':'<button class="btn sm" data-act="export">Guardar ahora</button>')+'</div>';
}
/* Copia automática: si pasaron AUTO_BK_DAYS días desde la última, se descarga sola al primer toque en la app
   (los navegadores solo dejan descargar archivos después de que uno toca la pantalla). Solo en el celular:
   en la computadora no se descarga nada solo. */
const AUTO_BK_DAYS=2;
function isPhone(){ try{ return matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<700; }catch(_){ return false; } }
function autoBackupDue(){
  if(!isPhone()) return false;
  if(!S.movs.length&&!S.exp.length&&!S.ops.length) return false;
  const l=lastBackup(); return !l||daysBetween(l,todayStr())>=AUTO_BK_DAYS;
}
function armAutoBackup(){
  /* Se dispara después del toque (no al apoyar el dedo): si se redibuja la pantalla entre el apoyo y el toque, se perdía el primer toque. */
  const go=()=>{ document.removeEventListener('click',go,true); setTimeout(()=>{ if(!S.error&&autoBackupDue()) exportBackup('Copia automática descargada',true); },0); };
  document.addEventListener('click',go,true);
}
function backupBlock(){
  const l=lastBackup();
  return '<section><h2 class="sec">Copia de seguridad</h2><p class="muted" style="margin:4px 0 8px">Tus datos viven solo en este celular. Si borrás los datos del navegador o cambiás de teléfono, se pierden.</p>'
    +'<p class="muted" style="margin:0 0 8px"><strong style="color:var(--ink)">Copia automática (solo en el celular):</strong> cada '+AUTO_BK_DAYS+' días, la primera vez que tocás la app se descarga sola una copia en la carpeta Descargas del celular. Podés borrar las viejas y quedarte con las últimas.</p>'
    +'<p class="muted" style="margin:0 0 8px">«Enviar copia a Drive» abre el menú de compartir: elegís Drive y una carpeta, y queda guardada fuera del celular. Tocá ese botón cuando la app te avise.</p>'
    +'<p style="margin:0 0 10px">'+(l?'Última copia: '+fmtDate(l):'Todavía no hiciste ninguna copia.')+'</p>'
    +antesBlock()
    +'<div class="actions">'+(canShareFile()?'<button class="btn primary" data-act="share-bk">Enviar copia a Drive</button>':'')+'<button class="btn" data-act="export">Guardar copia en el celular</button><button class="btn ghost" data-act="import">Restaurar copia</button></div>'
    +'<input type="file" id="imp-file" accept=".json,application/json" hidden></section>';
}
/* Mandar la copia directo a Drive (u otra app) con el menú de compartir del celular. */
function canShareFile(){ try{ if(!navigator.share||!navigator.canShare) return false; return navigator.canShare({files:[new File(['{}'],'x.json',{type:'application/json'})]}); }catch(_){ return false; } }
async function shareBackup(){
  if(!canShareFile()){ exportBackup('Copia descargada (este navegador no puede enviarla a Drive)'); return; }
  try{
    const f=new File([backupJson()],'mis-cuentas-'+todayStr()+'.json',{type:'application/json'});
    await navigator.share({files:[f],title:'Copia de Mis cuentas'});
    try{ localStorage.setItem(BK,todayStr()); }catch(_){}
    toast('Copia enviada'); render();
  }catch(e){ if(e&&e.name!=='AbortError') toast('No se pudo enviar la copia'); }
}
function backupJson(){ return JSON.stringify(dataSnap({app:'mis-cuentas',v:5,exportedAt:new Date().toISOString()})); }
/* auto=true: copia automática (no borra la copia interna de antes de restaurar). */
function exportBackup(msg,auto){
  const data=backupJson();
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download='mis-cuentas-'+todayStr()+'.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
  try{ localStorage.setItem(BK,todayStr()); }catch(_){}
  if(auto!==true) dropAntes();
  toast(typeof msg==='string'?msg:'Copia descargada'); render();
}
function readImport(inp){
  const f=inp.files&&inp.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(String(r.result));
      if(!isOurBackup(d)) throw new Error('ajeno');
      const o=normalizeData(d,false);
      if(!o.accounts.length) throw new Error('vacío');
      openModal('imp',{data:o,mig:!(d.v>=5)});
    }catch(_){ toast('Ese archivo no es una copia de Mis cuentas'); }
  };
  r.onerror=()=>toast('No se pudo leer el archivo');
  r.readAsText(f); inp.value='';
}
function impModal(d){
  const o=d.data;
  const menos=S.movs.length-o.movs.length;
  return '<div class="sheet"><h2>Restaurar copia</h2><p class="hint">La copia tiene '+o.accounts.length+' cuentas, '+o.movs.length+' movimientos y '+o.exp.length+' consumos de tarjeta. Va a reemplazar todo lo que hay ahora en este celular ('+S.accounts.length+' cuentas, '+S.movs.length+' movimientos y '+S.exp.length+' consumos).</p>'+(menos>0?'<p class="note warn" style="margin:0 0 10px"><strong>Ojo: la copia tiene '+menos+(menos===1?' movimiento':' movimientos')+' menos que lo que hay ahora. Si la restaurás, se pierden (después podés deshacerlo).</strong></p>':'')+((S.closed||[]).length?'<p class="hint">Los meses cerrados ('+S.closed.map(monthLabel).join(', ')+') siguen cerrados, pero lo que hay adentro vuelve a como estaba en la copia.</p>':'')+'<div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="button" class="btn danger" data-act="imp-yes">Reemplazar todo</button></div></div>';
}
/* ¿Es una copia de Mis cuentas? Las nuevas traen app:'mis-cuentas'. Las viejas (sin marca) se aceptan si traen
   versión, fecha de exportación, lista de movimientos y al menos una cuenta con id y nombre.
   Se revisa el archivo tal como vino, ANTES de completarlo con valores por defecto. */
function isOurBackup(d){
  if(!d||typeof d!=='object'||Array.isArray(d)) return false;
  if('app' in d) return d.app==='mis-cuentas';
  return typeof d.v==='number'&&typeof d.exportedAt==='string'&&Array.isArray(d.movs)&&Array.isArray(d.accounts)&&d.accounts.some(a=>a&&typeof a.id==='string'&&typeof a.name==='string');
}
function dropAntes(){ try{ localStorage.removeItem(KEY_ANTES); }catch(_){} }
/* Fecha de la copia interna de antes de restaurar, o null si no hay. Si ya venció, la borra. */
function antesInfo(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(KEY_ANTES)||'null'); }catch(_){ return null; }
  if(!d||typeof d.antes!=='string') return null;
  if(daysBetween(d.antes,todayStr())>=ANTES_DIAS){ dropAntes(); return null; }
  return {fecha:d.antes};
}
function antesBlock(){
  const a=antesInfo(); if(!a) return '';
  return '<div class="note" style="margin:0 0 10px"><p style="margin:0 0 8px;color:var(--ink)">Antes de restaurar el '+fmtDate(a.fecha,true)+' guardé cómo estaba todo.</p><div class="actions"><button class="btn danger" data-act="antes-undo">Deshacer la restauración</button><button class="btn ghost" data-act="antes-del">Borrar esa copia</button></div></div>';
}
/* ¿Quedó bien guardado en el celular lo que hay en pantalla? */
function savedOK(){ try{ const d=JSON.parse(localStorage.getItem(KEY)); return !!d&&Array.isArray(d.movs)&&d.movs.length===S.movs.length&&Array.isArray(d.accounts)&&d.accounts.length===S.accounts.length; }catch(_){ return false; } }
function keepOld(){ const o={loans:S.loans}; DATA_KEYS.forEach(k=>{o[k]=S[k]}); return o; }
/* Pone los datos de una copia (los meses cerrados de ahora siguen cerrados). Si la copia es anterior a la v5, pasa las deudas al formato nuevo. */
function applyRestored(o,mig){
  const cerr=(S.closed||[]).slice(); applyData(o); if(mig) migrateV5();
  S.closed=Array.from(new Set((S.closed||[]).concat(cerr))); ensureCards(); applyPlans(); applyFixed();
}
/* Restaurar: primero guarda lo actual en la copia interna; si no hay lugar, no restaura.
   Después verifica que lo restaurado quedó guardado; si no hay lugar, borra la copia interna y reintenta;
   si igual falla, vuelve a como estaba. */
function restoreBackup(o,mig){
  try{ localStorage.setItem(KEY_ANTES,JSON.stringify(dataSnap({app:'mis-cuentas',v:5,exportedAt:new Date().toISOString(),antes:todayStr()}))); }
  catch(_){ closeModal(); toast('No hay lugar para guardar una copia de lo actual; no restauré nada. Bajá una copia primero.',5000); return false; }
  const old=keepOld();
  applyRestored(o,mig);
  let ok=persist()&&savedOK(), sinCopia=false;
  if(!ok){ dropAntes(); sinCopia=true; ok=persist()&&savedOK(); }
  if(!ok){ applyData(old); persist(); closeModal(); onData(); toast('No hubo lugar para guardar la copia restaurada; dejé todo como estaba.',5000); return false; }
  closeModal(); onData(); toast(sinCopia?'Copia restaurada (no quedó lugar para poder deshacerla)':'Copia restaurada',sinCopia?5000:0);
  return true;
}
/* Deshacer la restauración: vuelve a la copia interna (pasa por la misma revisión que un archivo). */
function undoRestore(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(KEY_ANTES)||'null'); }catch(_){}
  const o=isOurBackup(d)?normalizeData(d,false):null;
  if(!o||!o.accounts.length){ render(); toast('No pude leer la copia guardada; no cambié nada.',4500); return false; }
  const old=keepOld();
  applyRestored(o,!(d.v>=5));
  if(!(persist()&&savedOK())){ applyData(old); persist(); onData(); toast('No hay lugar para deshacer; no cambié nada.',4500); return false; }
  dropAntes(); onData(); toast('Restauración deshecha');
  return true;
}
