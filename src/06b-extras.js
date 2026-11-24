/* ---------- Extras: informe por dueño, presupuestos y metas, gastos fijos, cierre de mes, resumen del mes ---------- */
const PARISH_CATS=[['mat','Materiales de catequesis'],['mision','Misión y retiros'],['liturgia','Liturgia y templo'],['libreria','Librería y fotocopias']];
const monthEnd=ym=>ym+'-'+pad(new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate());
const nextMonth=ym=>{ let y=+ym.slice(0,4), m=+ym.slice(5,7)+1; if(m>12){ m=1; y++; } return y+'-'+pad(m); };
const isClosed=date=>(S.closed||[]).indexOf(String(date).slice(0,7))>-1;
const arsAccs=()=>S.accounts.filter(a=>a.kind!=='card'&&a.cur!=='USD');
/* Un gasto cuenta para quien se gastó (los dueños de «para quién»), no solo para quien puso la plata. */
const benShare=(m,o)=>m.for?(m.for[o]||0):((m.owner||'yo')===o?m.cents:0);
const isInvOp=m=>!!(m.internal||m.opId);
/* Si la fecha cae en un mes cerrado, pasa al primer día del mes abierto siguiente (sin pasarse de hoy). */
function openDate(dt,today){ let d=dt; for(let i=0;i<60&&isClosed(d);i++) d=nextMonth(d.slice(0,7))+'-01'; return d>today?today:d; }

/* ----- Gastos fijos: se anotan solos cada mes ----- */
function applyFixed(){
  const today=todayStr(); let ch=false;
  (S.fixed||[]).forEach(f=>{
    for(let g=0;g<36;g++){
      const nm=nextMonth(f.last), dt=nm+'-'+pad(Math.min(f.day,+monthEnd(nm).slice(8,10)));
      if(dt>today) break;
      f.last=nm; ch=true;
      const od=openDate(dt,today), mv=Object.assign({},f.data,{id:newId(),date:od,fx:f.id,createdAt:Date.now()+g});
      if(od!==dt) mv.note=(f.data.note||typeLabel(f.data.type))+' (de '+monthLabel(nm)+')';
      S.movs.push(mv);
    }
  });
  if(ch) persist();
  return ch;
}
function fixedBlock(){
  if(!(S.fixed||[]).length) return '';
  return '<section><h2 class="sec">Gastos fijos (se anotan solos cada mes)</h2><div class="list-head">'+S.fixed.map(f=>{
    const a=accById(f.data.account), cur=curOf(f.data.account);
    const acts=S.confirmFx===f.id
      ?'<span>¿Dejar de repetirlo?</span><button class="link danger" data-act="fx-yes" data-id="'+esc(f.id)+'">Sí</button><button class="link" data-act="fx-no">No</button>'
      :'<button class="link" data-act="fx-edit" data-id="'+esc(f.id)+'">Cambiar monto</button><button class="link danger" data-act="fx-ask" data-id="'+esc(f.id)+'">Dejar de repetir</button>';
    return '<div class="mov"><div><div class="mov-t">'+esc(f.data.note||typeLabel(f.data.type))+' · '+amt(money(f.data.cents,cur))+'</div><div class="mov-s">El día '+f.day+' de cada mes · '+esc(accLabel(a))+(f.data.owner&&f.data.owner!=='yo'?' · '+esc(ownerName(f.data.owner)):'')+'</div></div><div class="mov-actions">'+acts+'</div></div>';
  }).join('')+'</div></section>';
}

/* ----- Gastos por categoría (cuentas y efectivo) ----- */
function monthSpend(ym,owner){
  const by={}; let tot=0;
  S.movs.forEach(m=>{
    if(m.type!=='out'||m.date.slice(0,7)!==ym||curOf(m.account)!=='ARS'||isInvOp(m)) return;
    const v=owner?benShare(m,owner):m.cents; if(!v) return;
    const c=m.cat||'sin'; by[c]=(by[c]||0)+v; tot+=v;
  });
  return {by:by,tot:tot};
}
function catSpendBlock(fo){
  const ym=todayStr().slice(0,7), r=monthSpend(ym,fo);
  let h='<section><h2 class="sec">Gastos de '+esc(monthLabel(ym))+' por categoría</h2>';
  const ent=Object.keys(r.by).map(k=>[k,r.by[k]]).sort((a,b)=>b[1]-a[1]);
  if(!ent.length) return h+'<div class="note">Cuando cargues egresos con su categoría, acá ves en qué se va la plata.</div></section>';
  h+='<div class="list-head">'+ent.map(x=>'<div class="catrow" style="cursor:default"><span class="cat-name">'+esc(catName(x[0]))+'</span><span class="cat-amt">'+amt(money(x[1]))+'</span><span class="cat-sub">'+p0.format(x[1]/r.tot*100)+'%'+'</span></div>').join('')+'</div>';
  return h+'<p class="an-note">Total: '+amt(money(r.tot))+'. Los consumos de los resúmenes de tarjeta se ven más abajo.</p></section>';
}

