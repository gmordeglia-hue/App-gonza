/* ---------- Vistas ---------- */
const CHEV='<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
function yieldStatus(a){
  if(!a.yields) return '';
  const ly=lastYieldOf(a.id);
  if(!ly) return 'Sin rendimientos cargados';
  const d=daysBetween(ly.date,todayStr());
  return d<=0?'Actualizada hoy':d===1?'Actualizada ayer':'Actualizada hace '+d+' días';
}
function needsUpd(a){ if(!a.yields) return false; const ly=lastYieldOf(a.id); return !ly||daysBetween(ly.date,todayStr())>=1; }
function stmtReminder(){
  if(!S.cards.length) return '';
  const t=todayStr(), day=+t.slice(8), cur=t.slice(0,7);
  const per=day>=25?cur:(day<=5?prevPeriod(cur):'');
  if(!per||S.stmts.some(s=>s.period===per)) return '';
  return '<div class="notice info"><span>Resumen de tarjetas de '+esc(monthLabel(per))+': todavía no lo cargaste</span><button class="btn sm" data-act="stmt-new">Cargar</button></div>';
}
/* ---------- Deudas del modelo anterior (solo para pasar los datos viejos) ---------- */
function legacyPairs(ob){
  const pos={}, out=[]; let P=0, N=0;
  S.owners.forEach(o=>{ const v=ob[o.id]||0; if(v>0){ pos[o.id]=v; P+=v; } else N-=v; });
  const f=N>P?P/N:1;
  S.owners.forEach(o=>{
    const v=ob[o.id]||0; if(v>=0) return;
    const sp=allocate(Math.round(-v*f),pos);
    for(const k in sp) if(k!==o.id&&pos[k]&&sp[k]>0) out.push({from:o.id,to:k,v:sp[k]});
  });
  return out.sort((a,b)=>b.v-a.v);
}

const settled=m=>{ let s=0; if(m.settle) for(const k in m.settle) s+=m.settle[k]; return s; };
const loanPart=m=>m.loan!=null?m.loan:m.cents-settled(m);
function loanNet(){
  const r={ARS:{},USD:{}};
  S.loans.forEach(l=>{ const c=l.cur==='USD'?'USD':'ARS'; r[c][l.owner]=(r[c][l.owner]||0)+l.cents; });
  S.movs.forEach(m=>{
    if(!m.repay||m.type!=='in') return;
    const to=m.repayTo||'yo'; if((m.owner||'yo')!==to) return;
    const c=curOf(m.account), v=loanPart(m);
    if(to==='yo') r[c][m.repay]=(r[c][m.repay]||0)-v;
    else if(m.repay==='yo') r[c][to]=(r[c][to]||0)+v;
  });
  return r;
}
// Junta deudas entre los mismos dos dueños: si van y vienen, queda la diferencia.
function mergePairs(list){
  const m=new Map();
  list.forEach(p=>{ const a=p.from<p.to?p.from:p.to, b=a===p.from?p.to:p.from, k=a+'\n'+b; m.set(k,(m.get(k)||0)+(p.from===a?p.v:-p.v)); });
  const out=[];
  m.forEach((v,k)=>{ const x=k.split('\n'); if(v>0) out.push({from:x[0],to:x[1],v:v}); else if(v<0) out.push({from:x[1],to:x[0],v:-v}); });
  return out.sort((a,b)=>b.v-a.v);
}
// Deudas en total por las cuentas, por moneda: la suma de lo que se debe en cada cuenta.
// Que el deudor tenga plata en otra cuenta no salda la deuda: para eso se registra la devolución
// "con plata que ya está en una cuenta", que la pasa al acreedor.
function legacyAccountDebts(){
  const ps={ARS:[],USD:[]}, r={};
  liveAccs().forEach(a=>{ legacyPairs(ownerBalances(a)).forEach(p=>ps[curOf(a.id)].push(p)); });
  ['ARS','USD'].forEach(c=>{ r[c]=mergePairs(ps[c]); });
  return r;
}
// Deudas de toda la plata (lo que muestra Inicio): las de las cuentas más los gastos pagados por otros.
function legacyTotalDebts(){
  const ad=legacyAccountDebts(), ln=loanNet(), r={};
  ['ARS','USD'].forEach(c=>{
    const ps=ad[c].slice();
    for(const k in ln[c]){ const v=ln[c][k]; if(k==='yo'||!v) continue; ps.push(v>0?{from:k,to:'yo',v:v}:{from:'yo',to:k,v:-v}); }
    r[c]=mergePairs(ps);
  });
  return r;
}
// Al editar una devolución: conserva sus marcas y achica lo saldado si bajó el monto (primero
// las cuentas, después los gastos pagados por otros). Si es una de las dos partes de una
// devolución con plata que ya estaba en una cuenta, la otra parte toma el mismo monto, cuenta y fecha.
function trimSettle(m,cents){
  let left=cents; const st={};
  for(const k in (m.settle||{})){ const v=Math.min(m.settle[k],left); if(v>0){ st[k]=v; left-=v; } }
  return {settle:Object.keys(st).length?st:undefined,loan:Math.min(loanPart(m),left)};
}
function keepRepay(m,data,type,owner,cents,date){
  if(!m||!m.repay||type!==m.type||owner!==(m.owner||'yo')) return;
  data.repay=m.repay; if(m.repayTo) data.repayTo=m.repayTo;
  if(m.type==='in') Object.assign(data,trimSettle(m,cents));
  if(!m.pair) return;
  data.pair=m.pair; data.own=true;
  const pm=S.movs.find(x=>x.pair===m.pair&&x.id!==m.id);
  if(pm){ pm.cents=cents; pm.date=date; pm.account=data.account; if(pm.type==='in') Object.assign(pm,trimSettle(pm,cents)); }
}

