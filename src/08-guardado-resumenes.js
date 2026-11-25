/* ---------- Guardado ---------- */
function saveMov(){
  const m=S.modal.m, err=$('#m-err'); err.textContent='';
  const isY=m&&m.type==='yield';
  const r=$('input[name=mtype]:checked'); const type=isY?'yield':(r?r.value:'in');
  const account=$('#m-acc').value, to=type==='transfer'?$('#m-to').value:null;
  const cents=parseAmt($('#m-amt').value), date=$('#m-date').value, note=$('#m-note').value.trim();
  const ownEl=$('#m-own'), owner=ownEl?ownEl.value:'yo';
  const byOwn=type==='transfer'&&movMode()==='own';
  const toOwn=byOwn?($('#m-toown').value||owner):owner;
  if(!account){err.textContent='Elegí una cuenta.';return;}
  if(byOwn&&toOwn===owner){err.textContent='Elegí dos dueños distintos.';return;}
  if(isNaN(cents)||cents===0){err.textContent='Ingresá un monto distinto de cero.';return;}
  if(type!=='yield'&&cents<0){err.textContent='El monto va en positivo. Para una salida elegí Egreso.';return;}
  if(type==='transfer'&&(!to||(to===account&&toOwn===owner))){err.textContent=(to&&to===account)?'Para pasar plata dentro de la misma cuenta elegí dos dueños distintos.':'Elegí dos cuentas distintas.';return;}
  if(!date){err.textContent='Elegí una fecha.';return;}
  if(isClosed(date)||(m&&isClosed(m.date))){err.textContent='Ese mes está cerrado (rendido). Para modificarlo, reabrilo desde «Informe por dueño».';return;}
  let toCents=null;
  if(type==='transfer'&&curOf(account)!==curOf(to)){
    toCents=parseAmt($('#m-amt2').value);
    if(isNaN(toCents)||toCents<=0){err.textContent='Escribí cuánto llega a la otra cuenta (las monedas son distintas).';return;}
  }
  let nq=1;
  if(type==='out'&&!m&&isCard(account)&&$('#m-cuotas')){ const raw=$('#m-cuotas').value.trim(); if(raw){ if(!/^\d{1,2}$/.test(raw)||+raw<1||+raw>60){err.textContent='Las cuotas tienen que ser un número entre 1 y 60.';return;} nq=+raw; } }
  let forMap=null;
  if(type==='out'){
    const fs=$('#m-for'), fv=fs?fs.value:'';
    if(fv==='__multi'){
      forMap={}; let sum=0, bad=false;
      $$('[data-fo]').forEach(i=>{ const raw=i.value.trim(); if(!raw) return; const v=parseAmt(raw); if(isNaN(v)||v<0) bad=true; else if(v>0){ forMap[i.dataset.fo]=v; sum+=v; } });
      if(bad||!Object.keys(forMap).length){err.textContent='Hay un monto del reparto que no se entiende.';return;}
      if(sum!==cents){err.textContent='El reparto suma '+money(sum,curOf(account))+' y el monto es '+money(cents,curOf(account))+'. Tienen que coincidir.';return;}
    }else if(fv) forMap={[fv]:cents};
    if(forMap){ const ks=Object.keys(forMap); if(ks.length===1&&ks[0]===owner) forMap=null; }
  }
  if(type==='in'&&m&&m.repayFrom&&!$('#m-repay')){ /* se conserva */ }
  /* Aviso de duplicado: mismo tipo, cuenta, monto, dueño y fecha que algo ya cargado. */
  if(!m&&type!=='yield'&&!S.modal.dupOK&&S.movs.some(x=>x.date===date&&x.type===type&&x.account===account&&x.cents===cents&&(x.owner||'yo')===owner&&(type!=='transfer'||x.to===to))){ S.modal.dupOK=true; guardarIgual(); err.textContent='Ya hay cargado algo igual en esa fecha (mismo monto y cuenta). Si es otro, tocá «Guardar igual».'; return; }
  if((type==='out'||type==='transfer')&&!S.modal.negOK){
    const acc=accById(account), ob=acc?ownerBalances(acc):{};
    /* Si la cuenta todavía no tiene nada cargado (saldo inicial 0 y sin movimientos), no hay saldo real contra qué comparar: no avisa. */
    const conDatos=acc&&(acc.initial!==0||S.movs.some(x=>x.account===acc.id||x.to===acc.id));
    if(acc&&acc.kind!=='card'&&conDatos){
      const nb=(ob[owner]||0)-(m?effectOwner(m,account,owner):0)-(nq>1?Math.floor(cents/nq):cents);
      if(nb<0){ S.modal.negOK=true; guardarIgual(); err.textContent='Esto deja la plata de '+ownerName(owner)+' en esa cuenta en '+money(nb,curOf(account))+'. Tocá «Guardar igual» para confirmar.'; return; }
    }
  }
  {
    let deb='', cre='', back=0;
    if(type==='transfer'&&toOwn!==owner&&($('#m-kind')||{}).value==='repay'){ deb=owner; cre=toOwn; if(m&&m.type==='transfer'&&m.kind==='repay'&&(m.owner||'yo')===owner&&m.toOwner===toOwn) back=m.cents; }
    else if(type==='in'&&$('#m-repay')&&$('#m-repay').value&&$('#m-repay').value!==owner){ deb=$('#m-repay').value; cre=owner; if(m&&m.repayFrom===deb&&(m.owner||'yo')===owner) back=m.cents; }
    if(deb&&!S.modal.repOK){
      const cu=curOf(account), due=Math.max(0,owes(deb,cre,cu)-owes(cre,deb,cu)+back);
      if(cents>due){
        S.modal.repOK=true; guardarIgual();
        err.textContent=due>0
          ?ownerName(deb)+' solo le debe '+money(due,cu)+' a '+ownerName(cre)+'. Lo que sobra quedaría como deuda al revés. Tocá Guardar otra vez para anotarlo igual.'
          :ownerName(deb)+' no le debe nada a '+ownerName(cre)+', así que esto quedaría como deuda al revés. Si es plata de '+ownerName(cre)+' que figuraba como de '+ownerName(deb)+', elegí «Aporte, sin deuda». Si no, tocá Guardar otra vez.';
        return;
      }
    }
  }
  const data={type:type,account:account,cents:cents,date:date,note:note,createdAt:m?m.createdAt:Date.now()};
  if(to) data.to=to;
  if(toCents!=null) data.toCents=toCents;
  if(type!=='yield') data.owner=owner;
  if(type==='transfer'&&toOwn!==owner){ data.toOwner=toOwn; data.kind=($('#m-kind')&&$('#m-kind').value)||'gift'; }
  if(forMap) data.for=forMap;
  if(type==='out'){ const cv=($('#m-cat')||{}).value; if(cv&&cv!=='sin'){ data.cat=cv; if(note&&S.modal.catTouched) learnRule(note,cv); } }
  { const rf=($('#m-ref')||{}).value; if(rf&&rf.trim()) data.ref=rf.trim(); }
  { const pj=($('#m-proj')||{}).value; if(pj&&type!=='transfer') data.proj=pj; else if(m&&m.proj&&!$('#m-proj')) data.proj=m.proj; }
  if(m&&m.fx) data.fx=m.fx;
  if(type==='in'){ const rp=$('#m-repay'); if(rp&&rp.value&&rp.value!==owner) data.repayFrom=rp.value; }
  if(m&&m.hold) data.hold=m.hold; keepRepay(m,data,type,owner,cents,date);
  if(m&&m.internal){ data.internal=true; if(m.opId) data.opId=m.opId; }
  if(isY){
    if(m.base!=null) data.base=m.base; if(m.days!=null) data.days=m.days;
    if(m.split){ const w={}; for(const k in m.split) w[k]=Math.abs(m.split[k]); data.split=allocate(cents,w); }
  }
  if(!m&&type!=='transfer'&&nq===1&&$('#m-fixed')&&$('#m-fixed').checked){ const fd=Object.assign({},data); delete fd.date; delete fd.createdAt; delete fd.ref; S.fixed.push({id:newId(),day:+date.slice(8,10),last:date.slice(0,7),data:fd}); }
  if(type!=='yield'){ S.lastOwner=owner; if(!m) prefSet({owner:owner,acc:account}); }
  if(nq>1){ const pd=Object.assign({},data); delete pd.date; delete pd.createdAt; S.plans.push({id:newId(),n:nq,done:0,start:date,total:cents,data:pd}); applyPlans(); persist(); closeModal(); onData(); again(type,account); toast('Guardado · '+nq+' cuotas'); return; }
  putMov(m?m.id:null,data); closeModal(); again(type,account); toast('Guardado');
}
function guardarIgual(){ const sb=$('#mform button.primary[type=submit]'); if(sb) sb.textContent='Guardar igual'; }
/* «Guardar y otro»: vuelve a abrir el formulario con el mismo tipo y cuenta. */
function again(type,account){ if(S.again){ S.again=false; openModal('mov',{m:null,type:type,acc:account,pay:null}); } }
function saveUpd(){
  const err=$('#u-err'); err.textContent='';
  const rows=updRows().filter(r=>r.raw);
  if(!rows.length){err.textContent='Escribí el saldo actual de al menos una cuenta.';return;}
  if(rows.some(r=>isNaN(r.n))){err.textContent='Hay un monto que no se entiende.';return;}
  const todo=rows.filter(r=>r.diff!==0);
  if(todo.some(r=>isClosed(r.date))){err.textContent='Hay una fecha en un mes cerrado. Reabrilo desde «Informe por dueño» o cambiá la fecha.';return;}
  if(!todo.length){err.textContent='Los saldos coinciden con lo anotado: no hay rendimiento para cargar.';return;}
  let tot=0;
  todo.forEach(r=>{
    const ly=lastYieldOf(r.a.id,r.date), d=ly?daysBetween(ly.date,r.date):0;
    const data={type:'yield',account:r.a.id,cents:r.diff,date:r.date,note:'',createdAt:Date.now()};
    if(r.prev>0) data.base=r.prev;
    if(d>=1) data.days=d;
    const sp=allocate(r.diff,posWeights(r.ob));
    if(Object.keys(sp).length>1||!('yo' in sp)) data.split=sp;
    S.movs.push(Object.assign({id:newId()},data)); tot+=r.diff;
  });
  persist(); onData(); closeModal(); toast('Rendimientos guardados'+(todo.length===1?': '+signed(tot,todo[0].a.cur):''));
}
function saveAcc(){
  const a=S.modal.a, err=$('#a-err'); err.textContent='';
  const group=$('#a-group').value.trim(); let name=$('#a-name').value.trim();
  if(!name) name=group;
  if(!name){err.textContent='Poné el banco o el nombre de la cuenta.';return;}
  const ini={}; let initial=0, badI=false;
  $$('[data-ini]').forEach(i=>{ const raw=i.value.trim(); if(!raw) return; const v=parseAmt(raw); if(isNaN(v)) badI=true; else if(v){ ini[i.dataset.ini]=v; initial+=v; } });
  if(badI){err.textContent='Hay un saldo inicial que no se entiende.';return;}
  { const so=($('#a-solo')||{}).value; if(so){ const tot=Object.keys(ini).reduce((x,k)=>x+ini[k],0); Object.keys(ini).forEach(k=>delete ini[k]); if(tot) ini[so]=tot; initial=tot; } }
  if(S.closed.length&&a&&(a.cur!==($('#a-cur').value==='USD'?'USD':'ARS')||(a.kind==='card')!==!!($('#a-card')&&$('#a-card').checked))){err.textContent='Hay meses cerrados: no se puede cambiar la moneda ni el tipo de una cuenta que ya existe. Reabrí esos meses desde «Informe por dueño» primero.';return;}
  if(S.closed.length){
    const prev=a?(a.initialOwners||{yo:a.initial||0}):{}, ks=Array.from(new Set(Object.keys(prev).concat(Object.keys(ini))));
    if(ks.some(k=>(prev[k]||0)!==(ini[k]||0))){err.textContent=a?'Hay meses cerrados: no se puede cambiar el saldo inicial (ni de quién es). Reabrí esos meses desde «Informe por dueño» primero.':'Hay meses cerrados: creá la cuenta con saldo 0 y anotá un ingreso con la fecha de hoy.';return;}
  }
  const maxOrder=S.accounts.reduce((m,x)=>Math.max(m,x.order||0),0);
  const data={group:group||name,name:name,cur:$('#a-cur').value==='USD'?'USD':'ARS',yields:$('#a-yields').checked,initial:initial,initialOwners:ini,soloOwner:($('#a-solo')||{}).value||'',kind:($('#a-card')&&$('#a-card').checked)?'card':'',order:a?(a.order||0):Math.floor(maxOrder)+1,archived:a?$('#a-arch').checked:false};
  const id=a?a.id:slug((group||'')+'-'+name)+'-'+Math.random().toString(36).slice(2,6);
  putAcc(id,data);
  if(data.kind==='card'&&!S.cards.some(c=>c.account===id)){ S.cards.push({id:slug(accLabel(data))+'-'+Math.random().toString(36).slice(2,6),name:accLabel(data),account:id}); persist(); }
  closeModal(); toast('Cuenta guardada');
}
function readName(errSel){
  const v=$('#n-name').value.trim();
  if(!v){ $(errSel).textContent='Escribí un nombre.'; return ''; }
  return v;
}
function saveCard(){
  const v=readName('#n-err'); if(!v) return;
  const c=S.modal.c, then=S.modal.thenStmt;
  if(c){ c.name=v; S.cards=S.cards.map(x=>x.id===c.id?Object.assign({},x,{name:v}):x); }
  else{ const free=S.accounts.find(a=>a.kind==='card'&&!a.archived&&!S.cards.some(c=>c.account===a.id)); S.cards.push(Object.assign({id:slug(v)+'-'+Math.random().toString(36).slice(2,6),name:v},free?{account:free.id}:{})); }
  persist(); closeModal(); render(); toast('Tarjeta guardada');
  if(then) openStmt();
}
function saveCat(){
  const v=readName('#n-err'); if(!v) return;
  const c=S.modal.c;
  if(S.cats.some(x=>x.name.toLowerCase()===v.toLowerCase()&&(!c||x.id!==c.id))){ $('#n-err').textContent='Ya existe una categoría con ese nombre.'; return; }
  if(c) S.cats=S.cats.map(x=>x.id===c.id?Object.assign({},x,{name:v}):x);
  else S.cats.push({id:slug(v)+'-'+Math.random().toString(36).slice(2,6),name:v});
  persist(); closeModal(); render(); toast('Categoría guardada');
}
function saveOwner(){
  const v=readName('#n-err'); if(!v) return;
  const o=S.modal.o;
  if(S.owners.some(x=>x.name.toLowerCase()===v.toLowerCase()&&(!o||x.id!==o.id))){ $('#n-err').textContent='Ya hay alguien con ese nombre.'; return; }
  if(o) S.owners=S.owners.map(x=>x.id===o.id?Object.assign({},x,{name:v}):x);
  else S.owners.push({id:slug(v)+'-'+Math.random().toString(36).slice(2,6),name:v});
  persist(); closeModal(); render(); toast('Guardado');
}

