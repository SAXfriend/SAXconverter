// Variables globales para audio y contexto Web Audio API
let audioBuffer = null;
let context = null;
let source = null; // Fuente de audio actual para reproducir


// Referencias a elementos DOM
const input = document.getElementById('link-input');
const fileInput = document.getElementById('file-input');
const desde = document.getElementById('desde');
const hasta = document.getElementById('hasta');
const error = document.getElementById('error');
const extractBtn = document.getElementById('extract-btn');
const sheetBtn = document.getElementById('sheet-btn');
const stopBtn = document.getElementById('stop-btn');

//-------------------------------
//Defino el boton stop
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

  // Si ya hay una fuente sonando, la paramos antes de crear una nueva
  if (source) {
    source.stop();
    source.disconnect();
    source = null;
  }

  source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);

  // Cuando termine la reproducción, liberamos la fuente y habilitamos UI
  source.onended = () => {
    source.disconnect();
    source = null;
    habilitarUI();
  }
}

// ------------------------------
// Función para deshabilitar la interfaz mientras se procesa
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

// ------------------------------
// Función para habilitar la interfaz tras procesar
// ------------------------------
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
// Botón EXTRAER - simula extracción de audio segmento
// ------------------------------
xtractBtn.onclick = () => {
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

  // Si el contexto no está en estado 'running', lo reanudamos (importante en navegadores)
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

  // Aquí iría la lógica para procesar el segmento seleccionado (extraer sonido saxofón etc.)
  // Por ahora sólo simulamos con retraso y mensaje

  setTimeout(() => {
    alert("Proceso de extracción simulado terminado.");
    habilitarUI();
  }, 2000);
};

// ------------------------------
// Botón PARTITURA - simula análisis para generar MusicXML
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

  deshabilitarUI();

  const segmento = extraerSegmento(desde.value, hasta.value);
  if (!segmento) {
    alert("Rango inválido o sin audio cargado.");
    habilitarUI();
    return;
  }

  // Aquí iría el código de detección de notas y creación de archivo MusicXML
  // Por ahora sólo simulamos con retraso y mensaje

  setTimeout(() => {
    alert("Simulación de generación de partitura terminada.");
    habilitarUI();
  }, 2000);
};