/* ----- Informe por dueño ----- */
function informeData(o,from,to){
  const accs=arsAccs(), ids=new Set(accs.map(a=>a.id)), prev=addDays(from,-1);
  let open=0, close=0; accs.forEach(a=>{ open+=(ownerBalances(a,prev)[o]||0); close+=(ownerBalances(a,to)[o]||0); });
  const B={ing:0,yld:0,out:{},tra:0,otr:0}, rows=[];
  S.movs.forEach(m=>{
    if(m.date<from||m.date>to) return;
    let v=0; [m.account,m.to].filter((x,i,ar)=>x&&ar.indexOf(x)===i&&ids.has(x)).forEach(id=>{ v+=effectOwner(m,id,o); });
    if(v===0) return;
    if(m.type==='in') B.ing+=v;
    else if(m.type==='yield') B.yld+=v;
    else if(m.type==='out'&&!isInvOp(m)){ const c=m.cat||'sin'; B.out[c]=(B.out[c]||0)+v; }
    else if(m.type==='transfer'&&m.toOwner&&m.toOwner!==(m.owner||'yo')) B.tra+=v;
    else B.otr+=v;
    rows.push({date:m.date,note:m.note||typeLabel(m.type),cat:m.type==='out'?catName(m.cat||'sin'):'',ref:m.ref||'',acc:accLabel(accById(m.account)),v:v});
  });
  const ben={}; let benTot=0, benOtros=0;
  S.movs.forEach(m=>{ if(m.type!=='out'||m.date<from||m.date>to||isInvOp(m)||curOf(m.account)!=='ARS') return; const v=benShare(m,o); if(!v) return; const c=m.cat||'sin'; ben[c]=(ben[c]||0)+v; benTot+=v; if((m.owner||'yo')!==o) benOtros+=v; });
  rows.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  const outTot=Object.keys(B.out).reduce((s,k)=>s+B.out[k],0);
  return {open:open,close:close,B:B,outTot:outTot,rows:rows,ben:ben,benTot:benTot,benOtros:benOtros,debts:debtPairs().filter(p=>p.debtor===o||p.creditor===o)};
}
function infState(){
  const t=todayStr(), ym=t.slice(0,7);
  const o=S.owners.some(x=>x.id===S.iOwnerR)?S.iOwnerR:'yo';
  const from=S.iFrom||ym+'-01', to=S.iTo||monthEnd(ym);
  return {o:o,from:from,to:to<from?from:to};
}
function viewInforme(){
  const st=infState(), D=informeData(st.o,st.from,st.to), B=D.B;
  const wholeMonth=st.from.slice(8)==='01'&&st.to===monthEnd(st.from.slice(0,7))&&st.from.slice(0,7)===st.to.slice(0,7);
  const ym=st.from.slice(0,7), closed=wholeMonth&&isClosed(st.from);
  let h='<p class="an-note">Para rendir cuentas: cuánto tenía, cuánto entró, en qué se gastó y cuánto queda, de un dueño y en un período. Solo cuentas en pesos: no entran las cuentas en dólares ni los consumos de los resúmenes de tarjeta (sí lo que otro dueño gastó para este dueño con tarjeta, en el bloque «En qué se gastó en nombre de…»).</p>';
  h+='<div class="filters inf"><select data-filter="iOwnerR" aria-label="Dueño">'+S.owners.map(x=>opt(x.id,x.name+(x.archived?' (archivado)':''),x.id===st.o)).join('')+'</select>'
    +'<label class="small muted" style="display:grid;gap:2px">Desde<input type="date" data-filter="iFrom" value="'+esc(st.from)+'"></label>'
    +'<label class="small muted" style="display:grid;gap:2px">Hasta<input type="date" data-filter="iTo" value="'+esc(st.to)+'"></label></div>';
  const row=(t,v,cls,sub)=>'<div class="mov"><div><div class="mov-t">'+t+'</div>'+(sub?'<div class="mov-s">'+sub+'</div>':'')+'</div>'+amt(signed(v),cls)+'</div>';
  h+='<section class="total"><div class="eyebrow">Plata de '+esc(ownerName(st.o))+' al '+esc(fmtDate(st.to))+'</div><div class="big">'+amt(money(D.close),D.close<0?'neg':'')+'</div></section>';
  h+='<div class="list-head">'
    +'<div class="mov"><div><div class="mov-t">Saldo al '+esc(fmtDate(addDays(st.from,-1)))+'</div></div>'+amt(money(D.open))+'</div>'
    +(B.ing?row('Ingresos',B.ing,'pos'):'')+(B.yld?row('Rendimientos',B.yld,'pos'):'')
    +Object.keys(B.out).map(k=>[k,B.out[k]]).sort((a,b)=>a[1]-b[1]).map(x=>row('Gastos pagados con su plata · '+esc(catName(x[0])),x[1],'neg')).join('')
    +(B.tra?row('Pasó de o a otros dueños',B.tra,B.tra<0?'neg':'pos'):'')+(B.otr?row('Otros movimientos',B.otr,B.otr<0?'neg':'pos'):'')
    +'<div class="mov"><div><div class="mov-t"><b>Saldo al '+esc(fmtDate(st.to))+'</b></div></div>'+amt(money(D.close))+'</div></div>';
  if(D.benTot) h+='<h2 class="sec">En qué se gastó en nombre de '+esc(ownerName(st.o))+'</h2><div class="list-head">'+Object.keys(D.ben).map(k=>[k,D.ben[k]]).sort((a,b)=>b[1]-a[1]).map(x=>'<div class="mov"><div><div class="mov-t">'+esc(catName(x[0]))+'</div></div>'+amt(money(x[1]))+'</div>').join('')+'<div class="mov"><div><div class="mov-t"><b>Total gastado para '+esc(ownerName(st.o))+'</b></div>'+(D.benOtros?'<div class="mov-s">De eso, lo pagó otro dueño: '+money(D.benOtros)+'</div>':'')+'</div>'+amt(money(D.benTot))+'</div></div>';
  { const cm=commitData(st.o); if(cm.F>0) h+='<section class="note"><strong>Cuotas por venir de '+esc(ownerName(st.o))+':</strong> '+amt(money(cm.F))+' en '+cm.nC+' cuota(s)'+(cm.months.length?' ('+cm.months.map(m=>esc(monthShort(m[0]))+' '+money(m[1])).join(', ')+')':'')+'. Es plata que tiene que quedar disponible, además de las deudas.</section>'; }
  if(D.debts.length) h+='<section class="note"><strong>Deudas pendientes hoy</strong> (no a la fecha del informe)'+D.debts.map(p=>'<div>'+esc(ownerName(p.debtor))+' le debe '+amt(money(p.cents,p.c))+' a '+esc(ownerName(p.creditor))+esc(ageTxt(p))+'</div>').join('')+'<div class="small muted" style="margin-top:6px">El saldo de arriba no descuenta estas deudas.</div></section>';
  h+='<h2 class="sec">Detalle ('+D.rows.length+')</h2>';
  h+=D.rows.length?'<div class="list-head">'+D.rows.map(r=>'<div class="mov"><div><div class="mov-t">'+esc(r.note)+'</div><div class="mov-s">'+esc(fmtDate(r.date))+' · '+esc(r.acc)+(r.cat?' · '+esc(r.cat):'')+(r.ref?' · comp. '+esc(r.ref):'')+'</div></div>'+amt(signed(r.v),r.v<0?'neg':'pos')+'</div>').join('')+'</div>':'<div class="note">No hay movimientos de este dueño en el período.</div>';
  h+='<div class="actions"><button class="btn primary" data-act="inf-print">Imprimir o guardar PDF</button><button class="btn" data-act="inf-csv">Pasar a Excel</button><button class="btn" data-act="inf-wa">Mandar resumen por WhatsApp</button></div>';
  if(wholeMonth){
    const ended=ym<todayStr().slice(0,7);
    h+='<section class="note">'+(closed?'<strong>'+esc(monthLabel(ym))+' está cerrado:</strong> no se puede agregar, cambiar ni borrar nada de ese mes. <button class="btn sm" data-act="mes-open" data-id="'+ym+'">Reabrir el mes</button>'
      :!ended?'Cuando termine '+esc(monthLabel(ym))+' vas a poder darlo por cerrado, para que nadie lo toque por error.'
      :S.confirmMes===ym?'<strong>¿Dar por cerrado '+esc(monthLabel(ym))+'?</strong> Después no se va a poder cargar, cambiar ni borrar nada de ese mes (se puede reabrir desde acá). <button class="btn sm primary" data-act="mes-close" data-id="'+ym+'">Sí, cerrar el mes</button> <button class="btn sm" data-act="mes-no">No</button>'
      :'Cuando termines de revisar '+esc(monthLabel(ym))+', podés darlo por cerrado para que nadie lo toque por error. <button class="btn sm" data-act="mes-ask" data-id="'+ym+'">Dar el mes por cerrado</button>')+'</section>';
  }
  return h;
}
function infCsv(){
  const st=infState(), D=informeData(st.o,st.from,st.to), B=D.B;
  const q=x=>'"'+String(x).replace(/"/g,'""')+'"', n=v=>(v/100).toFixed(2).replace('.',',');
  const L=[['Informe de '+ownerName(st.o),'Del '+st.from+' al '+st.to],[],['Saldo inicial','',n(D.open)],['Ingresos','',n(B.ing)],['Rendimientos','',n(B.yld)]];
  Object.keys(B.out).forEach(k=>L.push(['Gastos · '+catName(k),'',n(B.out[k])]));
  L.push(['Traspasos con otros dueños','',n(B.tra)],['Otros movimientos','',n(B.otr)],['Saldo final','',n(D.close)]);
  if(D.benTot){ L.push([],['Gastado en nombre de '+ownerName(st.o)]); Object.keys(D.ben).forEach(k=>L.push([catName(k),'',n(D.ben[k])])); L.push(['Total gastado para este dueño','',n(D.benTot)],['De eso, lo pagó otro dueño','',n(D.benOtros)]); }
  L.push([],['Fecha','Detalle','Importe','Cuenta','Categoría','Comprobante']);
  D.rows.forEach(r=>L.push([r.date,r.note,n(r.v),r.acc,r.cat,r.ref]));
  const csv='﻿'+L.map(r=>r.map(q).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download='informe-'+slug(ownerName(st.o))+'-'+st.from+'.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast('Excel descargado');
}
function infPrint(){
  const st=infState(), D=informeData(st.o,st.from,st.to), B=D.B;
  const tr=(t,v,b)=>'<tr'+(b?' class="b"':'')+'><td>'+esc(t)+'</td><td class="r">'+money(v)+'</td></tr>';
  const sum=tr('Saldo al '+fmtDate(addDays(st.from,-1)),D.open)+(B.ing?tr('Ingresos',B.ing):'')+(B.yld?tr('Rendimientos',B.yld):'')
    +Object.keys(B.out).map(k=>tr('Gastos · '+catName(k),B.out[k])).join('')+(B.tra?tr('Pasó de o a otros dueños',B.tra):'')+(B.otr?tr('Otros movimientos',B.otr):'')+tr('Saldo al '+fmtDate(st.to),D.close,true);
  const det=D.rows.map(r=>'<tr><td>'+esc(fmtDate(r.date))+'</td><td>'+esc(r.note)+'</td><td>'+esc(r.cat)+'</td><td>'+esc(r.ref)+'</td><td class="r">'+money(r.v)+'</td></tr>').join('');
  const cmx=commitData(st.o), cmHtml=cmx.F>0?'<h2>Cuotas por venir</h2><p>'+money(cmx.F)+' en '+cmx.nC+' cuota(s)'+(cmx.months.length?': '+cmx.months.map(m=>esc(monthShort(m[0]))+' '+money(m[1])).join(', '):'')+'. Plata que tiene que quedar disponible, además de las deudas.</p>':'';
  const benHtml=D.benTot?'<h2>En qué se gastó en nombre de '+esc(ownerName(st.o))+'</h2><table>'+Object.keys(D.ben).map(k=>tr(catName(k),D.ben[k])).join('')+tr('Total gastado para '+ownerName(st.o),D.benTot,true)+(D.benOtros?tr('De eso, lo pagó otro dueño',D.benOtros):'')+'</table>':'';
  const debts=D.debts.map(p=>'<li>'+esc(ownerName(p.debtor))+' le debe '+money(p.cents,p.c)+' a '+esc(ownerName(p.creditor))+esc(ageTxt(p))+'</li>').join('');
  const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe de '+esc(ownerName(st.o))+'</title><style>@page{size:A4;margin:16mm}body{font:13px/1.4 Arial,sans-serif;color:#111}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px}p{margin:0 0 12px;color:#444}table{width:100%;border-collapse:collapse}td,th{padding:5px 6px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{background:#f1f3f6}.r{text-align:right;white-space:nowrap}tr.b td{font-weight:700;border-top:2px solid #111}</style></head><body><h1>Informe de '+esc(ownerName(st.o))+'</h1><p>Del '+esc(fmtDate(st.from))+' al '+esc(fmtDate(st.to))+' · cuentas en pesos · emitido el '+esc(fmtDate(todayStr()))+'</p><table>'+sum+'</table>'+benHtml+cmHtml+(debts?'<h2>Deudas pendientes hoy</h2><ul>'+debts+'</ul>':'')+'<h2>Detalle</h2><table><tr><th>Fecha</th><th>Detalle</th><th>Categoría</th><th>Comprobante</th><th class="r">Importe</th></tr>'+det+'</table></body></html>';
  const w=window.open('','_blank'); if(!w){ toast('El navegador bloqueó la ventana. Permitila e intentá de nuevo.'); return; }
  w.document.open(); w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(_){} },400);
}

/* ----- Presupuestos mensuales y metas por dueño ----- */
function budgetSpent(b,ym){
  let s=0;
  S.movs.forEach(m=>{ if(m.type==='out'&&!isInvOp(m)&&m.date.slice(0,7)===ym&&curOf(m.account)==='ARS'&&(m.cat||'sin')===b.cat) s+=b.owner?benShare(m,b.owner):m.cents; });
  if(!b.owner) S.exp.forEach(e=>{ if(e.period===ym&&e.cur!=='USD'&&e.cat===b.cat) s+=e.cents; });
  return s;
}
function budgetNotice(){
  const ym=todayStr().slice(0,7), over=(S.budgets||[]).filter(b=>budgetSpent(b,ym)>b.cents);
  if(!over.length) return '';
  return '<div class="notice warn"><span>Te pasaste del presupuesto de '+over.map(b=>esc(catName(b.cat))+(b.owner?' ('+esc(ownerName(b.owner))+')':'')).join(', ')+' este mes.</span><a class="btn sm" href="#metas">Ver</a></div>';
}
function goalNow(g){ let v=0; arsAccs().forEach(a=>{ v+=(ownerBalances(a)[g.owner]||0); }); return v; }
function viewMetas(){
  const ym=todayStr().slice(0,7);
  let h='<section><h2 class="sec">Presupuestos del mes ('+esc(monthLabel(ym))+')</h2><p class="an-note">Un tope por categoría. Cuenta lo que cargaste como egreso con esa categoría. Los consumos de los resúmenes de tarjeta solo cuentan en los presupuestos de «Todos los dueños».</p>';
  h+=(S.budgets||[]).length?'<div class="list-head">'+S.budgets.map(b=>{
    const sp=budgetSpent(b,ym), pc=b.cents>0?sp/b.cents:0;
    return '<button class="mov mrow-btn" data-act="bg-edit" data-id="'+esc(b.id)+'"><div><div class="mov-t">'+esc(catName(b.cat))+(b.owner?' · '+esc(ownerName(b.owner)):'')+'</div><div class="mov-s">Gastaste '+amt(money(sp))+' de '+amt(money(b.cents))+' ('+Math.round(pc*100)+'%)'+(sp>b.cents?' · <b class="neg">Te pasaste '+money(sp-b.cents)+'</b>':'')+'</div><div class="pbar'+(pc>1?' over':'')+'"><i style="width:'+Math.min(100,Math.round(pc*100))+'%"></i></div></div></button>';
  }).join('')+'</div>':'<div class="note">Todavía no hay presupuestos.</div>';
  h+='<div class="actions"><button class="btn" data-act="bg-new">Agregar presupuesto</button></div></section>';
  h+='<section><h2 class="sec">Metas y proyectos</h2><p class="an-note">Una meta de plata para un dueño: por ejemplo, lo que tiene que juntar un grupo para una misión o un retiro. Si anotás los movimientos con ese <em>Proyecto</em> (en «Más opciones» del formulario), cuenta lo que entró y lo que se gastó en el proyecto; si no, se compara con la plata que ese dueño tiene hoy en cuentas en pesos.</p>';
  h+=(S.goals||[]).length?'<div class="list-head">'+S.goals.map(g=>{
    const pj=projTotals(g), conProy=pj.i>0||pj.o>0, now=conProy?pj.i-pj.o:goalNow(g), pc=g.target>0?Math.max(0,now)/g.target:0, falta=Math.max(0,g.target-now);
    const dl=g.date?Math.ceil((new Date(g.date+'T12:00:00')-new Date(todayStr()+'T12:00:00'))/864e5):null;
    return '<button class="mov mrow-btn" data-act="gl-edit" data-id="'+esc(g.id)+'"><div><div class="mov-t">'+esc(g.name)+' · '+esc(ownerName(g.owner))+'</div><div class="mov-s">'+(conProy?'Entró '+amt(money(pj.i))+' · se gastó '+amt(money(pj.o))+' · en caja ':'Juntó ')+amt(money(Math.max(0,now)))+' de '+amt(money(g.target))+' ('+Math.round(pc*100)+'%) · falta '+amt(money(falta))+(dl!=null?' · '+(dl>=0?'quedan '+dl+' días':'pasó hace '+(-dl)+' días'):'')+'</div><div class="pbar"><i style="width:'+Math.min(100,Math.round(pc*100))+'%"></i></div>'+(pj.otros?'<div class="mov-s" style="margin-top:4px"><b>'+pj.otros+' movimiento(s) con este proyecto no cuentan</b>: son de otro dueño, en dólares o devoluciones.</div>':'')+'</div></button><div class="mov-actions" style="padding:0 14px 10px"><button class="link" data-act="gl-det" data-id="'+esc(g.id)+'">Ver detalle, imprimir o pasar a Excel</button></div>';
  }).join('')+'</div>':'<div class="note">Todavía no hay metas.</div>';
  h+='<div class="actions"><button class="btn" data-act="gl-new">Agregar meta</button></div></section>';
  return h;
}
function budgetModal(b){
  const cats=S.cats.filter(c=>c.id!=='sin');
  return '<form id="bgform" class="sheet" novalidate><h2>'+(b?'Editar presupuesto':'Nuevo presupuesto')+'</h2>'
    +'<label for="bg-cat">Categoría</label><select id="bg-cat">'+cats.map(c=>opt(c.id,c.name,b&&b.cat===c.id)).join('')+'</select>'
    +'<label for="bg-own">De quién</label><select id="bg-own">'+opt('','Todos los dueños',!b||!b.owner)+liveOwners(b&&b.owner).map(o=>opt(o.id,o.name,b&&b.owner===o.id)).join('')+'</select>'
    +'<label for="bg-amt">Tope por mes ($)</label><input id="bg-amt" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+(b?centsToInput(b.cents):'')+'" data-focus>'
    +'<p class="err" id="bg-err" role="alert"></p><div class="sheet-actions">'+(b?'<button type="button" class="btn danger" data-act="bg-del" data-id="'+esc(b.id)+'">Borrar</button>':'')+'<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
function saveBudget(){
  const err=$('#bg-err'), cents=parseAmt($('#bg-amt').value), b=S.modal.b;
  if(isNaN(cents)||cents<=0){ err.textContent='Ingresá un tope mayor a cero.'; return; }
  const d={cat:$('#bg-cat').value,owner:$('#bg-own').value,cents:cents};
  if(b) Object.assign(b,d); else S.budgets.push(Object.assign({id:newId()},d));
  persist(); closeModal(); render(); toast('Guardado');
}
function goalModal(g){
  return '<form id="glform" class="sheet" novalidate><h2>'+(g?'Editar meta':'Nueva meta')+'</h2>'
    +'<label for="gl-name">Nombre</label><input id="gl-name" maxlength="60" autocomplete="off" placeholder="Misión 2027" value="'+esc(g?g.name:'')+'" data-focus>'
    +'<label for="gl-own">De quién es la plata</label><select id="gl-own">'+liveOwners(g&&g.owner).map(o=>opt(o.id,o.name,g?g.owner===o.id:false)).join('')+'</select>'
    +'<label for="gl-amt">Cuánto hay que juntar ($)</label><input id="gl-amt" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+(g?centsToInput(g.target):'')+'">'
    +'<label for="gl-date">Para cuándo (opcional)</label><input id="gl-date" type="date" value="'+esc(g&&g.date?g.date:'')+'">'
    +'<p class="err" id="gl-err" role="alert"></p><div class="sheet-actions">'+(g?'<button type="button" class="btn danger" data-act="gl-del" data-id="'+esc(g.id)+'">Borrar</button>':'')+'<button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
function saveGoal(){
  const err=$('#gl-err'), cents=parseAmt($('#gl-amt').value), name=$('#gl-name').value.trim(), g=S.modal.g;
  if(!name){ err.textContent='Poné un nombre.'; return; }
  if(isNaN(cents)||cents<=0){ err.textContent='Ingresá cuánto hay que juntar.'; return; }
  const d={name:name,owner:$('#gl-own').value,target:cents,date:$('#gl-date').value||''};
  if(g) Object.assign(g,d); else S.goals.push(Object.assign({id:newId()},d));
  persist(); closeModal(); render(); toast('Guardado');
}

function fixedModal(f){
  if(!f) return '<div class="sheet"><h2>Gasto fijo</h2><p class="hint">Ya no existe.</p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cerrar</button></div></div>';
  return '<form id="fxform" class="sheet" novalidate><h2>Cambiar gasto fijo</h2><p class="hint">El cambio vale desde el próximo mes: lo ya anotado no se toca.</p>'
    +'<label for="fx-note">Detalle</label><input id="fx-note" maxlength="120" autocomplete="off" value="'+esc(f.data.note||'')+'">'
    +'<label for="fx-amt">Monto por mes</label><input id="fx-amt" inputmode="decimal" autocomplete="off" value="'+centsToInput(f.data.cents)+'" data-focus>'
    +'<p class="err" id="fx-err" role="alert"></p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar</button></div></form>';
}
function saveFixed(){
  const f=S.modal.f, err=$('#fx-err'), cents=parseAmt($('#fx-amt').value);
  if(isNaN(cents)||cents<=0){ err.textContent='Ingresá un monto mayor a cero.'; return; }
  f.data.cents=cents; f.data.note=$('#fx-note').value.trim(); if(f.data.for) f.data.for=allocate(cents,f.data.for);
  persist(); closeModal(); render(); toast('Guardado');
}

/* ----- Inicio: avisos y resumen del mes ----- */
function negNotice(){
  const bad=[];
  S.accounts.forEach(a=>{ if(a.kind==='card'||a.archived) return; const ob=ownerBalances(a); S.owners.forEach(o=>{ if((ob[o.id]||0)<0) bad.push({a:a,o:o,v:ob[o.id]}); }); });
  if(!bad.length) return '';
  const x=bad[0];
  return '<div class="notice warn"><span><b>'+esc(x.o.name)+'</b> gastó '+money(-x.v,curOf(x.a.id))+' de más en '+esc(accLabel(x.a))+': usó plata de otro dueño y no quedó anotado como deuda.</span><button class="btn sm" data-act="mov-new" data-move="'+esc(x.a.id)+'">Anotar deuda</button></div>';
}
function monthCard(fo){
  const t=todayStr(), ym=t.slice(0,7), pm=addDays(ym+'-01',-1).slice(0,7);
  const cur=monthSpend(ym,fo).tot, prv=monthSpend(pm,fo).tot;
  const last=S.movs.filter(m=>m.type!=='yield'&&(!fo||ownerHas(m,fo))).slice().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:((b.createdAt||0)-(a.createdAt||0))).slice(0,3);
  let h='<section class="usd-card"><div class="eyebrow">Este mes</div><div class="usd-fig">'+amt(money(cur))+'</div><div class="total-sub"><span>gastado en '+esc(monthLabel(ym))+'</span>'+(prv>0?'<span>'+(cur>prv?'<span class="neg">+':'<span class="pos">')+Math.round((cur-prv)/prv*100)+'% vs '+esc(monthShort(pm))+'</span></span>':'')+'</div>';
  if(prv>0) h+='<div class="pbar'+(cur>prv?' over':'')+'" style="margin-top:8px"><i style="width:'+Math.min(100,Math.round(cur/prv*100))+'%"></i></div>';
  if(last.length) h+='<div style="margin-top:10px">'+last.map(m=>'<div class="mov"><div><div class="mov-t">'+esc(m.note||typeLabel(m.type))+'</div><div class="mov-s">'+esc(fmtDate(m.date,true))+' · '+esc(accLabel(accById(m.account)))+'</div></div>'+amt(money(m.cents,curOf(m.account)),m.type==='out'?'neg':m.type==='in'?'pos':'muted')+'</div>').join('')+'</div>';
  return h+'</section>';
}

/* ----- Acciones de estas pantallas (las llama el manejador de toques) ----- */
function extraAct(act,id){
  switch(act){
    case 'inf-print': infPrint(); return true;
    case 'inf-csv': infCsv(); return true;
    case 'inf-wa': infWa(); return true;
    case 'mes-ask': S.confirmMes=id; render(); return true;
    case 'mes-no': S.confirmMes=''; render(); return true;
    case 'mes-close': if(id>=todayStr().slice(0,7)){ toast('Ese mes todavía no terminó.'); return true; } if(S.closed.indexOf(id)<0) S.closed.push(id); S.confirmMes=''; persist(); render(); toast('Mes cerrado'); return true;
    case 'mes-open': S.closed=S.closed.filter(x=>x!==id); persist(); render(); toast('Mes reabierto'); return true;
    case 'bg-new': openModal('budget',{b:null}); return true;
    case 'bg-edit': openModal('budget',{b:S.budgets.find(x=>x.id===id)||null}); return true;
    case 'bg-del': if(!S.modal||!S.modal.confirmDel){ if(S.modal) S.modal.confirmDel=true; const bt=document.querySelector('[data-act=bg-del]'); if(bt) bt.textContent='Tocá otra vez para borrar'; return true; } S.budgets=S.budgets.filter(x=>x.id!==id); persist(); closeModal(); render(); toast('Presupuesto borrado'); return true;
    case 'gl-det': openModal('projdet',{g:S.goals.find(x=>x.id===id)||null}); return true;
    case 'gl-csv': { const g=S.goals.find(x=>x.id===id); if(g) projCsv(g); return true; }
    case 'gl-pdf': { const g=S.goals.find(x=>x.id===id); if(g) projPrint(g); return true; }
    case 'gl-new': openModal('goal',{g:null}); return true;
    case 'gl-edit': openModal('goal',{g:S.goals.find(x=>x.id===id)||null}); return true;
    case 'gl-del': if(!S.modal||!S.modal.confirmDel){ if(S.modal) S.modal.confirmDel=true; const bt=document.querySelector('[data-act=gl-del]'); if(bt) bt.textContent='Tocá otra vez para borrar'; return true; } S.goals=S.goals.filter(x=>x.id!==id); persist(); closeModal(); render(); toast('Meta borrada'); return true;
    case 'fx-edit': openModal('fixed',{f:S.fixed.find(x=>x.id===id)||null}); return true;
    case 'owner-arch': { const o=S.owners.find(x=>x.id===id); if(!o) return true; if(o.archived){ o.archived=false; persist(); closeModal(); render(); toast('Dueño reactivado'); return true; } const why=ownerBusy(id); if(why){ toast('No se puede archivar: '+why+'.'); return true; } o.archived=true; if(S.rOwner===id) S.rOwner='yo'; persist(); closeModal(); render(); toast('Dueño archivado'); return true; }
    case 'fx-ask': S.confirmFx=id; render(); return true;
    case 'fx-no': S.confirmFx=''; render(); return true;
    case 'fx-yes': S.fixed=S.fixed.filter(x=>x.id!==id); S.confirmFx=''; persist(); render(); toast('Ya no se repite'); return true;
  }
  return false;
}

/* ----- Tanda 4 ----- */
/* Tarjetas: si hay cuentas de tarjeta y todavía no hay «tarjetas» para subir resúmenes, se crean enlazadas a esas cuentas. */
function ensureCards(){
  if(S.cards.length) return false;
  const cc=S.accounts.filter(a=>a.kind==='card'&&!a.archived); if(!cc.length) return false;
  cc.forEach(a=>S.cards.push({id:slug(accLabel(a))+'-'+Math.random().toString(36).slice(2,6),name:accLabel(a),account:a.id}));
  return true;
}
/* Antigüedad de una deuda: lo que se devuelve se descuenta primero de lo más viejo; devuelve cuántos días tiene lo más viejo que sigue sin devolverse. */
function debtAge(p){
  const L=p.items.map(it=>({d:it.m.date,v:it.a===p.debtor?it.v:-it.v})).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0), Q=[];
  L.forEach(x=>{ if(x.v>0) Q.push({d:x.d,v:x.v}); else { let r=-x.v; while(r>0&&Q.length){ const t=Math.min(r,Q[0].v); Q[0].v-=t; r-=t; if(Q[0].v<=0) Q.shift(); } } });
  return Q.length?daysBetween(Q[0].d,todayStr()):0;
}
const diasTxt=d=>d+(d===1?' día':' días');
function ageTxt(p){ const d=debtAge(p); return d>=1?' (desde hace '+diasTxt(d)+')':''; }
function ageTag(p){ const d=debtAge(p); if(d<1) return ''; return ' · '+(d>60?'<b class="neg">hace '+diasTxt(d)+'</b>':'hace '+diasTxt(d)); }
/* Resumen del informe en texto, para mandarlo por WhatsApp. */
function infWa(){
  const st=infState(), D=informeData(st.o,st.from,st.to), B=D.B, n=v=>money(v);
  const L=['*Informe de '+ownerName(st.o)+'*','Del '+fmtDate(st.from)+' al '+fmtDate(st.to),'','Saldo inicial: '+n(D.open)];
  if(B.ing) L.push('Ingresos: '+n(B.ing)); if(B.yld) L.push('Rendimientos: '+n(B.yld));
  Object.keys(B.out).map(k=>[k,B.out[k]]).sort((a,b)=>a[1]-b[1]).forEach(x=>L.push('Gastos · '+catName(x[0])+': '+n(x[1])));
  if(B.tra) L.push('Con otros dueños: '+n(B.tra)); if(B.otr) L.push('Otros movimientos: '+n(B.otr));
  L.push('*Saldo final: '+n(D.close)+'*');
  if(D.benTot){ L.push('','En nombre de '+ownerName(st.o)+' se gastó: '+n(D.benTot)+(D.benOtros?' (pagó otro dueño: '+n(D.benOtros)+')':'')); }
  { const cm=commitData(st.o); if(cm.F>0) L.push('','Cuotas por venir: '+n(cm.F)+' ('+cm.nC+')'+(cm.months.length?' · '+cm.months.map(m=>monthShort(m[0])+' '+n(m[1])).join(', '):'')); }
  if(D.debts.length) L.push('');
  D.debts.forEach(p=>L.push(ownerName(p.debtor)+' le debe '+money(p.cents,p.c)+' a '+ownerName(p.creditor)+ageTxt(p)));
  L.push('','(Resumen. El detalle con comprobantes está en el PDF.)');
  const w=window.open('https://wa.me/?text='+encodeURIComponent(L.join('\n')),'_blank'); if(!w) toast('El navegador bloqueó la ventana. Permitila e intentá de nuevo.');
}
function projTotals(g){ let i=0,o=0,otros=0; S.movs.forEach(m=>{ if(m.proj!==g.id) return; if(curOf(m.account)!=='ARS'){ otros++; return; } if(m.type==='in'){ if((m.owner||'yo')===g.owner&&!m.repayFrom) i+=m.cents; else otros++; } else if(m.type==='out'){ const v=benShare(m,g.owner); if(v) o+=v; else otros++; } }); return {i:i,o:o,otros:otros}; }
function projRows(g){
  return S.movs.filter(m=>m.proj===g.id&&curOf(m.account)==='ARS'&&(m.type==='in'||m.type==='out')).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).map(m=>({date:m.date,note:m.note||typeLabel(m.type),cat:m.type==='out'?catName(m.cat||'sin'):'',ref:m.ref||'',own:ownerName(m.owner||'yo'),v:m.type==='in'?m.cents:-m.cents}));
}
function projModal(g){
  if(!g) return '<div class="sheet"><h2>Proyecto</h2><p class="hint">Ya no existe.</p><div class="sheet-actions"><button type="button" class="btn" data-act="close">Cerrar</button></div></div>';
  const R=projRows(g), t=projTotals(g);
  return '<div class="sheet"><h2>'+esc(g.name)+'</h2><p class="hint">Entró '+money(t.i)+' · se gastó '+money(t.o)+' · en caja '+money(t.i-t.o)+' de '+money(g.target)+'. Solo cuentas en pesos.</p>'
    +'<div class="list-head" style="max-height:46vh;overflow:auto">'+(R.length?R.map(r=>'<div class="mov"><div><div class="mov-t">'+esc(r.note)+'</div><div class="mov-s">'+esc(fmtDate(r.date))+' · '+esc(r.own)+(r.cat?' · '+esc(r.cat):'')+(r.ref?' · comp. '+esc(r.ref):'')+'</div></div>'+amt(signed(r.v),r.v<0?'neg':'pos')+'</div>').join(''):'<div class="note">Todavía no hay movimientos con este proyecto.</div>')+'</div>'
    +'<div class="sheet-actions"><button type="button" class="btn" data-act="gl-csv" data-id="'+esc(g.id)+'">Excel</button><button type="button" class="btn" data-act="gl-pdf" data-id="'+esc(g.id)+'">Imprimir o PDF</button><button type="button" class="btn primary" data-act="close">Cerrar</button></div></div>';
}
function projCsv(g){
  const q=x=>'"'+String(x).replace(/"/g,'""')+'"', n=v=>(v/100).toFixed(2).replace('.',','), R=projRows(g), t=projTotals(g);
  const L=[['Proyecto',g.name],['Entró','',n(t.i)],['Se gastó','',n(t.o)],['En caja','',n(t.i-t.o)],[],['Fecha','Detalle','Importe','Dueño','Categoría','Comprobante']].concat(R.map(r=>[r.date,r.note,n(r.v),r.own,r.cat,r.ref]));
  const csv='\ufeff'+L.map(r=>r.map(q).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download='proyecto-'+slug(g.name)+'-'+todayStr()+'.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast('Excel descargado');
}
function projPrint(g){
  const R=projRows(g), t=projTotals(g);
  const det=R.map(r=>'<tr><td>'+esc(fmtDate(r.date))+'</td><td>'+esc(r.note)+'</td><td>'+esc(r.own)+'</td><td>'+esc(r.cat)+'</td><td>'+esc(r.ref)+'</td><td class="r">'+money(r.v)+'</td></tr>').join('');
  const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+esc(g.name)+'</title><style>@page{size:A4;margin:16mm}body{font:13px/1.4 Arial,sans-serif;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;color:#444}table{width:100%;border-collapse:collapse}td,th{padding:5px 6px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{background:#f1f3f6}.r{text-align:right;white-space:nowrap}</style></head><body><h1>'+esc(g.name)+'</h1><p>Entró '+money(t.i)+' · se gastó '+money(t.o)+' · en caja '+money(t.i-t.o)+' de '+money(g.target)+' · emitido el '+esc(fmtDate(todayStr()))+'</p><table><tr><th>Fecha</th><th>Detalle</th><th>Dueño</th><th>Categoría</th><th>Comprobante</th><th class="r">Importe</th></tr>'+det+'</table></body></html>';
  const w=window.open('','_blank'); if(!w){ toast('El navegador bloqueó la ventana. Permitila e intentá de nuevo.'); return; }
  w.document.open(); w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(_){} },400);
}

