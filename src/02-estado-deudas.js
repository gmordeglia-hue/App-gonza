/* ---------- Estado ---------- */
const S={accounts:[],movs:[],owners:[],cards:[],cats:[],rules:[],stmts:[],exp:[],hlds:[],ops:[],loans:[],claims:[],plans:[],hd:'',selOp:'',confirmOp:'',
  error:'',tab:'resumen',fAcc:'',fType:'',fMonth:'',fOwner:'',limit:100,chartAcc:'',
  xPeriod:'',xCard:'',xCat:'',xLimit:100,modal:null,confirmDel:'',confirmX:'',confirmS:'',hide:false,lastOwner:'yo',
  acc:'',selMov:'',open:{},rOwner:'yo',fQ:'',qf:false};
const byOrder=(a,b)=>((a.order||0)-(b.order||0))||String(a.name).localeCompare(String(b.name));
const liveAccs=()=>S.accounts.filter(a=>!a.archived).sort(byOrder);
const accById=id=>S.accounts.find(a=>a.id===id);
const curOf=id=>{const a=S.accounts.find(x=>x.id===id);return a&&a.cur==='USD'?'USD':'ARS'};
const accLabel=a=>a?((a.group&&a.group!==a.name?a.group+' · '+a.name:a.name)+(a.cur==='USD'&&!/US\$|dólar/i.test(a.name)?' (US$)':'')):'Cuenta eliminada';
const ownerName=id=>{const o=S.owners.find(x=>x.id===id);return o?o.name:'Otro'};
const catName=id=>{const c=S.cats.find(x=>x.id===id);return c?c.name:'Sin categorizar'};
const cardName=id=>{const c=S.cards.find(x=>x.id===id);return c?c.name:'Tarjeta eliminada'};

/* Las tarjetas de crédito no tienen saldo: lo que se anota en ellas es solo deuda de otros dueños y no mueve ningún saldo. */
const isCard=id=>{const a=S.accounts.find(x=>x.id===id);return !!a&&a.kind==='card'};
function effect(m,id){
  if(isCard(id)) return 0;
  if(m.type==='in'||m.type==='yield') return m.account===id?m.cents:0;
  if(m.type==='out') return m.account===id?-m.cents:0;
  if(m.type==='transfer') return (m.account===id?-m.cents:0)+(m.to===id?(m.toCents!=null?m.toCents:m.cents):0);
  return 0;
}
/* Cómo se reparte el efecto de un movimiento en una cuenta entre los dueños: [[dueño, importe], ...] */
function parts(m,id){
  if(isCard(id)) return [];
  const st=(m.settle&&m.settle[id]&&m.repay)?[[m.repay,m.settle[id]],[m.repayTo||'yo',-m.settle[id]]]:[];
  if(m.type==='transfer'){
    const o=m.owner||'yo', t=m.toOwner||o, r=[];
    if(m.account===id) r.push([o,-m.cents]);
    if(m.to===id) r.push([t,(m.toCents!=null?m.toCents:m.cents)]);
    return r;
  }
  const e=effect(m,id); if(e===0) return st;
  if(m.type==='yield'&&m.split) return st.concat(Object.keys(m.split).map(k=>[k,m.split[k]]));
  return st.concat([[m.owner||'yo',e]]);
}
function effectOwner(m,id,oid){ return parts(m,id).reduce((s,p)=>s+(p[0]===oid?p[1]:0),0); }
function ownerShare(m,oid){ return m.split?(m.split[oid]||0):(oid==='yo'?m.cents:0); }
const initOf=a=>a.initialOwners||{yo:a.initial||0};
function balance(a,upTo){
  if(a.kind==='card') return 0;
  let b=a.initial||0;
  for(const m of S.movs){ if(upTo&&m.date>upTo) continue; b+=effect(m,a.id); }
  return b;
}
function ownerBalances(a,upTo){
  const r={}; S.owners.forEach(o=>{r[o.id]=0});
  if(a.kind==='card') return r;
  const ini=initOf(a); for(const k in ini) r[k]=(r[k]||0)+ini[k];
  for(const m of S.movs){
    if(upTo&&m.date>upTo) continue;
    parts(m,a.id).forEach(p=>{ r[p[0]]=(r[p[0]]||0)+p[1]; });
  }
  return r;
}
/* ---------- Deudas entre dueños ----------
   Un egreso pagado con plata de A para B hace que B le deba a A.
   Una transferencia que cambia de dueño es una devolución (baja la deuda), un préstamo (la sube) o un aporte (no cambia nada).
   La deuda se cuenta por pareja de dueños y por moneda, sin importar en qué cuenta ocurrió. */
