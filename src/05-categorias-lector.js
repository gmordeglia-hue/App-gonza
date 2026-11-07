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