/* ----- Plata comprometida: cuotas por venir + deuda de hoy, por dueño ----- */
function commitData(o){
  const mon={}; let F=0, nC=0;
  (S.plans||[]).forEach(p=>{
    for(let k=p.done+1;k<=p.n;k++){
      const cq=planCuota(p,k); let v;
      if(p.data.for) v=(p.total!=null?allocate(cq,p.data.for):p.data.for)[o]||0; else v=(p.data.owner||'yo')===o?cq:0;
      if(!v||curOf(p.data.account)!=='ARS') continue;
      const ym=planDate(p.start,k-1).slice(0,7); mon[ym]=(mon[ym]||0)+v; F+=v; nC++;
    }
  });
  let D=0; debtPairs().forEach(p=>{ if(p.debtor===o&&p.c==='ARS') D+=p.cents; });
  let have=0; arsAccs().forEach(a=>{ have+=(ownerBalances(a)[o]||0); });
  return {F:F,nC:nC,D:D,have:have,libre:have-D-F,months:Object.keys(mon).sort().map(k=>[k,mon[k]])};
}
function commitCard(fo){
  if(!fo) return '';
  const c=commitData(fo); if(!(c.F>0||c.D>0)) return '';
  let h='<section class="usd-card"><div class="eyebrow">Comprometido para pagar · '+esc(ownerName(fo))+'</div><div class="usd-fig">'+amt(money(c.D+c.F))+'</div>';
  h+='<div class="total-sub">'+(c.D?'<span>Deuda de hoy '+amt(money(c.D))+'</span>':'')+(c.F?'<span>Cuotas por venir '+amt(money(c.F))+' ('+c.nC+')</span>':'')+'</div>';
  h+='<div class="total-sub" style="margin-top:6px"><span>Plata de '+esc(ownerName(fo))+' '+amt(money(c.have))+'</span><span>Libre '+amt(money(c.libre),c.libre<0?'neg':'pos')+'</span></div>';
  if(c.months.length) h+='<div class="total-sub" style="margin-top:6px">'+c.months.map(m=>'<span>'+esc(monthShort(m[0]))+' '+amt(money(m[1]))+'</span>').join('')+'</div>';
  return h+'<p class="small muted" style="margin:8px 0 0">La plata sigue siendo de '+esc(ownerName(fo))+' y sigue rindiendo; esto es lo que tiene que quedar disponible para pagar las cuotas y devolver lo que se debe.</p></section>';
}

