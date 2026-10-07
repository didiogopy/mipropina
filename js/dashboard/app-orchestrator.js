/**
 * ============================================================================
 * ORQUESTADOR PRINCIPAL DE LA APLICACIÓN
 * ============================================================================
 * Coordina toda la lógica de la aplicación usando módulos especializados
 * Este es el punto central sin lógica de negocio, solo orquestación
 */

import {
    createIngreso,
    deleteIngreso,
    updateIngreso,
    subscribeToIngresos
} from '../services/storage-service.js';

import { updateAllUI } from '../modules/ui-coordinator.js';

import {
    validateAmount,
    validateDate,
    isNotFutureDate,
    sanitizeHtml,
    toISODate
} from '../utils/validators.js';
import { toCalendarDate } from '../utils/calendar.js';

import {
    COLORS,
    DOM_SELECTORS,
    MESSAGES,
    APP_STATES
} from '../constants/app-constants.js';

// ============================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================================

let appState = {
    currentUser: null,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    historyYear: new Date().getFullYear(),
    ingresos: [],
    unsubscribeIngresos: null,
    appStatus: APP_STATES.UNAUTHENTICATED
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

/**
 * Inicializa el dashboard después de autenticación exitosa
 * @param {Object} user - Usuario autenticado desde Firebase Auth
 */
export async function iniciarDashboard(user) {
    try {
        appState.currentUser = user;
        appState.appStatus = APP_STATES.AUTHENTICATING;
        
        // Ocultar login, mostrar dashboard
        document.querySelector(DOM_SELECTORS.LOGIN_SCREEN).classList.add('d-none');
        document.querySelector(DOM_SELECTORS.APP_CONTAINER).classList.remove('d-none');
        
        // Actualizar perfil de usuario
        updateUserProfile(user);
        
        // Inicializar fecha del formulario
        setFechaHoyInput();
        
        // Cargar datos (inicial)
        await cargarDatos();
        
        // Configurar eventos
        configurarEventos();
        
        appState.appStatus = APP_STATES.DATA_READY;
    } catch (error) {
        console.error('Error iniciando dashboard:', error);
        appState.appStatus = APP_STATES.ERROR;
        mostrarError(MESSAGES.ERROR_LOAD_DATA);
    }
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

/**
 * Carga datos iniciales del usuario (año actual)
 * @private
 */
async function cargarDatos() {
    try {
        appState.appStatus = APP_STATES.LOADING_DATA;
        
        // Suscribirse a cambios en tiempo real
        if (appState.unsubscribeIngresos) {
            appState.unsubscribeIngresos();
        }
        
        appState.unsubscribeIngresos = subscribeToIngresos(
            appState.currentUser.uid,
            (ingresos) => {
                appState.ingresos = ingresos;
                actualizarUI();
            }
        );
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarError(MESSAGES.ERROR_LOAD_DATA);
        throw error;
    }
}

// ============================================================================
// ACTUALIZACIÓN DE UI
// ============================================================================

/**
 * Actualiza toda la interfaz
 * @private
 */
function actualizarUI() {
    const ingresosDelMes = appState.ingresos.filter(ingreso => {
        const fecha = toCalendarDate(ingreso);

        return !Number.isNaN(fecha.getTime()) &&
            fecha.getFullYear() === appState.currentYear &&
            fecha.getMonth() === appState.currentMonth;
    });

    const ingresosDelAnio = appState.ingresos.filter(ingreso => {
        const fecha = toCalendarDate(ingreso);

        return !Number.isNaN(fecha.getTime()) && fecha.getFullYear() === appState.historyYear;
    });

    updateAllUI(ingresosDelMes, appState.currentYear, appState.currentMonth, ingresosDelAnio, appState.historyYear);
}

/**
 * Actualiza perfil de usuario en la UI
 * @private
 */
function updateUserProfile(user) {
    const photoEl = document.querySelector(DOM_SELECTORS.USER_PHOTO);
    const nameEl = document.querySelector(DOM_SELECTORS.USER_NAME);
    
    if (photoEl && user.photoURL) {
        photoEl.src = user.photoURL;
    }
    if (nameEl && user.displayName) {
        nameEl.innerText = user.displayName.split(' ')[0];
    }
}

// ============================================================================
// CONFIGURACIÓN DE EVENTOS
// ============================================================================

/**
 * Configura todos los event listeners
 * @private
 */
function configurarEventos() {
    // Métodos de pago
    document.querySelectorAll(DOM_SELECTORS.METHOD_CARDS).forEach(card => {
        card.addEventListener('click', handleMethodClick);
    });
    
    // Botón guardar
    const btnSave = document.querySelector(DOM_SELECTORS.BTN_SAVE);
    if (btnSave) {
        btnSave.addEventListener('click', guardarPropina);
    }
    
    window.cambiarFecha = handleMonthChange;
    window.cambiarAnio = handleYearChange;
    
}

function configurarPestanasDashboard() {
    const tabs = Array.from(document.querySelectorAll('[data-dashboard-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-dashboard-panel]'));

    if (tabs.length === 0 || panels.length === 0) return;

    const activateTab = (key, moveFocus = false) => {
        const activeTab = tabs.find(tab => tab.dataset.dashboardTab === key);
        if (!activeTab) return;

        tabs.forEach(tab => {
            const isActive = tab === activeTab;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        });

        panels.forEach(panel => {
            panel.hidden = panel.dataset.dashboardPanel !== key;
        });

        if (moveFocus) activeTab.focus();
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab.dataset.dashboardTab));
        tab.addEventListener('keydown', event => {
            let nextIndex = index;

            if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = tabs.length - 1;
            else return;

            event.preventDefault();
            activateTab(tabs[nextIndex].dataset.dashboardTab, true);
        });
    });

    const selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0];
    activateTab(selectedTab.dataset.dashboardTab);
}

