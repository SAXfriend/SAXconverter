// Variables globales para audio
let audioBuffer = null;
let context = null;

// Referencias a elementos DOM
const input = document.getElementById('link-input');
const fileInput = document.getElementById('file-input');
const desde = document.getElementById('desde');
const hasta = document.getElementById('hasta');
const error = document.getElementById('error');
const extractBtn = document.getElementById('extract-btn');
const sheetBtn = document.getElementById('sheet-btn');

// --- Código previo que ya tienes para drag & drop ---
input.addEventListener('dragover', e => {
  e.preventDefault();
  input.style.background = '#eaeaea';
});
input.addEventListener('dragleave', e => {
  e.preventDefault();
  input.style.background = '';
});
input.addEventListener('drop', e => {
  e.preventDefault();
  input.style.background = '';
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    input.value = files[0].name;
    handleFile(files[0]);
  }
});

// Validación en vivo de los rangos
function validaRango() {
  error.style.display = (hasta.value !== "" && desde.value !== "" && Number(hasta.value) <= Number(desde.value)) ? 'inline' : 'none';
}
desde.addEventListener('input', validaRango);
hasta.addEventListener('input', validaRango);

// --- NUEVO: función para procesar archivo local ---
function handleFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    procesarAudio(ev.target.result);
  };
  reader.readAsArrayBuffer(file);
}

// Evento para input type=file cambio
fileInput.addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  input.value = file.name; // Mostrar nombre
  handleFile(file);
});

// Evento para cuando se pega un enlace (input change)
input.addEventListener('change', function() {
  const url = input.value.trim();
  if (!url) return;
  fetchAudioFromURL(url);
});

// --- NUEVO: función para cargar audio remoto ---
function fetchAudioFromURL(url) {
  fetch(url)
    .then(resp => {
      if (!resp.ok) throw new Error("Respuesta no OK");
      return resp.arrayBuffer();
    })
    .then(buffer => procesarAudio(buffer))
    .catch(e => alert('No se pudo cargar el archivo (quizá problemas de CORS): ' + e.message));
}

// --- NUEVO: procesar audio con Web Audio API ---
function procesarAudio(arrayBuffer) {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  context.decodeAudioData(arrayBuffer, (buffer) => {
    audioBuffer = buffer;
    alert(`Audio cargado (${Math.round(buffer.duration)} segundos). Listo para usar.`);
  }, (e) => alert('No se pudo procesar el audio: ' + e));
}

// --- NUEVO: función para extraer segmento ---
function extraerSegmento(desdeVal, hastaVal) {
  if (!audioBuffer) return null;
  const desdeSec = Number(desdeVal) || 0;
  const hastaSec = Math.min(Number(hastaVal) || audioBuffer.duration, audioBuffer.duration);
  const sampleRate = audioBuffer.sampleRate;
  const canales = audioBuffer.numberOfChannels;
  const length = Math.floor((hastaSec - desdeSec) * sampleRate);
  const nuevoBuffer = context.createBuffer(canales, length, sampleRate);

  for (let ch = 0; ch < canales; ch++) {
    // Copia el dato del canal desde 'desde' a 'hasta'
    const channelData = audioBuffer.getChannelData(ch).slice(Math.floor(desdeSec * sampleRate), Math.floor(hastaSec * sampleRate));
    nuevoBuffer.copyToChannel(channelData, ch);
  }
  return nuevoBuffer;
}

// --- Código que bloquea UI - modificado para añadir funcionalidad ---
function deshabilitarUI() {
  extractBtn.disabled = true;
  sheetBtn.disabled = true;
  desde.disabled = true;
  hasta.disabled = true;
  input.disabled = true;
  document.querySelector('h1').classList.add('animado');
}

extractBtn.onclick = () => {
  if (error.style.display === 'inline') {
    alert("Corrige el rango 'desde' y 'hasta'.");
    return;
  }
  deshabilitarUI();

  // Extraer segmento
  const segmento = extraerSegmento(desde.value, hasta.value);

  // Aquí iría la lógica para procesar el segmento como audio déjalo listo para más adelante

  // Por ahora, re-habilitar UI tras el procesamiento simulado
  setTimeout(() => {
    extractBtn.disabled = false;
    sheetBtn.disabled = false;
    desde.disabled = false;
    hasta.disabled = false;
    input.disabled = false;
    document.querySelector('h1').classList.remove('animado');
    alert("Procesamiento simulado terminado.");
  }, 2000);
};

sheetBtn.onclick = () => {
  if (error.style.display === 'inline') {
    alert("Corrige el rango 'desde' y 'hasta'.");
    return;
  }
  deshabilitarUI();

  const segmento = extraerSegmento(desde.value, hasta.value);

  // Aquí se implementará la extracción de notas y generación MusicXML

  setTimeout(() => {
    extractBtn.disabled = false;
    sheetBtn.disabled = false;
    desde.disabled = false;
    hasta.disabled = false;
    input.disabled = false;
    document.querySelector('h1').classList.remove('animado');
    alert("Simulación de partitura terminada.");
  }, 2000);
};