function debtLedger(){
  const d={ARS:{},USD:{}}, items=[];
  const add=(c,a,b,v,m,why)=>{ if(!v||a===b) return; d[c][a]=d[c][a]||{}; d[c][a][b]=(d[c][a][b]||0)+v; items.push({c:c,a:a,b:b,v:v,m:m,why:why}); };
  for(const m of S.movs){
    const c=curOf(m.account), o=m.owner||'yo';
    if(m.type==='in'&&m.repayFrom&&m.repayFrom!==o) add(c,m.repayFrom,o,-m.cents,m,'Devolución');
    else if(m.type==='out'&&m.for){ for(const k in m.for) if(k!==o) add(c,k,o,m.for[k],m,'Gasto'); }
    else if(m.type==='transfer'&&m.toOwner&&m.toOwner!==o){
      if(m.kind==='repay') add(c,o,m.toOwner,-m.cents,m,'Devolución');
      else if(m.kind==='loan') add(c,m.toOwner,o,m.cents,m,'Préstamo');
    }
  }
  S.claims.forEach(c=>{ const cur=c.cur==='USD'?'USD':'ARS'; add(cur,c.from,c.to,c.cents,c,c.cents<0?'Devolución anotada':'Deuda anotada'); });
  return {d:d,items:items};
}
function debtPairs(){
  const L=debtLedger(), out=[];
  ['ARS','USD'].forEach(c=>{
    const dd=L.d[c], ids=new Set();
    for(const a in dd){ ids.add(a); for(const b in dd[a]) ids.add(b); }
    const arr=Array.from(ids);
    for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++){
      const x=arr[i], y=arr[j], n=((dd[x]||{})[y]||0)-((dd[y]||{})[x]||0);
      if(n>0) out.push({c:c,debtor:x,creditor:y,cents:n});
      else if(n<0) out.push({c:c,debtor:y,creditor:x,cents:-n});
    }
  });
  return out.map(p=>Object.assign(p,{items:L.items.filter(it=>it.c===p.c&&((it.a===p.debtor&&it.b===p.creditor)||(it.a===p.creditor&&it.b===p.debtor)))}))
    .sort((a,b)=>b.cents-a.cents);
}
function posWeights(ob){ const w={}; for(const k in ob) if(ob[k]>0) w[k]=ob[k]; return w; }
function allocate(total,weights){
  const ids=Object.keys(weights).filter(k=>weights[k]>0);
  const sw=ids.reduce((s,k)=>s+weights[k],0);
  if(!ids.length||sw<=0) return {yo:total};
  const out={}; let acc=0;
  ids.forEach((k,i)=>{ if(i===ids.length-1) out[k]=total-acc; else{ const v=Math.round(total*weights[k]/sw); out[k]=v; acc+=v; } });
  return out;
}
function splitText(diff,ob,cur){
  const sp=allocate(diff,posWeights(ob)), ks=Object.keys(sp);
  if(ks.length<2) return '';
  return ks.map(k=>ownerName(k)+' '+signed(sp[k],cur)).join(' · ');
}
function lastYieldOf(id,upTo){
  for(let i=S.movs.length-1;i>=0;i--){
    const m=S.movs[i];
    if(m.type==='yield'&&m.account===id&&(!upTo||m.date<=upTo)) return m;
  }
  return null;
}
function yieldMetrics(m){
  if(!(m.base>0)) return null;
  const p=m.cents/m.base, d=m.days>=1?m.days:null;
  return {p:p,days:d,tna:d?p/d*365:null};
}
function nonzeroOwners(ob){ return S.owners.filter(o=>ob[o.id]).map(o=>({id:o.id,name:o.name,v:ob[o.id]})); }
function ownersBreak(ob,cur){
  const l=nonzeroOwners(ob);
  if(l.length>=2||(l.length===1&&l[0].id!=='yo')) return l.map(x=>esc(x.name)+' '+amt(money(x.v,cur),x.v<0?'neg':'')).join(' · ');
  return '';
}

