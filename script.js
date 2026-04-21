let intervencion = JSON.parse(localStorage.getItem('bvg_int_data')) || null;
let eqs = JSON.parse(localStorage.getItem('eq_bvg_timer_fix')) || [];
let idS = -1; 
let audioCtx = null;

// --- REGISTRO DEL SERVICE WORKER PARA PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// --- GESTIÓN DE BLOQUEO DE NAVEGACIÓN ---
function manejarHistorial() { 
    history.pushState({page: "activo"}, "", ""); 
}
manejarHistorial();

window.addEventListener('popstate', function(event) {
    if (intervencion) {
        if (confirm("¿Seguro que quieres salir de la intervención activa? Se perderán los datos actuales.")) {
            // El navegador retrocede
        } else {
            manejarHistorial(); 
        }
    }
});

window.addEventListener('beforeunload', (e) => {
    if (intervencion) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// --- LÓGICA DE INTERVENCIÓN ---

function iniciarIntervencion() {
    let n = document.getElementById('int-nom').value;
    let d = document.getElementById('int-dir').value;
    if(!n) {
        alert("Por favor, introduce un nombre para la intervención.");
        return;
    }
    intervencion = { nombre: n, direccion: d };
    localStorage.setItem('bvg_int_data', JSON.stringify(intervencion));
    manejarHistorial();
    checkActiva();
}

function checkActiva() {
    if(intervencion) {
        document.getElementById('setup-intervencion').style.display='none';
        document.getElementById('panel-control').style.display='block';
        document.getElementById('display-intervencion').style.display='block';
        document.getElementById('txt-int-nom').innerText = intervencion.nombre.toUpperCase();
        document.getElementById('txt-int-dir').innerText = intervencion.direccion.toUpperCase();
        render();
    } else {
        document.getElementById('setup-intervencion').style.display='block';
        document.getElementById('panel-control').style.display='none';
        document.getElementById('display-intervencion').style.display='none';
    }
}

function finalizarTodo() {
    if(confirm("¿FINALIZAR INTERVENCIÓN? Se guardará en el historial y se limpiará el panel.")) {
        // Guardar en Historial antes de borrar
        let historial = JSON.parse(localStorage.getItem('bvg_historial')) || [];
        let registro = {
            id: Date.now(),
            info: intervencion,
            equipos: eqs,
            fecha: new Date().toLocaleString()
        };
        historial.push(registro);
        localStorage.setItem('bvg_historial', JSON.stringify(historial));

        // Limpiar datos activos
        intervencion = null; 
        eqs = [];
        localStorage.removeItem('bvg_int_data');
        localStorage.removeItem('eq_bvg_timer_fix');
        checkActiva();
    }
}

// --- LÓGICA DE BINOMIOS ---

function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playAlertSound() {
    initAudio();
    let osc = audioCtx.createOscillator(); 
    let gain = audioCtx.createGain();
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start(); 
    osc.stop(audioCtx.currentTime + 0.2);
}

function formatHora(f) { 
    let d = new Date(f); 
    return d.getHours().toString().padStart(2,'0') + ":" + d.getMinutes().toString().padStart(2,'0'); 
}

function formatTimeMS(ms) { 
    return Math.floor(ms/60000) + "m " + Math.floor((ms%60000)/1000) + "s"; 
}

function addEquipo() {
    initAudio();
    let n = document.getElementById('nom').value; 
    let b = document.getElementById('bar').value;
    if(!n || !b) return;
    let p = [
        document.getElementById('np1').value || "-", 
        document.getElementById('np2').value || "-", 
        document.getElementById('np3').value || "-"
    ];
    let ah = Date.now(); 
    let barNum = parseInt(b);
    eqs.push({ 
        n: n, pE: barNum, pA: barNum, prof: p, 
        sit: document.getElementById('sit').value || "---", 
        obj: document.getElementById('obj').value || "---",
        hE: formatHora(ah), 
        hS55: formatHora(ah + (((barNum-50)*6/55)*60000)), 
        hSMed: "--:--",
        pSegReg: Math.round((barNum / 2) + 25),
        tI: ah, tU: ah, hUltActualizacion: formatHora(ah),
        tAcumuladoPrevio: 0, rMed: 0, rInst: 0, autMed: 0, 
        activo: true, alerta: false, silenciado: false, informadoRegreso: false
    });
    sync(); render();
    ["nom","bar","np1","np2","np3","sit","obj"].forEach(id => document.getElementById(id