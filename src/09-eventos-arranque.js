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