function viewResumen(){
  if(!S.accounts.length) return '<div class="empty"><h2>Todavía no hay cuentas</h2><p>Agregá la primera cuenta para empezar a llevar tus saldos.</p><button class="btn primary" data-act="acc-new">Agregar cuenta</button></div>';
  const accs=liveAccs(), arch=S.accounts.filter(a=>a.archived).sort(byOrder);
  const fo=S.owners.some(o=>o.id===S.rOwner)?S.rOwner:'';
  const obs=new Map(accs.map(a=>[a.id,ownerBalances(a)]));
  const val=a=>fo?((obs.get(a.id)||{})[fo]||0):balance(a);
  const isU=a=>a.cur==='USD';
  const tot={ARS:0,USD:0}, ot={ARS:{},USD:{}}, curId={};
  accs.forEach(a=>{const c=isU(a)?'USD':'ARS'; curId[a.id]=c; tot[c]+=val(a); const ob=obs.get(a.id); for(const k in ob) ot[c][k]=(ot[c][k]||0)+ob[k];});
  const showU=accs.some(isU)&&(!fo||tot.USD!==0), hasYU=accs.some(a=>isU(a)&&a.yields);
  const today=todayStr(), mp=today.slice(0,7), who=fo||'yo';
  const yM={ARS:0,USD:0}, yT={ARS:0,USD:0}; const hasY=accs.some(a=>a.yields&&!isU(a));
  for(const m of S.movs){ const c=curId[m.account]; if(m.type==='yield'&&c){ const v=ownerShare(m,who); if(m.date.startsWith(mp)) yM[c]+=v; if(m.date===today) yT[c]+=v; } }
  const nonz=o=>nonzeroOwners(o);
  const owLine=(o,c)=>{const l=nonz(o); return (!fo&&(l.length>=2||(l.length===1&&l[0].id!=='yo')))?'<div class="total-sub owners">'+l.map(x=>'<span>'+esc(x.name)+' '+amt(money(x.v,c),x.v<0?'neg':'')+'</span>').join('')+'</div>':'';};
  const chips=S.owners.length>1?'<div class="chips" role="group" aria-label="De quién es la plata">'+S.owners.slice().sort((a,b)=>(b.id==='yo')-(a.id==='yo')).map(o=>'<button class="chip" data-act="rown" data-id="'+esc(o.id)+'" aria-pressed="'+(fo===o.id)+'">'+esc(o.name)+'</button>').join('')+'<button class="chip" data-act="rown" data-id="" aria-pressed="'+(!fo)+'">Todo</button></div>':'';
  // avisos primero (sin recordatorios de actualizar saldos ni de cargar resúmenes: eso se hace a mano cuando uno quiere)
  let L='';
  if(!S.movs.length&&accs.every(a=>!a.initial)) L+='<div class="note"><strong>Primer paso:</strong> cargá lo que tenés hoy en cada cuenta. Tocá una cuenta y entrá a <em>Editar cuenta</em> para completar el saldo inicial. Después anotá cada movimiento con el botón <strong>+</strong> y usá <em>Actualizar saldos</em> para los rendimientos.</div>';
  L+=backupNote();
  L+=planReminder();
  L+=cardReminder();
  L+='<section class="total">'+chips+'<div class="eyebrow">Total en pesos</div><div class="big">'+amt(money(tot.ARS),tot.ARS<0?'neg':'')+'</div>';
  if(hasY) L+='<div class="stats"><div class="stat"><span class="small muted">Rendimiento hoy</span><b>'+amt(signed(yT.ARS),cls(yT.ARS))+'</b></div><div class="stat"><span class="small muted">Rendimiento del mes</span><b>'+amt(signed(yM.ARS),cls(yM.ARS))+'</b></div></div>';
  L+=owLine(ot.ARS,'ARS')+'</section>';
  if(showU){
    L+='<section class="usd-card"><div class="eyebrow">Total en dólares</div><div class="usd-fig">'+amt(money(tot.USD,'USD'),tot.USD<0?'neg':'')+'</div>'
      +(hasYU?'<div class="total-sub" style="margin-top:2px"><span>Rendimiento hoy '+amt(signed(yT.USD,'USD'),cls(yT.USD))+'</span><span>del mes '+amt(signed(yM.USD,'USD'),cls(yM.USD))+'</span></div>':'')+owLine(ot.USD,'USD')+'</section>';
  }
  {
    const DP=debtPairs().filter(p=>!fo||p.debtor===fo||p.creditor===fo);
    if(DP.length) L+='<section class="note"><strong>Deudas entre dueños</strong>'+DP.slice(0,3).map(p=>'<div>'+esc(ownerName(p.debtor))+' le debe '+amt(money(p.cents,p.c))+' a '+esc(ownerName(p.creditor))+'</div>').join('')+'<a class="link" href="#deudas">Ver y devolver</a></section>';
  }
  {
    const IT=invTotals(fo);
    if(IT.ARS||IT.USD) L+='<section class="usd-card"><div class="eyebrow">Cuotapartes (Balanz y otros fondos)</div><div class="usd-fig">'+amt(money(IT.ARS))+'</div>'+(IT.USD?'<div class="total-sub"><span>'+amt(money(IT.USD,'USD'))+'</span></div>':'')+'<div class="total-sub"><a class="link" href="#inversiones">Ver inversiones</a></div></section>';
  }
  // cuentas por entidad
  const gm=new Map();
  accs.forEach(a=>{ if(fo&&val(a)===0) return; const g=a.group||a.name; if(!gm.has(g)) gm.set(g,[]); gm.get(g).push(a); });
  let R='';
  if(!gm.size&&fo) R+='<div class="note">No hay plata de '+esc(ownerName(fo))+' en tus cuentas.</div>';
  if(gm.size){
    R+='<h2 class="sec" style="margin:0">Tus cuentas</h2><div class="blist">';
    gm.forEach((list,g)=>{
      const sums={ARS:0,USD:0}; list.forEach(a=>{sums[isU(a)?'USD':'ARS']+=val(a)});
      const amts=(sums.ARS||!sums.USD?'<span class="bam">'+amt(money(sums.ARS),sums.ARS<0?'neg':'')+(sums.USD?'<span class="alt">'+amt(money(sums.USD,'USD'))+'</span>':'')+'</span>':'<span class="bam">'+amt(money(sums.USD,'USD'),sums.USD<0?'neg':'')+'</span>');
      if(list.length===1){
        const a=list[0];
        R+='<div class="bank"><button data-act="acc-open" data-id="'+esc(a.id)+'"><span><span class="nm">'+esc(accLabel(a))+'</span>'+(a.yields?'<span class="small muted" style="display:block">'+yieldStatus(a)+'</span>':'')+(fo?'':ownSub(a))+'</span><span class="bam">'+(a.kind==='card'?'<span class="small muted">solo deuda</span>':amt(money(val(a),a.cur),val(a)<0?'neg':''))+'</span>'+CHEV+'</button></div>';
      }else{
        const op=!!S.open[g];
        R+='<div class="bank'+(op?' open':'')+'"><button data-act="grp-toggle" data-id="'+esc(g)+'" aria-expanded="'+op+'"><span><span class="nm">'+esc(g)+'</span><span class="small muted" style="display:block">'+list.length+' cuentas'+'</span></span>'+amts+CHEV+'</button>';
        if(op) R+='<div class="subs">'+list.map(a=>'<button class="brow" data-act="acc-open" data-id="'+esc(a.id)+'"><span><span class="nm">'+esc(a.name+(isU(a)&&!/US\$|dólar/i.test(a.name)?' (US$)':''))+'</span>'+(a.yields?'<span class="small muted" style="display:block">'+yieldStatus(a)+'</span>':'')+(fo?'':ownSub(a))+'</span><span class="bam">'+(a.kind==='card'?'<span class="small muted">solo deuda</span>':amt(money(val(a),a.cur),val(a)<0?'neg':''))+'</span>'+CHEV+'</button>').join('')+'</div>';
        R+='</div>';
      }
    });
    R+='</div>';
  }
  if(arch.length) R+='<details class="arch"><summary>Archivadas ('+arch.length+')</summary><div class="list-head">'+arch.map(a=>'<div class="acc"><div><div class="acc-name">'+esc(accLabel(a))+'</div></div><div class="acc-bal">'+amt(money(balance(a),a.cur),'muted')+'</div><div class="acc-actions"><button class="btn sm ghost" data-act="acc-edit" data-id="'+esc(a.id)+'">Editar</button></div></div>').join('')+'</div></details>';
  return '<div class="home"><div>'+L+'</div><div>'+R+'</div></div>';
}
function ownerPanel(a,ob){
  const l=nonzeroOwners(ob); if(!l.length) return '';
  const neg=l.filter(x=>x.v<0);
  let h='<section class="note"><strong>De quién es la plata de esta cuenta</strong>'+l.map(x=>'<div class="debt-h"><span>'+esc(x.name)+'</span>'+amt(money(x.v,a.cur),x.v<0?'neg':'')+'</div>').join('');
  if(neg.length) h+='<p class="small muted" style="margin:6px 0 0">'+neg.map(x=>esc(x.name)).join(', ')+' figura en negativo en esta cuenta.</p>';
  h+='</section>';
  return h;
}
function ownSub(a){
  const l=nonzeroOwners(ownerBalances(a)); if(l.length<2&&!(l.length===1&&l[0].id!=='yo')) return '';
  return '<span class="small muted" style="display:block">'+l.map(x=>esc(x.name)+' '+money(x.v,a.cur)).join(' · ')+'</span>';
}
/* Cuenta de tarjeta: solo muestra los consumos anotados (de otros dueños). No tiene saldo ni cuenta en los totales. */
function viewTarjetaCuenta(a){
  const mp=todayStr().slice(0,7), outs=S.movs.filter(m=>m.account===a.id&&m.type==='out');
  const mes=outs.filter(m=>m.date.startsWith(mp)).reduce((t,m)=>t+m.cents,0);
  let h='<section class="total"><div class="eyebrow">Consumos de otros este mes</div><div class="big">'+amt(money(mes,a.cur),'muted')+'</div><p class="small muted" style="margin:8px 0 0">Es solo deuda: no se descuenta de ninguno de tus saldos. Se ve en «Deudas entre dueños».</p></section>';
  h+='<div class="actions"><button class="btn primary" data-act="mov-new" data-acc="'+esc(a.id)+'" data-type="out">Anotar consumo</button><button class="btn ghost" data-act="acc-edit" data-id="'+esc(a.id)+'">Editar cuenta</button></div>';
  const list=S.movs.filter(m=>m.account===a.id||m.to===a.id).reverse();
  const saved=[S.fAcc,S.fOwner]; S.fAcc=a.id; S.fOwner='';
  h+='<h2 class="sec" style="margin:4px 0 0">Consumos anotados</h2>';
  h+=list.length?'<div class="list-head">'+list.slice(0,S.limit).map(m=>movRow(m,null)).join('')+'</div>'+(list.length>S.limit?'<div><button class="btn ghost" data-act="more">Ver más ('+(list.length-S.limit)+')</button></div>':''):'<div class="note">Todavía no anotaste consumos en esta tarjeta.</div>';
  S.fAcc=saved[0]; S.fOwner=saved[1];
  return h;
}
function viewCuenta(){
  const a=accById(S.acc);
  if(!a){ S.acc=''; return viewResumen(); }
  if(a.kind==='card') return viewTarjetaCuenta(a);
  const b=balance(a), ob=ownerBalances(a), ow=ownersBreak(ob,a.cur);
  let h='<section class="total"><div class="eyebrow">Saldo</div><div class="big">'+amt(money(b,a.cur),b<0?'neg':'')+'</div>'
    +'<div class="total-sub">'+(ow?'<span>'+ow+'</span>':'<span>Todo es tuyo</span>')+'</div>'
    +(a.yields?'<div class="small muted" style="margin-top:10px">'+yieldStatus(a)+'</div>':'')+'</section>';
  h+=ownerPanel(a,ob);
  h+='<div class="actions">'+(a.kind==='card'?'<button class="btn primary" data-act="mov-new" data-type="transfer" data-card="'+esc(a.id)+'">Pagar tarjeta</button>':'')+(a.yields?'<button class="btn primary" data-act="upd" data-id="'+esc(a.id)+'">Actualizar saldo</button>':'')
    +'<button class="btn'+(a.yields?'':' primary')+'" data-act="mov-new" data-acc="'+esc(a.id)+'">Nuevo movimiento</button><button class="btn ghost" data-act="acc-edit" data-id="'+esc(a.id)+'">Editar cuenta</button></div>';
  const saved=[S.fAcc,S.fOwner]; S.fAcc=a.id; S.fOwner='';
  const run=new Map(); let bb=a.initial||0;
  for(const m of S.movs){ const e=effect(m,a.id); if(e!==0){ bb+=e; run.set(m.id,bb); } }
  const list=S.movs.filter(m=>m.account===a.id||m.to===a.id).reverse();
  h+='<h2 class="sec" style="margin:4px 0 0">Movimientos de esta cuenta</h2>';
  h+=list.length?'<div class="list-head">'+list.slice(0,S.limit).map(m=>movRow(m,run)).join('')+'</div>'+(list.length>S.limit?'<div><button class="btn ghost" data-act="more">Ver más ('+(list.length-S.limit)+')</button></div>':''):'<div class="note">Todavía no hay movimientos en esta cuenta.</div>';
  S.fAcc=saved[0]; S.fOwner=saved[1];
  return h;
}
function viewMas(){
  const groups=[
    ['La plata que crece',[['rendimientos','Rendimientos','Cuánto rinde cada cuenta','rend'],['inversiones','Inversiones','Cuotapartes de Balanz, nominales y cobros','inv']]],
    ['Gastos y deudas',[['tarjetas','Tarjetas','Resúmenes y en qué se va la plata','card'],['deudas','Deudas entre dueños','Quién le debe a quién y devoluciones','debt']]],
    ['Configuración',[['ajustes','Ajustes y seguridad','Cuentas, dueños, tarjetas, categorías, copias y bloqueo','gear']]]
  ];
  const IC={debt:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>',inv:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="5"/><path d="M13 13.5A5 5 0 1 0 19 19"/><path d="M9 7v4M7.5 9H11"/></svg>',rend:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',card:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',gear:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>'};
  return '<div>'+groups.map(g=>'<div class="eyebrow mgrp-h">'+g[0]+'</div><div class="mlist">'+g[1].map(r=>'<a class="mrow" href="#'+r[0]+'">'+IC[r[3]]+'<span><b>'+r[1]+'</b><span class="small muted">'+r[2]+'</span></span>'+CHEV+'</a>').join('')+'</div>').join('')+'</div>';
}

function typeLabel(t){return t==='in'?'Ingreso':t==='out'?'Egreso':t==='transfer'?'Transferencia':'Rendimiento'}
function ownerHas(m,oid){
  if(m.type==='yield') return m.split?((m.split[oid]||0)!==0):oid==='yo';
  if(m.type==='transfer') return (m.owner||'yo')===oid||(m.toOwner||m.owner||'yo')===oid;
  return (m.owner||'yo')===oid||!!(m.for&&m.for[oid]);
}
function movRow(m,run,noDate){
  const a=accById(m.account), b=m.to?accById(m.to):null;
  const xo=m.type==='transfer'&&m.toOwner&&m.toOwner!==(m.owner||'yo');
  const main=m.note?m.note:(m.type==='transfer'?(b&&b.kind==='card'?'Pago de tarjeta':xo?({repay:'Devolución',loan:'Préstamo',gift:'Aporte'}[m.kind]||'Traspaso'):'Movimiento entre cuentas'):typeLabel(m.type));
  const where=(m.type==='transfer'&&m.to!==m.account)?accLabel(a)+' → '+accLabel(b):accLabel(a);
  let amtHtml;
  if(m.type==='transfer'&&(!S.fAcc||(m.to===m.account&&!S.fOwner))){ const c1=curOf(m.account), c2=m.to?curOf(m.to):c1; amtHtml=amt((m.toCents!=null&&c1!==c2)?money(m.cents,c1)+' → '+money(m.toCents,c2):money(m.cents,c1),'muted'); }
  else if(a&&a.kind==='card'&&m.type==='out') amtHtml=amt(money(m.cents,curOf(m.account)),'muted');
  else{
    let e;
    if(S.fAcc) e=S.fOwner?effectOwner(m,S.fAcc,S.fOwner):effect(m,S.fAcc);
    else if(S.fOwner&&m.type==='yield'&&m.split) e=m.split[S.fOwner]||0;
    else e=effect(m,m.account);
    amtHtml=amt(signed(e,S.fAcc?curOf(S.fAcc):curOf(m.account)),cls(e));
  }
  let sub=(noDate?'':'<span class="mono">'+fmtDate(m.date)+'</span> · ')+esc(m.note?typeLabel(m.type)+' · '+where:where);
  if(m.type!=='yield'&&(m.owner||'yo')!=='yo'&&!xo) sub+=' · <span class="pill own">'+esc(ownerName(m.owner))+'</span>';
  if(xo) sub+=' · <span class="pill own">'+esc(ownerName(m.owner||'yo'))+' → '+esc(ownerName(m.toOwner))+'</span>';
  if(m.type==='out'&&m.for) sub+=' · <span class="pill own">Para '+Object.keys(m.for).map(k=>esc(ownerName(k))).join(', ')+'</span>';
  if(m.type==='yield'){
    const k=yieldMetrics(m);
    if(k) sub+=' · '+spct(k.p)+(k.days?' en '+k.days+(k.days===1?' día':' días'):'')+(k.tna!=null?' · TNA ≈ '+pf.format(k.tna*100)+'%':'');
    if(m.split&&Object.keys(m.split).length>1) sub+=' · '+Object.keys(m.split).map(k=>esc(ownerName(k))+' '+signed(m.split[k],curOf(m.account))).join(' / ');
    else if(m.split&&!m.split.yo) sub+=' · <span class="pill own">'+esc(ownerName(Object.keys(m.split)[0]))+'</span>';
  }
  const runHtml=(run&&run.has(m.id))?'<div class="mov-run">Saldo '+amt(money(run.get(m.id),curOf(S.fAcc)))+'</div>':'';
  const sel=S.selMov===m.id||S.confirmDel===m.id;
  const acts=S.confirmDel===m.id
    ? '<span>¿Eliminar este movimiento?</span><button class="btn sm danger" data-act="del-yes" data-id="'+esc(m.id)+'">Sí, eliminar</button><button class="btn sm" data-act="del-no">No</button>'
    : '<button class="link" data-act="mov-edit" data-id="'+esc(m.id)+'">Editar</button><button class="link danger" data-act="del-ask" data-id="'+esc(m.id)+'">Eliminar</button>';
  return '<div class="mov'+(sel?' sel':'')+'" data-act="mov-sel" data-id="'+esc(m.id)+'"><div><div class="mov-t">'+esc(main)+'</div><div class="mov-s">'+sub+'</div></div><div class="mov-amt">'+amtHtml+runHtml+'</div>'+(sel?'<div class="mov-actions">'+acts+'</div>':'')+'</div>';
}
const opt=(v,l,sel)=>'<option value="'+esc(v)+'"'+(sel?' selected':'')+'>'+esc(l)+'</option>';
function dayLabel(s){
  const t=todayStr(); if(s===t) return 'Hoy'; if(s===addDays(t,-1)) return 'Ayer';
  const p=s.split('-'); const x=new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
  return x.charAt(0).toUpperCase()+x.slice(1);
}
function viewMovs(){
  const accsAll=S.accounts.slice().sort(byOrder);
  const months=Array.from(new Set(S.movs.map(m=>m.date.slice(0,7)))).sort().reverse();
  let run=null;
  if(S.fAcc){ const a=accById(S.fAcc); if(a){ run=new Map(); let b=S.fOwner?(initOf(a)[S.fOwner]||0):(a.initial||0); for(const m of S.movs){ const e=S.fOwner?effectOwner(m,a.id,S.fOwner):effect(m,a.id); if(e!==0){ b+=e; run.set(m.id,b); } } } }
  const q=(S.fQ||'').trim().toLowerCase();
  const hit=m=>{ if(!q) return true; const a=accById(m.account), b=m.to?accById(m.to):null; return (accLabel(a)+' '+(b?accLabel(b):'')+' '+(m.note||'')+' '+typeLabel(m.type)+' '+ownerName(m.owner||'yo')).toLowerCase().indexOf(q)>-1; };
  const list=S.movs.filter(m=>(!S.fAcc||m.account===S.fAcc||m.to===S.fAcc)&&(!S.fType||m.type===S.fType)&&(!S.fMonth||m.date.startsWith(S.fMonth))&&(!S.fOwner||ownerHas(m,S.fOwner))&&hit(m)).reverse();
  let h='<input class="search" id="mq" type="search" placeholder="Buscar por detalle o cuenta" aria-label="Buscar movimientos" autocomplete="off" value="'+esc(S.fQ||'')+'">'
    +'<div class="chips" role="group" aria-label="Tipo de movimiento">'+[['','Todos'],['out','Egresos'],['in','Ingresos'],['transfer','Transferencias'],['yield','Rendimientos']].map(c=>'<button class="chip" data-act="ftype" data-id="'+c[0]+'" aria-pressed="'+(S.fType===c[0])+'">'+c[1]+'</button>').join('')+'</div>'
    +'<details class="more-f"'+((S.fAcc||S.fOwner||S.fMonth)?' open':'')+'><summary>Más filtros</summary><div class="filters">'
    +'<select data-filter="fAcc" aria-label="Filtrar por cuenta">'+opt('','Todas las cuentas',!S.fAcc)+accsAll.map(a=>opt(a.id,accLabel(a),S.fAcc===a.id)).join('')+'</select>'
    +'<select data-filter="fOwner" aria-label="Filtrar por dueño">'+opt('','Todos los dueños',!S.fOwner)+S.owners.map(o=>opt(o.id,o.name,S.fOwner===o.id)).join('')+'</select>'
    +'<select data-filter="fMonth" aria-label="Filtrar por mes">'+opt('','Todos los meses',!S.fMonth)+months.map(mo=>opt(mo,monthLabel(mo),S.fMonth===mo)).join('')+'</select></div></details>'+plansBlock();
  if(!S.movs.length) return h+'<div class="empty"><h2>Sin movimientos todavía</h2><p>Los ingresos, egresos, transferencias y rendimientos que cargues aparecen acá, del más nuevo al más viejo.</p><button class="btn primary" data-act="mov-new">Cargar el primero</button></div>';
  if(!list.length) return h+'<div class="note">No hay movimientos con estos filtros.</div>';
  let last='', open=false;
  list.slice(0,S.limit).forEach(m=>{
    if(m.date!==last){ if(open) h+='</div>'; h+='<div class="day">'+esc(dayLabel(m.date))+'</div><div class="list-head">'; open=true; last=m.date; }
    h+=movRow(m,run,true);
  });
  if(open) h+='</div>';
  if(list.length>S.limit) h+='<div><button class="btn ghost" data-act="more">Ver más ('+(list.length-S.limit)+')</button></div>';
  return h;
}
function chartSvg(ids,cur){
  const sym=cur==='USD'?'US$':'$';
  const today=todayStr(), days=[]; for(let i=29;i>=0;i--) days.push(addDays(today,-i));
  const sums={}; for(const m of S.movs){ if(m.type==='yield'&&ids.has(m.account)) sums[m.date]=(sums[m.date]||0)+m.cents; }
  const vals=days.map(d=>sums[d]||0);
  const max=Math.max(0,...vals), min=Math.min(0,...vals);
  if(max===0&&min===0) return '<div class="note">Todavía no hay rendimientos en los últimos 30 días.</div>';
  const W=480,H=190,pl=58,pr=8,pt=10,pb=24, pw=W-pl-pr, ph=H-pt-pb, range=max-min;
  const y=v=>pt+(max-v)/range*ph, y0=y(0), step=pw/30, bw=step*0.68;
  let s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Rendimientos diarios de los últimos 30 días">';
  s+='<line class="grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+pt+'" y2="'+pt+'"/>';
  vals.forEach((v,i)=>{
    if(!v) return;
    const x=pl+i*step+(step-bw)/2, top=v>0?y(v):y0, hh=Math.max(1,Math.abs(y(v)-y0));
    s+='<rect class="'+(v>0?'bar-pos':'bar-neg')+'" x="'+x.toFixed(1)+'" y="'+top.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hh.toFixed(1)+'"><title>'+fmtDate(days[i])+': '+signed(v,cur)+'</title></rect>';
  });
  s+='<line class="zero" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y0.toFixed(1)+'" y2="'+y0.toFixed(1)+'"/>';
  s+='<text x="'+(pl-6)+'" y="'+(pt+4)+'" text-anchor="end">'+sym+' '+cf.format(max/100)+'</text>';
  if(min<0) s+='<text x="'+(pl-6)+'" y="'+(y(min)+4).toFixed(1)+'" text-anchor="end">'+sym+' '+cf.format(min/100)+'</text>';
  s+='<text x="'+(pl-6)+'" y="'+(y0+4).toFixed(1)+'" text-anchor="end">0</text>';
  [[0,'start'],[15,'middle'],[29,'end']].forEach(p=>{
    const x=pl+p[0]*step+step/2;
    s+='<text x="'+(p[1]==='start'?pl:p[1]==='end'?W-pr:x).toFixed(1)+'" y="'+(H-6)+'" text-anchor="'+p[1]+'">'+fmtDate(days[p[0]],true)+'</text>';
  });
  return s+'</svg>';
}
function monthsBack(n){
  const t=todayStr(); let y=+t.slice(0,4), m=+t.slice(5,7); const out=[];
  for(let i=0;i<n;i++){ out.unshift(y+'-'+pad(m)); m--; if(m<1){ m=12; y--; } }
  return out;
}
function barsSvg(labels,series,sym,label){
  const all=[].concat.apply([],series.map(s=>s.vals)), max=Math.max.apply(null,[0].concat(all));
  if(!(max>0)) return '<div class="note">Todavía no hay datos en estos meses.</div>';
  const W=480,H=200,pl=58,pr=8,pt=12,pb=26,pw=W-pl-pr,ph=H-pt-pb,n=labels.length,gw=pw/n;
  const bw=Math.min(26,gw*0.78/series.length-2), y0=pt+ph, y=v=>pt+(1-v/max)*ph;
  let s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(label)+'">';
  s+='<line class="grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+pt+'" y2="'+pt+'"/><line class="zero" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y0+'" y2="'+y0+'"/>';
  s+='<text x="'+(pl-6)+'" y="'+(pt+4)+'" text-anchor="end">'+sym+' '+cf.format(max/100)+'</text><text x="'+(pl-6)+'" y="'+(y0+4)+'" text-anchor="end">0</text>';
  labels.forEach((lb,i)=>{
    const cx=pl+gw*i+gw/2, tw=series.length*(bw+2)-2;
    series.forEach((se,k)=>{
      const v=se.vals[i]; if(!(v>0)) return;
      const hh=Math.max(1,y0-y(v)), r=Math.min(3,hh), x=cx-tw/2+k*(bw+2), top=y0-hh;
      s+='<path class="'+se.cls+'" d="M'+x.toFixed(1)+','+y0+' V'+(top+r).toFixed(1)+' a'+r+','+r+' 0 0 1 '+r+','+(-r)+' H'+(x+bw-r).toFixed(1)+' a'+r+','+r+' 0 0 1 '+r+','+r+' V'+y0+' Z"/>';
    });
    s+='<text x="'+cx.toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(lb)+'</text>';
    s+='<rect class="hit" x="'+(pl+gw*i).toFixed(1)+'" y="'+pt+'" width="'+gw.toFixed(1)+'" height="'+ph+'"><title>'+esc(labels[i])+': '+series.map(se=>se.name+' '+se.fmt(se.vals[i])).join(' · ')+'</title></rect>';
  });
  return s+'</svg>';
}
function viewAnalisis(){
  const N=+S.aRange===12?12:6, ms=monthsBack(N);
  const fo=S.aOwner&&S.owners.some(o=>o.id===S.aOwner)?S.aOwner:'';
  const pm=(a,b)=>{ if(!(b>0)) return ''; const r=(a-b)/b; return '<span class="'+(r>0?'neg':r<0?'pos':'muted')+'">'+spct(r)+'</span>'; };
  let h='<div class="filters"><select data-filter="aRange" aria-label="Período">'+opt('6','Últimos 6 meses',N===6)+opt('12','Últimos 12 meses',N===12)+'</select></div>';
  // ----- tarjetas por mes (se arma acá y se muestra después de las cuentas) -----
  const head=h; h='';
  h+='<section><h2 class="sec">Tarjetas: gasto por mes</h2>';
  if(!S.exp.length) h+='<div class="note">Cuando cargues resúmenes de tarjeta, acá vas a ver cuánto gastás cada mes y en qué.</div>';
  else{
    const ars=ms.map(p=>sumC(S.exp.filter(e=>e.period===p&&e.cur!=='USD'))), usd=ms.map(p=>sumC(S.exp.filter(e=>e.period===p&&e.cur==='USD')));
    h+='<div class="chart-box">'+barsSvg(ms.map(monthShort),[{name:'Gastado',cls:'bar-acc',vals:ars,fmt:v=>money(v)}],'$','Gasto en tarjetas por mes, en pesos')+'</div>';
    const withData=ms.map((p,i)=>({p:p,a:ars[i],u:usd[i],i:i})).filter(x=>S.exp.some(e=>e.period===x.p)).reverse();
    h+='<div class="list-head" style="margin-top:10px">'+withData.map(x=>'<div class="mov"><div><div class="mov-t">'+esc(monthLabel(x.p))+'</div><div class="mov-s">'+pm(x.a,x.i>0?ars[x.i-1]:0)+(x.i>0&&ars[x.i-1]>0?' vs '+esc(monthShort(ms[x.i-1])):'')+'</div></div><div class="mov-amt">'+amt(money(x.a))+(x.u?'<div>'+amt(money(x.u,'USD'),'muted')+'</div>':'')+'</div></div>').join('')+'</div>';
    // detalle de un mes
    const avail=withData.map(x=>x.p);
    const sel=avail.indexOf(S.aMonth)>-1?S.aMonth:(avail[0]||'');
    if(sel){
      const cur=S.exp.filter(e=>e.period===sel&&e.cur!=='USD'), prv=S.exp.filter(e=>e.period===prevPeriod(sel)&&e.cur!=='USD');
      const by=new Map(), pby=new Map(); cur.forEach(e=>by.set(e.cat,(by.get(e.cat)||0)+e.cents)); prv.forEach(e=>pby.set(e.cat,(pby.get(e.cat)||0)+e.cents));
      const tot=sumC(cur), ent=Array.from(by.entries()).sort((a,b)=>b[1]-a[1]), mx=Math.max(1,...ent.map(x=>x[1]));
      h+='<h3 class="sec" style="font-size:16px;margin-top:18px">En qué se fue</h3><div class="filters"><select data-filter="aMonth" aria-label="Mes">'+avail.map(p=>opt(p,monthLabel(p),p===sel)).join('')+'</select></div>';
      h+='<div class="list-head">'+ent.map(x=>'<div class="catrow" style="cursor:default"><span class="cat-name">'+esc(catName(x[0]))+'</span><span class="cat-amt">'+amt(money(x[1]))+'</span><span class="cat-sub">'+(tot>0?p0.format(x[1]/tot*100)+'%':'')+(pby.get(x[0])>0?' '+pm(x[1],pby.get(x[0]))+' vs '+esc(monthShort(prevPeriod(sel))):'')+'</span><span class="bar"><i style="width:'+Math.max(0,x[1]/mx*100).toFixed(1)+'%"></i></span></div>').join('')+'</div>';
      const cu=S.exp.filter(e=>e.period===sel&&e.cur==='USD');
      if(cu.length){ const by2=new Map(); cu.forEach(e=>by2.set(e.cat,(by2.get(e.cat)||0)+e.cents)); h+='<p class="an-note">En dólares: '+Array.from(by2.entries()).sort((a,b)=>b[1]-a[1]).map(x=>esc(catName(x[0]))+' '+amt(money(x[1],'USD'))).join(' · ')+'</p>'; }
    }
  }
  if(S.stmts.length) h+='<p class="an-note">Los resúmenes uno por uno, y para cambiarles el mes o borrarlos, están en <a class="link" href="#tarjetas">Tarjetas</a>.</p>';
  h+='</section>';
  const tj=h; h=head;
  // ----- movimiento de cuentas -----
  const idx={}; ms.forEach((p,i)=>{idx[p]=i});
  const R=ms.map(()=>({ARS:{i:0,o:0,y:0},USD:{i:0,o:0,y:0}}));
  for(const m of S.movs){
    const i=idx[m.date.slice(0,7)]; if(i===undefined||m.type==='transfer'||m.internal) continue;
    const c=curOf(m.account), r=R[i][c];
    if(m.type==='yield') r.y+=fo?ownerShare(m,fo):m.cents;
    else if(m.own||m.repay||m.repayFrom) continue;
    else if(m.type==='in'){ if(fo&&(m.owner||'yo')!==fo) continue; r.i+=m.cents; }
    else if(m.type==='out'){ if(!fo&&isCard(m.account)) continue; const fm=m.for||{[m.owner||'yo']:m.cents}; r.o+=fo?(fm[fo]||0):m.cents; }
  }
  h+='<section><h2 class="sec">Cuentas: ingresos y egresos</h2><div class="filters"><select data-filter="aOwner" aria-label="De quién es la plata">'+opt('','Todos los dueños',!fo)+S.owners.map(o=>opt(o.id,'Solo '+o.name,fo===o.id)).join('')+'</select></div>';
  if(!S.movs.length) h+='<div class="note">Cuando cargues movimientos, acá vas a ver cuánto entra y cuánto sale cada mes.</div>';
  else{
    h+='<div class="legend"><span><i class="sw-pos"></i>Ingresos</span><span><i class="sw-neg"></i>Egresos</span></div><div class="chart-box">'+barsSvg(ms.map(monthShort),[{name:'Ingresos',cls:'bar-pos',vals:R.map(r=>r.ARS.i),fmt:v=>money(v)},{name:'Egresos',cls:'bar-neg',vals:R.map(r=>r.ARS.o),fmt:v=>money(v)}],'$','Ingresos y egresos de las cuentas por mes, en pesos')+'</div>';
    const rowsFor=c=>ms.map((p,i)=>({p:p,r:R[i][c]})).filter(x=>x.r.i||x.r.o||x.r.y).reverse();
    const list=(c)=>rowsFor(c).map(x=>{ const net=x.r.i-x.r.o+x.r.y; return '<div class="mov"><div><div class="mov-t">'+esc(monthLabel(x.p))+'</div><div class="mov-s">Ingresos '+amt(money(x.r.i,c))+' · Egresos '+amt(money(x.r.o,c))+(x.r.y?' · Rendimientos '+amt(money(x.r.y,c)):'')+'</div></div><div class="mov-amt">'+amt(signed(net,c),cls(net))+'</div></div>'; }).join('');
    const la=list('ARS'), lu=list('USD');
    h+=(la?'<div class="list-head" style="margin-top:10px">'+la+'</div>':'')+(lu?'<h3 class="sec" style="font-size:16px;margin-top:18px">En dólares</h3><div class="list-head">'+lu+'</div>':'');
    h+='<p class="an-note">La cifra de cada mes es ingresos menos egresos más rendimientos. Las transferencias entre tus cuentas no cuentan. Con un dueño elegido, los egresos son los gastos que fueron para ese dueño, aunque los haya pagado otro. Pagar una tarjeta que cargaste como cuenta es una transferencia y no cuenta: el gasto se cuenta cuando lo cargás en la tarjeta. Las compras de cuotapartes tampoco cuentan como gasto.</p>';
  }
  h+='</section>'+tj;
  return h;
}
function viewAjustes(){
  const all=S.accounts.slice().sort(byOrder), gm=new Map();
  all.forEach(a=>{const g=a.group||a.name; if(!gm.has(g)) gm.set(g,[]); gm.get(g).push(a);});
  let h='<p class="muted" style="font-size:14px;margin:0 0 4px">Lo que se toca de vez en cuando: cuentas, dueños, tarjetas, categorías y la copia de seguridad (al final).</p><section><h2 class="sec">Cuentas</h2>';
  gm.forEach((list,g)=>{
    h+='<div class="grp"><div class="grp-h"><span class="eyebrow">'+esc(g)+'</span></div>'
      +list.map(a=>'<div class="acc"><div><div class="acc-name">'+esc(a.name)+(a.cur==='USD'&&!/US\$|dólar/i.test(a.name)?' (US$)':'')+'</div>'+(a.archived?'<div class="acc-meta"><span>Archivada</span></div>':'')+'</div><div class="acc-actions"><button class="btn sm ghost" data-act="acc-edit" data-id="'+esc(a.id)+'">Editar</button></div></div>').join('')
      +'<div class="grp-add"><button class="link" data-act="acc-new" data-group="'+esc(g)+'">+ Agregar fondo, reserva u otra cuenta en '+esc(g)+'</button><button class="link" data-act="acc-new" data-group="'+esc(g)+'" data-cur="USD">+ Agregar cuenta en dólares en '+esc(g)+'</button></div></div>';
  });
  h+='<div style="margin-top:10px"><button class="btn" data-act="acc-new">Nueva cuenta, banco o billetera</button></div></section>';
  h+='<section><h2 class="sec">Dueños de la plata</h2><div class="list-head">'+S.owners.map(o=>'<div class="acc"><div><div class="acc-name">'+esc(o.name)+'</div></div><div class="acc-actions"><button class="btn sm ghost" data-act="owner-edit" data-id="'+esc(o.id)+'">Editar</button></div></div>').join('')+'</div><div style="margin-top:10px"><button class="btn ghost" data-act="owner-new">Agregar dueño</button></div></section>';
  h+=cardsCatsBlock()+backupBlock()+(window.lockBlock?window.lockBlock():'');
  return h;
}
function viewRend(){
  const yAccs=liveAccs().filter(a=>a.yields);
  if(!yAccs.length) return '<div class="empty"><h2>Ninguna cuenta rinde todavía</h2><p>Editá una cuenta y marcá «Genera rendimientos diarios» para poder actualizar su saldo y ver cuánto rinde.</p></div>';
  const today=todayStr(), mp=today.slice(0,7), d30=addDays(today,-29);
  const anySplit=S.movs.some(m=>m.split&&Object.keys(m.split).some(k=>k!=='yo'));
  const cards=yAccs.map(a=>{
    const ys=S.movs.filter(m=>m.type==='yield'&&m.account===a.id), ly=ys[ys.length-1];
    const mo=sumC(ys.filter(m=>m.date.startsWith(mp)));
    const mine=ys.filter(m=>m.date.startsWith(mp)).reduce((s,m)=>s+ownerShare(m,'yo'),0);
    const k=ly?yieldMetrics(ly):null;
    return '<div class="ycard"><h3>'+esc(accLabel(a))+'</h3><div class="eyebrow">Este mes</div><div class="figure">'+amt(signed(mo,a.cur),cls(mo))+'</div><dl>'
      +(anySplit?'<dt>Tu parte este mes</dt><dd>'+amt(signed(mine,a.cur),cls(mine))+'</dd>':'')
      +'<dt>Últimos 30 días</dt><dd>'+amt(signed(sumC(ys.filter(m=>m.date>=d30)),a.cur),'')+'</dd>'
      +'<dt>Acumulado</dt><dd>'+amt(signed(sumC(ys),a.cur),'')+'</dd>'
      +'<dt>Último</dt><dd>'+(ly?fmtDate(ly.date,true):'—')+'</dd>'
      +'<dt>TNA aprox.</dt><dd>'+(k&&k.tna!=null?amt(pf.format(k.tna*100)+'%'):'—')+'</dd></dl></div>';
  }).join('');
  const hasU=yAccs.some(a=>a.cur==='USD');
  if(S.chartAcc==='__usd'&&!hasU) S.chartAcc='';
  if(S.chartAcc&&S.chartAcc!=='__usd'&&!yAccs.some(a=>a.id===S.chartAcc)) S.chartAcc='';
  const chartCur=S.chartAcc==='__usd'?'USD':(S.chartAcc?curOf(S.chartAcc):'ARS');
  const ids=new Set(S.chartAcc==='__usd'?yAccs.filter(a=>a.cur==='USD').map(a=>a.id):S.chartAcc?[S.chartAcc]:yAccs.filter(a=>a.cur!=='USD').map(a=>a.id));
  const chips='<div class="chips"><button class="chip" data-act="chart" data-id="" aria-pressed="'+(!S.chartAcc)+'">'+(hasU?'Todas en pesos':'Todas')+'</button>'
    +(hasU?'<button class="chip" data-act="chart" data-id="__usd" aria-pressed="'+(S.chartAcc==='__usd')+'">Todas en dólares</button>':'')
    +yAccs.map(a=>'<button class="chip" data-act="chart" data-id="'+esc(a.id)+'" aria-pressed="'+(S.chartAcc===a.id)+'">'+esc(accLabel(a))+'</button>').join('')+'</div>';
  const recent=S.movs.filter(m=>m.type==='yield'&&(ids.has(m.account)||(!S.chartAcc&&yAccs.some(a=>a.id===m.account)))).slice(-12).reverse();
  let h='<div class="ycards">'+cards+'</div><h2 class="sec">Últimos 30 días</h2>'+chips+'<div class="chart-box">'+chartSvg(ids,chartCur)+'</div>';
  h+='<h2 class="sec">Últimos rendimientos</h2>';
  h+=recent.length?'<div class="list-head">'+recent.map(m=>movRow(m,null)).join('')+'</div>':'<div class="note">Todavía no cargaste rendimientos. Usá «Actualizar saldos».</div>';
  h+='<p class="muted" style="font-size:13px;margin:0">La TNA es una estimación: rendimiento dividido el saldo anotado, por los días desde la actualización anterior, llevado a 365 días.</p>';
  return h;
}

/* ----- Tarjetas ----- */
function cardsCatsBlock(){
  let h='<section><h2 class="sec">Mis tarjetas</h2><div class="list-head">'
    +S.cards.map(c=>'<div class="acc"><div><div class="acc-name">'+esc(c.name)+'</div></div><div class="acc-actions" style="margin:0"><button class="btn sm ghost" data-act="card-edit" data-id="'+esc(c.id)+'">Editar</button></div></div>').join('')
    +'</div><div style="margin-top:10px"><button class="btn ghost" data-act="card-new">Agregar tarjeta</button></div></section>';
  h+='<section><h2 class="sec">Categorías</h2><div class="chips">'+S.cats.map(c=>'<button class="chip" data-act="cat-edit" data-id="'+esc(c.id)+'" aria-pressed="false">'+esc(c.name)+'</button>').join('')+'</div>'
    +'<div style="margin-top:10px"><button class="btn ghost" data-act="cat-new">Agregar categoría</button></div>'
    +'<p class="muted" style="font-size:13px;margin:8px 0 0">La app aprende: cuando cambiás la categoría de un consumo, la usa para los próximos consumos del mismo comercio.</p></section>';
  return h;
}
function mgmtBlock(){
  let h='';
  if(S.stmts.length){
    h+='<section><h2 class="sec">Resúmenes cargados</h2><div class="list-head">'+S.stmts.slice().sort((a,b)=>a.period<b.period?1:-1).map(s=>{
      const l=S.exp.filter(e=>e.stmt===s.id);
      const acts=S.confirmS===s.id
        ?'<span>¿Eliminar el resumen y sus '+l.length+' consumos?</span><button class="link danger" data-act="stmt-del-yes" data-id="'+esc(s.id)+'">Sí, eliminar</button><button class="link" data-act="stmt-del-no">No</button>'
        :'<button class="link" data-act="stmt-month" data-id="'+esc(s.id)+'">Cambiar mes</button><button class="link danger" data-act="stmt-del-ask" data-id="'+esc(s.id)+'">Eliminar resumen</button>';
      return '<div class="mov"><div><div class="mov-t">'+esc(cardName(s.card))+' · '+esc(monthLabel(s.period))+'</div><div class="mov-s">'+l.length+' consumos</div></div><div class="mov-amt">'+amt(money(sumC(l.filter(e=>e.cur!=='USD'))))+(l.some(e=>e.cur==='USD')?'<div>'+amt(money(sumC(l.filter(e=>e.cur==='USD')),'USD'),'muted')+'</div>':'')+'</div><div class="mov-actions">'+acts+'</div></div>';
    }).join('')+'</div></section>';
  }
  return h;
}
function viewTarj(){
  if(!S.cards.length) return '<div class="empty"><h2>Cargá tus tarjetas</h2><p>Agregá tus tarjetas de crédito y subí los resúmenes para ver en qué se va la plata.</p><button class="btn primary" data-act="card-new">Agregar tarjeta</button></div>';
  let h='<div class="actions"><button class="btn primary" data-act="stmt-new">Cargar resumen</button><a class="btn ghost" href="#ajustes" style="text-decoration:none;display:inline-flex;align-items:center">Editar tarjetas y categorías</a></div>';
  if(!S.exp.length) return h+'<div class="note">Todavía no cargaste ningún resumen. Tocá <strong>Cargar resumen</strong>, pegá el texto del PDF y revisá los consumos.</div>'+mgmtBlock();
  const periods=Array.from(new Set(S.exp.map(e=>e.period))).sort().reverse();
  if(S.xPeriod!=='all'&&periods.indexOf(S.xPeriod)<0) S.xPeriod=periods[0];
  if(S.xCard&&!S.cards.some(c=>c.id===S.xCard)) S.xCard='';
  const scopedAll=S.exp.filter(e=>(S.xPeriod==='all'||e.period===S.xPeriod)&&(!S.xCard||e.card===S.xCard));
  const scoped=scopedAll.filter(e=>e.cur!=='USD'), scopedU=scopedAll.filter(e=>e.cur==='USD');
  const total=sumC(scoped), totalU=sumC(scopedU);
  const by=new Map(); scoped.forEach(e=>by.set(e.cat,(by.get(e.cat)||0)+e.cents));
  let prev=null;
  if(S.xPeriod!=='all'){
    const pp=prevPeriod(S.xPeriod), pe=S.exp.filter(e=>e.cur!=='USD'&&e.period===pp&&(!S.xCard||e.card===S.xCard));
    if(pe.length){ prev={p:pp,total:sumC(pe),by:new Map()}; pe.forEach(e=>prev.by.set(e.cat,(prev.by.get(e.cat)||0)+e.cents)); }
  }
  const delta=(cur,old)=>{ if(!prev||!(old>0)) return ''; const r=(cur-old)/old; return '<span class="'+(r>0?'neg':r<0?'pos':'muted')+'">'+spct(r)+' vs '+esc(monthShort(prev.p))+'</span>'; };
  h+='<div class="filters"><select data-filter="xPeriod" aria-label="Mes del resumen">'+periods.map(p=>opt(p,monthLabel(p),S.xPeriod===p)).join('')+opt('all','Todos los meses',S.xPeriod==='all')+'</select>'
    +'<select data-filter="xCard" aria-label="Tarjeta">'+opt('','Todas las tarjetas',!S.xCard)+S.cards.map(c=>opt(c.id,c.name,S.xCard===c.id)).join('')+'</select></div>';
  h+='<section class="total"><div class="eyebrow">Gastado en tarjetas</div><div class="big">'+amt(money(total))+'</div>'+(prev?'<div class="total-sub"><span>'+delta(total,prev.total)+'</span></div>':'')+(scopedU.length?'<div class="total-usd"><div class="eyebrow">Gastado en dólares</div><div class="usd-fig">'+amt(money(totalU,'USD'))+'</div></div>':'')+'</section>';
  let pend=0;
  S.cards.forEach(c=>{
    const ps=S.exp.filter(e=>e.card===c.id).map(e=>e.period).sort(); if(!ps.length) return;
    const last=ps[ps.length-1];
    S.exp.filter(e=>e.cur!=='USD'&&e.card===c.id&&e.period===last&&e.cuota&&e.cents>0).forEach(e=>{ const q=e.cuota.split('/'); if(+q[1]>+q[0]) pend+=(+q[1]-+q[0])*e.cents; });
  });
  if(pend>0) h+='<div class="note">Te quedan <strong>'+amt(money(pend))+'</strong> en cuotas por pagar, según el último resumen de cada tarjeta.</div>';
  const entries=Array.from(by.entries()).sort((a,b)=>b[1]-a[1]);
  const maxv=Math.max(1,...entries.map(x=>x[1]));
  h+='<section><h2 class="sec">En qué gastás</h2><div class="list-head">'+entries.map(x=>{
    const pctTxt=total>0?p0.format(x[1]/total*100)+'%':'';
    return '<button class="catrow" data-act="xcat" data-id="'+esc(x[0])+'" aria-pressed="'+(S.xCat===x[0])+'"><span class="cat-name">'+esc(catName(x[0]))+'</span><span class="cat-amt">'+amt(money(x[1]))+'</span>'
      +'<span class="cat-sub">'+pctTxt+(prev?' '+delta(x[1],prev.by.get(x[0])||0):'')+'</span><span class="bar"><i style="width:'+Math.max(0,x[1]/maxv*100).toFixed(1)+'%"></i></span></button>';
  }).join('')+'</div>'+(S.xCat?'<p class="muted" style="margin:6px 0 0;font-size:13px">Mostrando solo «'+esc(catName(S.xCat))+'». <button class="link" data-act="xcat" data-id="">Ver todo</button></p>':'')+'</section>';
  const lines=scopedAll.filter(e=>!S.xCat||e.cat===S.xCat).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
  h+='<section><h2 class="sec">Consumos</h2><div class="list-head">'+lines.slice(0,S.xLimit).map(e=>{
    const tags=esc(cardName(e.card))+(e.cuota?' · Cuota '+esc(e.cuota):'');
    const acts=S.confirmX===e.id
      ?'<span>¿Eliminar?</span><button class="link danger" data-act="xdel-yes" data-id="'+esc(e.id)+'">Sí</button><button class="link" data-act="xdel-no">No</button>'
      :'<select class="x-cat" data-xcat="'+esc(e.id)+'" aria-label="Categoría de '+esc(e.desc)+'">'+S.cats.map(c=>opt(c.id,c.name,c.id===e.cat)).join('')+'</select><button class="link danger" data-act="xdel-ask" data-id="'+esc(e.id)+'">Eliminar</button>';
    return '<div class="xrow"><div><div class="mov-t">'+esc(e.desc)+'</div><div class="mov-s"><span class="mono">'+fmtDate(e.date)+'</span> · '+tags+'</div></div><div class="mov-amt">'+amt(money(e.cents,e.cur),e.cents<0?'pos':'')+'</div><div class="x-act">'+acts+'</div></div>';
  }).join('')+'</div>'+(lines.length>S.xLimit?'<div style="margin-top:10px"><button class="btn ghost" data-act="xmore">Ver más ('+(lines.length-S.xLimit)+')</button></div>':'')+'</section>';
  return h+mgmtBlock();
}

const qtyNf=new Intl.NumberFormat('es-AR',{maximumFractionDigits:6});
const qtyFmt=n=>qtyNf.format(n);
const pxNf=new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:6});
const pxFmt=(v,cur)=>(cur==='USD'?'US$ ':'$ ')+pxNf.format(v);
const holdById=id=>S.hlds.find(h=>h.id===id);
const r2=n=>Math.round(n*1e6)/1e6; /* 6 decimales: las cuotapartes no son enteras */
const holdQty=h=>r2(S.ops.filter(o=>o.hold===h.id).reduce((t,o)=>t+(o.type==='buy'?o.qty:-o.qty),h.initial||0));
const holdQtyOwner=(h,oid)=>r2(S.ops.filter(o=>o.hold===h.id&&(o.owner||'yo')===oid).reduce((t,o)=>t+(o.type==='buy'?o.qty:-o.qty),(h.iowner||'yo')===oid?(h.initial||0):0));
const holdCobros=h=>S.movs.filter(m=>m.hold===h.id&&m.type==='yield');
const canDelHold=h=>!S.ops.some(o=>o.hold===h.id)&&!holdCobros(h).length;
const lastPx=h=>{ const l=h.px||[]; return l.length?l[l.length-1]:null; };
const holdCur=h=>h.cur==='USD'?'USD':'ARS';
/* Cantidad, valor y costo promedio (de un dueño, o de todos si oid está vacío). Solo los fondos (cuotapartes) se valúan. */
function holdStats(h,oid){
  const px=lastPx(h); let q=0, c=0, known=true;
  if(!oid||oid===(h.iowner||'yo')){ q+=h.initial||0; if(h.initial){ if(h.initialPx>0) c+=h.initial*h.initialPx; else known=false; } }
  S.ops.filter(o=>o.hold===h.id&&(!oid||(o.owner||'yo')===oid)).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:((a.createdAt||0)-(b.createdAt||0))).forEach(o=>{
    if(o.type==='buy'){ q+=o.qty; if(o.price>0) c+=o.qty*o.price; else known=false; }
    else{ const f=q>0?Math.min(1,o.qty/q):0; c-=c*f; q-=o.qty; }
  });
  q=r2(q);
  const fci=h.kind==='fci';
  return {qty:q,px:px,value:(fci&&px)?Math.round(q*px.v*100):0,cost:Math.round(c*100),known:known&&q>0&&fci&&!!px};
}
function invTotals(oid){
  const t={ARS:0,USD:0,costARS:0,costUSD:0,unknown:false};
  S.hlds.filter(h=>h.kind==='fci').forEach(h=>{ const s=holdStats(h,oid), c=holdCur(h); t[c]+=s.value; if(s.known) t['cost'+c]+=s.cost; else if(s.qty>0) t.unknown=true; });
  return t;
}
function gainTxt(value,cost,cur){
  if(!(cost>0)) return '';
  const g=value-cost;
  return '<span>Ganancia '+amt(signed(g,cur),cls(g))+' ('+spct(g/cost)+')</span>';
}
function pxAge(px){
  if(!px) return '';
  const d=daysBetween(px.date,todayStr());
  return d<=0?'<span class="pill ok">Valor de hoy</span>':'<span class="pill stale">Valor de hace '+d+(d===1?' día':' días')+'</span>';
}
function viewInv(){
  const hd=holdById(S.hd); if(S.hd&&!hd) S.hd='';
  if(hd) return viewHold(hd);
  const fo=S.owners.some(o=>o.id===S.iOwner)?S.iOwner:'';
  const yr=todayStr().slice(0,4), all=S.movs.filter(m=>m.hold&&m.type==='yield');
  const cv=m=>fo?ownerShare(m,fo):m.cents;
  const sum=l=>l.reduce((s,m)=>s+cv(m),0);
  let h='';
  if(S.owners.length>1) h+='<div class="chips" role="group" aria-label="De quién son">'+S.owners.slice().sort((a,b)=>(b.id==='yo')-(a.id==='yo')).map(o=>'<button class="chip" data-act="iown" data-id="'+esc(o.id)+'" aria-pressed="'+(fo===o.id)+'">'+esc(o.name)+'</button>').join('')+'<button class="chip" data-act="iown" data-id="" aria-pressed="'+(!fo)+'">Todo</button></div>';
  const T=invTotals(fo), funds=S.hlds.filter(x=>x.kind==='fci');
  if(funds.length){
    h+='<section class="total"><div class="eyebrow">Cuotapartes valuadas</div><div class="big">'+amt(money(T.ARS))+'</div>'
      +(T.USD?'<div class="total-sub"><span>'+amt(money(T.USD,'USD'))+'</span></div>':'')
      +'<div class="total-sub">'+gainTxt(T.ARS,T.costARS,'ARS')+gainTxt(T.USD,T.costUSD,'USD')+'</div>'
      +(T.unknown?'<p class="hint" style="margin:8px 0 0">Algunos fondos no tienen el precio de compra, así que no entran en la ganancia.</p>':'')+'</section>';
  }
  h+='<section class="usd-card"><div class="eyebrow">Cobrado en dólares</div><div class="usd-fig">'+amt(money(sum(all.filter(m=>m.date.startsWith(yr))),'USD'))+'</div><div class="total-sub" style="margin-top:2px"><span>en '+esc(yr)+'</span><span>Total '+amt(money(sum(all),'USD'))+'</span></div></section>';
  h+='<div class="actions"><button class="btn primary" data-act="op-new">Compra o venta</button><button class="btn" data-act="px-new">Actualizar valores</button><button class="btn" data-act="cobro-new">Registrar cobro</button><button class="btn ghost" data-act="hold-new">Nueva tenencia</button></div>';
  if(!S.hlds.length) return h+'<div class="note">Todavía no hay tenencias. Agregá un fondo de Balanz con su nombre (por ejemplo, Balanz Capital Money Market) o un bono por sus nominales.</div>';
  const list=S.hlds.filter(x=>!fo||holdStats(x,fo).qty!==0);
  h+='<div class="blist">'+list.map(x=>{
    const s=holdStats(x,fo), cb=holdCobros(x), last=cb[cb.length-1], c=holdCur(x);
    let sub, right;
    if(x.kind==='fci'){
      sub=s.px?'Cuotaparte '+pxFmt(s.px.v,c)+' · '+fmtDate(s.px.date,true)+' '+pxAge(s.px):'Falta cargar el valor de la cuotaparte';
      right='<span class="bam">'+amt(s.px?money(s.value,c):'—')+'<span class="alt">'+qtyFmt(s.qty)+' cuotapartes</span></span>';
    }else{
      sub=last?'Último cobro '+fmtDate(last.date,true):'Sin cobros cargados';
      right='<span class="bam">'+amt(qtyFmt(s.qty))+'<span class="alt">nominales</span></span>';
    }
    return '<div class="bank"><button data-act="hold-open" data-id="'+esc(x.id)+'"><span><span class="nm">'+esc(x.name)+'</span><span class="small muted" style="display:block">'+sub+'</span></span>'+right+CHEV+'</button></div>';
  }).join('')+'</div>';
  h+='<p class="an-note">Cada compra o venta se anota con su dueño. Si elegís una cuenta, la plata sale o entra de ahí y no cuenta como gasto. Los valores de cuotaparte los cargás vos cuando quieras ver cuánto valen.</p>';
  return h;
}
function opRow(o){
  const sel=S.selOp===o.id||S.confirmOp===o.id, x=holdById(o.hold), fci=x&&x.kind==='fci';
  const acts=S.confirmOp===o.id
    ?'<span>¿Eliminar esta operación?</span><button class="btn sm danger" data-act="op-del-yes" data-id="'+esc(o.id)+'">Sí, eliminar</button><button class="btn sm" data-act="op-del-no">No</button>'
    :'<button class="link" data-act="op-edit" data-id="'+esc(o.id)+'">Editar</button><button class="link danger" data-act="op-del-ask" data-id="'+esc(o.id)+'">Eliminar</button>';
  const ow=(o.owner||'yo')!=='yo'?' · <span class="pill own">'+esc(ownerName(o.owner))+'</span>':'';
  const pr=o.price>0?' · a '+esc(pxFmt(o.price,holdCur(x||{}))):'';
  return '<div class="mov'+(sel?' sel':'')+'" data-act="op-sel" data-id="'+esc(o.id)+'"><div><div class="mov-t">'+(o.type==='buy'?'Compra':'Venta')+'</div><div class="mov-s"><span class="mono">'+fmtDate(o.date)+'</span>'+pr+ow+(o.note?' · '+esc(o.note):'')+'</div></div><div class="mov-amt">'+amt((o.type==='buy'?'+':'−')+qtyFmt(o.qty))+(fci&&o.price>0?'<div class="mov-run">'+amt(money(Math.round(o.qty*o.price*100),holdCur(x)))+'</div>':'')+'</div>'+(sel?'<div class="mov-actions">'+acts+'</div>':'')+'</div>';
}
function viewHold(x){
  const cb=holdCobros(x), s=holdStats(x,''), c=holdCur(x), fci=x.kind==='fci';
  let h='<section class="total"><div class="eyebrow">'+(fci?'Cuotapartes':'Nominales')+'</div><div class="big">'+amt(qtyFmt(s.qty))+'</div>';
  if(fci){
    h+='<div class="total-sub"><span>Valen '+amt(s.px?money(s.value,c):'—')+'</span>'+(s.px?'<span>Cuotaparte '+amt(pxFmt(s.px.v,c))+'</span>':'')+'</div>';
    if(s.px) h+='<div class="total-sub">'+pxAge(s.px)+(s.known?gainTxt(s.value,s.cost,c):'')+'</div>';
    else h+='<p class="hint" style="margin:8px 0 0">Cargá el valor de la cuotaparte para ver cuánto vale.</p>';
  }
  h+='<div class="total-sub"><span>Cobrado '+amt(money(sumC(cb),'USD'))+'</span></div>';
  const owners=S.owners.map(o=>({o:o,s:holdStats(x,o.id)})).filter(z=>z.s.qty!==0);
  if(owners.length>1||(owners.length===1&&owners[0].o.id!=='yo')) h+='<div class="total-sub owners">'+owners.map(z=>'<span>'+esc(z.o.name)+' '+amt(qtyFmt(z.s.qty))+(fci&&z.s.px?' · '+amt(money(z.s.value,c)):'')+'</span>').join('')+'</div>';
  h+='</section>';
  h+='<div class="actions"><button class="btn primary" data-act="op-new" data-type="buy" data-hold="'+esc(x.id)+'">Compra</button><button class="btn" data-act="op-new" data-type="sell" data-hold="'+esc(x.id)+'">Venta</button>'+(fci?'<button class="btn" data-act="px-new" data-hold="'+esc(x.id)+'">Actualizar valor</button>':'')+'<button class="btn" data-act="cobro-new" data-hold="'+esc(x.id)+'">Registrar cobro</button><button class="btn ghost" data-act="hold-edit" data-id="'+esc(x.id)+'">Editar</button></div>';
  if(fci&&(x.px||[]).length){
    const ps=x.px.slice(-10).reverse();
    h+='<h2 class="sec" style="margin:4px 0 0">Valor de la cuotaparte</h2><div class="list-head">'+ps.map((p,i,arr)=>{
      const prev=x.px[x.px.length-1-i-1], d=prev&&prev.v>0?(p.v-prev.v)/prev.v:null;
      return '<div class="mov"><div><div class="mov-t">'+esc(pxFmt(p.v,c))+'</div><div class="mov-s"><span class="mono">'+fmtDate(p.date)+'</span></div></div><div class="mov-amt">'+(d!=null?amt(spct(d),cls(d)):'')+'</div></div>';
    }).join('')+'</div>';
  }
  const items=S.ops.filter(o=>o.hold===x.id).map(o=>({d:o.date,c:o.createdAt||0,h:opRow(o)})).concat(cb.map(m=>({d:m.date,c:m.createdAt||0,h:movRow(m,null)})));
  items.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:b.c-a.c);
  h+='<h2 class="sec" style="margin:4px 0 0">Historial</h2>';
  const ini=x.initial?'<div class="mov"><div><div class="mov-t">Tenencia inicial</div><div class="mov-s">'+esc(ownerName(x.iowner||'yo'))+' · antes de las operaciones cargadas</div></div><div class="mov-amt">'+amt(qtyFmt(x.initial))+'</div></div>':'';
  h+=(items.length||ini)?'<div class="list-head">'+items.map(i=>i.h).join('')+ini+'</div>':'<div class="note">Todavía no cargaste compras, ventas ni cobros.</div>';
  return h;
}
const TITLES={resumen:'Mis cuentas',movimientos:'Movimientos',rendimientos:'Rendimientos',tarjetas:'Tarjetas',analisis:'Análisis',ajustes:'Ajustes',mas:'Más',inversiones:'Inversiones',deudas:'Deudas entre dueños'};
const SUBTABS=['rendimientos','inversiones','deudas','tarjetas','ajustes'];
function render(){
  document.body.classList.toggle('hide',S.hide);
  const hb=$('#hidebtn'); hb.setAttribute('aria-pressed',String(S.hide)); const hl=S.hide?'Mostrar montos':'Ocultar montos'; hb.title=hl; hb.setAttribute('aria-label',hl);
  const sub=SUBTABS.indexOf(S.tab)>-1, inAcc=!!S.acc&&!!accById(S.acc), inHold=S.tab==='inversiones'&&!!S.hd&&!!holdById(S.hd);
  $('#ttl').textContent=inAcc?accLabel(accById(S.acc)):inHold?holdById(S.hd).name:TITLES[S.tab];
  const bk=$('#backbtn'); bk.hidden=!(sub||inAcc||inHold); bk.dataset.act=inAcc?'acc-back':inHold?'hold-back':'back'; bk.classList.toggle('only-phone',!inAcc&&!inHold);
  $('#lockc').hidden=!(S.tab==='resumen'&&!inAcc);
  const key=sub?'mas':S.tab;
  $$('[data-tab]').forEach(a=>{ const k=a.closest('#bnav')?key:S.tab; if(a.dataset.tab===k) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  const v=$('#view');
  if(S.error) v.innerHTML='<div class="empty"><h2>No se pudo abrir tu libro</h2><p>'+esc(S.error)+'</p></div>';
  else v.innerHTML=storeWarn()+(S.acc?viewCuenta():S.tab==='movimientos'?viewMovs():S.tab==='rendimientos'?viewRend():S.tab==='tarjetas'?viewTarj():S.tab==='analisis'?viewAnalisis():S.tab==='ajustes'?viewAjustes():S.tab==='mas'?viewMas():S.tab==='inversiones'?viewInv():S.tab==='deudas'?viewDeudas():viewResumen());
  const q=$('#mq'); if(q&&S.qf){ q.focus(); try{q.setSelectionRange(q.value.length,q.value.length)}catch(_){} }
  S.qf=false;
}

