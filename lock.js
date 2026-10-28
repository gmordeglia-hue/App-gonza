// Bloqueo con huella o PIN del celular (WebAuthn). Se activa desde Más.
// Es una traba de acceso: los datos siguen guardados en el celular igual que antes.
(function(){
const K='mis-cuentas-lock', GRACE=60000;
const ok=!!(window.isSecureContext&&window.PublicKeyCredential&&navigator.credentials);
let hiddenAt=0, busy=false;

function getId(){ try{ return localStorage.getItem(K); }catch(_){ return null; } }
function setId(v){ try{ v?localStorage.setItem(K,v):localStorage.removeItem(K); }catch(_){} }
const b64=buf=>btoa(String.fromCharCode.apply(null,new Uint8Array(buf)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));

async function verify(){
  const id=getId(); if(!id) return true;
  const a=await navigator.credentials.get({publicKey:{
    challenge:rnd(32), allowCredentials:[{type:'public-key',id:unb64(id)}],
    userVerification:'required', timeout:60000 }});
  // Byte 32 del authenticatorData: el bit 0x04 indica que se verificó huella o PIN.
  if(!a||!(new Uint8Array(a.response.authenticatorData)[32]&4)) throw new Error('sin verificación');
  return true;
}

async function enable(){
  const c=await navigator.credentials.create({publicKey:{
    challenge:rnd(32), rp:{name:'Mis cuentas'},
    user:{id:rnd(16),name:'Mis cuentas',displayName:'Mis cuentas'},
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
    authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},
    attestation:'none', timeout:60000 }});
  setId(b64(c.rawId));
}

// Pantalla de bloqueo
function overlay(){
  let el=document.getElementById('lock'); if(el) return el;
  el=document.createElement('div'); el.id='lock';
  el.innerHTML='<img src="icon-192.png" alt="" width="72" height="72">'
    +'<h1>Mis cuentas</h1><p class="lock-msg">Usá tu huella o el PIN del celular para entrar.</p>'
    +'<button class="btn primary" data-lock="unlock">Desbloquear</button>';
  document.body.appendChild(el); return el;
}
function msg(t){ const m=document.querySelector('#lock .lock-msg'); if(m) m.textContent=t; }
function lock(){ if(!getId()||!ok) return; document.documentElement.classList.add('locked'); overlay(); unlock(); }
async function unlock(){
  if(busy) return; busy=true;
  try{ await verify(); document.documentElement.classList.remove('locked'); const el=document.getElementById('lock'); if(el) el.remove(); }
  catch(_){ msg('No se pudo verificar. Tocá Desbloquear para probar de nuevo.'); }
  finally{ busy=false; }
}

// Bloque en la pantalla Más
window.lockBlock=function(){
  const on=!!getId();
  const body=!ok?'<p class="muted" style="margin:4px 0 0">Este navegador no permite bloquear con huella. Abrí la app instalada desde Chrome.</p>'
    :on?'<p class="muted" style="margin:4px 0 8px">Activado: la app pide tu huella o el PIN del celular al abrirse y después de 1 minuto en segundo plano.</p><div class="actions"><button class="btn danger" data-lock="off">Desactivar bloqueo</button></div>'
    :'<p class="muted" style="margin:4px 0 8px">Pedí tu huella o el PIN del celular cada vez que abrís la app.</p><div class="actions"><button class="btn" data-lock="on">Activar bloqueo</button></div>';
  return '<section id="lock-sec" style="margin-top:20px"><h2 class="sec">Bloqueo con huella</h2>'+body+'<p class="small muted lock-err" style="margin:6px 0 0"></p></section>';
};
function refresh(err){
  const s=document.getElementById('lock-sec'); if(!s) return;
  s.outerHTML=window.lockBlock();
  if(err){ const e=document.querySelector('#lock-sec .lock-err'); if(e) e.textContent=err; }
}

document.addEventListener('click',async e=>{
  const b=e.target.closest&&e.target.closest('[data-lock]'); if(!b) return;
  const act=b.dataset.lock;
  if(act==='unlock') return unlock();
  try{
    if(act==='on'){ await enable(); await verify(); }
    else if(act==='off'){ await verify(); setId(null); }
    refresh();
  }catch(_){
    if(act==='on') setId(null);
    refresh(act==='on'?'No se pudo activar. Revisá que el celular tenga huella o PIN configurados.':'No se pudo verificar. El bloqueo sigue activado.');
  }
});

document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ hiddenAt=Date.now(); return; }
  if(getId()&&hiddenAt&&Date.now()-hiddenAt>GRACE&&!document.documentElement.classList.contains('locked')) lock();
});

if(getId()) lock();
})();
