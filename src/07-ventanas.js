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

