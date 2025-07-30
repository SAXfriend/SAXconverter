// Variables globales para audio y contexto Web Audio API
let audioBuffer = null;
let context = null;
let source = null; // Fuente de audio actual para reproducción

// Referencias a elementos del DOM
const input = document.getElementById('link-input');
const fileInput = document.getElementById('file-input');
const desde = document.getElementById('desde');
const hasta = document.getElementById('hasta');
const error = document.getElementById('error');
const extractBtn = document.getElementById('extract-btn');
const sheetBtn = document.getElementById('sheet-btn');
const stopBtn = document.getElementById('stop-btn');

// ------------------------------
// Drag & Drop para archivo sobre input
// ------------------------------
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
    fileInput.files = files;      // sincroniza input file oculto
    input.value = files[0].name;  // muestra nombre archivo
    handleFile(files[0]);         // procesa archivo
  }
});

// ------------------------------
// Validación en vivo del rango 'desde' y 'hasta'
// ------------------------------
function validaRango() {
  const desdeVal = desde.value;
  const hastaVal = hasta.value;
  if (desdeVal !== "" && hastaVal !== "" && Number(hastaVal) <= Number(desdeVal)) {
    error.style.display = 'inline';
  } else {
    error.style.display = 'none';
  }
}
desde.addEventListener('input', validaRango);
hasta.addEventListener('input', validaRango);

// ------------------------------
// Procesa archivo local (audio/video) seleccionado o soltado
// ------------------------------
function handleFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    procesarAudio(ev.target.result);
  };
  reader.readAsArrayBuffer(file);
}

// Evento para detectar cambio en input file oculto
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  input.value = file.name;  // mostrar solo el nombre
  handleFile(file);
});

// ------------------------------
// Descarga y carga archivo desde enlace remoto (si CORS lo permite)
// ------------------------------
input.addEventListener('change', () => {
  const url = input.value.trim();
  if (!url) return;
  fetchAudioFromURL(url);
});

function fetchAudioFromURL(url) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("Respuesta no OK");
      return response.arrayBuffer();
    })
    .then(buffer => procesarAudio(buffer))
    .catch(e => alert('No se pudo cargar el archivo (problemas de CORS o URL inválida): ' + e.message));
}

// ------------------------------
// Decodifica el audio con Web Audio API
// ------------------------------
function procesarAudio(arrayBuffer) {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  context.decodeAudioData(arrayBuffer, buffer => {
      audioBuffer = buffer;
      alert(`Audio cargado (${Math.round(buffer.duration)} segundos). Listo para usar.`);
  }, e => alert('No se pudo procesar el audio: ' + e));
}

// ------------------------------
// Extrae segmento de audio entre desde y hasta en un nuevo AudioBuffer
// ------------------------------
function extraerSegmento(desdeVal, hastaVal) {
  if (!audioBuffer) return null;
  const desdeSec = Number(desdeVal) || 0;
  const hastaSec = Math.min(Number(hastaVal) || audioBuffer.duration, audioBuffer.duration);

  if (hastaSec <= desdeSec) return null;

  const sampleRate = audioBuffer.sampleRate;
  const canales = audioBuffer.numberOfChannels;
  const length = Math.floor((hastaSec - desdeSec) * sampleRate);
  const nuevoBuffer = context.createBuffer(canales, length, sampleRate);

  for (let ch = 0; ch < canales; ch++) {
    const channelData = audioBuffer.getChannelData(ch).slice(Math.floor(desdeSec * sampleRate), Math.floor(hastaSec * sampleRate));
    nuevoBuffer.copyToChannel(channelData, ch);
  }
  return nuevoBuffer;
}

// ------------------------------
// Función para reproducir un AudioBuffer
// ------------------------------
function reproducirAudioBuffer(buffer) {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();

  // Si ya hay una fuente sonando, la paramos primero
  if (source) {
    source.stop();
    source.disconnect();
    source = null;
  }

  source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);

  // Cuando termina de reproducirse, se limpia y habilita UI
  source.onended = () => {
    source.disconnect();
    source = null;
    habilitarUI();
  }
}

// ------------------------------
// Funciones para bloquear y desbloquear la UI
// ------------------------------
function deshabilitarUI() {
  extractBtn.disabled = true;
  sheetBtn.disabled = true;
  desde.disabled = true;
  hasta.disabled = true;
  input.disabled = true;
  stopBtn.disabled = false;
  document.querySelector('h1').classList.add('animado');
}

function habilitarUI() {
  extractBtn.disabled = false;
  sheetBtn.disabled = false;
  desde.disabled = false;
  hasta.disabled = false;
  input.disabled = false;
  stopBtn.disabled = true;
  document.querySelector('h1').classList.remove('animado');
}

// ------------------------------
// Manejo del botón "Parar"
// ------------------------------
stopBtn.onclick = () => {
  if (source) {
    source.stop();
    source.disconnect();
    source = null;
    habilitarUI();
  }
};

// ------------------------------
// Manejo del botón "Extraer" (reproduce segmento)
// ------------------------------
extractBtn.onclick = () => {
  if (error.style.display === 'inline') {
    alert("Corrige el rango: 'hasta' debe ser mayor que 'desde'.");
    return;
  }
  if (!audioBuffer) {
    alert('Carga un archivo de audio o video primero.');
    return;
  }

  const segmento = extraerSegmento(desde.value, hasta.value);
  if (!segmento) {
    alert("Rango inválido o sin audio cargado.");
    return;
  }

  // Reanudar el contexto si está suspendido (navegadores modernos requieren interacción del usuario)
  if (context.state === 'suspended') {
    context.resume().then(() => {
      deshabilitarUI();
      reproducirAudioBuffer(segmento);
    });
  } else {
    deshabilitarUI();
    reproducirAudioBuffer(segmento);
  }
};

// ------------------------------
// Manejo del botón "Partitura" (simulación por ahora)
// ------------------------------
sheetBtn.onclick = () => {
  if (error.style.display === 'inline') {
    alert("Corrige el rango: 'hasta' debe ser mayor que 'desde'.");
    return;
  }
  if (!audioBuffer) {
    alert('Carga un archivo de audio o video primero.');
    return;
  }

  const segmento = extraerSegmento(desde.value, hasta.value);
  if (!segmento) {
    alert("Rango inválido o sin audio cargado.");
    return;
  }

  // Aquí irá la lógica para análisis de notas y creación MusicXML

  deshabilitarUI();

  setTimeout(() => {
    alert("Simulación de generación de partitura terminada.");
    habilitarUI();
  }, 2000);
};