configurarPestanasDashboard();

/**
 * Utilidad: Debounce para limitar llamadas a función
 * @private
 */
// ============================================================================
// MANEJADORES DE EVENTOS
// ============================================================================

/**
 * Maneja selección de método de pago
 * @private
 */
function handleMethodClick(e) {
    const card = e.target.closest(DOM_SELECTORS.METHOD_CARDS);
    if (!card) return;
    
    // Actualizar UI
    document.querySelectorAll(DOM_SELECTORS.METHOD_CARDS).forEach(methodCard => {
        methodCard.classList.remove('active');
        methodCard.setAttribute('aria-pressed', 'false');
    });
    card.classList.add('active');
    card.setAttribute('aria-pressed', 'true');
}

function handleMonthChange(delta) {
    const nextMonth = new Date(appState.currentYear, appState.currentMonth + delta, 1);
    appState.currentYear = nextMonth.getFullYear();
    appState.currentMonth = nextMonth.getMonth();
    actualizarUI();
}

/**
 * Cambia el año del historial.
 * @private
 */
function handleYearChange(delta) {
    appState.historyYear += delta;
    actualizarUI();
}

// ============================================================================
// FUNCIONES DE GUARDADO DE INGRESOS
// ============================================================================

/**
 * Guarda una propina
 * @private
 */
