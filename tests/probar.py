# Pruebas automáticas de "Mis cuentas". Usan datos inventados (no tocan los tuyos).
# Uso:   python tests/probar.py
# Hace falta: Python con Playwright (ya instalado). Termina con "TODO OK" o con la lista de lo que falló.
import os, sys, time, subprocess, datetime, csv, io, socket
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fallos, hechos = [], []

def chequear(nombre, ok, detalle=''):
    (hechos if ok else fallos).append(nombre)
    print(('  ok   ' if ok else '  FALLA ') + nombre + ('' if ok else '  -> ' + str(detalle)))

def puerto_libre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

def main():
    puerto = puerto_libre()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(puerto), '-d', RAIZ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch()
            ctx = nav.new_context(viewport={'width': 420, 'height': 900}, accept_downloads=True)
            pg = ctx.new_page()
            errores = []
            pg.on('pageerror', lambda e: errores.append(str(e)))
            pg.clock.install(time=datetime.datetime(2026, 11, 10, 12, 0, 0))
            pg.goto(f'http://localhost:{puerto}/index.html?test'); pg.wait_for_timeout(800)
            ev = lambda js, arg=None: pg.evaluate(js, arg)
            total = lambda: ev("()=>__T.S.accounts.filter(a=>!a.archived&&a.cur!=='USD').reduce((s,a)=>s+__T.balance(a),0)")

            print('Arranque')
            chequear('la app abre y hay cuentas', ev("()=>__T.S.accounts.length")>0)
            chequear('hay una tarjeta de crédito entre las cuentas', ev("()=>__T.S.accounts.some(a=>a.kind==='card')"))

            print('Saldos')
            ev("()=>{__T.S.movs.push({id:'i1',type:'in',account:'bbva-cuenta',cents:100000,date:__T.todayStr(),note:'Ingreso',owner:'yo',createdAt:1});__T.persist();__T.onData()}")
            t0 = total()
            chequear('un ingreso de $1.000 suma al saldo', t0 == 100000, t0)

            print('Tarjeta: consumo de otro dueño')
            ev("()=>{__T.S.movs.push({id:'c1',type:'out',account:'bbva-tarjeta',cents:500000,date:__T.todayStr(),note:'Libreria',owner:'yo',for:{catequesis:500000},createdAt:2});__T.persist();__T.onData()}")
            chequear('el consumo de tarjeta NO cambia los saldos', total() == t0, total())
            chequear('la tarjeta no tiene saldo', ev("()=>__T.balance(__T.accById('bbva-tarjeta'))") == 0)
            chequear('el saldo de ningún dueño en la tarjeta se mueve', ev("()=>Object.values(__T.ownerBalances(__T.accById('bbva-tarjeta'))).every(v=>v===0)"))
            deudas = ev("()=>__T.debtPairs().map(p=>p.debtor+'>'+p.creditor+':'+p.cents)")
            chequear('queda la deuda: Catequesis le debe $5.000 a Gonza', deudas == ['catequesis>yo:500000'], deudas)

            print('Devolución')
            ev("()=>{__T.S.movs.push({id:'r1',type:'in',account:'bbva-cuenta',cents:200000,date:__T.todayStr(),note:'Devolución',owner:'yo',repayFrom:'catequesis',createdAt:3});__T.persist();__T.onData()}")
            deudas = ev("()=>__T.debtPairs().map(p=>p.debtor+'>'+p.creditor+':'+p.cents)")
            chequear('una devolución de $2.000 baja la deuda a $3.000', deudas == ['catequesis>yo:300000'], deudas)

            print('Recordatorio de fin de mes')
            chequear('el día 10 no avisa', ev("()=>__T.cardReminder()") == '')
            pg.clock.set_fixed_time(datetime.datetime(2026, 11, 25, 12, 0, 0))
            ev("()=>__T.S.movs=__T.S.movs.filter(m=>m.id!=='r1')")
            txt = ev("()=>__T.cardReminder().replace(/<[^>]+>/g,' ')")
            chequear('el día 25 avisa que Catequesis debe consumos de tarjeta', 'Catequesis' in txt and '5.000' in txt, txt)

            print('Resumen de tarjeta con consumos de otros')
            ev("""()=>{const T=__T; T.S.cards=[{id:'visa',name:'BBVA Visa'}];
              T.openModal('stmt',{step:2,paid:'pesos',card:'visa',period:'2026-10',text:'',totalStr:'',cardAcc:'',rows:[
                {inc:true,date:'2026-10-05',desc:'Super',amtStr:'1000,00',cents:100000,cat:'sin',auto:'sin',cuota:'',usd:false,flag:''},
                {inc:true,date:'2026-10-06',desc:'Retiro grupo',amtStr:'7000,00',cents:700000,cat:'sin',auto:'sin',cuota:'',usd:false,flag:''}]});
              T.stmtShowReview();}""")
            pg.locator('select[data-f=own]').nth(1).select_option('grupo-misionero')
            pg.click('[data-act=rv-import]'); pg.wait_for_timeout(400)
            movs = ev("()=>__T.S.movs.filter(m=>m.stmt).map(m=>m.cents+':'+Object.keys(m.for).join())")
            chequear('el consumo de otro dueño se anotó como deuda en la tarjeta', movs == ['700000:grupo-misionero'], movs)
            chequear('el consumo mío quedó como gasto del resumen', ev("()=>__T.S.exp.filter(e=>e.period==='2026-10').map(e=>e.cents)") == [100000])
            ev("""()=>{const T=__T; T.openModal('stmt',{step:2,paid:'pesos',card:'visa',period:'2026-10',text:'',totalStr:'',cardAcc:'',rows:[
                {inc:true,date:'2026-10-06',desc:'Retiro grupo',amtStr:'7000,00',cents:700000,cat:'sin',auto:'sin',cuota:'',usd:false,flag:'',own:'grupo-misionero'}]}); T.stmtShowReview();}""")
            pg.click('[data-act=rv-import]'); pg.wait_for_timeout(400)
            chequear('cargar de nuevo el mismo resumen no duplica', ev("()=>__T.S.movs.filter(m=>m.stmt).length") == 1)
            chequear('los saldos siguen sin moverse', total() == t0 + 200000 - 200000 or total() == t0, total())

            print('Informe de deuda')
            pg.evaluate("()=>{location.hash='#resumen'}"); pg.wait_for_timeout(300)
            pg.click('text=Ver y devolver'); pg.wait_for_timeout(500)
            with pg.expect_download() as dl:
                pg.click('[data-act=debt-csv] >> nth=0')
            ruta = os.path.join(RAIZ, 'tests', '_informe.csv'); dl.value.save_as(ruta)
            filas = list(csv.reader(io.StringIO(open(ruta, encoding='utf-8-sig').read()), delimiter=';')); os.remove(ruta)
            chequear('el Excel trae encabezado, detalle y total', filas[0][0] == 'Fecha' and len(filas) >= 3 and filas[-1][3].startswith('TOTAL'), filas)
            with ctx.expect_page() as nueva:
                pg.click('[data-act=debt-pdf] >> nth=0')
            hoja = nueva.value; hoja.wait_for_timeout(400)
            chequear('la hoja para imprimir/PDF muestra el total', 'Total' in hoja.inner_text('body'))
            hoja.close()

            print('Gastos en cuotas')
            pg.clock.set_fixed_time(datetime.datetime(2026, 12, 25, 12, 0, 0))
            ev("()=>{__T.S.plans.push({id:'p1',n:3,done:0,start:'2026-11-01',total:300000,data:{type:'out',account:'bbva-cuenta',cents:300000,owner:'yo',note:'Heladera',createdAt:5}});__T.applyPlans();__T.onData()}")
            cuotas = ev("()=>__T.S.movs.filter(m=>m.plan==='p1').map(m=>m.cents)")
            chequear('a fines de diciembre van 2 de las 3 cuotas de $1.000', cuotas == [100000, 100000], cuotas)

            print('Copia de seguridad')
            copia = ev("()=>__T.backupJson()")
            cantidad = ev("()=>__T.S.movs.length")
            vuelta = ev("j=>__T.normalizeData(JSON.parse(j),false).movs.length", copia)
            chequear('restaurar una copia devuelve los mismos movimientos', vuelta == cantidad, (vuelta, cantidad))

            print('Caja de una línea')
            ev("()=>{localStorage.removeItem('cuentas-ultimo');__T.openModal('mov',{m:null,type:'',acc:'',pay:null})}")
            chequear('"Nuevo movimiento" abre en Egreso', ev("()=>document.querySelector('input[name=mtype]:checked').value")=='out')
            inicial = ev("()=>document.querySelector('#m-acc').value")
            antes = ev("()=>__T.S.movs.length")
            pg.fill('#m-quick', 'nafta 25k efectivo ayer')
            campos = ev("()=>({t:document.querySelector('input[name=mtype]:checked').value,a:document.querySelector('#m-acc').value,m:document.querySelector('#m-amt').value,n:document.querySelector('#m-note').value})")
            chequear('la frase completa tipo, cuenta, monto y detalle', campos == {'t':'out','a':'efectivo','m':'25000,00','n':'Nafta'}, campos)
            pg.press('#m-quick', 'Enter'); pg.wait_for_timeout(150)
            chequear('Enter en la caja no guarda nada', ev("()=>__T.S.movs.length")==antes)
            pg.fill('#m-quick', 'pasé 5000 de bbva a efectivo')
            tr = ev("()=>({t:document.querySelector('input[name=mtype]:checked').value,a:document.querySelector('#m-acc').value,d:document.querySelector('#m-to').value})")
            chequear('una transferencia se completa con origen y destino', tr == {'t':'transfer','a':'bbva-cuenta','d':'efectivo'}, tr)
            pg.fill('#m-quick', 'hola')
            chequear('si no nombra cuenta vuelve a la que traía el formulario', ev("()=>document.querySelector('#m-acc').value")==inicial)
            pg.fill('#m-quick', 'super 15000 efectivo')
            pg.click('button.primary[type=submit]'); pg.wait_for_timeout(200)
            ult = ev("()=>__T.S.movs[__T.S.movs.length-1]")
            chequear('Guardar anota el gasto de la frase', ult['type']=='out' and ult['cents']==1500000 and ult['account']=='efectivo' and ult['note']=='Super', ult)
            ev("()=>__T.openModal('mov',{m:null,type:'',acc:'',pay:null})")
            chequear('el próximo movimiento arranca con la última cuenta', ev("()=>document.querySelector('#m-acc').value")=='efectivo')

            print('Tanda 1: dueño visible y duplicados')
            chequear('el dueño se ve sin abrir «Más opciones»', ev("()=>{const o=document.querySelector('#m-own');return !!o&&!o.closest('details')}"))
            n0 = ev("()=>__T.S.movs.length")
            pg.fill('#m-quick', 'super 15000 efectivo')
            pg.click('button.primary[type=submit]'); pg.wait_for_timeout(200)
            chequear('un gasto repetido avisa y no se guarda de entrada', ev("()=>__T.S.movs.length")==n0 and 'Guardar igual' in ev("()=>document.querySelector('button.primary[type=submit]').textContent"))
            for _ in range(3):
                if ev("()=>__T.S.movs.length")==n0+1: break
                pg.click('button.primary[type=submit]'); pg.wait_for_timeout(200)
            chequear('tocando «Guardar igual» se guarda', ev("()=>__T.S.movs.length")==n0+1)
            ev("()=>{__T.S.tab='resumen';__T.S.acc='';__T.S.modal=null;__T.render()}")
            chips = ev("()=>[...document.querySelectorAll('#view .chips .chip, .total .chips .chip')].map(c=>c.textContent.trim())")
            chequear('en Inicio «Todo» es el primer botón de dueños', bool(chips) and chips[0]=='Todo', chips)
            chequear('no queda ninguna tenencia de ejemplo (YMCXO) en una instalación nueva', ev("()=>!JSON.stringify(__T.S.hlds||[]).includes('YMCXO')"))

            print('Pantallas')
            for h in ['resumen', 'movimientos', 'tarjetas', 'deudas', 'analisis', 'ajustes']:
                pg.evaluate(f"()=>{{location.hash='#{h}'}}"); pg.wait_for_timeout(250)
            chequear('recorrer las pantallas no da errores', not errores, errores)
            nav.close()
    finally:
        srv.terminate()
    print()
    if fallos:
        print('FALLARON %d de %d:' % (len(fallos), len(fallos) + len(hechos))); [print(' -', f) for f in fallos]; sys.exit(1)
    print('TODO OK (%d pruebas)' % len(hechos))

main()
