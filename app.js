// app.js

// --- Referencias a elementos del DOM (Document Object Model) ---
// const urlParams = new URLSearchParams(window.location.search); // Ya no es necesario
// const plan = urlParams.get("plan"); // Ya no es necesario

const tituloCarrera = document.getElementById("titulo-carrera");
const planDeEstudiosContainer = document.getElementById("plan-de-estudios"); // Nuevo contenedor principal para materias

// Elementos de métricas
const progressBar = document.getElementById("progress-bar");
const progressDisplay = document.getElementById("progress-display");
const averageDisplay = document.getElementById("average-display");

// Elementos del modal de estado de materia
const statusModal = document.getElementById("status-modal");
const modalTitle = document.getElementById("modal-title");
const modalErrorMessage = document.getElementById("modal-error-message");
const modalOptionsContainer = document.getElementById("modal-options");
const gradeInputContainer = document.getElementById("grade-input-container");
const gradeInputLabel = document.getElementById("grade-input-label");
const gradeInput = document.getElementById("grade-input");
const modalCloseBtn = document.getElementById("modal-close-btn");

// Elementos del modal de confirmación de reinicio
const confirmResetModal = document.getElementById("confirm-reset-modal");
const confirmResetBtn = document.getElementById("confirm-reset-btn");
const cancelResetBtn = document.getElementById("cancel-reset-btn");

// Elemento de notificación toast
const toastNotification = document.getElementById("toast-notification");

// Nuevos elementos para el selector de plan
const planSelector = document.getElementById('plan-selector');
const applyPlanButton = document.getElementById('apply-plan-button');
const mainTitle = document.getElementById('main-title');


// --- Variables de estado global ---
let materias = []; // Array que contendrá todas las materias con su estado y nota
let currentMateriaId = null; // ID de la materia que se está editando en el modal
let currentPlanName = 'tpi'; // Plan por defecto al iniciar

// --- Opciones y configuraciones ---
const statusOptions = {
    'no-cursada': { label: 'No Cursada', icon: '⚪' },
    'cursando': { label: 'Cursando', icon: '⏳' },
    'regular': { label: 'Regular', icon: '🟡' },
    'aprobada': { label: 'Aprobada', icon: '✅' },
    'promocionada': { label: 'Promocionada', icon: '🌟' },
    'equivalencia': { label: 'Equivalencia', icon: '🤝' },
    'abandonada': { label: 'Abandonada', icon: '❌' }
};

const approvedStates = ['aprobada', 'promocionada', 'equivalencia']; // Estados que se consideran aprobados para correlativas

// --- Funciones de Gestión de Estado y Datos ---

/**
 * Guarda el estado actual de las materias en localStorage.
 * Solo guarda el ID, status y nota de cada materia.
 */
function saveState() {
    const stateToSave = materias.map(materia => ({
        id: materia.id,
        status: materia.status,
        nota: materia.nota
    }));
    // Usa el nombre del plan actual para la clave de localStorage
    localStorage.setItem(`progresoCarrera_${currentPlanName}`, JSON.stringify(stateToSave));
    showToast("Progreso guardado automáticamente.");
}

/**
 * Carga el estado guardado desde localStorage y lo aplica a las materias.
 */
function loadState() {
    // Usa el nombre del plan actual para la clave de localStorage
    const savedState = localStorage.getItem(`progresoCarrera_${currentPlanName}`);
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        parsedState.forEach(savedMateria => {
            const materia = materias.find(m => m.id === savedMateria.id);
            if (materia) {
                materia.status = savedMateria.status;
                materia.nota = savedMateria.nota;
            }
        });
        showToast("Progreso cargado desde la última sesión.");
    } else {
        // Si no hay estado guardado para el plan actual, reinicia las materias a no-cursada
        materias.forEach(materia => {
            materia.status = 'no-cursada';
            materia.nota = null;
        });
        showToast(`No se encontró progreso para ${currentPlanName.toUpperCase()}. Iniciando nuevo seguimiento.`);
    }
}

/**
 * Reinicia el estado de todas las materias a "no-cursada" y borra el localStorage.
 */
function resetState() {
    materias.forEach(materia => {
        materia.status = 'no-cursada';
        materia.nota = null;
    });
    // Elimina el progreso solo del plan actual
    localStorage.removeItem(`progresoCarrera_${currentPlanName}`);
    renderPlan(); // Vuelve a dibujar el plan con el estado reiniciado
    updateMetrics(); // Actualiza las métricas
    showToast("Progreso reiniciado exitosamente.");
}

