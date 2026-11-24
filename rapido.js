/* Intérprete de frases para cargar un movimiento: "super 15000 bbva", "cobré 80 mil mp",
   "pasé 5000 de bbva a mp", "nafta 25k efectivo ayer". Funciona sin internet y NO guarda nada:
   solo devuelve lo que entendió; la app completa el formulario y vos confirmás con "Guardar". */
(function(root){
  var STOP={de:1,en:1,con:1,para:1,por:1,a:1,el:1,la:1,los:1,las:1,un:1,una:1,mi:1,del:1,al:1,y:1,pesos:1,peso:1,plata:1,me:1,lo:1,ars:1,cuenta:1,x:1};
  var IN={cobre:1,cobro:1,cobramos:1,ingreso:1,ingrese:1,entro:1,entraron:1,recibi:1,recibimos:1,deposito:1,depositaron:1,sueldo:1,pagaron:1,devolvieron:1,acreditaron:1,transfirieron:1};
  var OUT={gaste:1,gasto:1,pague:1,pagamos:1,compre:1,compramos:1,egreso:1};
  var TRANSFER={transferi:1,transferencia:1,pase:1,pasamos:1,pasar:1,mover:1,movi:1,traspaso:1};
  var CUR_USD={usd:1,'u$s':1,'us$':1,dolar:1,dolares:1,dolarcitos:1};
  var SUFFIX={k:1000,mil:1000,luca:1000,lucas:1000,palo:1e6,palos:1e6,palu:1e6,millon:1e6,millones:1e6};
  var ALIAS={mp:['mercado','pago'],mercadopago:['mercado','pago'],efe:['efectivo'],cash:['efectivo'],visa:['tarjeta'],master:['tarjeta'],mastercard:['tarjeta'],tarjeta:['tarjeta'],credito:['credito'],nx:['naranja'],fci:['fondo']};
  var GENERIC={cuenta:1,de:1,en:1,x:1,la:1,el:1};

  function norm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function words(s){ return norm(s).split(/[^a-z0-9$]+/).filter(Boolean); }
  function parseNum(raw){
    var s=String(raw).replace(/[^\d.,]/g,''); if(!/\d/.test(s)) return NaN;
    var lc=s.lastIndexOf(','), ld=s.lastIndexOf('.');
    if(lc>-1&&ld>-1){ s = lc>ld ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,''); }
    else if(lc>-1){ s = (s.split(',').length>2) ? s.replace(/,/g,'') : s.replace(',','.'); }
    else if(ld>-1){ var p=s.split('.'); if(p.length>2||(p[p.length-1].length===3&&p[0]!=='0')) s=s.replace(/\./g,''); }
    var n=Number(s); return isFinite(n)?n:NaN;
  }
  function pad(n){ return (n<10?'0':'')+n; }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function addDays(todayStr,n){ var p=todayStr.split('-'); var d=new Date(+p[0],+p[1]-1,+p[2]+n); return ymd(d); }

  function parse(text,ctx){
    ctx=ctx||{};
    var today=ctx.today||ymd(new Date());
    var accounts=(ctx.accounts||[]).filter(function(a){return !a.archived}).slice().sort(function(a,b){return (a.order||0)-(b.order||0)});
    var owners=ctx.owners||[];
    var raw=String(text||'').trim();
    var res={ok:false,type:'out',cents:null,acc:null,to:null,owner:null,date:null,note:'',cur:null,found:{}};
    if(!raw) return res;
    var tok=raw.split(/\s+/), nt=tok.map(function(t){ return norm(t).replace(/^[^a-z0-9$]+|[^a-z0-9$]+$/g,''); });
    var used=tok.map(function(){return false});

    /* fecha */
    for(var i=0;i<nt.length;i++){
      var t=nt[i], m;
      if(t==='hoy'){ res.date=today; used[i]=true; }
      else if(t==='ayer'){ res.date=addDays(today,-1); used[i]=true; if(nt[i-1]==='antes'||nt[i-1]==='anteayer'){ /* "antes de ayer" */ } }
      else if(t==='anteayer'||t==='antiayer'){ res.date=addDays(today,-2); used[i]=true; }
      else if((m=/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/.exec(t))){
        var dd=+m[1], mm=+m[2], tp=today.split('-'), yy=m[3]?(+m[3]<100?2000+(+m[3]):+m[3]):+tp[0];
        if(dd>=1&&dd<=31&&mm>=1&&mm<=12){
          var ds=yy+'-'+pad(mm)+'-'+pad(dd);
          if(!m[3]&&ds>addDays(today,31)) ds=(yy-1)+'-'+pad(mm)+'-'+pad(dd);
          res.date=ds; used[i]=true;
        }
      }
    }

    /* moneda y palabras de tipo */
    var hasTransferWord=false, hasIn=false, hasOut=false;
    for(i=0;i<nt.length;i++){
      if(used[i]) continue; t=nt[i];
      if(CUR_USD[t]){ res.cur='USD'; used[i]=true; }
      else if(IN[t]){ hasIn=true; used[i]=true; }
      else if(OUT[t]){ hasOut=true; used[i]=true; }
      else if(TRANSFER[t]){ hasTransferWord=true; used[i]=true; }
    }

    /* monto: "15000", "15.000", "$15000", "15k", "15 mil", "1,5 palo", "2 lucas" */
    var cands=[];
    for(i=0;i<nt.length;i++){
      if(used[i]) continue;
      var mm2=/^\$?(\d[\d.,]*)([a-z]*)$/.exec(nt[i]); if(!mm2) continue;
      var base=parseNum(mm2[1]); if(isNaN(base)||base<=0) continue;
      var suf=mm2[2], span=[i], mult=1;
      if(suf){ if(SUFFIX[suf]) mult=SUFFIX[suf]; else continue; }
      else if(i+1<nt.length&&!used[i+1]&&SUFFIX[nt[i+1]]){ mult=SUFFIX[nt[i+1]]; span=[i,i+1]; }
      cands.push({v:base*mult,span:span,suf:mult>1});
    }
    if(cands.length){
      var best=cands.filter(function(c){return c.suf})[0];
      if(!best) best=cands.slice().sort(function(a,b){return b.v-a.v})[0];
      res.cents=Math.round(best.v*100);
      best.span.forEach(function(k){ used[k]=true; });
    }
    /* símbolos sueltos ($) */
    for(i=0;i<nt.length;i++) if(!used[i]&&(nt[i]===''||nt[i]==='$')) used[i]=true;

    /* dueño */
    var ownerHit=null;
    for(i=0;i<nt.length&&!ownerHit;i++){
      if(used[i]||!nt[i]) continue;
      for(var o=0;o<owners.length;o++){
        var al=words(owners[o].name); if(owners[o].id==='yo') al=al.concat(['yo']);
        var hit=al.some(function(w){ return w===nt[i] || (nt[i].length>=4&&w.length>nt[i].length&&w.indexOf(nt[i])===0); });
        if(hit){ ownerHit=owners[o].id; used[i]=true; break; }
      }
    }
    res.owner=ownerHit;

    /* cuentas */
    function accOf(idxs){
      var toks=idxs.filter(function(k){return !used[k]&&nt[k]}).map(function(k){return {k:k,w:nt[k]}});
      var exp=[]; toks.forEach(function(x){ (ALIAS[x.w]||[x.w]).forEach(function(w){ exp.push({k:x.k,w:w}); }); });
      var bestA=null,bestS=0,bestK=[];
      accounts.forEach(function(a){
        var aw=words((a.group||'')+' '+(a.name||'')).filter(function(w,ix,arr){return !GENERIC[w]&&w.length>=2&&arr.indexOf(w)===ix});
        var sc=0, ks=[];
        aw.forEach(function(w){
          var h=exp.filter(function(e){ return e.w===w || (e.w.length>=4&&w.length>e.w.length&&w.indexOf(e.w)===0); });
          if(h.length){ sc+=1; h.forEach(function(e){ ks.push(e.k); }); }
        });
        if(!sc) return;
        if(res.cur==='USD'&&a.cur==='USD') sc+=0.5;
        if(res.cur==='USD'&&a.cur!=='USD') sc-=0.5;
        if(a.cur==='USD'&&res.cur!=='USD'&&!exp.some(function(e){return e.w==='dolares'||e.w==='dolar'})) sc-=0.5;
        if(a.name==='Cuenta'&&a.kind!=='card') sc+=0.25;
        if(sc>bestS){ bestS=sc; bestA=a; bestK=ks; }
      });
      if(!bestA&&res.cur==='USD'){ bestA=accounts.filter(function(a){return a.cur==='USD'})[0]||null; }
      if(bestA) bestK.forEach(function(k){ used[k]=true; });
      return bestA;
    }
    var all=nt.map(function(_,k){return k});
    var ia=-1; for(i=0;i<nt.length;i++){ if(!used[i]&&nt[i]==='a'){ ia=i; break; } }
    var transferDone=false;
    if(ia>-1){
      var snap=used.slice();
      var L=all.filter(function(k){return k<ia}), R=all.filter(function(k){return k>ia});
      var aL=accOf(L), aR=accOf(R);
      if(aL&&aR&&aL.id!==aR.id){ res.type='transfer'; res.acc=aL.id; res.to=aR.id; used[ia]=true; transferDone=true; }
      else { for(i=0;i<used.length;i++) used[i]=snap[i]; }
    }
    if(!transferDone){
      var a1=accOf(all);
      if(a1) res.acc=a1.id;
      if(hasTransferWord) res.type='transfer';
      else if(hasIn&&!hasOut) res.type='in';
      else res.type='out';
    }
    if(res.acc){ var ac=accounts.filter(function(a){return a.id===res.acc})[0]; if(ac&&!res.cur) res.cur=ac.cur; }

    /* lo que sobra es el detalle */
    /* se conservan las palabras de enlace del medio ("Pago de luz") y se sacan las de los extremos */
    var rest=[]; for(i=0;i<tok.length;i++){ if(used[i]) continue; rest.push({w:tok[i].replace(/^[,;:.]+|[,;:.]+$/g,''),s:!!STOP[nt[i]]}); }
    while(rest.length&&(rest[0].s||!rest[0].w)) rest.shift();
    while(rest.length&&(rest[rest.length-1].s||!rest[rest.length-1].w)) rest.pop();
    var note=rest.map(function(x){return x.w}).filter(Boolean).join(' ');
    res.note=note?note.charAt(0).toUpperCase()+note.slice(1):'';
    res.ok=res.cents!=null;
    return res;
  }
  var api={parse:parse};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.QuickMov=api;
})(typeof window!=='undefined'?window:globalThis);
