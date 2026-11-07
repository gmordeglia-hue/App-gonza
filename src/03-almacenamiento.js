/* ---------- Almacenamiento en el celular ---------- */
const KEY='mis-cuentas-v1', BK='mis-cuentas-copia';
let storeOK=true;
function persist(){
  try{
    localStorage.setItem(KEY,JSON.stringify({v:5,accounts:S.accounts,movs:S.movs,owners:S.owners,cards:S.cards,cats:S.cats,rules:S.rules,stmts:S.stmts,exp:S.exp,hlds:S.hlds,ops:S.ops,claims:S.claims,plans:S.plans}));
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
  if(!o.owners.some(x=>x.id==='yo')) o.owners.unshift({id:'yo',name:'Gonza'});
  if(mig4||fresh){
    o.owners=o.owners.map(x=>(x.id==='yo'&&x.name==='Mío')?Object.assign({},x,{name:'Gonza'}):x);
    DEFAULT_OWNERS.forEach(x=>{ if(!o.owners.some(y=>y.id===x.id||y.name.toLowerCase()===x.name.toLowerCase())) o.owners.push(Object.assign({},x)); });
  }
  o.cards=arr(d.cards).filter(x=>x&&str(x.id)&&str(x.name));
  o.cats=arr(d.cats).filter(x=>x&&str(x.id)&&str(x.name));
  if(!o.cats.length) o.cats=DEFAULT_CATS.map(x=>({id:x[0],name:x[1]}));
  if(!o.cats.some(x=>x.id==='sin')) o.cats.push({id:'sin',name:'Sin categorizar'});
  o.rules=arr(d.rules).filter(x=>x&&str(x.k)&&str(x.cat));
  o.stmts=arr(d.stmts).filter(x=>x&&str(x.id)&&str(x.card)&&str(x.period));
  o.exp=arr(d.exp).filter(x=>x&&str(x.id)&&str(x.date)&&typeof x.cents==='number'&&str(x.period));
  o.hlds=Array.isArray(d.hlds)?d.hlds.filter(x=>x&&str(x.id)&&str(x.name)).map(x=>Object.assign({initial:0,kind:'nom',cur:'USD',px:[]},x)):[{id:'ymcxo',name:'YMCXO',initial:0,kind:'nom',cur:'USD',px:[]}];
  o.claims=arr(d.claims).filter(x=>x&&str(x.id)&&str(x.from)&&str(x.to)&&typeof x.cents==='number');
  o.plans=arr(d.plans).filter(x=>x&&str(x.id)&&str(x.start)&&x.data&&typeof x.n==='number'&&typeof x.done==='number'&&typeof x.data.cents==='number'&&str(x.data.account));
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
  const go=()=>{ document.removeEventListener('pointerdown',go,true); if(!S.error&&autoBackupDue()) exportBackup('Copia automática descargada'); };
  document.addEventListener('pointerdown',go,true);
}
function backupBlock(){
  const l=lastBackup();
  return '<section><h2 class="sec">Copia de seguridad</h2><p class="muted" style="margin:4px 0 8px">Tus datos viven solo en este celular. Si borrás los datos del navegador o cambiás de teléfono, se pierden.</p>'
    +'<p class="muted" style="margin:0 0 8px"><strong style="color:var(--ink)">Copia automática (solo en el celular):</strong> cada '+AUTO_BK_DAYS+' días, la primera vez que tocás la app se descarga sola una copia en la carpeta Descargas del celular. Podés borrar las viejas y quedarte con las últimas.</p>'
    +'<p class="muted" style="margin:0 0 8px">«Enviar copia a Drive» abre el menú de compartir: elegís Drive y una carpeta, y queda guardada fuera del celular. Tocá ese botón cuando la app te avise.</p>'
    +'<p style="margin:0 0 10px">'+(l?'Última copia: '+fmtDate(l):'Todavía no hiciste ninguna copia.')+'</p>'
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
function backupJson(){ return JSON.stringify({v:5,exportedAt:new Date().toISOString(),accounts:S.accounts,movs:S.movs,owners:S.owners,cards:S.cards,cats:S.cats,rules:S.rules,stmts:S.stmts,exp:S.exp,hlds:S.hlds,ops:S.ops,claims:S.claims,plans:S.plans}); }
function exportBackup(msg){
  const data=JSON.stringify({v:5,exportedAt:new Date().toISOString(),accounts:S.accounts,movs:S.movs,owners:S.owners,cards:S.cards,cats:S.cats,rules:S.rules,stmts:S.stmts,exp:S.exp,hlds:S.hlds,ops:S.ops,claims:S.claims,plans:S.plans});
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download='mis-cuentas-'+todayStr()+'.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
  try{ localStorage.setItem(BK,todayStr()); }catch(_){}
  toast(typeof msg==='string'?msg:'Copia descargada'); render();
}
function readImport(inp){
  const f=inp.files&&inp.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(String(r.result));
      const o=normalizeData(d,false);
      if(!o.accounts.length) throw new Error('vacío');
      openModal('imp',{data:o});
    }catch(_){ toast('Ese archivo no es una copia de Mis cuentas'); }
  };
  r.onerror=()=>toast('No se pudo leer el archivo');
  r.readAsText(f); inp.value='';
}
function impModal(d){
  const o=d.data;
  return '<div class="sheet"><h2>Restaurar copia</h2><p class="hint">La copia tiene '+o.accounts.length+' cuentas, '+o.movs.length+' movimientos y '+o.exp.length+' consumos de tarjeta. Va a reemplazar todo lo que hay ahora en este celular ('+S.accounts.length+' cuentas, '+S.movs.length+' movimientos y '+S.exp.length+' consumos).</p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="button" class="btn danger" data-act="imp-yes">Reemplazar todo</button></div></div>';
}