/**
 * Calcula y actualiza el porcentaje de progreso y el promedio de notas.
 */
function updateMetrics() {
    const totalMaterias = materias.length;
    const materiasAprobadas = materias.filter(materia => approvedStates.includes(materia.status));
    const porcentajeProgreso = totalMaterias > 0 ? (materiasAprobadas.length / totalMaterias) * 100 : 0;

    const notasAprobadas = materiasAprobadas
        .filter(materia => materia.nota !== null && materia.nota >= 4) // Solo notas de 4 o más
        .map(materia => materia.nota);

    const promedio = notasAprobadas.length > 0
        ? (notasAprobadas.reduce((sum, nota) => sum + nota, 0) / notasAprobadas.length).toFixed(2)
        : 'N/A';

    progressBar.style.width = `${porcentajeProgreso.toFixed(2)}%`;
    progressDisplay.textContent = `${porcentajeProgreso.toFixed(2)}%`;
    averageDisplay.textContent = promedio;
}

/**
 * Actualiza visualmente una tarjeta de materia específica.
 * @param {string} materiaId - El ID de la materia a actualizar.
 */
function updateMateriaView(materiaId) {
    const materia = materias.find(m => m.id === materiaId);
    if (!materia) return;

    const materiaDiv = document.querySelector(`.materia[data-id="${materiaId}"]`);
    if (!materiaDiv) return;

    // Remover clases de estado anteriores
    Object.keys(statusOptions).forEach(status => {
        materiaDiv.classList.remove(status);
    });

    // Añadir clase de estado actual
    materiaDiv.classList.add(materia.status);

    // Actualizar ícono de estado y nota
    const statusIconSpan = materiaDiv.querySelector('.status-icon');
    if (statusIconSpan) {
        statusIconSpan.textContent = statusOptions[materia.status].icon;
    }

    const gradeDisplaySpan = materiaDiv.querySelector('.grade-display');
    if (gradeDisplaySpan) {
        gradeDisplaySpan.textContent = materia.nota !== null ? `Nota: ${materia.nota}` : '';
        gradeDisplaySpan.classList.toggle('hidden', materia.nota === null);
    }
}

/**
 * Muestra una notificación temporal al usuario.
 * @param {string} message - El mensaje a mostrar.
 */
function showToast(message) {
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000); // El toast desaparece después de 3 segundos
}

/**
 * Exporta el progreso actual a un archivo CSV.
 */