/* ----- Archivar dueños (para los que están «por un tiempo») ----- */
function ownerBusy(o){
  if(S.accounts.some(a=>Math.abs((ownerBalances(a)[o]||0))>0)) return 'todavía tiene plata en alguna cuenta';
  if(debtPairs().some(p=>p.debtor===o||p.creditor===o)) return 'todavía tiene deudas con otros dueños';
  if(S.plans.some(p=>p.data.owner===o||(p.data.for&&p.data.for[o]))||S.fixed.some(f=>f.data.owner===o||(f.data.for&&f.data.for[o]))) return 'todavía tiene cuotas o gastos fijos';
  return '';
}
/* ----- Gastos de tarjeta para otros dueños: se cargan antes y se reconocen al subir el resumen ----- */
const prePend=()=>S.movs.filter(m=>m.type==='out'&&isCard(m.account)&&!m.stmt&&m.for&&Object.keys(m.for).some(k=>k!==(m.owner||'yo')));
function matchPre(M){
  if(M.preDone) return; M.preDone=true;
  const ex=S.stmts.find(x=>x.card===M.card&&x.period===M.period);
  const forOther=m=>m.for&&Object.keys(m.for).some(k=>k!==(m.owner||'yo'));
  /* Candidatos: lo cargado antes y todavía sin resumen, y lo que ya estaba en este mismo resumen si se vuelve a subir. */
  const free=prePend().concat(ex?S.movs.filter(m=>m.stmt===ex.id&&m.type==='out'&&forOther(m)):[]);
  const dd=(a,b)=>Math.abs(daysBetween(a,b));
  const words=t=>normDesc(t).split(' ').filter(w=>w.length>=3);
  const sim=(a,b)=>{ const A=words(a),B=words(b); return A.some(w=>B.indexOf(w)>-1); };
  const cn=r=>{ const q=/(\d+)\s*\/\s*(\d+)/.exec(r.cuota||''); return q?+q[1]:0; };
  const cand=[];
  M.rows.forEach((r,i)=>{
    if(!r.inc||r.usd||r.own||isNaN(r.cents)||!r.date) return;
    free.forEach(m=>{
      if(m.cents!==r.cents) return;
      const k=cn(r), mk=/cuota (\d+)\/\d+/.exec(m.note||''); let score=null;
      /* Una cuota se reconoce por su número (el banco imprime la fecha de la compra, no la de la cuota). */
      if(k&&m.plan&&mk&&+mk[1]===k) score=-1000;
      else if(!k||!m.plan){ const d=dd(m.date,r.date); if(d<=10) score=d+(sim(m.note,r.desc)?0:50); }
      if(score!==null) cand.push({i:i,m:m,score:score});
    });
  });
  cand.sort((a,b)=>a.score-b.score);
  const usedR={}, usedM={};
  cand.forEach(c=>{ if(usedR[c.i]||usedM[c.m.id]) return; usedR[c.i]=1; usedM[c.m.id]=1; const r=M.rows[c.i]; r.pre=c.m.id; r.own=Object.keys(c.m.for).find(k=>k!==(c.m.owner||'yo'))||Object.keys(c.m.for)[0]; });
  M.rows.forEach((r,i)=>{ if(r.pre&&(cand.filter(c=>c.i===i).length>1||cand.filter(c=>c.m.id===r.pre).length>1)) r.preAmb=true; });
  /* Cuotas de un gasto en cuotas cuya cuota todavía no se anotó (el banco la cobró antes de la fecha de la app). */
  M.rows.forEach(r=>{
    if(r.pre||!r.inc||r.usd||r.own||isNaN(r.cents)) return; const k=cn(r); if(k<2) return;
    const pl=S.plans.find(x=>isCard(x.data.account)&&k>x.done&&k<=x.n&&planCuota(x,k)===r.cents&&x.data.for&&Object.keys(x.data.for).some(z=>z!==(x.data.owner||'yo')));
    if(pl){ r.planAhead=pl.id; r.own=Object.keys(pl.data.for).find(z=>z!==(pl.data.owner||'yo')); }
  });
}
/* Anota ahora las cuotas de un plan hasta la k (la k queda ligada al resumen). */
function planAdvanceTo(pl,k,stmtId,date,cat){
  for(let j=pl.done+1;j<=k;j++){
    const cq=planCuota(pl,j), cd={cents:cq}; if(pl.data.for&&pl.total!=null) cd.for=allocate(cq,pl.data.for);
    const mv=Object.assign({},pl.data,cd,{id:newId(),date:j===k?date:planDate(pl.start,j-1),note:(pl.data.note||'Compra')+' · cuota '+j+'/'+pl.n,plan:pl.id,createdAt:Date.now()+j});
    if(j===k){ mv.stmt=stmtId; if(cat&&cat!=='sin') mv.cat=cat; }
    S.movs.push(mv);
  }
  pl.done=k; S.plans=S.plans.filter(x=>x.done<x.n);
}
function prePendBlock(){
  const L=prePend(); if(!L.length) return '';
  return '<section><h2 class="sec">Gastos de tarjeta para otros dueños, esperando el resumen</h2><div class="list-head">'+L.slice().sort((a,b)=>a.date<b.date?1:-1).map(m=>'<div class="mov"><div><div class="mov-t">'+esc(m.note||'Consumo')+'</div><div class="mov-s">'+esc(fmtDate(m.date))+' · para '+esc(Object.keys(m.for).map(ownerName).join(', '))+'</div></div>'+amt(money(m.cents))+'</div>').join('')+'</div><p class="an-note">Cuando subas el resumen del mes, la app los reconoce por monto y fecha (y las cuotas por su número) y no los duplica.</p></section>';
}

function preNotice(){
  const L=prePend(); if(!L.length) return '';
  const tot=L.reduce((s,m)=>s+m.cents,0);
  return '<div class="notice info"><span>Tenés '+L.length+' gasto(s) de tarjeta para otros dueños ('+amt(money(tot))+') que todavía no figuran en un resumen. Cuando subas el resumen, la app los reconoce sola.</span><a class="btn sm" href="#tarjetas">Ver</a></div>';
}