async function guardarPropina() {
    try {
        const tipo = document.querySelector(DOM_SELECTORS.METHOD_CARDS + '.active')?.dataset.tipo;
        const monto = parseFloat(document.querySelector(DOM_SELECTORS.INPUT_AMOUNT).value);
        const fecha = document.querySelector(DOM_SELECTORS.INPUT_DATE).value;

        if (!tipo) {
            mostrarError(MESSAGES.ERROR_METHOD_REQUIRED);
            return;
        }

        const amountValidation = validateAmount(monto);
        if (!amountValidation.isValid) {
            mostrarError(amountValidation.error);
            return;
        }

        const dateValidation = validateDate(fecha);
        if (!dateValidation.isValid) {
            mostrarError(dateValidation.error);
            return;
        }

        const fechaRegistro = new Date(`${fecha}T12:00:00`);
        if (!isNotFutureDate(fechaRegistro)) {
            mostrarError('No puedes registrar propinas con fecha futura.');
            return;
        }

        await createIngreso(appState.currentUser.uid, {
            tipo: sanitizeHtml(tipo),
            monto: parseFloat(monto.toFixed(2)),
            fecha: fechaRegistro,
            fecha_str: fechaRegistro.toISOString()
        });

        limpiarFormulario();
        mostrarExito(MESSAGES.SUCCESS_SAVED);
    } catch (error) {
        console.error('Error guardando propina:', error);
        mostrarError(error.message || MESSAGES.ERROR_SAVE_DATA);
    }
}

// ============================================================================
// UTILIDADES DE FORMULARIO
// ============================================================================

/**
 * Limpia todos los campos del formulario
 * @private
 */
function limpiarFormulario() {
    document.querySelector(DOM_SELECTORS.INPUT_AMOUNT).value = '';
    document.querySelectorAll(DOM_SELECTORS.METHOD_CARDS).forEach(card => {
        card.classList.remove('active');
        card.setAttribute('aria-pressed', 'false');
    });
}

/**
 * Establece fecha del input a hoy
 * @private
 */
function setFechaHoyInput() {
    const hoy = new Date();
    document.querySelector(DOM_SELECTORS.INPUT_DATE).value = toISODate(hoy);
}

// ============================================================================
// FEEDBACK AL USUARIO
// ============================================================================

/**
 * Muestra error al usuario
 * @private
 */
function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonColor: COLORS.PRIMARY
    });
}

/**
 * Muestra mensaje de éxito
 * @private
 */
function mostrarExito(mensaje) {
    Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: mensaje,
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: COLORS.PRIMARY
    });
}

function findIngreso(ingresoId) {
    return appState.ingresos.find(ingreso => ingreso.id === ingresoId);
}

function getIngresoDateValue(ingreso) {
    return toISODate(toCalendarDate(ingreso));
}

