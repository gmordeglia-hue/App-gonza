// ARCHIVO ARMADO: no se edita a mano. Editá los archivos de la carpeta src y corré: python build.py
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const nf=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'});
const pf=new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
const p0=new Intl.NumberFormat('es-AR',{maximumFractionDigits:0});
const cf=new Intl.NumberFormat('es-AR',{notation:'compact',maximumFractionDigits:1});
const nfU=new Intl.NumberFormat('es-AR',{style:'currency',currency:'USD'});
const money=(c,cur)=>(cur==='USD'?nfU:nf).format(c/100);
const signed=(c,cur)=>(c>0?'+':'')+money(c,cur);
const spct=r=>(r>0?'+':'')+pf.format(r*100)+'%';
const pad=n=>String(n).padStart(2,'0');
const todayStr=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const toUTC=s=>{const p=s.split('-');return Date.UTC(+p[0],+p[1]-1,+p[2])};
const daysBetween=(a,b)=>Math.round((toUTC(b)-toUTC(a))/864e5);
const addDays=(s,n)=>{const t=new Date(toUTC(s)+n*864e5);return t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(t.getUTCDate())};
const fmtDate=(s,short)=>{const p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:short?undefined:'numeric'})};
const monthLabel=p=>{const x=p.split('-');return new Date(+x[0],+x[1]-1,1).toLocaleDateString('es-AR',{month:'long',year:'numeric'})};
const monthShort=p=>{const x=p.split('-');return new Date(+x[0],+x[1]-1,1).toLocaleDateString('es-AR',{month:'short'})};
const prevPeriod=p=>{let y=+p.slice(0,4),m=+p.slice(5,7)-1; if(m<1){m=12;y--} return y+'-'+pad(m)};
const amt=(txt,cls)=>'<span class="amt mono'+(cls?' '+cls:'')+'">'+txt+'</span>';
const cls=c=>c>0?'pos':c<0?'neg':'';
const sumC=l=>l.reduce((s,m)=>s+m.cents,0);

function parseNum(raw){
  let s=String(raw==null?'':raw).trim().replace(/[^\d.,-]/g,'');
  if(!/\d/.test(s)) return NaN;
  const neg=s.charAt(0)==='-'; s=s.replace(/-/g,'');
  const lc=s.lastIndexOf(','), ld=s.lastIndexOf('.');
  if(lc>-1&&ld>-1){ s = lc>ld ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,''); }
  else if(lc>-1){ s = (s.split(',').length>2) ? s.replace(/,/g,'') : s.replace(',','.'); }
  else if(ld>-1){ const p=s.split('.'); if(p.length>2||(p[p.length-1].length===3&&p[0]!=='0')) s=s.replace(/\./g,''); }
  const n=Number(s); if(!isFinite(n)) return NaN;
  return neg?-n:n;
}
function parseAmt(raw){ const n=parseNum(raw); return isNaN(n)?NaN:Math.round(n*100); }
const centsToInput=c=>(c/100).toFixed(2).replace('.',',');
const slug=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30)||'x';
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

/* ---------- Datos por defecto ---------- */
const SEED=[
  ['bbva-cuenta','BBVA','Cuenta',false,1],
  ['bbva-fondo-comun','BBVA','Fondo común',true,2],
  ['bbva-reservas','BBVA','Reservas',false,2.5],
  ['santander-cuenta','Santander','Cuenta',false,3],
  ['mercado-pago','Mercado Pago','Cuenta',true,4],
  ['mercado-pago-reservas','Mercado Pago','Reservas',false,4.4],
  ['naranja-x','Naranja X','Naranja X',true,5],
  ['efectivo','Efectivo','Efectivo',false,6],
  ['bbva-dolares','BBVA','Cuenta en dólares',false,1.5,'USD'],
  ['bbva-tarjeta','BBVA','Tarjeta de crédito',false,2.8,'ARS','card'],
  ['santander-tarjeta','Santander','Tarjeta de crédito',false,3.5,'ARS','card'],
  ['naranja-x-frasco','Naranja X','Frasco',true,5.5]
];
const SEED_V4=['bbva-dolares','bbva-tarjeta','santander-tarjeta','naranja-x-frasco'];
const SEED_V2=['bbva-reservas','mercado-pago-reservas'];
const SEED_V3=['efectivo'];
const seedAcc=x=>({id:x[0],group:x[1],name:x[2],cur:x[5]||'ARS',kind:x[6]||'',yields:x[3],initial:0,order:x[4],archived:false});
const DEFAULT_OWNERS=[{id:'yo',name:'Gonza'},{id:'catequesis',name:'Catequesis'},{id:'grupo-misionero',name:'Grupo misionero'},{id:'parroquia',name:'Parroquia'}];
const DEFAULT_CATS=[['super','Supermercado'],['comida','Comida y delivery'],['transporte','Transporte y combustible'],['servicios','Servicios y suscripciones'],['salud','Salud'],['hogar','Hogar'],['ropa','Ropa y calzado'],['entretenimiento','Entretenimiento'],['educacion','Educación'],['impuestos','Impuestos y cargos'],['regalos','Regalos y donaciones'],['otros','Otros'],['sin','Sin categorizar']];
/* Palabras clave: una palabra o frase exacta; con * al final coincide con el inicio de una palabra. */
const DEFAULT_RULES=[
  ['coto','super'],['carrefour','super'],['jumbo','super'],['disco','super'],['vea','super'],['dia','super'],['chango mas','super'],['changomas','super'],['la anonima','super'],['supermercado*','super'],['walmart','super'],['makro','super'],['verduleria*','super'],['carniceria*','super'],['panaderia*','super'],['dietetica*','super'],['almacen*','super'],
  ['rappi','comida'],['pedidos ya','comida'],['pedidosya','comida'],['mcdonald*','comida'],['burger king','comida'],['starbucks','comida'],['mostaza','comida'],['kfc','comida'],['resto*','comida'],['restaurant*','comida'],['cafe','comida'],['cafeteria*','comida'],['parrilla*','comida'],['pizzeria*','comida'],['heladeria*','comida'],['havanna','comida'],['grido','comida'],
  ['ypf','transporte'],['shell','transporte'],['axion','transporte'],['puma','transporte'],['estacion de servicio','transporte'],['uber','transporte'],['cabify','transporte'],['didi','transporte'],['sube','transporte'],['peaje*','transporte'],['autopista*','transporte'],['aerolineas*','transporte'],['flybondi','transporte'],['jetsmart','transporte'],['despegar','transporte'],['estacionamiento*','transporte'],['telepase','transporte'],
  ['netflix','servicios'],['spotify','servicios'],['google','servicios'],['youtube','servicios'],['apple','servicios'],['icloud','servicios'],['disney*','servicios'],['hbo','servicios'],['prime video','servicios'],['amazon prime','servicios'],['paramount','servicios'],['claude','servicios'],['anthropic','servicios'],['openai','servicios'],['chatgpt','servicios'],['telecentro','servicios'],['personal','servicios'],['movistar','servicios'],['claro','servicios'],['edenor','servicios'],['edesur','servicios'],['metrogas','servicios'],['aysa','servicios'],['fibertel','servicios'],['flow','servicios'],['directv','servicios'],['cablevision','servicios'],['telefonica','servicios'],['dropbox','servicios'],['microsoft','servicios'],['adobe','servicios'],['canva','servicios'],
  ['farmacia*','salud'],['farmacity','salud'],['swiss medical','salud'],['osde','salud'],['galeno','salud'],['medicus','salud'],['medife','salud'],['laboratorio*','salud'],['clinica*','salud'],['hospital*','salud'],['odontolog*','salud'],['optica*','salud'],
  ['easy','hogar'],['sodimac','hogar'],['ferreteria*','hogar'],['ikea','hogar'],['fravega','hogar'],['garbarino','hogar'],['musimundo','hogar'],['mueble*','hogar'],['colchon*','hogar'],
  ['zara','ropa'],['adidas','ropa'],['nike','ropa'],['topper','ropa'],['cuesta blanca','ropa'],['kevingston','ropa'],['cheeky','ropa'],['mimo','ropa'],['falabella','ropa'],['levis','ropa'],['lacoste','ropa'],['rapsodia','ropa'],
  ['cinemark','entretenimiento'],['hoyts','entretenimiento'],['village cines','entretenimiento'],['cine*','entretenimiento'],['teatro*','entretenimiento'],['steam','entretenimiento'],['playstation','entretenimiento'],['xbox','entretenimiento'],['nintendo','entretenimiento'],['ticketek','entretenimiento'],['allaccess','entretenimiento'],['eventbrite','entretenimiento'],
  ['colegio*','educacion'],['universidad*','educacion'],['udemy','educacion'],['coursera','educacion'],['instituto*','educacion'],['escuela*','educacion'],
  ['iva','impuestos'],['impuesto*','impuestos'],['percep*','impuestos'],['sellos','impuestos'],['sellado','impuestos'],['interes*','impuestos'],['comision*','impuestos'],['mantenimiento*','impuestos'],['iibb','impuestos'],['rg','impuestos'],['appypf*','transporte'],['combust*','transporte'],['corredores viale*','transporte'],['camino pque*','transporte'],['autopistas','transporte'],['aca central','transporte'],['emova','transporte'],['tuenti','servicios'],['seguro*','servicios'],['san cristobal','servicios'],['microsoft','servicios'],['ley 25413','impuestos'],['cargo*','impuestos']
];

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

/* ---------- Categorías automáticas ---------- */
const normDesc=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\b(merpago|mercadopago|dlo|dlocal)\b/g,' ').replace(/\s+/g,' ').trim();
function kwMatch(norm,kw){
  const pre=kw.charAt(kw.length-1)==='*', k=pre?kw.slice(0,-1):kw, hay=' '+norm+' ';
  return pre?hay.indexOf(' '+k)>-1:hay.indexOf(' '+k+' ')>-1;
}
function categorize(desc){
  const n=normDesc(desc); if(!n) return 'sin';
  const user=S.rules.slice().sort((a,b)=>b.k.length-a.k.length);
  for(const r of user){ if(kwMatch(n,r.k)&&S.cats.some(c=>c.id===r.cat)) return r.cat; }
  for(const r of DEFAULT_RULES){ if(kwMatch(n,r[0])&&S.cats.some(c=>c.id===r[1])) return r[1]; }
  return 'sin';
}
function learnKey(desc){
  const t=normDesc(desc).split(' ').filter(x=>x.length>=3&&!/^\d+$/.test(x));
  return t.slice(0,2).join(' ');
}
function learnRule(desc,cat){
  const k=learnKey(desc); if(!k||cat==='sin') return null;
  S.rules=S.rules.filter(r=>r.k!==k); S.rules.push({k:k,cat:cat}); return k;
}

