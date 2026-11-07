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

