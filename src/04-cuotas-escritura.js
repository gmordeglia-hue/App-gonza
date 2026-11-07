/* ---------- Escritura ---------- */
function putAcc(id,data){ const i=S.accounts.findIndex(a=>a.id===id), o=Object.assign({id:id},data); if(i>-1) S.accounts[i]=o; else S.accounts.push(o); persist(); onData(); }
/* ---------- Gastos en cuotas: se cargan una vez y la app debita una cuota por mes ---------- */
function planDate(start,k){
  const y=+start.slice(0,4), mo=+start.slice(5,7)-1, dd=+start.slice(8,10), t=mo+k;
  const yy=y+Math.floor(t/12), mm=((t%12)+12)%12, dim=new Date(yy,mm+1,0).getDate();
  return yy+'-'+String(mm+1).padStart(2,'0')+'-'+String(Math.min(dd,dim)).padStart(2,'0');
}
/* Monto de la cuota k: el total dividido en partes iguales; la última ajusta los centavos. */
function planCuota(p,k){ if(p.total==null) return p.data.cents; const b=Math.floor(p.total/p.n); return k===p.n?p.total-b*(p.n-1):b; }
function applyPlans(){
  const today=todayStr(); let ch=false;
  S.plans.forEach(p=>{
    while(p.done<p.n){
      const dt=planDate(p.start,p.done); if(dt>today) break;
      p.done++; ch=true;
      const cq=planCuota(p,p.done), cd={cents:cq};
      if(p.data.for&&p.total!=null) cd.for=allocate(cq,p.data.for);
      S.movs.push(Object.assign({},p.data,cd,{id:newId(),date:dt,note:(p.data.note||'Compra')+' · cuota '+p.done+'/'+p.n,plan:p.id,createdAt:Date.now()+p.done}));
    }
  });
  const n=S.plans.length; S.plans=S.plans.filter(p=>p.done<p.n);
  if(ch||S.plans.length!==n) persist();
  return ch;
}
/* Aviso de Inicio: una vez por mes, si un dueño te debe cuotas de este mes y todavía no hubo devolución este mes. */
function planReminder(){
  const cm=todayStr().slice(0,7), P=debtPairs(); let h='';
  P.forEach((p,i)=>{
    const cur=p.items.filter(it=>it.a===p.debtor&&it.v>0&&it.m.plan&&it.m.date.slice(0,7)===cm);
    if(!cur.length) return;
    if(p.items.some(it=>it.a===p.debtor&&it.v<0&&!it.m.plan&&it.m.date.slice(0,7)===cm)) return;
    const sum=cur.reduce((s,it)=>s+it.v,0);
    h+='<div class="notice info"><span>'+esc(ownerName(p.debtor))+(p.creditor==='yo'?' te debe ':' le debe a '+esc(ownerName(p.creditor))+' ')+amt(money(sum,p.c))+' de cuotas de este mes. Acordate de hacer el pase.</span><button class="btn sm" data-act="debt-pay" data-id="'+i+'">Devolver</button></div>';
  });
  return h;
}
/* Aviso de Inicio desde el día 20: consumos de tarjeta (de este mes y del anterior) que otro dueño todavía te debe (la tarjeta se debita a fin de mes). */
function cardReminder(){
  const t=todayStr(), cm=t.slice(0,7), pm=addDays(cm+'-01',-1).slice(0,7); if(+t.slice(8,10)<20) return '';
  let h=''; debtPairs().forEach((p,i)=>{
    const cur=p.items.filter(it=>it.a===p.debtor&&it.v>0&&!it.m.plan&&isCard(it.m.account)&&it.m.date.slice(0,7)>=pm);
    if(!cur.length) return;
    if(p.items.some(it=>it.a===p.debtor&&it.v<0&&!it.m.plan&&it.m.date.slice(0,7)===cm)) return;
    const sum=cur.reduce((x,it)=>x+it.v,0);
    h+='<div class="notice info"><span>La tarjeta se debita a fin de mes. '+esc(ownerName(p.debtor))+(p.creditor==='yo'?' te debe ':' le debe a '+esc(ownerName(p.creditor))+' ')+amt(money(sum,p.c))+' de consumos de tarjeta.</span><button class="btn sm" data-act="debt-pay" data-id="'+i+'">Devolver</button></div>';
  });
  return h;
}
function plansBlock(){
  if(!S.plans.length) return '';
  return '<section><h2 class="sec">Cuotas en curso</h2><div class="list-head">'+S.plans.map(p=>{
    const next=planDate(p.start,p.done), cur=curOf(p.data.account);
    const acts=S.confirmPlan===p.id
      ?'<span>¿Cancelar las '+(p.n-p.done)+' cuotas que faltan?</span><button class="link danger" data-act="plan-yes" data-id="'+esc(p.id)+'">Sí</button><button class="link" data-act="plan-no">No</button>'
      :'<button class="link danger" data-act="plan-ask" data-id="'+esc(p.id)+'">Cancelar las que faltan</button>';
    return '<div class="mov"><div><div class="mov-t">'+esc(p.data.note||'Compra')+'</div><div class="mov-s">'+p.done+' de '+p.n+' debitadas · próxima el '+fmtDate(next)+' · '+esc(accLabel(accById(p.data.account)))+'</div></div><div class="mov-amt">'+amt(money(planCuota(p,Math.min(p.done+1,p.n)),cur))+'<div class="muted">por mes'+(p.total!=null?' · total '+amt(money(p.total,cur)):'')+'</div></div><div class="mov-actions">'+acts+'</div></div>';
  }).join('')+'</div></section>';
}
function putMov(id,data){
  if(id){ const i=S.movs.findIndex(m=>m.id===id), o=Object.assign({id:id},data); if(i>-1) S.movs[i]=o; else S.movs.push(o); }
  else S.movs.push(Object.assign({id:newId()},data));
  persist(); onData();
}
function delMov(id){ const t=S.movs.find(m=>m.id===id); S.movs=S.movs.filter(m=>m.id!==id&&!(t&&t.pair&&m.pair===t.pair)); persist(); onData(); }