/* ---------- Lector de resúmenes ---------- */
const MONTHS={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,set:9,oct:10,nov:11,dic:12};
const MONEY_RE=/-?\$?\s*\d[\d.]*,\d{2}-?/g;
function resolveDate(d,m,y,period){
  const py=+period.slice(0,4), pm=+period.slice(5,7);
  if(!(m>=1&&m<=12&&d>=1&&d<=31)) return '';
  let yy;
  if(y){ yy=+y; if(yy<100) yy+=2000; } else yy=(m>pm)?py-1:py;
  return yy+'-'+pad(m)+'-'+pad(d);
}
const noAcc=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function parseStatement(text,period){
  const rows=[]; let inSec=false, lastDate=''; const hasHdr=/^fecha\s+descripci/m.test(noAcc(String(text)).replace(/[ \t]+/g,' ').split(/\r?\n/).map(s=>s.trim()).join('\n'));
  String(text).split(/\r?\n/).forEach(raw=>{
    const line=raw.replace(/[;\t]+/g,' ').replace(/\s+/g,' ').trim();
    const nl0=noAcc(line);
    if(/^fecha\s+descripci/.test(nl0)){ inSec=true; lastDate=''; return; }
    if(/^(subtotal|total a pagar|total consumos|total consumido|saldo del resumen|saldo actual|minimo a pagar|copia fiel|terminos|legales)/.test(nl0)){ inSec=false; return; }
    if(line.length<8) return;
    let cuota=''; const cm=line.match(/\b(?:c|cta|cuota)\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/i);
    if(cm&&+cm[1]<=+cm[2]&&+cm[2]>1) cuota=(+cm[1])+'/'+(+cm[2]);
    const base=cm?line.replace(cm[0],' ').replace(/\s+/g,' ').trim():line;
    let date='', dstr='';
    const dm=base.match(/(?<![\d,.])(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}|\d{2}))?(?![\d,]|\.\d)/);
    if(dm){ date=resolveDate(+dm[1],+dm[2],dm[3],period); dstr=dm[0]; }
    else{
      const nl=base.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      const mm=nl.match(/(?<!\d)(\d{1,2})[ \-\/]?(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?(?:[ \-\/,]*(\d{4}|\d{2})(?!\d))?/);
      if(mm){ date=resolveDate(+mm[1],MONTHS[mm[2]],mm[3],period); dstr=base.substr(mm.index,mm[0].length); }
    }
    if(hasHdr&&!inSec) return;
    if(date) lastDate=date;
    else if(inSec&&lastDate&&/^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(line)){ date=lastDate; dstr=''; }
    if(!date) return;
    const ams=(line.match(MONEY_RE)||[]).map(t=>{ const neg=/^-/.test(t)||/-$/.test(t); const c=parseAmt(t.replace(/-/g,'')); return {t:t,c:isNaN(c)?0:(neg?-c:c)}; }).filter(a=>a.c!==0);
    if(!ams.length) return;
    const chosen=ams[ams.length-1];
    let cents=chosen.c;
    const norm=line.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    if(/bonif|devol|reintegro|anulacion|credito a favor/.test(norm)&&cents>0) cents=-cents;
    let desc=base;
    if(dstr) desc=desc.replace(dstr,' ');
    ams.forEach(a=>{desc=desc.replace(a.t,' ')});
    desc=desc.replace(MONEY_RE,' ').replace(/\b\d{5,}\*?/g,' ').replace(/\s-?\d{1,3}(?:-\d{1,3})+(?=\s|$)/g,' ').replace(/[()%]/g,' ').replace(/[$*]+/g,' ').replace(/\s+/g,' ').replace(/^[\s\-.,:]+|[\s\-.,:]+$/g,'');
    if(desc.length<2) desc='Consumo';
    const skip=/su pago|pago recibido|pago de resumen|saldo anterior|saldo actual|pago minimo|total consumos|total a pagar/.test(norm);
    const usd=/usd\s*\d|u\$s/.test(norm)&&!skip;
    if(usd) desc=desc.replace(/usd|u\$s/ig,' ').replace(/\s+/g,' ').trim()||'Consumo en dólares';
    const auto=categorize(desc);
    rows.push({inc:!skip,date:date,desc:desc,amtStr:centsToInput(cents),cents:cents,cat:auto,auto:auto,cuota:cuota,usd:usd,rg:/5617/.test(norm)&&cents>0,flag:skip?'Parece un pago o un total: no se importa si lo dejás sin marcar.':''});
  });
  return rows;
}
function stmtMeta(text){
  const t=String(text), m={}, MO={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,set:9,oct:10,nov:11,dic:12};
  let r=t.match(/cierre actual[^\n]*\n\s*(\d{1,2})-([A-Za-z]{3})-(\d{2})/i);
  const dayBefore=(y,mo,d)=>{ const x=new Date(Date.UTC(y,mo-1,d-1)); return x.getUTCFullYear()+'-'+pad(x.getUTCMonth()+1); };
  if(r&&MO[r[2].toLowerCase()]) m.period=dayBefore(2000+(+r[3]),MO[r[2].toLowerCase()],+r[1]);
  if(!m.period){ r=t.match(/^\s*\d\d\/\d\d\/\d\d\s+\d\d\/\d\d\/\d\d\s+(\d\d)\/(\d\d)\/(\d\d)\s+\d\d\/\d\d\/\d\d\s+\d\d\/\d\d\/\d\d\s+\d\d\/\d\d\/\d\d\s*$/m); if(r) m.period=dayBefore(2000+(+r[3]),+r[2],+r[1]); }
  r=t.match(/^\s*saldo actual\s+\$?\s*(\d[\d.]*,\d{2})/im)||t.match(/^\s*total a pagar\s+\$\s*(\d[\d.]*,\d{2})/im);
  if(r) m.total=r[1];
  r=t.match(/^\s*saldo actual\s+\$?\s*\d[\d.]*,\d{2}\s+(\d[\d.]*,\d{2})\s*$/im)||t.match(/^\s*total a pagar\s+\$\s*\d[\d.]*,\d{2}\s+u\$s\s*(\d[\d.]*,\d{2})/im);
  if(r) m.totalUsd=r[1];
  if(/bbva/i.test(t)){ const c=S.cards.find(x=>/bbva/i.test(x.name)); if(c) m.card=c.id; }
  return m;
}
let pdfLibP=null;
function loadPdfJs(){
  if(pdfLibP) return pdfLibP;
  pdfLibP=new Promise((res,rej)=>{
    try{
      if(!window.pdfjsLib){ const s=document.createElement('script'); s.textContent=document.getElementById('pdf-lib').textContent; document.head.appendChild(s); }
      const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
      if(!lib) throw new Error('sin lector');
      lib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([document.getElementById('pdf-worker').textContent],{type:'text/javascript'}));
      res(lib);
    }catch(e){ rej(e); }
  });
  pdfLibP.catch(()=>{ pdfLibP=null; });
  return pdfLibP;
}
async function pdfToText(lib,data){
  const doc=await lib.getDocument({data:data}).promise, out=[];
  for(let p=1;p<=doc.numPages;p++){
    const tc=await (await doc.getPage(p)).getTextContent(), rows=[];
    tc.items.forEach(it=>{
      if(!it.str||!it.str.trim()) return;
      const x=it.transform[4], y=it.transform[5];
      let r=rows.find(r=>Math.abs(r.y-y)<=2.5);
      if(!r){ r={y:y,it:[]}; rows.push(r); }
      r.it.push({x:x,s:it.str});
    });
    rows.sort((a,b)=>b.y-a.y).forEach(r=>{ r.it.sort((a,b)=>a.x-b.x); out.push(r.it.map(i=>i.s.trim()).join(' ').replace(/\s+/g,' ')); });
    out.push('');
  }
  return out.join('\n');
}
function readPdfFile(f){
  const err=$('#s-err'); if(err) err.textContent='Leyendo el PDF…';
  const fr=new FileReader();
  fr.onerror=()=>{ if($('#s-err')) $('#s-err').textContent='No pude abrir ese archivo.'; };
  fr.onload=()=>{
    loadPdfJs().then(lib=>pdfToText(lib,new Uint8Array(fr.result))).then(txt=>{
      if(!S.modal||S.modal.kind!=='stmt'||!$('#s-text')) return;
      const e=$('#s-err');
      if(txt.replace(/\s/g,'').length<60){ e.textContent='Este PDF no tiene texto que se pueda leer (puede ser una foto). Probá copiar y pegar el texto, o «Cargar a mano».'; return; }
      $('#s-text').value=txt;
      const m=stmtMeta(txt);
      if(m.card) $('#s-card').value=m.card;
      if(m.period) $('#s-period').value=m.period;
      if(m.total) $('#s-total').value=m.total;
      if(S.modal) S.modal.totalUsdStr=m.totalUsd||'';
      e.textContent=''; const hh=$('#s-pdfok'); if(hh) hh.textContent='PDF leído. Revisá el mes y tocá Analizar.';
    }).catch(e=>{
      const el=$('#s-err'); if(!el) return;
      el.textContent=(e&&e.name==='PasswordException')?'El PDF tiene contraseña. Abrilo, copiá el texto y pegalo acá.':'No pude leer ese PDF. Probá copiar y pegar el texto.';
    });
  };
  fr.readAsArrayBuffer(f);
}
const blankRow=period=>({inc:true,date:todayStr().indexOf(period)===0?todayStr():period+'-01',desc:'',amtStr:'',cents:NaN,cat:'sin',auto:'sin',cuota:'',flag:''});

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

