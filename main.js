// Drag & Drop funcionalidad
const input = document.getElementById('link-input');
const fileInput = document.getElementById('file-input');
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
  }
});

// Validación en vivo de los rangos
const desde = document.getElementById('desde');
const hasta = document.getElementById('hasta');
const error = document.getElementById('error');
function validaRango() {
  error.style.display = (hasta.value !== "" && desde.value !== "" && Number(hasta.value) <= Number(desde.value)) ? 'inline' : 'none';
}
desde.addEventListener('input', validaRango);
hasta.addEventListener('input', validaRango);

// Deshabilita interfaz al hacer click en botones
function deshabilitarUI() {
  document.getElementById('extract-btn').disabled = true;
  document.getElementById('sheet-btn').disabled = true;
  desde.disabled = true;
  hasta.disabled = true;
  input.disabled = true;
  document.querySelector('h1').classList.add('animado');
}
document.getElementById('extract-btn').onclick = deshabilitarUI;
document.getElementById('sheet-btn').onclick = deshabilitarUI;