/* ----- Resúmenes de tarjeta ----- */
function openStmt(){
  if(!S.cards.length){ toast('Primero agregá una tarjeta'); openModal('card',{c:null,thenStmt:true}); return; }
  openModal('stmt',{step:1,paid:'pesos',card:S.xCard||S.cards[0].id,period:todayStr().slice(0,7),text:'',totalStr:'',rows:[]});
}
function stmtRead(){
  const M=S.modal;
  M.card=$('#s-card').value; M.paid=$('#s-pay')?$('#s-pay').value:'pesos'; M.period=$('#s-period').value; M.text=$('#s-text').value; M.totalStr=$('#s-total').value.trim();
}
function stmtShowReview(){
  $('#modal').innerHTML=wrapModal(stmtReview());
  updateReviewSum();
  const sh=$('.sheet.wide'); if(sh) sh.scrollTop=0;
}
function stmtAnalyze(){
  const M=S.modal, err=$('#s-err'); stmtRead(); err.textContent='';
  if(!/^\d{4}-\d{2}$/.test(M.period)){err.textContent='Elegí el mes del resumen.';return;}
  if(!M.text.trim()){err.textContent='Pegá el texto del resumen o elegí «Cargar a mano».';return;}
  if(!M.totalStr){ const mt=stmtMeta(M.text); if(mt.total) M.totalStr=mt.total; if(mt.totalUsd&&!M.totalUsdStr) M.totalUsdStr=mt.totalUsd; }
  M.rows=parseStatement(M.text,M.period); M.parsedZero=false; M.preDone=false; M.etiosDone=false;
  if(M.paid==='usd') M.rows.forEach(r=>{ if(r.rg){ r.inc=false; r.flag='No se cobra si pagás los dólares con dólares: se descuenta de tus gastos.'; } });
  if(!M.rows.length){ M.rows=[blankRow(M.period)]; M.parsedZero=true; }
  M.step=2; stmtShowReview();
}
function stmtManual(){
  const M=S.modal; stmtRead();
  if(!/^\d{4}-\d{2}$/.test(M.period)){ $('#s-err').textContent='Elegí el mes del resumen.'; return; }
  M.rows=[blankRow(M.period)]; M.parsedZero=false; M.preDone=false; M.etiosDone=false; M.step=2; stmtShowReview();
}
function reviewField(t){
  const M=S.modal; if(!M||!M.rows) return;
  const row=t.closest('.rv-row'); if(!row) return;
  const r=M.rows[+row.dataset.i], f=t.dataset.f; if(!r) return;
  if(f==='inc') r.inc=t.checked;
  else if(f==='date') r.date=t.value;
  else if(f==='desc') r.desc=t.value;
  else if(f==='amt'){ r.amtStr=t.value; r.cents=parseAmt(t.value); }
  else if(f==='cat') r.cat=t.value;
  else if(f==='usd') r.usd=t.checked;
  else if(f==='own'){ r.own=t.value; if(!t.value){ r.pre=null; r.preAmb=false; r.planAhead=null; } }
  updateReviewSum();
}
function importReview(){
  const M=S.modal, err=$('#rv-err'); err.textContent='';
  if(!M.rows.some(r=>r.inc)){ err.textContent='No hay consumos marcados para importar.'; return; }
  let bad=0;
  $$('.rv-row').forEach(el=>{
    const r=M.rows[+el.dataset.i];
    const isBad=r.inc&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||isNaN(r.cents)||r.cents===0);
    el.classList.toggle('bad',!!isBad); if(isBad) bad++;
  });
  if(bad){ err.textContent='Revisá las filas marcadas: falta la fecha o el monto.'; return; }
  const others=M.rows.filter(r=>r.inc&&r.own);
  const ra=$('#rv-acc'); if(ra) M.cardAcc=ra.value;
  if(others.length){
    if(others.some(r=>r.usd)){ err.textContent='Los consumos en dólares de otros dueños no se pueden anotar acá: cargalos a mano como egreso.'; return; }
    if(!M.cardAcc||!accById(M.cardAcc)){ err.textContent='Elegí en qué tarjeta anotar los consumos de otros (si no hay, creá una cuenta de tarjeta en Ajustes).'; return; }
  }
  let st=S.stmts.find(s=>s.card===M.card&&s.period===M.period);
  if(M.rows.some(r=>r.inc&&r.own&&isClosed(r.date))||(st&&S.movs.some(m=>m.stmt===st.id&&isClosed(m.date)))){ err.textContent='Hay consumos de otros dueños en un mes cerrado. Reabrilo desde «Informe por dueño» para cargar este resumen.'; return; }
  /* Lo que ya estaba anotado (como gasto de otro dueño) se conserva y se vuelve a ligar, en lugar de borrarse al reimportar. */
  const keep=new Set(M.rows.filter(r=>r.inc&&r.own&&r.pre).map(r=>r.pre));
  { const free2=prePend().concat(st?S.movs.filter(m=>m.stmt===st.id&&m.for):[]).filter(m=>!keep.has(m.id));
    M.rows.forEach(r=>{ if(!r.inc||!r.own||r.pre||r.usd||r.planAhead) return; const ix=free2.findIndex(m=>m.cents===r.cents&&m.for&&m.for[r.own]&&Math.abs(daysBetween(m.date,r.date))<=45); if(ix>=0){ r.pre=free2[ix].id; keep.add(r.pre); free2.splice(ix,1); } }); }
  if(st){ S.exp=S.exp.filter(e=>e.stmt!==st.id); S.movs=S.movs.filter(m=>m.stmt!==st.id||keep.has(m.id)); }
  else{ st={id:newId(),card:M.card,period:M.period,createdAt:Date.now()}; S.stmts.push(st); }
  st.paid=M.paid==='usd'?'usd':'pesos';
  let learned=0;
  M.rows.filter(r=>r.inc).forEach(r=>{
    const pm=(r.own&&r.pre)?S.movs.find(x=>x.id===r.pre&&(!x.stmt||x.stmt===st.id)):null;
    if(pm){ pm.stmt=st.id; pm.date=r.date; pm.cents=r.cents; pm.for={[r.own]:r.cents}; if(!pm.note) pm.note=((r.desc||'').trim()||'Consumo de tarjeta'); if(r.cat&&r.cat!=='sin') pm.cat=r.cat; return; }
    const pl=(r.own&&r.planAhead)?S.plans.find(x=>x.id===r.planAhead):null;
    if(pl){ const q=/(\d+)\s*\/\s*(\d+)/.exec(r.cuota||''); if(q&&+q[1]>pl.done){ planAdvanceTo(pl,+q[1],st.id,r.date,r.cat); return; } }
    if(r.own){ S.movs.push({id:newId(),type:'out',account:M.cardAcc,cents:r.cents,date:r.date,note:((r.desc||'').trim()||'Consumo de tarjeta')+(r.cuota?' · cuota '+r.cuota:''),owner:'yo',for:{[r.own]:r.cents},stmt:st.id,createdAt:Date.now()}); return; }
    const e={id:newId(),card:M.card,stmt:st.id,period:M.period,date:r.date,desc:(r.desc||'').trim()||'Sin descripción',cents:r.cents,cat:r.cat};
    if(r.cuota) e.cuota=r.cuota;
    if(r.usd) e.cur='USD';
    if(r.etios&&!r.usd){ e.etios=r.etios; e.det=r.etiosDet; }
    S.exp.push(e);
    if(r.cat!=='sin'&&r.cat!==r.auto&&learnRule(e.desc,r.cat)) learned++;
  });
  if(others.length){ const cc=S.cards.find(x=>x.id===M.card); if(cc) cc.account=M.cardAcc; }
  persist();
  S.xPeriod=M.period; S.xCard=''; S.xCat=''; S.xLimit=100;
  const n=M.rows.filter(r=>r.inc).length;
  closeModal(); toast(n+' consumos guardados'+(others.length?' · '+others.length+' de otros dueños quedaron como deuda':'')+(learned?' · aprendí '+learned+' comercios':''));
  if(navHash()!=='#tarjetas') navGo('tarjetas'); else render();
}
function setExpCat(id,cat){
  const e=S.exp.find(x=>x.id===id); if(!e) return;
  e.cat=cat; let n=0;
  const k=learnRule(e.desc,cat);
  if(k) S.exp.forEach(x=>{ if(x.id!==id&&x.cat==='sin'&&kwMatch(normDesc(x.desc),k)){ x.cat=cat; n++; } });
  persist(); render();
  toast(n?'Categoría guardada · también cambié '+n+' consumos parecidos':'Categoría guardada');
}
/* Eliminar un resumen: borra sus consumos y les saca la marca de resumen a los movimientos ligados.
   Así los gastos para otros dueños vuelven a «esperando resumen» y, si se sube de nuevo, no se duplica la deuda.
   No toca la nafta del Etios ni los saldos. Si el resumen toca un mes cerrado, no se borra. */
const stmtOthers=id=>S.movs.filter(m=>m.stmt===id&&m.type==='out'&&isCard(m.account)&&m.for&&Object.keys(m.for).some(k=>k!==(m.owner||'yo')));
const othersTxt=(n,uno,varios)=>n+(n===1?uno:varios);
function delStmt(id){
  const s=S.stmts.find(x=>x.id===id), L=S.movs.filter(m=>m.stmt===id);
  if(s&&(isClosed(s.period)||L.some(m=>isClosed(m.date)))){ render(); toast('Ese resumen toca un mes cerrado. Reabrilo desde «Informe por dueño» para poder eliminarlo.',4500); return; }
  const n=stmtOthers(id).length;
  L.forEach(m=>{ delete m.stmt; });
  S.exp=S.exp.filter(x=>x.stmt!==id); S.stmts=S.stmts.filter(x=>x.id!==id); persist(); render();
  toast(n?'Resumen eliminado · '+othersTxt(n,' gasto para otro dueño volvió',' gastos para otros dueños volvieron')+' a esperar el resumen':'Resumen eliminado',n?4500:0);
}