/* ---------- Ventanas ---------- */
function accOptions(sel,extra){
  const ids=new Set(liveAccs().map(a=>a.id)); (extra||[]).forEach(i=>i&&ids.add(i));
  return S.accounts.filter(a=>ids.has(a.id)).sort(byOrder).map(a=>'<option value="'+esc(a.id)+'"'+(a.id===sel?' selected':'')+'>'+esc(accLabel(a))+'</option>').join('');
}
function ownOpts(sel){ return S.owners.map(o=>opt(o.id,o.name,o.id===sel)).join(''); }
function bestAcc(owner,cur){
  let best='',bv=0;
  liveAccs().forEach(a=>{ if(a.kind==='card'||curOf(a.id)!==cur) return; const v=ownerBalances(a)[owner]||0; if(v>bv){ bv=v; best=a.id; } });
  return best;
}
function viewDeudas(){
  const P=debtPairs();
  const addBtn='<div class="actions"><button class="btn" data-act="claim-new">Anotar deuda o devolución a mano</button></div>';
  if(!P.length) return '<div class="empty"><h2>Nadie le debe a nadie</h2><p>Cuando pagues algo de otro dueño, o algo tuyo con plata de otro, cargalo como egreso eligiendo «¿Para quién es el gasto?». Acá vas a ver cuánto se deben en total, sumando todas las cuentas, y desde acá podés devolverlo de una vez.</p></div>'+addBtn;
  const pos={ARS:{},USD:{}};
  P.forEach(p=>{ pos[p.c][p.debtor]=(pos[p.c][p.debtor]||0)-p.cents; pos[p.c][p.creditor]=(pos[p.c][p.creditor]||0)+p.cents; });
  let h='<section class="total"><div class="eyebrow">Cómo está cada uno</div>';
  ['ARS','USD'].forEach(c=>{
    const ids=Object.keys(pos[c]); if(!ids.length) return;
    h+='<div class="debt-pos">'+ids.sort((a,b)=>pos[c][b]-pos[c][a]).map(k=>{ const v=pos[c][k]; return '<div class="debt-h"><span>'+esc(ownerName(k))+'</span><span>'+(v>0?'le deben ':'debe ')+amt(money(Math.abs(v),c),v>0?'pos':'neg')+'</span></div>'; }).join('')+'</div>';
  });
  h+='</section>'+addBtn+'<h2 class="sec" style="margin:4px 0 0">Entre quiénes</h2>';
  P.forEach((p,i)=>{
    h+='<div class="debt"><div class="debt-h"><span><b>'+esc(ownerName(p.debtor))+'</b> le debe a <b>'+esc(ownerName(p.creditor))+'</b></span><b>'+amt(money(p.cents,p.c))+'</b></div>'
      +'<div class="mov-actions"><button class="btn sm primary" data-act="debt-pay" data-id="'+i+'">Devolver</button><button class="btn sm" data-act="debt-csv" data-id="'+i+'">Excel</button><button class="btn sm" data-act="debt-pdf" data-id="'+i+'">PDF / Imprimir</button></div>'
      +'<details><summary class="muted">De dónde sale</summary><div class="list-head">'
      +p.items.slice().sort((a,b)=>a.m.date<b.m.date?1:-1).map(it=>{ const v=it.a===p.debtor?it.v:-it.v; const man=!!it.m.src;
        return '<div class="mov"><div><div class="mov-t">'+esc(it.m.note||it.why)+'</div><div class="mov-s"><span class="mono">'+fmtDate(it.m.date)+'</span> · '+it.why+' · '+(man?'anotado a mano':esc(accLabel(accById(it.m.account))))+'</div></div><div class="mov-amt">'+amt(signed(v,p.c),v>0?'neg':'pos')+'</div>'
        +(man?'<div class="mov-actions"><button type="button" class="link danger" data-act="claim-del" data-id="'+esc(it.m.id)+'">Eliminar</button></div>':'')+'</div>'; }).join('')
      +'</div></details></div>';
  });
  h+='<p class="an-note">«Devolver» abre una transferencia ya armada: elegís de qué cuenta sale la plata de quien debe y en cuál entra la de quien cobra (puede ser la misma cuenta). Podés devolver de a partes. Si la devolución ya pasó por fuera de la app, anotala a mano.</p>';
  return h;
}
/* Informe de una deuda: Excel (CSV con punto y coma, abre directo en Excel) o PDF desde Imprimir. */
function debtRows(p){ return p.items.slice().sort((a,b)=>a.m.date<b.m.date?-1:1).map(it=>({date:it.m.date,note:it.m.note||it.why,acc:it.m.src?'Anotado a mano':accLabel(accById(it.m.account)),why:it.why,v:it.a===p.debtor?it.v:-it.v})); }
function debtCsv(i){
  const p=debtPairs()[i]; if(!p) return;
  const q=x=>'"'+String(x).replace(/"/g,'""')+'"', n=v=>(v/100).toFixed(2).replace('.',',');
  const L=[['Fecha','Detalle','Cuenta','Tipo','Importe']].concat(debtRows(p).map(r=>[r.date,r.note,r.acc,r.why,n(r.v)]));
  L.push(['','','','TOTAL que '+ownerName(p.debtor)+' le debe a '+ownerName(p.creditor),n(p.cents)]);
  const csv='\ufeff'+L.map(r=>r.map(q).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download='deuda-'+slug(ownerName(p.debtor))+'-'+todayStr()+'.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast('Excel descargado');
}
function debtPrint(i){
  const p=debtPairs()[i]; if(!p) return;
  const rows=debtRows(p).map(r=>'<tr><td>'+fmtDate(r.date)+'</td><td>'+esc(r.note)+'</td><td>'+esc(r.acc)+'</td><td>'+esc(r.why)+'</td><td class="r">'+money(r.v,p.c)+'</td></tr>').join('');
  const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Detalle de deuda</title><style>@page{size:A4;margin:16mm}body{font:13px/1.4 Arial,sans-serif;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;color:#444}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ccc;padding:6px 4px;text-align:left}th{background:#eee}.r{text-align:right;white-space:nowrap}tfoot td{font-weight:bold;border-top:2px solid #111}</style></head><body><h1>'+esc(ownerName(p.debtor))+' le debe a '+esc(ownerName(p.creditor))+'</h1><p>Detalle al '+fmtDate(todayStr())+'</p><table><thead><tr><th>Fecha</th><th>Detalle</th><th>Cuenta</th><th>Tipo</th><th class="r">Importe</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td colspan="4">Total</td><td class="r">'+money(p.cents,p.c)+'</td></tr></tfoot></table></body></html>';
  const w=window.open('','_blank'); if(!w){ toast('El navegador bloqueó la ventana. Permitila e intentá de nuevo.'); return; }
  w.document.open(); w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(_){} },400);
}
function claimModal(){
  const os=S.owners;
  return '<form id="clform" class="sheet" novalidate><h2>Deuda o devolución a mano</h2>'
    +'<p class="hint">Sirve para lo que no pasó por ninguna cuenta de la app: una deuda de antes, o una devolución que ya se hizo por fuera.</p>'
    +'<fieldset class="seg"><legend class="muted" style="position:absolute;left:-9999px">Qué anotás</legend><label><input type="radio" name="cl-kind" value="add" checked><span>Suma deuda</span></label><label><input type="radio" name="cl-kind" value="sub"><span>Resta deuda</span></label></fieldset>'
    +'<label for="cl-from">Quién debe</label><select id="cl-from">'+os.map((o,i)=>opt(o.id,o.name,i===1||os.length===1)).join('')+'</select>'
    +'<label for="cl-to">A quién le debe</label><select id="cl-to">'+os.map(o=>opt(o.id,o.name,o.id==='yo')).join('')+'</select>'
    +'<label for="cl-amt">Monto</label><input id="cl-amt" inputmode="decimal" autocomplete="off" placeholder="0,00" data-focus>'
    +'<label for="cl-cur">Moneda</label><select id="cl-cur">'+opt('ARS','Pesos',true)+opt('USD','Dólares (US$)',false)+'</select>'
    +'<label for="cl-date">Fecha</label><input id="cl-date" type="date" value="'+todayStr()+'">'
    +'<label for="cl-note">Detalle (opcional)</label><input id="cl-note" maxlength="120" autocomplete="off">'
    +'<p class="err" id="cl-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
function saveClaim(){
  const err=$('#cl-err'), cents=parseAmt($('#cl-amt').value), date=$('#cl-date').value, from=$('#cl-from').value, to=$('#cl-to').value;
  const sb=($('input[name=cl-kind]:checked')||{}).value==='sub';
  if(from===to){ err.textContent='Elegí dos dueños distintos.'; return; }
  if(isNaN(cents)||cents<=0){ err.textContent='Ingresá un monto mayor a cero.'; return; }
  if(!date){ err.textContent='Elegí una fecha.'; return; }
  S.claims.push({id:newId(),from:from,to:to,cur:$('#cl-cur').value==='USD'?'USD':'ARS',cents:sb?-cents:cents,date:date,note:$('#cl-note').value.trim(),src:'manual',createdAt:Date.now()});
  persist(); closeModal(); onData(); toast('Guardado');
}
function owes(a,b,cur){ const p=debtPairs().find(x=>x.c===cur&&x.debtor===a&&x.creditor===b); return p?p.cents:0; }
function movModal(m,pt,pa,pay){
  pay=pay||{};
  const isY=m&&m.type==='yield', type=m?m.type:(pt||'in');
  const seg=isY?'':'<fieldset class="seg"><legend class="muted" style="position:absolute;left:-9999px">Tipo</legend>'
    +[['in','Ingreso'],['out','Egreso'],['transfer','Transferencia']].map(t=>'<label><input type="radio" name="mtype" value="'+t[0]+'"'+(type===t[0]?' checked':'')+'><span>'+t[1]+'</span></label>').join('')+'</fieldset>';
  const first=liveAccs()[0];
  const sel=m?m.account:(pay.from||((pa&&accById(pa)&&!accById(pa).archived)?pa:(first&&first.id)));
  const ownSel=m?(m.owner||'yo'):(pay.owner||S.lastOwner);
  const toOwnSel=m?(m.toOwner||ownSel):(pay.toOwner||ownSel);
  const kindSel=m?(m.kind||''):(pay.kind||'');
  const fm=m&&m.for?m.for:null, fk=fm?Object.keys(fm):[];
  const forSel=fk.length>1?'__multi':(fk.length===1?fk[0]:'');
  const repSel=m?(m.repayFrom||''):(pay.repayFrom||'');
  const toSel=m?(m.to||''):(pay.to||'');
  const amtVal=m?centsToInput(m.cents):(pay.cents>0?centsToInput(pay.cents):'');
  /* Una transferencia es entre cuentas (la plata sigue siendo del mismo dueño) o entre dueños (cambia de dueño). */
  const modeSel=(m?(m.toOwner&&m.toOwner!==(m.owner||'yo')):(pay.mode==='own'||!!(pay.toOwner&&pay.toOwner!==ownSel)))?'own':'acc';
  const modeSeg=isY?'':'<fieldset class="seg" id="mode-wrap" hidden><legend class="muted" style="position:absolute;left:-9999px">Qué se pasa</legend>'
    +[['acc','Entre cuentas'],['own','Entre dueños']].map(t=>'<label><input type="radio" name="mmode" value="'+t[0]+'"'+(modeSel===t[0]?' checked':'')+'><span>'+t[1]+'</span></label>').join('')+'</fieldset>';
  const own=isY?'':'<label for="m-own" id="m-own-l">Con plata de quién</label><select id="m-own">'+ownOpts(ownSel)+'</select>';
  const trBlock=isY?'':'<div id="tr-wrap" hidden><label for="m-toown">Pasa a ser plata de</label><select id="m-toown">'+ownOpts(toOwnSel)+'</select>'
    +'<div id="kind-wrap" hidden><label for="m-kind">¿Qué significa?</label><select id="m-kind">'+opt('repay','Devolución de una deuda',kindSel==='repay')+opt('loan','Préstamo (me lo tiene que devolver)',kindSel==='loan')+opt('gift','Aporte, sin deuda',kindSel==='gift')+'</select></div></div>';
  const forBlock=isY?'':'<div id="for-wrap" hidden><label for="m-for">¿Para quién es el gasto?</label><select id="m-for">'+opt('','Para el mismo dueño de la plata',!forSel)+S.owners.map(o=>opt(o.id,o.name,forSel===o.id)).join('')+opt('__multi','Repartir entre varios…',forSel==='__multi')+'</select>'
    +'<div id="for-multi" hidden>'+S.owners.map(o=>'<label class="fo-row"><span>'+esc(o.name)+'</span><input data-fo="'+esc(o.id)+'" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+(fm&&fm[o.id]?centsToInput(fm[o.id]):'')+'"></label>').join('')+'</div></div>';
  const repBlock=isY?'':'<div id="rep-wrap" hidden><label for="m-repay">¿Es una devolución de una deuda?</label><select id="m-repay">'+opt('','No, es plata que entra',!repSel)+S.owners.map(o=>opt(o.id,'Sí, me la devuelve '+o.name,repSel===o.id)).join('')+'</select></div>';
  return '<form id="mform" class="sheet" novalidate><h2>'+(m?(isY?'Editar rendimiento':'Editar movimiento'):'Nuevo movimiento')+'</h2>'+seg+modeSeg
    +'<label for="m-acc" id="m-acc-l">Cuenta</label><select id="m-acc">'+accOptions(sel,m?[m.account]:[])+'</select>'
    +'<div id="to-wrap" hidden><label for="m-to">Hacia</label><select id="m-to">'+accOptions(toSel,m&&m.to?[m.to]:[])+'</select></div>'
    +own+trBlock+forBlock+repBlock
    +'<label for="m-amt" id="m-amt-l">'+(isY?'Rendimiento (puede ser negativo)':'Monto')+'</label><input id="m-amt" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+amtVal+'" data-focus>'
    +'<div id="amt2-wrap" hidden><label for="m-amt2" id="m-amt2-l">Monto que llega</label><input id="m-amt2" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+(m&&m.toCents!=null?centsToInput(m.toCents):'')+'"><p class="hint" id="m-rate"></p></div>'
    +(isY||m?'':'<div id="cq-wrap" hidden><label for="m-cuotas">¿En cuántas cuotas? (dejá 1 si es un solo pago)</label><input id="m-cuotas" inputmode="numeric" autocomplete="off" placeholder="1" value="1"><p class="hint">Poné arriba el monto <strong>total</strong> de la compra. La app lo divide por las cuotas: cada mes se debita (y se anota como deuda) solo la cuota de ese mes. La primera es en la fecha que elijas.</p><p class="hint" id="cq-pre"></p></div>')
    +'<label for="m-date">Fecha</label><input id="m-date" type="date" value="'+esc(m?m.date:todayStr())+'">'
    +'<label for="m-note">Detalle (opcional)</label><input id="m-note" maxlength="120" autocomplete="off" value="'+esc(m?m.note:'')+'">'
    +'<p class="hint" id="m-hint"></p>'
    +'<p class="err" id="m-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
const movMode=()=>{ const r=$('input[name=mmode]:checked'); return r?r.value:'acc'; };
function toggleTo(){
  const r=$('input[name=mtype]:checked'); const t=r?r.value:''; const tr=t==='transfer', byOwn=tr&&movMode()==='own';
  const w=$('#to-wrap'); if(!w) return; w.hidden=!tr;
  const mw=$('#mode-wrap'); if(mw) mw.hidden=!tr;
  const l=$('#m-acc-l'); if(l) l.textContent=byOwn?'Sale de la cuenta':tr?'Desde':'Cuenta';
  const tl=$('label[for=m-to]'); if(tl) tl.textContent=byOwn?'Entra en la cuenta (puede ser la misma)':'Hacia';
  const tw=$('#tr-wrap'); if(tw) tw.hidden=!byOwn;
  const fw=$('#for-wrap'); if(fw) fw.hidden=t!=='out';
  const cw=$('#cq-wrap'); if(cw) cw.hidden=t!=='out';
  const rw=$('#rep-wrap'); if(rw) rw.hidden=t!=='in';
  const ol=$('#m-own-l'); if(ol) ol.textContent=byOwn?'De quién es la plata que sale':tr?'De quién es la plata':t==='in'?'De quién es la plata que entra':'Con plata de quién';
  // Entre dueños: si no se eligió otra cosa, la plata queda en la misma cuenta
  const M=S.modal||{}, te=$('#m-to'), fe=$('#m-acc');
  if(byOwn&&!M.m&&!(M.pay&&M.pay.to)&&te&&fe&&!M.toTouched) te.value=fe.value;
  refreshMovForm();
}
function refreshMovForm(){
  const accEl=$('#m-acc'); if(!accEl||!$('#amt2-wrap')) return;
  const r=$('input[name=mtype]:checked'), type=r?r.value:'', tr=type==='transfer';
  const cf1=curOf(accEl.value), toEl=$('#m-to'), ct=toEl&&toEl.value?curOf(toEl.value):cf1, cross=tr&&cf1!==ct;
  const isY=S.modal&&S.modal.m&&S.modal.m.type==='yield';
  const cp=$('#cq-pre'); if(cp){ const nn=parseInt(($('#m-cuotas')||{}).value,10), cc=parseAmt($('#m-amt').value); cp.textContent=(nn>1&&cc>0)?'Cada cuota: '+money(Math.floor(cc/nn),cf1)+(cc%nn?' (la última ajusta los centavos)':''):''; }
  $('#m-amt-l').textContent=(isY?'Rendimiento (puede ser negativo)':(cross?'Monto que sale':'Monto'))+(cf1==='USD'?' (US$)':' ($)');
  $('#amt2-wrap').hidden=!cross;
  if(cross){ $('#m-amt2-l').textContent='Monto que llega'+(ct==='USD'?' (US$)':' ($)'); updRate(); }
  const hint=$('#m-hint'); if(!hint) return;
  const own=$('#m-own'), ov=own?own.value:'yo', amtC=parseAmt($('#m-amt').value);
  let ht='', due=0;
  if(tr){
    const byOwn=movMode()==='own', tw=$('#m-toown'), tv=(byOwn&&tw)?tw.value:ov, diff=tv!==ov, kw=$('#kind-wrap'); if(kw) kw.hidden=!diff;
    if(byOwn&&!diff) ht='Elegí a qué dueño pasa la plata.';
    else if(diff){
      const kd=$('#m-kind'), M=S.modal||{};
      if(kd&&!M.kindTouched&&!(M.m&&M.m.kind)&&!(M.pay&&M.pay.kind)) kd.value=owes(ov,tv,cf1)>0?'repay':'loan';
      const k=kd?kd.value:'gift';
      if(k==='repay'&&!cross) due=owes(ov,tv,cf1);
      ht=k==='repay'?ownerName(ov)+' le devuelve a '+ownerName(tv)+' y baja lo que le debe, sin importar de qué cuenta venía la deuda.':k==='loan'?'La plata pasa a ser de '+ownerName(tv)+', que le queda debiendo a '+ownerName(ov)+'.':'La plata pasa a ser de '+ownerName(tv)+' y no queda ninguna deuda.';
    }else ht='Entre tus cuentas: la plata sigue siendo de '+ownerName(ov)+' y no cuenta como ingreso ni gasto.';
  }else if(type==='in'){
    const rp=$('#m-repay'); if(rp&&rp.value) due=owes(rp.value,ov,cf1);
    if(rp&&rp.value) ht='Entra plata de '+ownerName(rp.value)+' que le devuelve a '+ownerName(ov)+': baja lo que le debe y no cuenta como ingreso.';
  }else if(type==='out'){
    const fs=$('#m-for'), mw=$('#for-multi'); if(mw) mw.hidden=!(fs&&fs.value==='__multi');
    if(fs&&fs.value==='__multi'){
      let sum=0; $$('[data-fo]').forEach(i=>{ const v=i.value.trim()?parseAmt(i.value):0; if(v>0) sum+=v; });
      ht='Repartido: '+money(sum,cf1)+(amtC>0?' de '+money(amtC,cf1):'')+'. Lo que no es de '+ownerName(ov)+' queda como deuda con '+ownerName(ov)+'.';
    }else if(isCard(accEl.value)&&!(fs&&fs.value&&fs.value!==ov)) ht='En la tarjeta anotá solo lo que gastan otros dueños: elegí para quién es. Tus consumos no hace falta anotarlos.';
    else if(fs&&fs.value&&fs.value!==ov) ht=ownerName(fs.value)+' le va a deber '+(amtC>0?money(amtC,cf1):'este monto')+' a '+ownerName(ov)+'.';
  }
  {
    const ai=$('#m-amt'), M=S.modal||{}, same=()=>M.autoAmt&&parseAmt(ai.value)===parseAmt(M.autoAmt);
    if(due>0&&!M.m){
      if(!ai.value.trim()||same()){ ai.value=centsToInput(due); M.autoAmt=ai.value; }
      ht+=' Debe '+money(due,cf1)+' en total'+(parseAmt(ai.value)<due?': devolvés una parte':'')+'.';
    }else if(same()){ ai.value=''; M.autoAmt=''; }
  }
  hint.textContent=ht;
}
function updRate(){
  const el=$('#m-rate'); if(!el) return;
  const a=parseAmt($('#m-amt').value), b=parseAmt($('#m-amt2').value);
  if(!(a>0)||!(b>0)){ el.textContent=''; return; }
  const ars=curOf($('#m-acc').value)==='ARS'?a:b, usd=curOf($('#m-acc').value)==='ARS'?b:a;
  el.textContent='Cotización: '+money(Math.round(ars/usd*100))+' por dólar';
}
function updModal(focusId){
  const accs=liveAccs().filter(a=>a.yields);
  if(!accs.length) return '<div class="sheet"><h2>Actualizar saldos</h2><p class="hint">Ninguna cuenta está marcada como que genera rendimientos. Editá una cuenta y activá esa opción.</p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cerrar</button></div></div>';
  return '<form id="uform" class="sheet" novalidate><h2>Actualizar saldos</h2><p class="hint">Escribí cuánto tenés hoy en cada cuenta. La diferencia con el saldo anotado se guarda como rendimiento.</p>'
    +'<label for="u-date">Fecha</label><input id="u-date" type="date" value="'+todayStr()+'">'
    +'<div class="urows">'+accs.map(a=>{const ly=lastYieldOf(a.id);return '<div class="urow" data-id="'+esc(a.id)+'"><div class="urow-head"><span class="urow-name">'+esc(accLabel(a))+'</span><small>Anotado: <span class="mono amt" data-prev></span>'+(ly?' · última vez '+fmtDate(ly.date,true):'')+'</small></div>'
      +'<input id="u-'+esc(a.id)+'" inputmode="decimal" autocomplete="off" placeholder="Saldo actual'+(a.cur==='USD'?' en US$':'')+'" aria-label="Saldo actual de '+esc(accLabel(a))+'"'+(a.id===focusId?' data-focus':'')+'><div class="udiff" data-diff aria-live="polite"></div></div>';}).join('')+'</div>'
    +'<p class="err" id="u-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar rendimientos</button></div></form>';
}
function updRows(){
  const date=$('#u-date').value||todayStr();
  return $$('.urow').map(row=>{
    const a=accById(row.dataset.id), prev=balance(a,date), raw=$('input',row).value.trim();
    const n=raw?parseAmt(raw):null;
    return {row:row,a:a,prev:prev,raw:raw,n:n,diff:(n!=null&&!isNaN(n))?n-prev:null,date:date,ob:ownerBalances(a,date)};
  });
}
function updPreview(){
  updRows().forEach(r=>{
    $('[data-prev]',r.row).textContent=money(r.prev,r.a.cur);
    const out=$('[data-diff]',r.row); out.className='udiff';
    if(!r.raw){out.textContent='';return;}
    if(isNaN(r.n)){out.textContent='No entiendo ese monto.';out.classList.add('neg');return;}
    let t='Rendimiento '+signed(r.diff,r.a.cur)+(r.prev>0?' · '+spct(r.diff/r.prev):'');
    out.classList.add(r.diff>0?'pos':r.diff<0?'neg':'x');
    const sp=r.diff!==0?splitText(r.diff,r.ob,r.a.cur):'';
    if(sp) t+=' · Reparto: '+sp;
    if(r.prev>0&&Math.abs(r.diff)/r.prev>0.05){t+=' · Diferencia grande: ¿falta cargar un movimiento?';out.className='udiff warn';}
    out.textContent=t;
  });
}
function accModal(a,preGroup,preCur){
  const groups=Array.from(new Set(S.accounts.map(x=>x.group).filter(Boolean)));
  const gv=a?a.group:(preGroup||'');
  return '<form id="aform" class="sheet" novalidate><h2>'+(a?'Editar cuenta':'Nueva cuenta')+'</h2>'
    +'<label for="a-group">Banco o billetera</label><input id="a-group" list="a-groups" maxlength="40" autocomplete="off" value="'+esc(gv)+'"'+(preGroup?'':' data-focus')+'><datalist id="a-groups">'+groups.map(g=>'<option value="'+esc(g)+'">').join('')+'</datalist>'
    +'<label for="a-name">Nombre de la cuenta</label><input id="a-name" maxlength="40" autocomplete="off" placeholder="Cuenta, Fondo, Reservas…" value="'+esc(a?a.name:(preCur==='USD'?'Dólares':''))+'"'+(preGroup?' data-focus':'')+'>'
    +'<label for="a-cur">Moneda</label><select id="a-cur"'+((a&&S.movs.some(m=>m.account===a.id||m.to===a.id))?' disabled':'')+'><option value="ARS"'+(((a&&a.cur!=='USD')||(!a&&preCur!=='USD'))?' selected':'')+'>Pesos</option><option value="USD"'+(((a&&a.cur==='USD')||(!a&&preCur==='USD'))?' selected':'')+'>Dólares (US$)</option></select>'
    +((a&&S.movs.some(m=>m.account===a.id||m.to===a.id))?'<p class="hint">La moneda no se puede cambiar porque la cuenta ya tiene movimientos.</p>':'')
    +'<label class="check"><input type="checkbox" id="a-yields"'+(a&&a.yields?' checked':'')+'>Genera rendimientos diarios</label>'
    +'<label class="check"><input type="checkbox" id="a-card"'+(a&&a.kind==='card'?' checked':'')+'>Es una tarjeta de crédito (no tiene saldo: solo anoto consumos de otros, que quedan como deuda)</label>'
    +'<label>Saldo inicial de cada dueño</label>'+S.owners.map(o=>'<label class="fo-row" for="ini-'+esc(o.id)+'"><span>'+esc(o.name)+'</span><input id="ini-'+esc(o.id)+'" data-ini="'+esc(o.id)+'" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+(a&&initOf(a)[o.id]?centsToInput(initOf(a)[o.id]):'')+'"></label>').join('')
    +'<p class="hint">Lo que había en la cuenta antes del primer movimiento, repartido por dueño (en Efectivo, lo de cada uno). En una tarjeta, escribí la deuda con signo menos.</p>'
    +(a?'<label class="check"><input type="checkbox" id="a-arch"'+(a.archived?' checked':'')+'>Archivada (se oculta y no suma al total)</label>':'')
    +'<p class="err" id="a-err" role="alert"></p><div class="sheet-actions">'+(a&&canDelAcc(a)?'<button type="button" class="btn danger" data-act="acc-del">Eliminar</button>':'')+'<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
const canDelAcc=a=>!a.initial&&!S.movs.some(m=>m.account===a.id||m.to===a.id);
function simpleNameModal(id,title,label,value,extraBtn,hint){
  return '<form id="'+id+'" class="sheet" novalidate><h2>'+title+'</h2><label for="n-name">'+label+'</label><input id="n-name" maxlength="40" autocomplete="off" value="'+esc(value)+'" data-focus>'
    +(hint?'<p class="hint">'+hint+'</p>':'')+'<p class="err" id="n-err" role="alert"></p><div class="sheet-actions">'+(extraBtn||'')+'<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
const smonthModal=id=>{
  const s=S.stmts.find(x=>x.id===id); if(!s) return '';
  return '<form id="pform" class="sheet" novalidate><h2>Cambiar mes del resumen</h2><p class="hint">'+esc(cardName(s.card))+'. Poné el mes en que hiciste los consumos: un resumen que cierra el 1 de octubre trae los de septiembre.</p><label for="p-month">Mes de los consumos</label><input id="p-month" type="month" value="'+esc(s.period)+'" data-focus><p class="err" id="p-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
};
function saveSMonth(){
  const s=S.stmts.find(x=>x.id===S.modal.id), v=$('#p-month').value;
  if(!s) return closeModal();
  if(!/^\d{4}-\d{2}$/.test(v)){ $('#p-err').textContent='Elegí un mes.'; return; }
  if(S.stmts.some(x=>x.id!==s.id&&x.card===s.card&&x.period===v)){ $('#p-err').textContent='Ya hay un resumen de esa tarjeta en ese mes.'; return; }
  s.period=v; S.exp.forEach(e=>{ if(e.stmt===s.id) e.period=v; });
  persist(); S.xPeriod=v; closeModal(); render(); toast('Mes cambiado a '+monthLabel(v));
}
const cardModal=c=>simpleNameModal('cform',c?'Editar tarjeta':'Nueva tarjeta','Nombre de la tarjeta',c?c.name:'','','Por ejemplo: BBVA Visa, Naranja X Mastercard.');
const catModal=(c,draft)=>{
  const n=c?S.exp.filter(e=>e.cat===c.id).length:0;
  let h=simpleNameModal('kform',c?'Editar categoría':'Nueva categoría','Nombre de la categoría',draft!=null?draft:(c?c.name:''),
    (c&&c.id!=='sin')?'<button type="button" class="btn danger" data-act="cat-del" id="cat-del-btn">Eliminar</button>':'',
    (c&&c.id!=='sin'&&n)?'Si la eliminás, sus '+n+' consumos pasan a «Sin categorizar».':'');
  if(c&&c.id!=='sin'){
    const rs=S.rules.filter(r=>r.cat===c.id);
    const extra='<div class="cat-rules"><h3 class="sec" style="font-size:15px;margin:14px 0 6px">Comercios de esta categoría</h3>'
      +(rs.length?'<div class="chips">'+rs.map(r=>'<button type="button" class="chip" data-act="cat-kw-del" data-k="'+esc(r.k)+'" aria-label="Quitar '+esc(r.k)+'">'+esc(r.k.replace(/\*$/,''))+' ✕</button>').join('')+'</div>':'<p class="hint">Todavía no agregaste comercios acá. La app también aprende sola cuando cambiás la categoría de un consumo.</p>')
      +'<label for="k-kw">Agregar un comercio o palabra</label><div style="display:flex;gap:8px"><input id="k-kw" maxlength="40" autocomplete="off" placeholder="Por ejemplo: ypf, farmacia" style="flex:1"><button type="button" class="btn" data-act="cat-kw-add">Agregar</button></div>'
      +'<p class="hint">Los consumos que empiecen con esa palabra van a esta categoría, y se re-categorizan los que hoy están sin categorizar. Tus palabras ganan sobre las que trae la app.</p></div>';
    h=h.replace('<p class="err" id="n-err"',extra+'<p class="err" id="n-err"');
  }
  return h;
};
const ownerUsed=id=>S.movs.some(m=>m.owner===id||m.toOwner===id||(m.for&&m.for[id]!=null)||(m.split&&m.split[id]!=null))||S.claims.some(c=>c.from===id||c.to===id)||S.movs.some(m=>m.repay===id||m.repayTo===id)||S.ops.some(o=>o.owner===id)||S.hlds.some(h=>h.iowner===id&&h.initial)||S.accounts.some(a=>a.initialOwners&&a.initialOwners[id]);
const ownerModal=o=>simpleNameModal('wform',o?'Editar dueño':'Nuevo dueño','Nombre (por ejemplo, un grupo o una persona)',o?o.name:'',(o&&o.id!=='yo'&&!ownerUsed(o.id))?'<button type="button" class="btn danger" data-act="owner-del">Eliminar</button>':'','');

/* Cuenta de tarjeta (en Cuentas) donde se anotan los consumos de otros dueños de esta tarjeta del resumen. */
function cardAccFor(cardId,cur){
  const c=S.cards.find(x=>x.id===cardId), cs=liveAccs().filter(a=>a.kind==='card'&&curOf(a.id)===(cur||'ARS'));
  if(c&&c.account&&cs.some(a=>a.id===c.account)) return c.account;
  const nm=c?c.name.toLowerCase():'', hit=cs.find(a=>{ const g=(a.group||a.name||'').toLowerCase(); return g&&nm.indexOf(g)>-1; });
  return hit?hit.id:(cs[0]?cs[0].id:'');
}
function stmtStep1(){
  const M=S.modal;
  return '<form id="sform" class="sheet wide" novalidate><h2>Cargar resumen</h2>'
    +'<p class="hint">Elegí el PDF del resumen y la app lo lee en el celular, sin subirlo a ningún lado. También podés pegar el texto. Antes de guardar, revisás cada consumo.</p>'
    +'<div><button type="button" class="btn" data-act="s-file">Elegir el PDF del resumen</button><p class="hint" id="s-pdfok" aria-live="polite"></p></div>'
    +'<label for="s-card">Tarjeta</label><select id="s-card">'+S.cards.map(c=>opt(c.id,c.name,c.id===M.card)).join('')+'</select>'
    +'<label for="s-period">Mes de los consumos</label><input id="s-period" type="month" value="'+esc(M.period)+'"><p class="hint">Es el mes en que hiciste los gastos. Un resumen que cierra el 1 de octubre trae los consumos de septiembre.</p>'
    +'<label for="s-total">Total del resumen (opcional, para controlar)</label><input id="s-total" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+esc(M.totalStr||'')+'">'
    +'<label for="s-pay">¿Cómo pagaste este resumen?</label><select id="s-pay">'+opt('pesos','Todo en pesos',M.paid!=='usd')+opt('usd','Pesos y dólares (los dólares con dólares)',M.paid==='usd')+'</select><p class="hint">Si los consumos en dólares los pagás con dólares, no te cobran la percepción RG 5617 (30%). La app la descuenta de tus gastos.</p>'
    +'<label for="s-text">Texto del resumen</label><textarea id="s-text" rows="8" placeholder="Pegá acá el texto del resumen" data-focus>'+esc(M.text||'')+'</textarea>'
    +'<div style="margin-top:6px"><button type="button" class="link" data-act="s-file">O elegí un archivo de texto o CSV</button><input type="file" id="s-file" accept=".pdf,application/pdf,.txt,.csv,text/plain,text/csv" hidden></div>'
    +'<p class="err" id="s-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="button" class="btn" data-act="s-manual">Cargar a mano</button><button type="submit" class="btn primary">Analizar</button></div></form>';
}
function stmtReview(){
  const M=S.modal;
  const existing=S.stmts.find(s=>s.card===M.card&&s.period===M.period);
  const catOpts=sel=>S.cats.map(c=>opt(c.id,c.name,c.id===sel)).join('');
  let h='<div class="sheet wide"><h2>Revisá los consumos</h2><p class="hint">'+esc(cardName(M.card))+' · consumos de '+esc(monthLabel(M.period))+' · pagado '+(M.paid==='usd'?'en pesos y dólares':'todo en pesos')+'</p>';
  if(existing) h+='<p class="hint" style="color:var(--warn)">Ya cargaste este resumen. Al importar se reemplaza.</p>';
  if(M.rows.length===1&&M.parsedZero) h+='<div class="note" style="margin-top:10px">No encontré consumos en ese texto. Podés cargarlos a mano abajo, o probar copiando solo la tabla de consumos.</div>';
  const cAccs=liveAccs().filter(a=>a.kind==='card'&&curOf(a.id)==='ARS');
  if(!M.cardAcc) M.cardAcc=cardAccFor(M.card);
  if(S.owners.length>1) h+='<div class="note" style="margin-top:10px">Si un consumo es de otro dueño, elegilo en «De quién es». No cuenta como gasto tuyo: se anota como deuda en la tarjeta.'+(cAccs.length?'<label for="rv-acc" style="margin-top:8px">Anotarlos en la tarjeta</label><select id="rv-acc">'+cAccs.map(a=>opt(a.id,accLabel(a),a.id===M.cardAcc)).join('')+'</select>':'<br><strong>Primero creá una cuenta marcada como tarjeta de crédito en Ajustes.</strong>')+'</div>';
  h+='<div class="rv-sum" id="rv-sum"></div><div id="rv-rows">';
  M.rows.forEach((r,i)=>{
    h+='<div class="rv-row" data-i="'+i+'"><label class="rv-inc"><input type="checkbox" data-f="inc" aria-label="Incluir"'+(r.inc?' checked':'')+'></label>'
      +'<input type="date" data-f="date" aria-label="Fecha" value="'+esc(r.date)+'"><input data-f="amt" class="rv-amt" inputmode="decimal" autocomplete="off" aria-label="Monto" placeholder="Monto" value="'+esc(r.amtStr)+'">'
      +'<input data-f="desc" class="rv-desc" autocomplete="off" aria-label="Descripción" placeholder="Descripción" value="'+esc(r.desc)+'">'
      +'<select data-f="cat" class="rv-cat" aria-label="Categoría">'+catOpts(r.cat)+'</select>'
      +(r.cuota||r.flag?'<div class="rv-flag">'+(r.cuota?'Cuota '+esc(r.cuota)+'. ':'')+esc(r.flag)+'</div>':'')
      +(S.owners.length>1?'<label class="rv-own">De quién es <select data-f="own" aria-label="De quién es el consumo">'+opt('','Mío',!r.own)+S.owners.filter(o=>o.id!=='yo').map(o=>opt(o.id,o.name,r.own===o.id)).join('')+'</select></label>':'')
      +'<label class="rv-usd"><input type="checkbox" data-f="usd"'+(r.usd?' checked':'')+'> En dólares (US$)</label></div>';
  });
  h+='</div><div style="margin:8px 0"><button type="button" class="link" data-act="rv-add">+ Agregar una línea</button></div>'
    +'<p class="err" id="rv-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="rv-back">Volver</button><button type="button" class="btn primary" data-act="rv-import">Importar</button></div></div>';
  return h;
}
function updateReviewSum(){
  const M=S.modal; if(!M||!M.rows) return; const el=$('#rv-sum'); if(!el) return;
  const inc=M.rows.filter(r=>r.inc&&!isNaN(r.cents));
  const tot=sumC(inc.filter(r=>!r.usd)), totU=sumC(inc.filter(r=>r.usd));
  let t=inc.length+' consumos · '+amt(money(tot))+(totU?' + '+amt(money(totU,'USD')):'');
  const given=M.totalStr?parseAmt(M.totalStr):NaN;
  const desc=M.paid==='usd'?sumC(M.rows.filter(r=>r.rg&&!r.inc&&!isNaN(r.cents))):0;
  if(desc) t+=' · Descontado por pagar en dólares '+amt(money(desc));
  if(!isNaN(given)){ const d=given-tot-desc; t+=' · Total del resumen '+amt(money(given))+' · Diferencia '+amt(money(d),d===0?'pos':'neg'); }
  const gU=M.totalUsdStr?parseAmt(M.totalUsdStr):NaN;
  if(!isNaN(gU)&&(gU||totU)){ const dU=gU-totU; t+=' · En dólares: resumen '+amt(money(gU,'USD'))+' · Diferencia '+amt(money(dU,'USD'),dU===0?'pos':'neg'); }
  el.innerHTML=t;
}
document.addEventListener('submit',e=>{ if(e.target.id==='clform'){ e.preventDefault(); saveClaim(); } });
function wrapModal(body){ return '<div class="overlay" data-overlay>'+body+'</div>'; }
function holdModal(x){
  const k=x?x.kind:'fci', cu=x?holdCur(x):'ARS';
  return '<form id="hform" class="sheet" novalidate><h2>'+(x?'Editar tenencia':'Nueva tenencia')+'</h2><label for="n-name">Nombre o ticker</label><input id="n-name" maxlength="40" autocomplete="off" placeholder="Por ejemplo, Balanz Capital Money Market" value="'+esc(x?x.name:'')+'" data-focus>'
    +'<label for="h-kind">Qué es</label><select id="h-kind">'+opt('fci','Fondo común: cuotapartes',k==='fci')+opt('nom','Bono u obligación: nominales',k!=='fci')+'</select>'
    +'<label for="h-cur">Moneda</label><select id="h-cur">'+opt('ARS','Pesos',cu==='ARS')+opt('USD','Dólares (US$)',cu==='USD')+'</select>'
    +'<label for="h-init">Cantidad que tenés hoy</label><input id="h-init" inputmode="decimal" autocomplete="off" placeholder="0" value="'+(x&&x.initial?esc(String(x.initial).replace('.',',')):'')+'"><p class="hint">'+(x?'Es la cantidad de partida, antes de las compras y ventas que cargaste.':'Si ya tenés cuotapartes, escribí cuántas (con decimales si hace falta). Después anotá solo las compras y ventas nuevas.')+'</p>'
    +'<label for="h-iown">De quién es esa cantidad</label><select id="h-iown">'+ownOpts(x?(x.iowner||'yo'):S.lastOwner)+'</select>'
    +'<label for="h-ipx">Valor de compra por cuotaparte (opcional)</label><input id="h-ipx" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+(x&&x.initialPx?esc(String(x.initialPx).replace('.',',')):'')+'"><p class="hint">Sirve para calcular la ganancia. Si no lo sabés, dejalo vacío.</p>'
    +'<p class="err" id="n-err" role="alert"></p><div class="sheet-actions">'+(x&&canDelHold(x)?'<button type="button" class="btn danger" data-act="hold-del">Eliminar</button>':'')+'<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
function opModal(o,pt,ph){
  if(!S.hlds.length) return '<div class="sheet"><h2>Compra o venta</h2><p class="hint">Primero agregá una tenencia, por ejemplo un fondo de Balanz.</p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cerrar</button><button type="button" class="btn primary" data-act="hold-new">Nueva tenencia</button></div></div>';
  const type=o?o.type:(pt||'buy'), sel=o?o.hold:((ph&&holdById(ph))?ph:S.hlds[0].id);
  const linked=o?S.movs.find(m=>m.opId===o.id):null;
  return '<form id="oform" class="sheet" novalidate><h2>'+(o?'Editar operación':'Compra o venta')+'</h2><fieldset class="seg"><legend class="muted" style="position:absolute;left:-9999px">Tipo</legend>'
    +[['buy','Compra'],['sell','Venta']].map(t=>'<label><input type="radio" name="otype" value="'+t[0]+'"'+(type===t[0]?' checked':'')+'><span>'+t[1]+'</span></label>').join('')+'</fieldset>'
    +'<label for="o-hold">Tenencia</label><select id="o-hold">'+S.hlds.map(x=>opt(x.id,x.name,x.id===sel)).join('')+'</select>'
    +'<label for="o-own">De quién es</label><select id="o-own">'+ownOpts(o?(o.owner||'yo'):S.lastOwner)+'</select>'
    +'<label for="o-qty">Cantidad (cuotapartes o nominales)</label><input id="o-qty" inputmode="decimal" autocomplete="off" placeholder="0" value="'+(o?esc(String(o.qty).replace('.',',')):'')+'" data-focus>'
    +'<label for="o-px">Valor por cuotaparte (opcional)</label><input id="o-px" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+(o&&o.price?esc(String(o.price).replace('.',',')):'')+'"><p class="hint" id="o-tot"></p>'
    +'<label for="o-acc">Cuenta de donde sale o a donde entra la plata</label><select id="o-acc">'+opt('','No tocar ninguna cuenta',!linked)+liveAccs().filter(a=>a.kind!=='card').map(a=>opt(a.id,accLabel(a),!!linked&&linked.account===a.id)).join('')+'</select>'
    +'<label for="o-date">Fecha</label><input id="o-date" type="date" value="'+esc(o?o.date:todayStr())+'">'
    +'<label for="o-note">Detalle (opcional)</label><input id="o-note" maxlength="120" autocomplete="off" value="'+esc(o?o.note||'':'')+'">'
    +'<p class="hint">Si elegís una cuenta, se anota la salida o entrada de plata en esa cuenta (como plata del dueño elegido) y no cuenta como gasto ni ingreso.</p>'
    +'<p class="err" id="o-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
function updOpTotal(){
  const el=$('#o-tot'); if(!el) return;
  const q=parseNum($('#o-qty').value), p=parseNum($('#o-px').value), x=holdById($('#o-hold').value);
  el.textContent=(q>0&&p>0&&x)?'Total: '+money(Math.round(q*p*100),holdCur(x)):'';
}
function pxModal(ph){
  const fs=S.hlds.filter(x=>x.kind==='fci');
  if(!fs.length) return '<div class="sheet"><h2>Actualizar valores</h2><p class="hint">Todavía no tenés fondos con cuotapartes. Agregá una tenencia de tipo «Fondo común».</p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cerrar</button><button type="button" class="btn primary" data-act="hold-new">Nueva tenencia</button></div></div>';
  return '<form id="vform" class="sheet" novalidate><h2>Actualizar valores</h2><p class="hint">Escribí el valor de la cuotaparte que figura en Balanz. Dejá vacío lo que no querés tocar.</p>'
    +'<label for="v-date">Fecha</label><input id="v-date" type="date" value="'+todayStr()+'">'
    +'<div class="urows">'+fs.map(x=>{ const p=lastPx(x); return '<div class="urow"><div class="urow-head"><span class="urow-name">'+esc(x.name)+'</span><small>'+(p?'Último '+esc(pxFmt(p.v,holdCur(x)))+' · '+fmtDate(p.date,true):'Sin valor cargado')+'</small></div><input data-px="'+esc(x.id)+'" inputmode="decimal" autocomplete="off" placeholder="Valor de la cuotaparte" aria-label="Valor de la cuotaparte de '+esc(x.name)+'"'+(x.id===ph?' data-focus':'')+'></div>'; }).join('')+'</div>'
    +'<p class="err" id="v-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
function savePx(){
  const err=$('#v-err'); err.textContent='';
  const date=$('#v-date').value; if(!date){ err.textContent='Elegí una fecha.'; return; }
  const rows=$$('[data-px]').filter(i=>i.value.trim());
  if(!rows.length){ err.textContent='Escribí el valor de al menos un fondo.'; return; }
  for(const i of rows){ const v=parseNum(i.value); if(!(v>0)){ err.textContent='Hay un valor que no se entiende.'; return; } }
  rows.forEach(i=>{
    const x=holdById(i.dataset.px), v=parseNum(i.value);
    x.px=(x.px||[]).filter(p=>p.date!==date).concat([{date:date,v:v}]).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  });
  persist(); closeModal(); render(); toast('Valores guardados');
}
function cobroModal(ph){
  if(!S.hlds.length) return '<div class="sheet"><h2>Registrar cobro</h2><p class="hint">Primero agregá una tenencia.</p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cerrar</button><button type="button" class="btn primary" data-act="hold-new">Nueva tenencia</button></div></div>';
  const usd=liveAccs().filter(a=>a.cur==='USD');
  if(!usd.length) return '<div class="sheet"><h2>Registrar cobro</h2><p class="hint">Para registrar un cobro necesitás una cuenta en dólares. Creala en Ajustes, con «Agregar cuenta en dólares».</p><div class="sheet-actions"><button type="button" class="btn primary" data-act="close">Entendido</button></div></div>';
  const sel=(ph&&holdById(ph))?ph:S.hlds[0].id;
  return '<form id="bform" class="sheet" novalidate><h2>Registrar cobro</h2><p class="hint">Renta, amortización o dividendo en dólares. Se suma como rendimiento en la cuenta que elijas y se reparte entre los dueños según lo que tenga cada uno.</p>'
    +'<label for="b-hold">Tenencia</label><select id="b-hold">'+S.hlds.map(x=>opt(x.id,x.name,x.id===sel)).join('')+'</select>'
    +'<label for="b-amt">Monto cobrado (US$)</label><input id="b-amt" inputmode="decimal" autocomplete="off" placeholder="0,00" data-focus>'
    +'<label for="b-acc">Se acredita en</label><select id="b-acc">'+usd.map(a=>opt(a.id,accLabel(a),false)).join('')+'</select>'
    +'<label for="b-date">Fecha</label><input id="b-date" type="date" value="'+todayStr()+'">'
    +'<label for="b-note">Detalle (opcional)</label><input id="b-note" maxlength="120" autocomplete="off">'
    +'<p class="err" id="b-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar cobro</button></div></form>';
}
function saveHold(){
  const v=readName('#n-err'); if(!v) return;
  const x=S.modal.h, raw=$('#h-init').value.trim(), q=raw?parseNum(raw):0, rp=$('#h-ipx').value.trim(), ipx=rp?parseNum(rp):0;
  if(isNaN(q)||q<0){ $('#n-err').textContent='La cantidad no se entiende.'; return; }
  if(isNaN(ipx)||ipx<0){ $('#n-err').textContent='El valor de compra no se entiende.'; return; }
  if(S.hlds.some(y=>y.name.toLowerCase()===v.toLowerCase()&&(!x||y.id!==x.id))){ $('#n-err').textContent='Ya tenés una tenencia con ese nombre.'; return; }
  const f={name:v,kind:$('#h-kind').value==='nom'?'nom':'fci',cur:$('#h-cur').value==='USD'?'USD':'ARS',initial:q,iowner:$('#h-iown').value||'yo',initialPx:ipx};
  if(x) S.hlds=S.hlds.map(y=>y.id===x.id?Object.assign({},y,f):y);
  else S.hlds.push(Object.assign({id:slug(v)+'-'+Math.random().toString(36).slice(2,6),px:[]},f));
  persist(); closeModal(); render(); toast('Tenencia guardada');
}
function saveOp(){
  const o=S.modal.o, err=$('#o-err'); err.textContent='';
  const r=$('input[name=otype]:checked'), type=r?r.value:'buy', hold=$('#o-hold').value, q=parseNum($('#o-qty').value), date=$('#o-date').value, note=$('#o-note').value.trim();
  const owner=$('#o-own').value||'yo', rp=$('#o-px').value.trim(), price=rp?parseNum(rp):0, acc=$('#o-acc').value, x=holdById(hold);
  if(!x){ err.textContent='Elegí la tenencia.'; return; }
  if(isNaN(q)||q<=0){ err.textContent='Ingresá una cantidad mayor a cero.'; return; }
  if(isNaN(price)||price<0){ err.textContent='El valor por cuotaparte no se entiende.'; return; }
  if(!date){ err.textContent='Elegí una fecha.'; return; }
  if(acc){
    if(!(price>0)){ err.textContent='Para mover plata de una cuenta, cargá el valor por cuotaparte.'; return; }
    if(curOf(acc)!==holdCur(x)){ err.textContent='La cuenta tiene que estar en '+(holdCur(x)==='USD'?'dólares':'pesos')+', igual que la tenencia.'; return; }
  }
  if(type==='sell'&&!S.modal.negOK){
    const have=r2(holdQtyOwner(x,owner)-(o&&o.hold===hold&&(o.owner||'yo')===owner?(o.type==='buy'?o.qty:-o.qty):0));
    if(q>have){ S.modal.negOK=true; err.textContent='Estás vendiendo más de lo que tiene '+ownerName(owner)+' ('+qtyFmt(have)+'). Tocá Guardar otra vez para confirmar.'; return; }
  }
  const id=o?o.id:newId();
  const data={type:type,hold:hold,qty:q,date:date,note:note,owner:owner,createdAt:o?(o.createdAt||Date.now()):Date.now()};
  if(price>0) data.price=price;
  if(o) S.ops=S.ops.map(y=>y.id===o.id?Object.assign({id:o.id},data):y); else S.ops.push(Object.assign({id:id},data));
  S.ops.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:((a.createdAt||0)-(b.createdAt||0)));
  S.movs=S.movs.filter(m=>m.opId!==id);
  if(acc) S.movs.push({id:newId(),type:type==='buy'?'out':'in',account:acc,cents:Math.round(q*price*100),date:date,note:(type==='buy'?'Compra de ':'Venta de ')+x.name+' ('+qtyFmt(q)+')',owner:owner,internal:true,opId:id,createdAt:Date.now()});
  S.lastOwner=owner; S.selOp='';
  persist(); closeModal(); onData(); toast('Operación guardada');
}
function saveCobro(){
  const err=$('#b-err'); err.textContent='';
  const hold=$('#b-hold').value, cents=parseAmt($('#b-amt').value), acc=$('#b-acc').value, date=$('#b-date').value, note=$('#b-note').value.trim(), x=holdById(hold);
  if(!x){ err.textContent='Elegí la tenencia.'; return; }
  if(isNaN(cents)||cents<=0){ err.textContent='Ingresá un monto mayor a cero.'; return; }
  if(!acc){ err.textContent='Elegí la cuenta en dólares.'; return; }
  if(!date){ err.textContent='Elegí una fecha.'; return; }
  const data={type:'yield',account:acc,cents:cents,date:date,note:'Cobro · '+x.name+(note?' · '+note:''),hold:hold,createdAt:Date.now()};
  const w={}; S.owners.forEach(o=>{ const q=holdQtyOwner(x,o.id); if(q>0) w[o.id]=q; });
  const sp=allocate(cents,w);
  if(Object.keys(sp).length>1||!('yo' in sp)) data.split=sp;
  putMov(null,data);
  closeModal(); toast('Cobro guardado: '+signed(cents,'USD'));
}
function menuModal(){
  const it=[['o','−','Egreso','Algo que pagaste','mov-new','out'],['i','+','Ingreso','Plata que entró','mov-new','in'],['t','⇄','Movimiento entre cuentas','Pasar plata de una cuenta a otra','mov-new','transfer'],['t','⇆','Movimiento entre dueños','La plata pasa a ser de otro dueño (o devolver una deuda)','mov-new','transfer','own'],['u','↻','Actualizar saldos','Lo que rindieron las cuentas','upd',''],['t','▤','Resumen de tarjeta','Subir el PDF del mes','stmt-new',''],['t','◆','Inversiones','Ir a compras, ventas, valores y cobros','goto-inv','']];
  return '<div class="sheet"><div class="grab"></div><h2>¿Qué querés cargar?</h2>'+it.map(x=>'<button type="button" class="mact" data-act="'+x[4]+'"'+(x[5]?' data-type="'+x[5]+'"':'')+(x[6]?' data-mode="'+x[6]+'"':'')+'><span class="mdot '+x[0]+'">'+x[1]+'</span><span><b>'+x[2]+'</b><span class="s">'+x[3]+'</span></span></button>').join('')
    +'<div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button></div></div>';
}
function modalBody(kind,data){
  switch(kind){
    case 'mov': return movModal(data.m,data.type,data.acc,data.pay);
    case 'claim': return claimModal();
    case 'px': return pxModal(data.hold);
    case 'menu': return menuModal();
    case 'hold': return holdModal(data.h);
    case 'op': return opModal(data.o,data.type,data.hold);
    case 'cobro': return cobroModal(data.hold);
    case 'upd': return updModal(data.accId);
    case 'imp': return impModal(data);
    case 'card': return cardModal(data.c);
    case 'cat': return catModal(data.c,data.name);
    case 'smonth': return smonthModal(data.id);
    case 'owner': return ownerModal(data.o);
    case 'stmt': return stmtStep1();
    default: return accModal(data.a,data.group,data.cur);
  }
}
function openModal(kind,data){
  data=data||{}; S.modal=Object.assign({kind:kind},data);
  $('#modal').innerHTML=wrapModal(modalBody(kind,data));
  if(kind==='mov') toggleTo();
  if(kind==='upd'&&$('#u-date')) updPreview();
  const f=$('#modal [data-focus]')||$('#modal input:not([type=radio]):not([type=checkbox])');
  if(f) f.focus();
}
function closeModal(){ S.modal=null; $('#modal').innerHTML=''; }
let toastT=null;
function toast(t,ms){ const el=$('#toast'); el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{el.hidden=true},ms||2800); }

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
  let toCents=null;
  if(type==='transfer'&&curOf(account)!==curOf(to)){
    toCents=parseAmt($('#m-amt2').value);
    if(isNaN(toCents)||toCents<=0){err.textContent='Escribí cuánto llega a la otra cuenta (las monedas son distintas).';return;}
  }
  let nq=1;
  if(type==='out'&&!m&&$('#m-cuotas')){ const raw=$('#m-cuotas').value.trim(); if(raw){ if(!/^\d{1,2}$/.test(raw)||+raw<1||+raw>60){err.textContent='Las cuotas tienen que ser un número entre 1 y 60.';return;} nq=+raw; } }
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
  if((type==='out'||type==='transfer')&&!S.modal.negOK){
    const acc=accById(account), ob=acc?ownerBalances(acc):{};
    if(acc&&acc.kind!=='card'){
      const nb=(ob[owner]||0)-(m?effectOwner(m,account,owner):0)-(nq>1?Math.floor(cents/nq):cents);
      if(nb<0){ S.modal.negOK=true; err.textContent='Esto deja la plata de '+ownerName(owner)+' en esa cuenta en '+money(nb,curOf(account))+'. Tocá Guardar otra vez para confirmar.'; return; }
    }
  }
  {
    let deb='', cre='', back=0;
    if(type==='transfer'&&toOwn!==owner&&($('#m-kind')||{}).value==='repay'){ deb=owner; cre=toOwn; if(m&&m.type==='transfer'&&m.kind==='repay'&&(m.owner||'yo')===owner&&m.toOwner===toOwn) back=m.cents; }
    else if(type==='in'&&$('#m-repay')&&$('#m-repay').value&&$('#m-repay').value!==owner){ deb=$('#m-repay').value; cre=owner; if(m&&m.repayFrom===deb&&(m.owner||'yo')===owner) back=m.cents; }
    if(deb&&!S.modal.repOK){
      const cu=curOf(account), due=Math.max(0,owes(deb,cre,cu)-owes(cre,deb,cu)+back);
      if(cents>due){
        S.modal.repOK=true;
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
  if(type==='in'){ const rp=$('#m-repay'); if(rp&&rp.value&&rp.value!==owner) data.repayFrom=rp.value; }
  if(m&&m.hold) data.hold=m.hold; keepRepay(m,data,type,owner,cents,date);
  if(m&&m.internal){ data.internal=true; if(m.opId) data.opId=m.opId; }
  if(isY){
    if(m.base!=null) data.base=m.base; if(m.days!=null) data.days=m.days;
    if(m.split){ const w={}; for(const k in m.split) w[k]=Math.abs(m.split[k]); data.split=allocate(cents,w); }
  }
  if(type!=='yield') S.lastOwner=owner;
  if(nq>1){ const pd=Object.assign({},data); delete pd.date; delete pd.createdAt; S.plans.push({id:newId(),n:nq,done:0,start:date,total:cents,data:pd}); applyPlans(); persist(); closeModal(); toast('Guardado · '+nq+' cuotas'); onData(); return; }
  putMov(m?m.id:null,data); closeModal(); toast('Guardado');
}
function saveUpd(){
  const err=$('#u-err'); err.textContent='';
  const rows=updRows().filter(r=>r.raw);
  if(!rows.length){err.textContent='Escribí el saldo actual de al menos una cuenta.';return;}
  if(rows.some(r=>isNaN(r.n))){err.textContent='Hay un monto que no se entiende.';return;}
  const todo=rows.filter(r=>r.diff!==0);
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
  const maxOrder=S.accounts.reduce((m,x)=>Math.max(m,x.order||0),0);
  const data={group:group||name,name:name,cur:$('#a-cur').value==='USD'?'USD':'ARS',yields:$('#a-yields').checked,initial:initial,initialOwners:ini,kind:($('#a-card')&&$('#a-card').checked)?'card':'',order:a?(a.order||0):Math.floor(maxOrder)+1,archived:a?$('#a-arch').checked:false};
  const id=a?a.id:slug((group||'')+'-'+name)+'-'+Math.random().toString(36).slice(2,6);
  putAcc(id,data); closeModal(); toast('Cuenta guardada');
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
  else S.cards.push({id:slug(v)+'-'+Math.random().toString(36).slice(2,6),name:v});
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
  M.rows=parseStatement(M.text,M.period); M.parsedZero=false;
  if(M.paid==='usd') M.rows.forEach(r=>{ if(r.rg){ r.inc=false; r.flag='No se cobra si pagás los dólares con dólares: se descuenta de tus gastos.'; } });
  if(!M.rows.length){ M.rows=[blankRow(M.period)]; M.parsedZero=true; }
  M.step=2; stmtShowReview();
}
function stmtManual(){
  const M=S.modal; stmtRead();
  if(!/^\d{4}-\d{2}$/.test(M.period)){ $('#s-err').textContent='Elegí el mes del resumen.'; return; }
  M.rows=[blankRow(M.period)]; M.parsedZero=false; M.step=2; stmtShowReview();
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
  else if(f==='own') r.own=t.value;
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
  if(st){ S.exp=S.exp.filter(e=>e.stmt!==st.id); S.movs=S.movs.filter(m=>m.stmt!==st.id); }
  else{ st={id:newId(),card:M.card,period:M.period,createdAt:Date.now()}; S.stmts.push(st); }
  st.paid=M.paid==='usd'?'usd':'pesos';
  let learned=0;
  M.rows.filter(r=>r.inc).forEach(r=>{
    if(r.own){ S.movs.push({id:newId(),type:'out',account:M.cardAcc,cents:r.cents,date:r.date,note:((r.desc||'').trim()||'Consumo de tarjeta')+(r.cuota?' · cuota '+r.cuota:''),owner:'yo',for:{[r.own]:r.cents},stmt:st.id,createdAt:Date.now()}); return; }
    const e={id:newId(),card:M.card,stmt:st.id,period:M.period,date:r.date,desc:(r.desc||'').trim()||'Sin descripción',cents:r.cents,cat:r.cat};
    if(r.cuota) e.cuota=r.cuota;
    if(r.usd) e.cur='USD';
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

/* ---------- Eventos ---------- */
document.addEventListener('click',e=>{
  if(e.target.matches&&e.target.matches('[data-overlay]')){ closeModal(); return; }
  const b=e.target.closest('[data-act]'); if(!b) return;
  const id=b.dataset.id, act=b.dataset.act;
  if(act==='close') closeModal();
  else if(act==='hide'){ S.hide=!S.hide; try{localStorage.setItem('cuentas-hide',S.hide?'1':'0')}catch(_){} render(); }
  else if(act==='upd') openModal('upd',{accId:id});
  else if(act==='mov-new'){
    let pay=null;
    if(b.dataset.card){ const ca=accById(b.dataset.card), o=S.lastOwner; pay={to:ca.id,cents:Math.max(0,-balance(ca)),from:bestAcc(o,'ARS'),owner:o}; }
    if(b.dataset.move){ const ma=accById(b.dataset.move), l=nonzeroOwners(ownerBalances(ma)), ng=l.filter(x=>x.v<0).sort((x,y)=>x.v-y.v)[0], ps=l.filter(x=>x.v>0).sort((x,y)=>y.v-x.v)[0];
      pay={from:ma.id,to:ma.id,owner:ps?ps.id:'yo',toOwner:ng?ng.id:'',cents:ng?-ng.v:0,kind:ng?'loan':'',mode:'own'}; }
    if(b.dataset.mode&&!pay) pay={mode:b.dataset.mode};
    openModal('mov',{m:null,type:b.dataset.type||'',acc:b.dataset.acc||'',pay:pay});
  }
  else if(act==='share-bk') shareBackup();
  else if(act==='debt-csv') debtCsv(+id);
  else if(act==='debt-pdf') debtPrint(+id);
  else if(act==='debt-pay'){ const p=debtPairs()[+id];
    if(p){ const fa=bestAcc(p.debtor,p.c), ta=bestAcc(p.creditor,p.c)||fa;
      if(fa) openModal('mov',{m:null,type:'transfer',pay:{owner:p.debtor,toOwner:p.creditor,kind:'repay',cents:p.cents,from:fa,to:ta}});
      else openModal('mov',{m:null,type:'in',pay:{owner:p.creditor,repayFrom:p.debtor,cents:p.cents,from:ta}}); } }
  else if(act==='claim-new') openModal('claim',{});
  else if(act==='plan-ask'){ S.confirmPlan=id; render(); }
  else if(act==='plan-no'){ S.confirmPlan=''; render(); }
  else if(act==='plan-yes'){ S.plans=S.plans.filter(x=>x.id!==id); S.confirmPlan=''; persist(); onData(); toast('Cuotas canceladas'); }
  else if(act==='claim-del'){
    if(!b.dataset.sure){ b.dataset.sure='1'; b.textContent='Tocá otra vez para eliminar'; return; }
    S.claims=S.claims.filter(x=>x.id!==id); persist(); onData(); toast('Eliminado');
  }
  else if(act==='px-new') openModal('px',{hold:b.dataset.hold||S.hd||''});
  else if(act==='iown'){ S.iOwner=id||''; render(); }
  else if(act==='fab') openModal('menu');
  else if(act==='goto-inv'){ closeModal(); if(navHash()==='#inversiones'){ S.hd=''; render(); } else navGo('inversiones'); }
  else if(act==='hold-open'){ S.hd=id; S.selOp=''; render(); window.scrollTo(0,0); }
  else if(act==='hold-back'){ S.hd=''; S.selOp=''; render(); }
  else if(act==='hold-new') openModal('hold',{h:null});
  else if(act==='hold-edit') openModal('hold',{h:holdById(id)});
  else if(act==='hold-del'){ const x=S.modal.h; if(x&&canDelHold(x)){ S.hlds=S.hlds.filter(y=>y.id!==x.id); if(S.hd===x.id) S.hd=''; persist(); closeModal(); render(); toast('Tenencia eliminada'); } }
  else if(act==='op-new') openModal('op',{o:null,type:b.dataset.type||'',hold:b.dataset.hold||S.hd||''});
  else if(act==='op-edit') openModal('op',{o:S.ops.find(y=>y.id===id)});
  else if(act==='op-sel'){ S.selOp=(S.selOp===id?'':id); S.confirmOp=''; render(); }
  else if(act==='op-del-ask'){ S.confirmOp=id; S.selOp=id; render(); }
  else if(act==='op-del-no'){ S.confirmOp=''; render(); }
  else if(act==='op-del-yes'){ S.ops=S.ops.filter(y=>y.id!==id); S.movs=S.movs.filter(m=>m.opId!==id); S.confirmOp=''; S.selOp=''; persist(); render(); toast('Operación eliminada'); }
  else if(act==='cobro-new') openModal('cobro',{hold:b.dataset.hold||S.hd||''});
  else if(act==='back'){ navGo('mas'); }
  else if(act==='acc-open'){ S.acc=id; S.selMov=''; S.limit=100; render(); window.scrollTo(0,0); }
  else if(act==='acc-back'){ S.acc=''; S.selMov=''; render(); }
  else if(act==='grp-toggle'){ S.open[id]=!S.open[id]; render(); }
  else if(act==='rown'){ S.rOwner=id||''; render(); }
  else if(act==='ftype'){ S.fType=id||''; S.limit=100; render(); }
  else if(act==='mov-sel'){ S.selMov=(S.selMov===id?'':id); S.confirmDel=''; render(); }
  else if(act==='mov-edit') openModal('mov',{m:S.movs.find(x=>x.id===id)});
  else if(act==='acc-new') openModal('acc',{a:null,group:b.dataset.group||'',cur:b.dataset.cur||''});
  else if(act==='acc-edit') openModal('acc',{a:accById(id)});
  else if(act==='acc-del'){ const a=S.modal.a; if(a&&canDelAcc(a)){ S.accounts=S.accounts.filter(x=>x.id!==a.id); persist(); closeModal(); onData(); toast('Cuenta eliminada'); } }
  else if(act==='del-ask'){ S.confirmDel=id; S.selMov=id; render(); }
  else if(act==='del-no'){ S.confirmDel=''; render(); }
  else if(act==='del-yes'){ S.confirmDel=''; S.selMov=''; delMov(id); toast('Movimiento eliminado'); }
  else if(act==='more'){ S.limit+=100; render(); }
  else if(act==='export') exportBackup();
  else if(act==='import'){ const f=$('#imp-file'); if(f) f.click(); }
  else if(act==='imp-yes'){ applyData(S.modal.data); persist(); closeModal(); onData(); toast('Copia restaurada'); }
  else if(act==='chart'){ S.chartAcc=id||''; render(); }
  else if(act==='owner-new') openModal('owner',{o:null});
  else if(act==='owner-edit') openModal('owner',{o:S.owners.find(x=>x.id===id)});
  else if(act==='owner-del'){ const o=S.modal.o; S.owners=S.owners.filter(x=>x.id!==o.id); if(S.lastOwner===o.id) S.lastOwner='yo'; persist(); closeModal(); render(); toast('Dueño eliminado'); }
  else if(act==='card-new') openModal('card',{c:null});
  else if(act==='card-edit') openModal('card',{c:S.cards.find(x=>x.id===id)});
  else if(act==='cat-kw-add'||act==='cat-kw-del'){
    const c=S.modal&&S.modal.c; if(!c) return;
    const nm=$('#n-name')?$('#n-name').value:c.name;
    if(act==='cat-kw-add'){
      const raw=$('#k-kw').value.trim(), k=normDesc(raw).replace(/\*/g,'').trim();
      if(!k){ $('#n-err').textContent='Escribí el nombre del comercio (palabras como «Merpago» se ignoran).'; return; }
      const key=k+'*'; S.rules=S.rules.filter(r=>r.k!==key); S.rules.push({k:key,cat:c.id});
      let n=0; S.exp.forEach(x=>{ if(x.cat==='sin'&&kwMatch(normDesc(x.desc),key)){ x.cat=c.id; n++; } });
      persist(); openModal('cat',{c:c,name:nm});
      toast(n?'Agregado · '+n+' consumos pasaron a esta categoría':'Agregado');
    }else{
      const k=b.dataset.k; S.rules=S.rules.filter(r=>!(r.k===k&&r.cat===c.id)); persist(); openModal('cat',{c:c,name:nm});
    }
  }
  else if(act==='stmt-month') openModal('smonth',{id:id});
  else if(act==='cat-new') openModal('cat',{c:null});
  else if(act==='cat-edit') openModal('cat',{c:S.cats.find(x=>x.id===id)});
  else if(act==='cat-del'){
    const c=S.modal.c;
    if(!S.modal.confirmDel){ S.modal.confirmDel=true; b.textContent='Tocá otra vez para eliminar'; return; }
    S.exp.forEach(x=>{ if(x.cat===c.id) x.cat='sin'; });
    S.cats=S.cats.filter(x=>x.id!==c.id); S.rules=S.rules.filter(r=>r.cat!==c.id);
    if(S.xCat===c.id) S.xCat='';
    persist(); closeModal(); render(); toast('Categoría eliminada');
  }
  else if(act==='stmt-new') openStmt();
  else if(act==='s-file'){ const f=$('#s-file'); if(f) f.click(); }
  else if(act==='s-manual') stmtManual();
  else if(act==='rv-back'){ S.modal.step=1; $('#modal').innerHTML=wrapModal(stmtStep1()); const f=$('#s-text'); if(f) f.focus(); }
  else if(act==='rv-add'){ const sh=$('.sheet.wide'), top=sh?sh.scrollTop:0; S.modal.rows.push(blankRow(S.modal.period)); S.modal.parsedZero=false; stmtShowReview(); const s2=$('.sheet.wide'); if(s2) s2.scrollTop=top+9999; }
  else if(act==='rv-import') importReview();
  else if(act==='xcat'){ S.xCat=(S.xCat===id)?'':(id||''); S.xLimit=100; render(); }
  else if(act==='xmore'){ S.xLimit+=100; render(); }
  else if(act==='xdel-ask'){ S.confirmX=id; render(); }
  else if(act==='xdel-no'){ S.confirmX=''; render(); }
  else if(act==='xdel-yes'){ S.confirmX=''; S.exp=S.exp.filter(x=>x.id!==id); persist(); render(); toast('Consumo eliminado'); }
  else if(act==='stmt-del-ask'){ S.confirmS=id; render(); }
  else if(act==='stmt-del-no'){ S.confirmS=''; render(); }
  else if(act==='stmt-del-yes'){ S.confirmS=''; S.exp=S.exp.filter(x=>x.stmt!==id); S.stmts=S.stmts.filter(x=>x.id!==id); persist(); render(); toast('Resumen eliminado'); }
});
document.addEventListener('submit',e=>{
  e.preventDefault();
  const f=e.target.id;
  if(f==='mform') saveMov(); else if(f==='uform') saveUpd(); else if(f==='aform') saveAcc();
  else if(f==='cform') saveCard(); else if(f==='kform') saveCat(); else if(f==='wform') saveOwner(); else if(f==='sform') stmtAnalyze(); else if(f==='pform') saveSMonth();
  else if(f==='vform') savePx(); else if(f==='hform') saveHold(); else if(f==='oform') saveOp(); else if(f==='bform') saveCobro();
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.filter){ S[t.dataset.filter]=t.value; S.limit=100; S.xLimit=100; if(t.dataset.filter==='xPeriod') S.xCat=''; render(); }
  else if(t.dataset&&t.dataset.xcat){ setExpCat(t.dataset.xcat,t.value); }
  else if(t.dataset&&t.dataset.f){ reviewField(t); }
  else if(t.name==='mtype'||t.name==='mmode') toggleTo();
  else if(t.id==='m-to'){ if(S.modal) S.modal.toTouched=true; refreshMovForm(); }
  else if(t.id==='m-kind'){ if(S.modal) S.modal.kindTouched=true; refreshMovForm(); }
  else if(t.id==='m-acc'||t.id==='m-to'||t.id==='m-own'||t.id==='m-toown'||t.id==='m-for') refreshMovForm();
  else if(t.id==='o-hold') updOpTotal();
  else if(t.id==='u-date') updPreview();
  else if(t.id==='imp-file') readImport(t);
  else if(t.id==='s-file'){
    const f=t.files&&t.files[0]; if(!f) return;
    if(/\.pdf$/i.test(f.name)||f.type==='application/pdf'){ t.value=''; readPdfFile(f); return; }
    const r=new FileReader(); r.onload=()=>{ const ta=$('#s-text'); if(ta) ta.value=String(r.result); }; r.readAsText(f); t.value='';
  }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='mq'){ S.fQ=t.value; S.limit=100; S.qf=true; render(); return; }
  if(t.closest&&t.closest('#uform')) updPreview();
  else if(t.dataset&&t.dataset.f) reviewField(t);
  else if(t.closest&&t.closest('#mform,#oform')&&S.modal){ S.modal.negOK=false; S.modal.repOK=false; if(t.id==='m-amt'||t.id==='m-amt2') updRate(); if(t.closest('#mform')) refreshMovForm(); if(t.closest('#oform')) updOpTotal(); }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&S.modal) closeModal(); });
const TABS=['resumen','movimientos','rendimientos','tarjetas','analisis','ajustes','mas','inversiones','deudas'];
function readHash(){ const h=navHash().replace('#',''); S.tab=TABS.indexOf(h)>-1?h:'resumen'; }
window.addEventListener('hashchange',()=>{ readHash(); S.acc=''; S.hd=''; S.selMov=''; S.selOp=''; render(); window.scrollTo(0,0); });
document.addEventListener('click',e=>{ const a=e.target.closest&&e.target.closest('a[data-tab]'); if(a&&(S.acc||S.hd)){ S.acc=''; S.hd=''; render(); } });

/* ---------- Arranque ---------- */
function fail(msg){ S.error=msg; render(); }
function onData(){
  S.accounts=S.accounts.map(a=>Object.assign({initial:0,yields:false},a));
  S.movs.sort((a,b)=>(a.date<b.date?-1:a.date>b.date?1:((a.createdAt||0)-(b.createdAt||0))||(a.id<b.id?-1:1)));
  render();
}
function init(){
  try{ S.hide=localStorage.getItem('cuentas-hide')==='1'; }catch(_){}
  readHash();
  if(!loadStore()) return;
  S.xPeriod='';
  applyPlans();
  onData();
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&applyPlans()) onData(); });
  armAutoBackup();
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(_){}
}
/* Solo para las pruebas automáticas (tests/probar.py): se activa abriendo la app con ?test en la dirección. */
if(location.search.indexOf('test')>-1) window.__T={S:S,debtPairs:debtPairs,balance:balance,accById:accById,persist:persist,onData:onData,render:render,todayStr:todayStr,openModal:openModal,stmtShowReview:stmtShowReview,cardReminder:cardReminder,cardAccFor:cardAccFor,applyPlans:applyPlans,ownerBalances:ownerBalances,normalizeData:normalizeData,backupJson:backupJson};
init();
})();
