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
// Función para convertir AudioBuffer en Blob WAV (16-bit PCM)
// ------------------------------
function audioBufferToWav(buffer, options = {}) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = options.float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  const bufferLength = result.length * (bitDepth / 8) + 44;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + result.length * (bitDepth / 8), true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, result.length * (bitDepth / 8), true);

  // Write PCM samples
  if (format === 1) { // 16-bit PCM
    floatTo16BitPCM(view, 44, result);
  } else { // 32-bit float
    writeFloat32(view, 44, result);
  }

  return new Blob([view], { type: 'audio/wav' });

  // Subfunciones
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      output.setInt16(offset, s, true);
    }
  }

  function writeFloat32(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 4) {
      output.setFloat32(offset, input[i], true);
    }
  }

  function interleave(left, right) {
    const length = left.length + right.length;
    const result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) {
      result[index++] = left[inputIndex];
      result[index++] = right[inputIndex];
      inputIndex++;
    }
    return result;
  }
}

// ------------------------------
// Función para descargar Blob WAV como archivo
// ------------------------------
function descargarWav(blob, filename = 'output.wav') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ------------------------------
// Manejo del botón "Extraer" (reproduce segmento y descarga WAV)
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

  // Reanudar el contexto si está suspendido
  if (context.state === 'suspended') {
    context.resume().then(() => {
      deshabilitarUI();
      reproducirAudioBuffer(segmento);
      // Crear blob WAV y lanzar descarga
      const wavBlob = audioBufferToWav(segmento);
      descargarWav(wavBlob, 'saxconverter_output.wav');
    });
  } else {
    deshabilitarUI();
    reproducirAudioBuffer(segmento);
    // Crear blob WAV y lanzar descarga
    const wavBlob = audioBufferToWav(segmento);
    descargarWav(wavBlob, 'saxconverter_output.wav');
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
