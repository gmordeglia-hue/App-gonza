// Puntos de mil mientras escribís un monto: 1234567 → 1.234.567. La coma es el decimal.
// Si el teclado del celular tiene punto en vez de coma, el punto que tocás se toma como coma.
// La app ya entiende los montos con puntos de mil, así que no hace falta cambiar nada más.
(function(){
const SEL='input[inputmode="decimal"]';
const dots=s=>(s.match(/\./g)||[]).length;

function fmt(v){
  const neg=/^\s*-/.test(v);
  const s=v.replace(/[^\d,]/g,''), i=s.indexOf(',');
  let ent=(i<0?s:s.slice(0,i)).replace(/^0+(?=\d)/,'');
  const dec=i<0?null:s.slice(i+1).replace(/,/g,'').slice(0,2);
  if(!ent&&dec!=null) ent='0';
  ent=ent.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return (neg?'-':'')+ent+(dec!=null?','+dec:'');
}

function apply(t,e){
  let v=t.value, c=t.selectionStart==null?v.length:t.selectionStart;
  const prev=t.dataset.milesPrev||'';
  // Un punto nuevo, escrito a mano, es la coma decimal. En un texto escrito o pegado
  // de una vez ("1234.5"), el punto seguido de 1 o 2 números al final también.
  const d=e&&e.data;
  if(d&&d.indexOf('.')>-1&&v.slice(c-d.length,c)===d){
    const nd=d==='.'?',':d.indexOf(',')<0?d.replace(/\.(\d{1,2})$/,',$1'):d;
    v=v.slice(0,c-d.length)+nd+v.slice(c);
  }
  else if(e&&!d&&v.length===prev.length+1&&dots(v)>dots(prev)&&v.charAt(c-1)==='.') v=v.slice(0,c-1)+','+v.slice(c);
  else if(e&&e.inputType==='insertFromPaste'&&v.indexOf(',')<0) v=v.replace(/\.(\d{1,2})$/,',$1');
  else if(!e&&v.indexOf(',')<0) v=v.replace(/\.(\d{1,2})$/,',$1');
  const n=v.slice(0,c).replace(/[^\d,-]/g,'').length;
  const out=fmt(v);
  t.dataset.milesPrev=out;
  if(out===t.value) return;
  t.value=out;
  // El cursor queda después de la misma cantidad de números que antes.
  let p=0, k=0;
  while(p<out.length&&k<n){ if(/[\d,-]/.test(out[p])) k++; p++; }
  if(document.activeElement===t) try{ t.setSelectionRange(p,p); }catch(_){}
}

document.addEventListener('input',e=>{ const t=e.target; if(t.matches&&t.matches(SEL)) apply(t,e); },true);
// Los montos que ya vienen cargados (al editar) se acomodan al tocar el campo.
document.addEventListener('focusin',e=>{ const t=e.target; if(t.matches&&t.matches(SEL)&&t.value) apply(t,null); },true);
})();