window.abrirEdicion = async ingresoId => {
    const ingreso = findIngreso(ingresoId);
    if (!ingreso) {
        mostrarError('No se encontró esta propina. Actualiza el historial e inténtalo de nuevo.');
        return;
    }

    const result = await Swal.fire({
        title: 'Editar propina',
        html: `
            <div class="text-start">
                <label class="form-label-custom" for="editFecha">Fecha</label>
                <input id="editFecha" type="date" class="form-control-custom mb-3" value="${getIngresoDateValue(ingreso)}">
                <label class="form-label-custom" for="editMonto">Monto (S/)</label>
                <input id="editMonto" type="number" class="form-control-custom mb-3" min="1" max="999" step="0.01" value="${Number(ingreso.monto)}">
                <label class="form-label-custom" for="editTipo">Método de pago</label>
                <select id="editTipo" class="form-control-custom form-select">
                    <option value="Efectivo" ${ingreso.tipo === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                    <option value="Tarjeta" ${ingreso.tipo === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
                    <option value="Yape/Plin" ${ingreso.tipo === 'Yape/Plin' ? 'selected' : ''}>Digital</option>
                    <option value="Otros" ${!['Efectivo', 'Tarjeta', 'Yape/Plin'].includes(ingreso.tipo) ? 'selected' : ''}>Otros</option>
                </select>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar cambios',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: COLORS.PRIMARY,
        background: document.documentElement.dataset.theme === 'dark' ? '#222d27' : '#fff',
        color: document.documentElement.dataset.theme === 'dark' ? '#eff5f0' : '#202b26',
        preConfirm: () => {
            const fecha = document.getElementById('editFecha').value;
            const monto = document.getElementById('editMonto').value;
            const tipo = document.getElementById('editTipo').value;
            const amountValidation = validateAmount(monto);
            const dateValidation = validateDate(fecha);

            if (!amountValidation.isValid) {
                Swal.showValidationMessage(amountValidation.error);
                return false;
            }
            if (!dateValidation.isValid) {
                Swal.showValidationMessage(dateValidation.error);
                return false;
            }
            if (!isNotFutureDate(new Date(`${fecha}T12:00:00`))) {
                Swal.showValidationMessage('No puedes usar una fecha futura.');
                return false;
            }

            return { fecha, monto: Number(monto), tipo };
        }
    });

    if (!result.isConfirmed) return;

    const fecha = new Date(`${result.value.fecha}T12:00:00`);
    try {
        await updateIngreso(ingresoId, {
            tipo: result.value.tipo,
            monto: Number(result.value.monto.toFixed(2)),
            fecha,
            fecha_str: fecha.toISOString()
        });
        mostrarExito(MESSAGES.SUCCESS_UPDATED);
    } catch (error) {
        console.error('Error actualizando propina:', error);
        mostrarError(error.message || MESSAGES.ERROR_SAVE_DATA);
    }
};

window.borrarRegistro = async ingresoId => {
    const ingreso = findIngreso(ingresoId);
    if (!ingreso) {
        mostrarError('No se encontró esta propina. Actualiza el historial e inténtalo de nuevo.');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar esta propina?',
        text: `${ingreso.tipo} · S/ ${Number(ingreso.monto).toFixed(2)}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Conservar',
        confirmButtonColor: COLORS.PRIMARY,
        background: document.documentElement.dataset.theme === 'dark' ? '#222d27' : '#fff',
        color: document.documentElement.dataset.theme === 'dark' ? '#eff5f0' : '#202b26'
    });

    if (!result.isConfirmed) return;

    try {
        await deleteIngreso(ingresoId);
        mostrarExito(MESSAGES.SUCCESS_DELETED);
    } catch (error) {
        console.error('Error eliminando propina:', error);
        mostrarError(error.message || MESSAGES.ERROR_DELETE_DATA);
    }
};

// ============================================================================
// FUNCIONES GLOBALES
// ============================================================================

/**
 * Expande/contrae un acordeón en el historial
 * @global
 */
window.toggleAccordion = (id, event) => {
    event.stopPropagation();
    const header = event.currentTarget;
    const items = document.querySelectorAll(`[data-parent-accordion="${id}"]`);
    
    if (!items || items.length === 0) return;
    
    const isOpen = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', String(!isOpen));
    header.classList.toggle('accordion-open', !isOpen);

    items.forEach(item => {
        item.classList.toggle('open', !isOpen);
        if (isOpen && item.dataset.accordion) {
            item.setAttribute('aria-expanded', 'false');
            item.classList.remove('accordion-open');
            item.querySelector('.accordion-icon, .accordion-icon-week, .accordion-icon-sub')?.style.removeProperty('transform');
            collapseAccordionChildren(item.dataset.accordion);
        }
    });
};

function collapseAccordionChildren(parentId) {
    document.querySelectorAll(`[data-parent-accordion="${parentId}"]`).forEach(child => {
        child.classList.remove('open', 'accordion-open');
        if (child.getAttribute('aria-expanded') !== null) {
            child.setAttribute('aria-expanded', 'false');
        }
        child.querySelector('.accordion-icon, .accordion-icon-week, .accordion-icon-sub')?.style.removeProperty('transform');
        if (child.dataset.accordion) collapseAccordionChildren(child.dataset.accordion);
    });
}

// ============================================================================
// LOGOUT
// ============================================================================

/**
 * Desconecta el usuario
 * @global
 */
window.logout = () => {
    if (appState.unsubscribeIngresos) {
        appState.unsubscribeIngresos();
    }
    // Aquí iría la lógica de logout de Firebase
    location.reload();
};