function printProgress() {
    let csvContent = "data:text/csv;charset=utf-8,ID,Nombre,Cuatrimestre,Estado,Nota\n";

    materias.forEach(materia => {
        const row = [
            materia.id,
            `"${materia.nombre.replace(/"/g, '""')}"`, // Escapar comillas dobles
            materia.cuatrimestre,
            statusOptions[materia.status].label,
            materia.nota !== null ? materia.nota : 'N/A'
        ].join(',');
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `progreso_${currentPlanName}.csv`);
    document.body.appendChild(link); // Requerido para Firefox
    link.click();
    document.body.removeChild(link);
    showToast("Progreso exportado como CSV.");
}

// --- Lógica de Correlativas ---

/**
 * Verifica si las correlativas de una materia están cumplidas para un tipo de requisito (cursar o final).
 * @param {object} materia - El objeto materia a verificar.
 * @param {'cursar'|'final'} tipoRequisito - 'cursar' para regularizar/cursar, 'final' para aprobar/promocionar/equivalencia.
 * @returns {Array<{id: string, nombre: string, tipo: string}>} Un array de correlativas no cumplidas.
 */
function checkCorrelativas(materia, tipoRequisito) {
    const unmet = [];
    const correlativas = materia.correlativas;

    console.log(`DEBUG: Materia completa recibida en checkCorrelativas:`, JSON.parse(JSON.stringify(materia)));
    console.log(`DEBUG: Tipo de requisito solicitado: "${tipoRequisito}"`);

    if (!correlativas) {
        console.log(`DEBUG: No hay correlativas definidas para ${materia.nombre}.`);
        return unmet;
    }

    // --- CAMBIO CLAVE AQUÍ ---
    // Capitalizamos la primera letra de tipoRequisito para que coincida con las claves del JSON (paraFinal, paraCursar)
    const capitalizedTipoRequisito = tipoRequisito.charAt(0).toUpperCase() + tipoRequisito.slice(1);
    const paraTipoRequisitoObj = correlativas[`para${capitalizedTipoRequisito}`];
    // --- FIN CAMBIO CLAVE ---

    console.log(`DEBUG: Objeto correlativas["para${capitalizedTipoRequisito}"]:`, paraTipoRequisitoObj); // Actualizado para reflejar el cambio

    const regularizadasNecesarias = paraTipoRequisitoObj?.regularizadas || [];
    const aprobadasNecesarias = paraTipoRequisitoObj?.aprobadas || [];

    console.log(`DEBUG:   - Regularizadas necesarias (extraídas):`, regularizadasNecesarias);
    console.log(`DEBUG:   - Aprobadas necesarias (extraídas):`, aprobadasNecesarias);

    console.log(`DEBUG: --- Chequeando correlativas para "${materia.nombre}" (${tipoRequisito}) ---`);
    console.log(`DEBUG:   - Regularizadas necesarias (IDs):`, regularizadasNecesarias);
    console.log(`DEBUG:   - Aprobadas necesarias (IDs):`, aprobadasNecesarias);

    // ... (el resto de la función es igual) ...
    regularizadasNecesarias.forEach(prereqId => {
        const prereqMateria = materias.find(m => String(m.id) === String(prereqId));

        console.log(`DEBUG:     - Correlativa Regularizada ID ${prereqId}:`);
        console.log(`DEBUG:       - Materia encontrada: ${prereqMateria ? prereqMateria.nombre : 'NO ENCONTRADA'}`);
        console.log(`DEBUG:       - Estado actual de "${prereqMateria?.nombre || 'N/A'}": ${prereqMateria?.status || 'N/A'}`);

        const estadosValidosParaRegularizada = ['regular', 'aprobada', 'promocionada', 'equivalencia'];
        const isMet = prereqMateria && estadosValidosParaRegularizada.includes(prereqMateria.status);

        console.log(`DEBUG:       - ¿Cumple para regularizada? ${isMet}`);

        if (!isMet) {
            unmet.push({
                id: prereqMateria?.id || String(prereqId),
                nombre: prereqMateria?.nombre || `Materia ID ${prereqId} (no encontrada en lista)`,
                tipo: 'regularizada'
            });
        }
    });

    aprobadasNecesarias.forEach(prereqId => {
        const prereqMateria = materias.find(m => String(m.id) === String(prereqId));

        console.log(`DEBUG:     - Correlativa Aprobada ID ${prereqId}:`);
        console.log(`DEBUG:       - Materia encontrada: ${prereqMateria ? prereqMateria.nombre : 'NO ENCONTRADA'}`);
        console.log(`DEBUG:       - Estado actual de "${prereqMateria?.nombre || 'N/A'}": ${prereqMateria?.status || 'N/A'}`);

        const isMet = prereqMateria && approvedStates.includes(prereqMateria.status);

        console.log(`DEBUG:       - ¿Cumple para aprobada? ${isMet}`);

        if (!isMet) {
            unmet.push({
                id: prereqMateria?.id || String(prereqId),
                nombre: prereqMateria?.nombre || `Materia ID ${prereqId} (no encontrada en lista)`,
                tipo: 'aprobada'
            });
        }
    });

    console.log(`DEBUG: --- Resultado final para "${materia.nombre}": Correlativas NO cumplidas:`, unmet);
    return unmet;
}

// --- Lógica del Modal de Estado ---

/**
 * Abre el modal de cambio de estado para una materia específica.
 * @param {string} materiaId - El ID de la materia a editar.
 */
function openModal(materiaId) {
    currentMateriaId = materiaId;
    const materia = materias.find(m => m.id === materiaId);
    if (!materia) return;

    modalTitle.textContent = materia.nombre;
    modalErrorMessage.textContent = '';
    modalErrorMessage.classList.add('hidden');

    gradeInput.value = materia.nota || '';

    modalOptionsContainer.innerHTML = '';
    Object.entries(statusOptions).forEach(([key, value]) => {
        const isChecked = materia.status === key;
        const optionHtml = `
            <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                ${isChecked ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}">
                <span class="font-semibold">${value.label}</span>
                <input type="radio" name="status" value="${key}" class="hidden" ${isChecked ? 'checked' : ''}>
            </label>
        `;
        modalOptionsContainer.insertAdjacentHTML('beforeend', optionHtml);
    });

    updateGradeInputForStatus(materia.status);

    // Añadir event listeners a los nuevos radio buttons del modal
    modalOptionsContainer.querySelectorAll('input[name="status"]').forEach(radio => {
        // Remover listener antes de añadir para evitar duplicados si el modal se reabre
        radio.removeEventListener('change', handleStatusOptionChange);
        radio.addEventListener('change', handleStatusOptionChange);
    });

    // Mostrar el modal
    statusModal.classList.remove('hidden');
    statusModal.classList.add('flex'); // Asegurar que sea flex para centrado

    if (gradeInputContainer.classList.contains('visible')) {
        gradeInput.focus();
    }
}

/**
 * Handler para el evento 'change' de las opciones de estado en el modal.
 * Realiza la validación de correlativas y actualiza la interfaz visual.
 * @param {Event} e - El objeto evento.
 */
function handleStatusOptionChange(e) {
    // console.log("handleStatusOptionChange se ha disparado.");
    // console.log("Evento target:", e.target);

    const materia = materias.find(m => m.id === currentMateriaId);
    if (!materia) return;

    const newStatus = e.target.value;
    const originalStatus = materia.status; // Estado actual de la materia, antes de cualquier cambio

    modalErrorMessage.textContent = ''; // Limpiar mensaje de error
    modalErrorMessage.classList.add('hidden'); // Ocultar contenedor de error

    let unmetPrerequisites = [];
    let needsValidation = false;

    // Determinar qué tipo de correlativa se necesita verificar para el NUEVO estado
    if (approvedStates.includes(newStatus)) {
        unmetPrerequisites = checkCorrelativas(materia, 'final');
        console.log("Materias no cumplidas para " + newStatus + ":", unmetPrerequisites);
        needsValidation = true;
    } else if (newStatus === 'regular' || newStatus === 'cursando') {
        unmetPrerequisites = checkCorrelativas(materia, 'cursar');
        console.log("Materias no cumplidas para " + newStatus + ":", unmetPrerequisites);
        needsValidation = true;
    }

    // --- LÓGICA DE VALIDACIÓN INMEDIATA ---
    if (needsValidation && unmetPrerequisites.length > 0) {
        const firstUnmet = unmetPrerequisites[0];
        let message = `No se puede seleccionar "${statusOptions[newStatus].label}". Requiere: `;
        if (firstUnmet.tipo === 'regularizada') {
            message += `regularizar "${firstUnmet.nombre}".`;
        } else if (firstUnmet.tipo === 'aprobada') {
            message += `aprobar "${firstUnmet.nombre}".`;
        }
        modalErrorMessage.textContent = message;
        modalErrorMessage.classList.remove('hidden'); // Mostrar el mensaje de error

        // Revertir la selección del radio button al estado original y actualizar visualmente
        e.target.checked = false; // Desmarcar la opción inválida
        const originalRadio = modalOptionsContainer.querySelector(`input[value="${originalStatus}"]`);
        if (originalRadio) originalRadio.checked = true; // Volver a marcar la opción original

        modalOptionsContainer.querySelectorAll('label').forEach(l => {
            l.classList.remove('bg-cyan-600'); // Remover el brillo de todas
            l.classList.add('bg-slate-700'); // Restaurar el fondo por defecto
            l.classList.add('hover:bg-slate-600'); // Restaurar el hover
        });
        if (originalRadio) {
            const originalLabel = originalRadio.closest('label');
            originalLabel.classList.remove('bg-slate-700'); // Quitar el fondo por defecto del label original
            originalLabel.classList.remove('hover:bg-slate-600'); // Quitar el hover del label original
            originalLabel.classList.add('bg-cyan-600'); // Aplicar brillo al label original
        }

        toggleGradeInputVisibility(originalStatus); // Asegura que el input de nota refleje el estado original
        return; // ¡IMPORTANTE! Detiene la ejecución de la función si la validación falla
    }

    // Si la validación pasa, actualiza los estilos para la opción seleccionada
    modalOptionsContainer.querySelectorAll('label').forEach(l => {
        l.classList.remove('bg-cyan-600'); // Quita el brillo de la opción previamente seleccionada
        l.classList.add('bg-slate-700'); // Asegura el color por defecto para las no seleccionadas
        l.classList.add('hover:bg-slate-600'); // Asegura el hover para las no seleccionadas
    });

    const selectedLabel = e.target.closest('label');
    if (selectedLabel) {
        selectedLabel.classList.remove('bg-slate-700'); // Quita el fondo por defecto
        selectedLabel.classList.remove('hover:bg-slate-600'); // Quita el hover
        selectedLabel.classList.add('bg-cyan-600'); // Aplica el brillo a la opción seleccionada
    }

    toggleGradeInputVisibility(newStatus);
    updateGradeInputForStatus(newStatus);
}


/**
 * Muestra u oculta el campo de entrada de nota en el modal según el estado.
 * @param {string} status - El estado seleccionado de la materia.
 */
function toggleGradeInputVisibility(status) {
    if (approvedStates.includes(status)) {
        gradeInputContainer.classList.remove('hidden');
        gradeInputContainer.classList.add('visible');
    } else {
        gradeInputContainer.classList.add('hidden');
        gradeInputContainer.classList.remove('visible');
    }
}

/**
 * Ajusta la etiqueta y los atributos min/max del input de nota en el modal.
 * @param {string} status - El estado seleccionado.
 */
function updateGradeInputForStatus(status) {
    if (status === 'aprobada' || status === 'promocionada') {
        gradeInputLabel.textContent = 'Nota Final (4-10):';
        gradeInput.min = '4';
        gradeInput.max = '10';
    } else {
        gradeInputLabel.textContent = 'Nota (1-10):'; // Para otros estados que no requieren nota de aprobación
        gradeInput.min = '1';
        gradeInput.max = '10';
    }
    toggleGradeInputVisibility(status);
}


/**
 * Cierra el modal, aplica los cambios de estado y nota, guarda y actualiza métricas.
 * Realiza la validación final antes de guardar.
 */
function closeModal() {
    const materia = materias.find(m => m.id === currentMateriaId);
    if (!materia) return;

    const selectedRadio = modalOptionsContainer.querySelector('input[name="status"]:checked');
    const newStatus = selectedRadio ? selectedRadio.value : materia.status; // Si no hay nada seleccionado, mantiene el estado actual

    let newGrade = null;
    modalErrorMessage.textContent = ''; // Limpiar mensajes de error anteriores
    modalErrorMessage.classList.add('hidden'); // Ocultar el contenedor de mensajes

    // --- Validación de Correlativas al CERRAR el modal ---
    // Esta validación final es crucial para evitar guardar un estado inválido
    let unmetPrerequisites = [];
    let needsValidation = false;

    // Determinar qué tipo de correlativa se necesita verificar según el nuevo estado
    if (approvedStates.includes(newStatus)) {
        unmetPrerequisites = checkCorrelativas(materia, 'final');
        needsValidation = true;
    } else if (newStatus === 'regular' || newStatus === 'cursando') { // Incluye 'cursando'
        unmetPrerequisites = checkCorrelativas(materia, 'cursar');
        needsValidation = true;
    }

    // Si la validación es necesaria y hay correlativas sin cumplir
    if (needsValidation && unmetPrerequisites.length > 0) {
        const firstUnmet = unmetPrerequisites[0]; // Tomar la primera correlativa no cumplida para el mensaje
        let message = `No se puede guardar como "${statusOptions[newStatus].label}". Requiere: `;
        if (firstUnmet.tipo === 'regularizada') {
            message += `regularizar "${firstUnmet.nombre}".`;
        } else if (firstUnmet.tipo === 'aprobada') {
            message += `aprobar "${firstUnmet.nombre}".`;
        }
        modalErrorMessage.textContent = message;
        modalErrorMessage.classList.remove('hidden'); // Mostrar el mensaje de error
        return; // ¡IMPORTANTE! Detiene el cierre del modal si las correlativas no se cumplen
    }
    // --- Fin Validación de Correlativas ---

    // --- Validación de Nota (lógica existente) ---
    // Solo se valida la nota si el nuevo estado es "aprobada", "promocionada" o "equivalencia"
    if (approvedStates.includes(newStatus)) {
        newGrade = parseFloat(gradeInput.value);
        if (isNaN(newGrade) || newGrade < 1 || newGrade > 10) {
            modalErrorMessage.textContent = 'Por favor, introduce una nota válida (1-10).';
            modalErrorMessage.classList.remove('hidden');
            return; // No cierra el modal si la nota es inválida
        }
        if ((newStatus === 'aprobada' || newStatus === 'promocionada') && newGrade < 4) {
             modalErrorMessage.textContent = 'Para aprobar/promocionar, la nota debe ser 4 o más.';
             modalErrorMessage.classList.remove('hidden');
             return; // No cierra el modal
        }
    }
    // --- Fin Validación de Nota ---

    // Si todas las validaciones (correlativas y nota) pasan, entonces se actualiza y cierra
    materia.status = newStatus;
    materia.nota = newGrade;

    statusModal.classList.add('hidden'); // Ocultar el modal
    statusModal.classList.remove('flex'); // Quitar la clase flex para que hidden funcione
    currentMateriaId = null; // Limpiar la materia actual

    updateMateriaView(materia.id); // Actualiza solo la tarjeta de la materia que cambió
    saveState(); // Guarda el estado actualizado
    updateMetrics(); // Recalcula y actualiza las métricas de progreso
    renderPlan(); // Re-renderiza todo el plan para actualizar visualmente las correlativas de otras materias
}


// --- Carga y Renderizado Inicial ---

/**
 * Carga las materias desde el archivo JSON del plan especificado.
 * @param {string} planName - El nombre del plan (ej. 'TPI').
 */
async function cargarMaterias(planName) {
    if (!planName) {
        // En lugar de error, intentamos cargar un plan por defecto o mostrar un mensaje inicial.
        tituloCarrera.innerText = "Selecciona un plan de estudios";
        console.warn("No se especificó un plan para cargar.");
        materias = []; // Vaciar materias si no hay plan
        renderPlan();
        updateMetrics();
        return;
    }

    currentPlanName = planName; // Establece el plan actual

    try {
        const response = await fetch(`planes/${planName}.json`);
        if (!response.ok) {
            throw new Error(`No se pudo cargar el plan: ${response.statusText}`);
        }
        const data = await response.json();

        // Inicializar materias con status y nota por defecto
        materias = data.map(materia => ({
            ...materia,
            status: 'no-cursada', // Estado inicial
            nota: null // Nota inicial
        }));

        tituloCarrera.innerText = `Seguimiento de Carrera: ${planName.toUpperCase()}`;

        loadState(); // Cargar el estado guardado *después* de inicializar las materias
        renderPlan();
        updateMetrics();

    } catch (error) {
        tituloCarrera.innerText = `Error al cargar el plan "${planName}"`;
        console.error("Error al cargar el JSON:", error);
        showToast(`Error: ${error.message}`);
        materias = []; // Asegurarse de que el array esté vacío en caso de error
        renderPlan(); // Renderizar el plan vacío
        updateMetrics(); // Actualizar métricas a 0
    }
}

/**
 * Dibuja el plan de estudios en el DOM, agrupando por cuatrimestre.
 */
function renderPlan() {
    planDeEstudiosContainer.innerHTML = ''; // Limpiar el contenedor existente

    // Agrupar materias por cuatrimestre
    const cuatrimestres = {};
    materias.forEach(materia => {
        if (!cuatrimestres[materia.cuatrimestre]) {
            cuatrimestres[materia.cuatrimestre] = [];
        }
        cuatrimestres[materia.cuatrimestre].push(materia);
    });

    // Ordenar cuatrimestres
    const cuatrimestresOrdenados = Object.keys(cuatrimestres).sort((a, b) => parseInt(a) - parseInt(b));

    cuatrimestresOrdenados.forEach(numCuatrimestre => {
        const columnaDiv = document.createElement('div');
        columnaDiv.className = 'cuatrimestre-columna bg-slate-800 p-4 rounded-lg shadow-xl m-2 flex-shrink-0 flex-grow';
        columnaDiv.innerHTML = `<h3 class="text-xl font-bold mb-4 text-center text-cyan-400">${numCuatrimestre}° Cuatrimestre</h3>`;

        cuatrimestres[numCuatrimestre].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(materia => {
            const materiaDiv = document.createElement('div');
            // Determinar el color del punto de dictado
            let dictadoColor = '';
            if (materia.dictado === '1') dictadoColor = 'bg-purple-500'; // 1er cuatrimestre
            else if (materia.dictado === '2') dictadoColor = 'bg-pink-500'; // 2do cuatrimestre
            else if (materia.dictado === 'ambos') dictadoColor = 'bg-orange-500'; // Ambos

            const unmetCorrelativasForRegular = checkCorrelativas(materia, 'cursar');
            const unmetCorrelativasForApproved = checkCorrelativas(materia, 'final');

            // Añadir clase 'requiere-correlativa' si no puede ser regular o aprobada
            const canBeRegular = unmetCorrelativasForRegular.length === 0;
            const canBeApproved = unmetCorrelativasForApproved.length === 0;
            const requiresCorrelativeClass = (!canBeRegular && materia.status === 'no-cursada') || (!canBeApproved && !approvedStates.includes(materia.status));


            materiaDiv.className = `materia p-4 rounded-lg shadow mb-3 border-2 border-slate-700 ${materia.status} ${requiresCorrelativeClass ? 'requiere-correlativa' : ''}`;
            materiaDiv.dataset.id = materia.id; // Almacena el ID para identificar la materia al hacer clic
            materiaDiv.dataset.correlativasParaCursar = JSON.stringify(materia.correlativas?.paraCursar || {});
            materiaDiv.dataset.correlativasParaFinal = JSON.stringify(materia.correlativas?.paraFinal || {});

            const dictadoLabel = materia.dictado === '1' ? '1° Cuatrimestre' :
                                 materia.dictado === '2' ? '2° Cuatrimestre' : 'Ambos Cuatrimestres';

            materiaDiv.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-semibold">${materia.nombre}</h4>
                    <span class="status-icon text-2xl">${statusOptions[materia.status].icon}</span>
                </div>
                <p class="text-slate-400 text-sm mb-1">
                    Cuatrimestre: ${materia.cuatrimestre}
                    <span class="dictado-punto ${dictadoColor}"></span>
                </p>
                <p class="text-slate-300 text-sm grade-display ${materia.nota === null ? 'hidden' : ''}">
                    Nota: ${materia.nota !== null ? materia.nota : ''}
                </p>
            `;
            columnaDiv.appendChild(materiaDiv);
        });
        planDeEstudiosContainer.appendChild(columnaDiv);
    });
    addEventListeners(); // Re-agrega los event listeners después de renderizar
}


// --- Event Listeners ---

function addEventListeners() {
    // Es crucial que los listeners se añadan *después* de que las materias existan en el DOM.
    // También nos aseguramos de no añadir duplicados.

    document.querySelectorAll('.materia').forEach(div => {
        // Remover cualquier listener existente antes de añadir uno nuevo
        // Esto es importante si renderPlan se llama múltiples veces (ej. al cerrar el modal)
        div.removeEventListener('click', handleMateriaClick);
        div.removeEventListener('mouseover', handleMateriaMouseOver);
        div.removeEventListener('mouseout', handleMateriaMouseOut);

        // Añadir los nuevos listeners
        div.addEventListener('click', handleMateriaClick);
        div.addEventListener('mouseover', handleMateriaMouseOver);
        div.addEventListener('mouseout', handleMateriaMouseOut);
    });

    // Event listeners para el modal de estado (elementos estáticos, se añaden una vez)
    // Nos aseguramos que solo se añadan si aún no tienen el listener
    if (!modalCloseBtn.dataset.listenerAdded) {
        modalCloseBtn.addEventListener('click', closeModal);
        modalCloseBtn.dataset.listenerAdded = 'true';
    }

    if (!statusModal.dataset.listenerAdded) {
        statusModal.addEventListener('click', (e) => {
            if (e.target === statusModal) closeModal(); // Cierra si se hace clic fuera del contenido
        });
        statusModal.dataset.listenerAdded = 'true';
    }


    // Event listeners para los botones de las métricas (elementos estáticos)
    const resetButton = document.getElementById('reset-button');
    if (resetButton && !resetButton.dataset.listenerAdded) {
        resetButton.addEventListener('click', () => {
            confirmResetModal.classList.remove('hidden');
            confirmResetModal.classList.add('flex');
        });
        resetButton.dataset.listenerAdded = 'true';
    }

    const printButton = document.getElementById('print-progress-button');
    if (printButton && !printButton.dataset.listenerAdded) {
        printButton.addEventListener('click', printProgress);
        printButton.dataset.listenerAdded = 'true';
    }


    // Event listeners para el modal de confirmación de reinicio (elementos estáticos)
    if (!cancelResetBtn.dataset.listenerAdded) {
        cancelResetBtn.addEventListener('click', () => {
            confirmResetModal.classList.add('hidden');
            confirmResetModal.classList.remove('flex');
        });
        cancelResetBtn.dataset.listenerAdded = 'true';
    }

    if (!confirmResetBtn.dataset.listenerAdded) {
        confirmResetBtn.addEventListener('click', () => {
            resetState();
            confirmResetModal.classList.add('hidden');
            confirmResetModal.classList.remove('flex');
        });
        confirmResetBtn.dataset.listenerAdded = 'true';
    }

    // Nuevo Event Listener para el botón de "Cargar Plan"
    if (applyPlanButton && !applyPlanButton.dataset.listenerAdded) {
        applyPlanButton.addEventListener('click', () => {
            const selectedPlan = planSelector.value;
            cargarMaterias(selectedPlan);
        });
        applyPlanButton.dataset.listenerAdded = 'true';
    }

    // Al cargar la página, asegúrate de que el selector muestre el plan actual.
    if (planSelector && planSelector.value !== currentPlanName) {
        planSelector.value = currentPlanName;
    }
}

// Handler para el clic en una materia (se usa en addEventListeners)
function handleMateriaClick(e) {
    const materiaId = e.currentTarget.dataset.id;
    openModal(materiaId);
}

// Handlers para mouseover y mouseout (resaltado de correlativas)
function handleMateriaMouseOver(e) {
    const materiaId = e.currentTarget.dataset.id;
    const materiaActual = materias.find(m => m.id === materiaId);
    if (!materiaActual) return;

    document.querySelectorAll('.materia').forEach(d => d.classList.remove('hovered', 'necesita', 'habilita'));
    e.currentTarget.classList.add('hovered');

    // Resaltar las correlativas necesarias para FINAL
    if (materiaActual.correlativas?.paraFinal?.aprobadas) {
        materiaActual.correlativas.paraFinal.aprobadas.forEach(id => {
            const el = document.querySelector(`.materia[data-id="${id}"]`);
            if (el) el.classList.add('necesita');
        });
    }
    if (materiaActual.correlativas?.paraFinal?.regularizadas) {
        materiaActual.correlativas.paraFinal.regularizadas.forEach(id => {
            const el = document.querySelector(`.materia[data-id="${id}"]`);
            if (el) el.classList.add('necesita');
        });
    }
    // Resaltar las correlativas necesarias para CURSAR
    if (materiaActual.correlativas?.paraCursar?.aprobadas) {
        materiaActual.correlativas.paraCursar.aprobadas.forEach(id => {
            const el = document.querySelector(`.materia[data-id="${id}"]`);
            if (el) el.classList.add('necesita');
        });
    }
    if (materiaActual.correlativas?.paraCursar?.regularizadas) {
        materiaActual.correlativas.paraCursar.regularizadas.forEach(id => {
            const el = document.querySelector(`.materia[data-id="${id}"]`);
            if (el) el.classList.add('necesita');
        });
    }


    // Resaltar las materias que esta habilita (para cursar o para final)
    materias.forEach(m => {
        const habilitaParaCursar = (m.correlativas?.paraCursar?.regularizadas?.includes(parseInt(materiaId)) || m.correlativas?.paraCursar?.aprobadas?.includes(parseInt(materiaId)));
        const habilitaParaFinal = (m.correlativas?.paraFinal?.regularizadas?.includes(parseInt(materiaId)) || m.correlativas?.paraFinal?.aprobadas?.includes(parseInt(materiaId)));
        if (habilitaParaCursar || habilitaParaFinal) {
            const el = document.querySelector(`.materia[data-id="${m.id}"]`);
            if (el) el.classList.add('habilita');
        }
    });
}

function handleMateriaMouseOut() {
    document.querySelectorAll('.materia').forEach(d => d.classList.remove('hovered', 'necesita', 'habilita'));
}


// --- Inicialización de la aplicación ---
document.addEventListener('DOMContentLoaded', () => {
    // Establecer el valor inicial del selector basado en `currentPlanName`
    if (planSelector) {
        planSelector.value = currentPlanName;
    }
    cargarMaterias(currentPlanName); // Carga el plan por defecto al iniciar la página
});