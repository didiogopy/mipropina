/**
 * ============================================================================
 * Módulo de Operaciones del Dashboard
 * ============================================================================
 * Descripción: Lógica central del dashboard. Gestiona:
 *              - Carga y visualización de datos de propinas
 *              - CRUD de registros (crear, editar, eliminar)
 *              - Visualización en gráficos y tablas
 *              - Filtrado por período (día, mes, año)
 * 
 * Responsabilidades:
 * - Inicializar dashboard y configurar eventos
 * - Gestionar estado de la aplicación (usuarioApp, datos locales)
 * - Operaciones CRUD en Firestore
 * - Renderizado de UI (gráficos e historial)
 * - Validación de datos
 * 
 * @module dashboard/operaciones
 */

import {
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import { db } from "../config/firebase.js";

/* ============================================================================
   ESTADO GLOBAL DE LA APLICACIÓN
   ============================================================================ */

/** @type {Object} Usuario autenticado actualmente */
let usuarioApp = null;

/** @type {Array} Lista de ingresos (propinas) del usuario actual */
let datosLocales = [];

/** @type {Object} Instancia actual del gráfico Chart.js */
let miGrafico = null;

/** @type {Date} Fecha de visualización seleccionada */
let fechaVisualizacion = new Date();

/** @type {Function} Unsubscribe function para listener de Firestore */
let unsubscribeFromIngresos = null;

/** @type {number} ID del intervalo de polling automático */
let pollingInterval = null;

/** @type {boolean} Indicador de estado de sincronización */
let isSyncing = false;

/* ============================================================================
   CONSTANTES DE CONFIGURACIÓN DE NEGOCIO
   ============================================================================ */

/** Porcentaje de comisión que aplica sobre pagos con tarjeta: 3.5% */
const TASA_NIUBIZ = 0.035;

/* ============================================================================
   1. UTILIDADES DE SEGURIDAD
   ============================================================================ */

/* ============================================================================
   2. INICIALIZACIÓN
   ============================================================================ */

/**
 * Inicializa el dashboard después de autenticación exitosa
 * @param {Object} user - Usuario autenticado desde Firebase Auth
 * @async
 * @global
 */
export function iniciarDashboard(user) {
    usuarioApp = user;
    setFechaHoyInput();
    configurarEventos();
    cargarDatos();
}

/* ============================================================================
   2. CONFIGURACIÓN DE EVENTOS
   ============================================================================ */

/**
 * Configura todos los event listeners del dashboard
 * Incluye: selección de métodos, navegación de años, buscador
 * @private
 */
function configurarEventos() {
    /* ---- Tarjetas de Método de Pago ---- */
    document.querySelectorAll('.method-card').forEach(card => {
        card.addEventListener('click', handleMethodClick);
    });

    /* ---- Botón Guardar (recreado para evitar event bubbling) ---- */
    const btnOld = document.getElementById('btnGuardar');
    const btnNew = btnOld.cloneNode(true);
    btnOld.parentNode.replaceChild(btnNew, btnOld);
    btnNew.addEventListener('click', guardarPropina);

    /* ---- Navegación de Años ---- */
    window.cambiarFecha = (delta) => {
        fechaVisualizacion.setFullYear(fechaVisualizacion.getFullYear() + delta);
        actualizarUI();
    };

}

/* ============================================================================
   4. GESTIÓN DE DATOS (CRUD)
   ============================================================================ */

/**
 * Configura listener en tiempo real para ingresos del usuario
 * Sincroniza automáticamente en todos los dispositivos
 * Con polling de respaldo cada 30 segundos
 * @async
 * @private
 */
function cargarDatos() {
    if (!usuarioApp) return;

    // Limpiar listener anterior si existe
    if (unsubscribeFromIngresos) {
        unsubscribeFromIngresos();
    }

    try {
        const q = query(
            collection(db, "ingresos"),
            where("uid", "==", usuarioApp.uid),
            orderBy("fecha", "desc")
        );

        // Listener en tiempo real (ideal, pero puede desconectarse)
        unsubscribeFromIngresos = onSnapshot(
            q,
            (snapshot) => {
                // Éxito: Actualizar datos
                datosLocales = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                actualizarUI();
                actualizarIndicadorSincronizacion(true);
            },
            (error) => {
                // Error: Usar polling como respaldo
                console.warn("Listener desconectado, usando polling de respaldo:", error);
                actualizarIndicadorSincronizacion(false);
                iniciarPollingRespaldo();
            }
        );

        // Iniciar polling automático como respaldo (cada 30 seg)
        iniciarPollingRespaldo();

    } catch (error) {
        console.error("Error configurando listener de datos:", error);
        actualizarIndicadorSincronizacion(false);
    }
}

/**
 * Inicia polling automático cada 30 segundos como respaldo
 * Se detiene si el listener en tiempo real está funcionando
 * @private
 */
function iniciarPollingRespaldo() {
    if (pollingInterval) return; // Ya está corriendo

    pollingInterval = setInterval(async () => {
        if (!usuarioApp) return;

        try {
            const q = query(
                collection(db, "ingresos"),
                where("uid", "==", usuarioApp.uid),
                orderBy("fecha", "desc")
            );

            const snapshot = await getDocs(q);
            const nuevosDatos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Actualizar solo si hay cambios (comparar longitud o datos)
            if (JSON.stringify(nuevosDatos) !== JSON.stringify(datosLocales)) {
                datosLocales = nuevosDatos;
                actualizarUI();
            }
        } catch (error) {
            console.warn("Error en polling de respaldo:", error);
        }
    }, 30000); // Cada 30 segundos
}

/**
 * Detiene el polling automático
 * @private
 */
function detenerPollingRespaldo() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

/**
 * Sincronización manual forzada (botón "Sincronizar")
 * Útil cuando el usuario sospecha que los datos no están actualizados
 * @async
 * @global
 */
window.sincronizarAhora = async () => {
    if (isSyncing) return; // Evitar múltiples sincronizaciones

    isSyncing = true;
    actualizarIndicadorSincronizacion(false, true);

    try {
        const q = query(
            collection(db, "ingresos"),
            where("uid", "==", usuarioApp.uid),
            orderBy("fecha", "desc")
        );

        const snapshot = await getDocs(q);
        datosLocales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        actualizarUI();
        actualizarIndicadorSincronizacion(true);

        // Mostrar confirmación
        Swal.fire({
            title: 'Sincronizado',
            text: 'Los datos se han actualizado correctamente',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Error sincronizando:", error);
        actualizarIndicadorSincronizacion(false);
        Swal.fire('Error', 'No se pudo sincronizar. Intenta más tarde.', 'error');
    } finally {
        isSyncing = false;
    }
}

/**
 * Actualiza el indicador visual de estado de sincronización
 * @param {boolean} sincronizado - True si está sincronizado
 * @param {boolean} sincronizando - True si está sincronizando
 * @private
 */
function actualizarIndicadorSincronizacion(sincronizado = true, sincronizando = false) {
    const badge = document.getElementById('syncBadge');
    if (!badge) return;

    if (sincronizando) {
        badge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
        badge.className = 'badge bg-warning ms-2';
    } else if (sincronizado) {
        badge.innerHTML = '<i class="fas fa-check-circle"></i> Actualizado';
        badge.className = 'badge bg-success ms-2';
    } else {
        badge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Desconectado';
        badge.className = 'badge bg-danger ms-2';
    }
}

/**
 * Limpia los listeners al desloguear
 * @global
 */
window.limpiarListeners = () => {
    if (unsubscribeFromIngresos) {
        unsubscribeFromIngresos();
        unsubscribeFromIngresos = null;
    }
    detenerPollingRespaldo();
};

/**
 * Guarda un nuevo ingreso (propina) en Firestore
 * Valida datos antes de guardar
 * MEJORADAS: Validaciones más robustas
 * @async
 * @private
 */
async function guardarPropina() {
    const inputMonto = document.getElementById('inputMonto');
    const monto = parseFloat(inputMonto.value);
    const metodo = document.querySelector('.method-card.active')?.getAttribute('data-tipo');
    const fechaInput = document.getElementById('inputFecha').value;

    /* ---- VALIDACIÓN ---- */
    if (!metodo || isNaN(monto) || monto <= 0) {
        return Swal.fire('Error', 'Ingresa un monto válido.', 'warning');
    }

    if (monto > 999) {
        return Swal.fire('Error', 'Monto excede el límite permitido.', 'error');
    }

    if (!fechaInput || new Date(fechaInput) > new Date()) {
        return Swal.fire('Fecha Inválida', 'No puedes registrar propinas futuras.', 'warning');
    }

    try {
        /* ---- UI: Mostrar estado de carga ---- */
        const btn = document.getElementById('btnGuardar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

        /* ---- PREPARAR DATOS ---- */
        const fechaObj = new Date(fechaInput + "T12:00:00");

        /* ---- GUARDAR EN FIRESTORE ---- */
        await addDoc(collection(db, "ingresos"), {
            uid: usuarioApp.uid,
            monto: monto,
            tipo: metodo,
            fecha: fechaObj,
            fecha_str: fechaObj.toISOString(),
            timestamp: new Date()
        });

        /* ---- NOTIFICACIÓN DE ÉXITO ---- */
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500,
            icon: 'success',
            title: 'Guardado'
        });
        Toast.fire();

        /* ---- ACTUALIZAR UI ---- */
        limpiarFormulario();
        cargarDatos();

    } catch (error) {
        console.error('Error guardando propina:', error);
        Swal.fire('Error al Guardar', 
            error.message === 'Firebase: Missing or insufficient permissions (firestore/permission-denied).' 
            ? 'No tienes permisos para guardar.' 
            : error.message, 
            'error');
    } finally {
        /* ---- RESTAURAR BOTÓN ---- */
        const btn = document.getElementById('btnGuardar');
        btn.disabled = false;
        btn.innerText = 'GUARDAR INGRESO';
    }
}

/* ============================================================================
   6. ACTUALIZACIÓN DE UI
   ============================================================================ */

/**
 * Actualiza toda la interfaz de usuario
 * Renderiza: gráficos, historial, proyección de pago
 * @private
 */
function actualizarUI() {
    actualizarEtiquetaFecha();
    const datosFiltrados = filtrarDatosPorFecha();

    renderizarGrafico(datosFiltrados);
    renderizarProyeccion(datosFiltrados);
    renderizarHistorial(datosFiltrados);
}

/**
 * Filtra datos según el período anual
 * @returns {Array} Array de datos del año actual
 * @private
 */
function filtrarDatosPorFecha() {
    const ref = fechaVisualizacion;

    return datosLocales.filter(d => {
        const f = d.fecha && d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha_str);
        return f.getFullYear() === ref.getFullYear();
    });
}

/**
 * Renderiza el gráfico doughnut con distribución de propinas
 * Muestra los métodos activos y agrupa registros históricos bajo Otros
 * @param {Array} datos - Datos a visualizar
 * @private
 */
function renderizarGrafico(datos) {
    const resumen = {
           'Efectivo': 0,
           'Tarjeta': 0,
           'Yape/Plin': 0,
           'Otros': 0
    };

    let total = 0;

    /* ---- SUMAR DATOS POR TIPO ---- */
    datos.forEach(d => {
          const tipo = Object.hasOwn(resumen, d.tipo) ? d.tipo : 'Otros';
          resumen[tipo] += d.monto || 0;
        total += d.monto;
    });

    /* ---- ACTUALIZAR TOTAL ---- */
    document.getElementById('totalLabel').innerText = `S/${total.toFixed(2)}`;

    /* ---- DESTRUIR GRÁFICO ANTERIOR ---- */
    if (miGrafico) {
        miGrafico.destroy();
    }

    /* ---- CREAR NUEVO GRÁFICO ---- */
    const ctx = document.getElementById('miGrafico').getContext('2d');
    miGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(resumen),
            datasets: [{
                data: Object.values(resumen),
                backgroundColor: ['#10b981', '#3b82f6', '#D32F2F', '#8b5cf6'],
                borderWidth: 0,
                borderRadius: 4,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Renderiza la proyección de pago por tarjetas (con comisión Niubiz)
 * @param {Array} datos - Datos para calcular proyección
 * @private
 */
function renderizarProyeccion(datos) {
    const totalTarjetas = datos
        .filter(d => d.tipo === 'Tarjeta')
        .reduce((sum, d) => sum + d.monto, 0);

    const comision = totalTarjetas * TASA_NIUBIZ;
    const neto = totalTarjetas - comision;

    document.getElementById('lblPorcentajeNiubiz').innerText = `-${(TASA_NIUBIZ * 100).toFixed(2)}%`;
    document.getElementById('lblBrutoTarjeta').innerText = `S/${totalTarjetas.toFixed(2)}`;
    document.getElementById('lblComisionNiubiz').innerText = `- S/${comision.toFixed(2)}`;
    document.getElementById('lblNetoDeposito').innerText = `S/${neto.toFixed(2)}`;
}

/**
 * Renderiza la tabla de historial anual desglosable
 * Agrupa por: Mes > Día > Transacciones
 * @param {Array} lista - Datos del año
 * @private
 */
function renderizarHistorial(lista) {
    const tabla = document.getElementById('tablaHistorial');
    const labelModo = document.getElementById('labelModoHistorial');
    
    if (!tabla) return;

    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4"><li class="text-center text-adaptive small py-3" style="color: var(--text-main) !important; list-style: none;">Sin propinas</li></td></tr>';
        if (labelModo) labelModo.innerText = '';
        return;
    }

    if (labelModo) {
        labelModo.innerText = `${new Date().getFullYear()}`;
    }

    tabla.innerHTML = renderizarHistorialPorMes(lista);
}

/**
 * Genera HTML del historial agrupado por mes (para "Año") con acordeones anidados
 * Nivel 1: Mes | Nivel 2: Día dentro del mes
 * @private
 */
function renderizarHistorialPorMes(lista) {
    const grupos = {};
    
    lista.forEach(d => {
        const fecha = d.fecha && d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha_str || d.fecha);
        const mes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        
        if (!grupos[mes]) grupos[mes] = [];
        grupos[mes].push(d);
    });

    let html = '';
    const mesesOrdenados = Object.keys(grupos).sort((a, b) => {
        const fechaA = new Date(grupos[a][0].fecha_str);
        const fechaB = new Date(grupos[b][0].fecha_str);
        return fechaB - fechaA;
    });

    mesesOrdenados.forEach((mes, mesIdx) => {
        const filasMes = grupos[mes];
        const totalMes = filasMes.reduce((sum, d) => sum + d.monto, 0);
        const idMes = `accordion-mes-${mesIdx}`;

        // Agrupar dentro del mes por día
        const diasEnMes = {};
        filasMes.forEach(d => {
            const fecha = d.fecha && d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha_str || d.fecha);
            const dia = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' });
            
            if (!diasEnMes[dia]) diasEnMes[dia] = [];
            diasEnMes[dia].push(d);
        });

        // Header del mes (acordeón nivel 1)
        html += `
        <tr class="accordion-header" data-accordion="${idMes}" onclick="toggleAccordion('${idMes}', event)" style="cursor: pointer;">
            <td colspan="4" style="padding: 12px !important;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main); text-transform: capitalize;">${mes}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${filasMes.length} propina${filasMes.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 700; color: var(--text-main);">S/${totalMes.toFixed(2)}</span>
                        <i class="fas fa-chevron-down accordion-icon" style="color: var(--text-muted); transition: transform 0.3s;"></i>
                    </div>
                </div>
            </td>
        </tr>
        `;

        // Procesar cada día dentro del mes
        const diasOrdenados = Object.keys(diasEnMes).sort((a, b) => {
            const fechaA = new Date(diasEnMes[a][0].fecha_str);
            const fechaB = new Date(diasEnMes[b][0].fecha_str);
            return fechaB - fechaA;
        });

        diasOrdenados.forEach((dia, diaIdx) => {
            const filasDelDia = diasEnMes[dia];
            const totalDia = filasDelDia.reduce((sum, d) => sum + d.monto, 0);
            const idDia = `accordion-mes-${mesIdx}-dia-${diaIdx}`;

            filasDelDia.sort((a, b) => {
                const fechaA = a.fecha && a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha_str || a.fecha);
                const fechaB = b.fecha && b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha_str || b.fecha);
                return fechaB - fechaA;
            });

            // Sub-header del día (acordeón nivel 2)
            html += `
            <tr class="accordion-item accordion-item-${idMes} accordion-header-sub" data-accordion="${idDia}" onclick="toggleAccordion('${idDia}', event)" style="cursor: pointer;">
                <td colspan="4" style="padding: 10px 12px !important; margin-left: 16px; background: rgba(211, 47, 47, 0.02); border-left: 3px solid rgba(211, 47, 47, 0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; font-size: 0.9rem; color: var(--text-main);">${dia}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-weight: 600; color: var(--text-main);">S/${totalDia.toFixed(2)}</span>
                            <i class="fas fa-chevron-down accordion-icon-sub" style="color: var(--text-muted); transition: transform 0.3s; font-size: 0.8rem;"></i>
                        </div>
                    </div>
                </td>
            </tr>
            `;

            // Filas individuales del día
            filasDelDia.forEach((d, filasIdx) => {
                const fecha = d.fecha && d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha_str || d.fecha);
                const horaTxt = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const isLast = filasIdx === filasDelDia.length - 1;
                html += generarFilaHistorial(d, horaTxt, idMes, idDia, isLast);
            });
        });
    });

    return html;
}

/**
 * Genera una fila del historial
 * @private
 */
function generarFilaHistorial(d, etiquetaPrincipal, etiquetaSecundaria, accordionId = '', isLast = false) {
    let iconClass = 'fa-coins';
    if (d.tipo === 'Tarjeta') iconClass = 'fa-credit-card';
    if (d.tipo === 'Yape/Plin') iconClass = 'fa-qrcode';

    const dataStr = encodeURIComponent(JSON.stringify({
        monto: d.monto,
        tipo: ['Efectivo', 'Tarjeta', 'Yape/Plin'].includes(d.tipo) ? d.tipo : 'Otros',
        fecha: d.fecha_str.split('T')[0]
    }));

    let claseAccordion = '';
    if (accordionId) {
        claseAccordion = `accordion-item accordion-item-${accordionId}`;
        if (isLast) claseAccordion += ' accordion-last';
    }

    return `<tr class="${claseAccordion}">
        <td width="50">
            <div style="width:36px; height:36px; background:var(--bg-body); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                <i class="fas ${iconClass}"></i>
            </div>
        </td>
        <td>
            <div style="font-weight:600; font-size:0.9rem;">${['Efectivo', 'Tarjeta', 'Yape/Plin'].includes(d.tipo) ? d.tipo : 'Otros'}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${etiquetaPrincipal}${etiquetaSecundaria ? ' • ' + etiquetaSecundaria : ''}</div>
        </td>
        <td class="text-end" style="font-weight:700;">S/${d.monto.toFixed(2)}</td>
        <td class="text-end" style="min-width:80px;">
            <div class="d-flex justify-content-end">
                <button onclick="abrirEdicion('${d.id}', '${dataStr}')" class="btn-edit-mini"><i class="fas fa-pen"></i></button>
                <button onclick="borrarRegistro('${d.id}')" class="btn-trash-mini"><i class="fas fa-times"></i></button>
            </div>
        </td>
    </tr>`;
}

/**
 * Genera una fila del historial para vista anidada (Año con subgrupos de día)
 * @private
 */
function generarFilaHistorialAnidado(d, horaTxt, idMesAccordion, idDiaAccordion, isLast = false) {
    let iconClass = 'fa-coins';
    if (d.tipo === 'Tarjeta') iconClass = 'fa-credit-card';
    if (d.tipo === 'Yape/Plin') iconClass = 'fa-qrcode';

    const dataStr = encodeURIComponent(JSON.stringify({
        monto: d.monto,
        tipo: ['Efectivo', 'Tarjeta', 'Yape/Plin'].includes(d.tipo) ? d.tipo : 'Otros',
        fecha: d.fecha_str.split('T')[0]
    }));

    let claseAccordion = `accordion-item accordion-item-${idDiaAccordion}`;
    if (isLast) claseAccordion += ' accordion-last';

    return `<tr class="${claseAccordion}">
        <td width="50" style="padding-left: 40px !important;">
            <div style="width:36px; height:36px; background:var(--bg-body); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                <i class="fas ${iconClass}"></i>
            </div>
        </td>
        <td>
            <div style="font-weight:600; font-size:0.9rem;">${['Efectivo', 'Tarjeta', 'Yape/Plin'].includes(d.tipo) ? d.tipo : 'Otros'}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${horaTxt}</div>
        </td>
        <td class="text-end" style="font-weight:700;">S/${d.monto.toFixed(2)}</td>
        <td class="text-end" style="min-width:80px;">
            <div class="d-flex justify-content-end">
                <button onclick="abrirEdicion('${d.id}', '${dataStr}')" class="btn-edit-mini"><i class="fas fa-pen"></i></button>
                <button onclick="borrarRegistro('${d.id}')" class="btn-trash-mini"><i class="fas fa-times"></i></button>
            </div>
        </td>
    </tr>`;
}

/**
 * Expande/contrae un acordeón en el historial
 * @param {string} id - ID del acordeón a toggle
 * @param {Event} event - Evento del click
 * @window
 */
window.toggleAccordion = (id, event) => {
    event.stopPropagation();
    const header = event.currentTarget;
    const icon = header.querySelector('.accordion-icon');
    const iconSub = header.querySelector('.accordion-icon-sub');
    const items = document.querySelectorAll(`.accordion-item-${id}`);
    
    if (!items || items.length === 0) return;
    
    const isOpen = items[0].classList.contains('open');
    
    items.forEach(item => {
        if (isOpen) {
            item.classList.remove('open');
        } else {
            item.classList.add('open');
        }
    });
    
    // Controlar visualización del header
    if (isOpen) {
        header.classList.remove('accordion-open');
    } else {
        header.classList.add('accordion-open');
    }
    
    if (icon) {
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
    
    if (iconSub) {
        iconSub.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
};

/* ============================================================================
   7. MANEJADORES DE EVENTOS
   ============================================================================ */

/**
 * Maneja click en tarjeta de método de pago
 * @param {Event} e - Evento del click
 * @private
 */
function handleMethodClick(e) {
    document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');

    setFechaHoyInput();
    document.getElementById('inputMonto').focus();
}

/**
 * Actualiza la etiqueta mostrando el año actual
 * @private
 */
function actualizarEtiquetaFecha() {
    const lbl = document.getElementById('labelFechaActual');
    lbl.innerText = fechaVisualizacion.getFullYear();
}

/**
 * Establece la fecha del input a hoy
 * @private
 */
function setFechaHoyInput() {
    const hoy = new Date();
    document.getElementById('inputFecha').value = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
}

/**
 * Limpia todos los campos del formulario
 * @private
 */
function limpiarFormulario() {
    document.getElementById('inputMonto').value = '';
    document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
}

/* ============================================================================
   8. OPERACIONES DE ELIMINACIÓN
   ============================================================================ */

/**
 * Elimina un registro de propina después de confirmación
 * @param {string} id - ID del documento en Firestore
 * @global
 * @async
 */
window.borrarRegistro = async (id) => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const confirmado = await Swal.fire({
        title: '¿Borrar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D32F2F',
        confirmButtonText: 'Sí',
        background: isDark ? '#1e293b' : '#fff',
        color: isDark ? '#fff' : '#000'
    }).then(r => r.isConfirmed);

    if (confirmado) {
        try {
            await deleteDoc(doc(db, "ingresos", id));
            cargarDatos();
        } catch (error) {
            Swal.fire('Error', 'No se pudo eliminar', 'error');
        }
    }
};

/* ============================================================================
   9. EDICIÓN AVANZADA (MODAL CON FORMULARIO)
   ============================================================================ */

/**
 * Abre un modal para editar un registro de propina
 * Permite cambiar: fecha, monto y tipo
 * @param {string} id - ID del documento a editar
 * @param {string} dataEncoded - Datos codificados en URL encoding
 * @global
 * @async
 */
window.abrirEdicion = async (id, dataEncoded) => {
    const data = JSON.parse(decodeURIComponent(dataEncoded));
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    /* ---- FORMULARIO HTML PARA EL MODAL ---- */
    const htmlForm = `
        <div class="text-start">
            <div class="mb-3">
                <label class="small text-muted-adaptive d-block mb-2">Fecha</label>
                <div class="input-group-custom">
                    <span class="currency"><i class="far fa-calendar"></i></span>
                    <input type="date" id="editFecha" class="form-control-custom" value="${data.fecha}">
                </div>
            </div>

            <div class="mb-3">
                <label class="small text-muted-adaptive d-block mb-2">Monto (S/)</label>
                <div class="input-group-custom">
                    <span class="currency">S/</span>
                    <input type="number" id="editMonto" class="form-control-custom" value="${data.monto}" step="0.50" min="0" max="999" oninput="if(this.value.length > 3) this.value = this.value.slice(0,3);">
                </div>
            </div>

            <div class="mb-3">
                <label class="small text-muted-adaptive d-block mb-2">Método</label>
                <div class="input-group-custom">
                    <span class="currency"><i class="fas fa-credit-card"></i></span>
                    <select id="editTipo" class="form-control-custom form-select">
                        <option value="Efectivo" ${data.tipo === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="Tarjeta" ${data.tipo === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
                        <option value="Yape/Plin" ${data.tipo === 'Yape/Plin' ? 'selected' : ''}>Digital</option>
                        <option value="Otros" ${data.tipo === 'Otros' ? 'selected' : ''}>Otros</option>
                    </select>
                </div>
            </div>

        </div>
    `;

    const result = await Swal.fire({
        title: 'Editar Propina',
        html: htmlForm,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#D32F2F',
        cancelButtonColor: isDark ? '#64748b' : '#94a3b8',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#e2e8f0' : '#0f172a',
        customClass: {
            popup: 'glass-card',
            title: 'fw-bold',
            confirmButton: 'btn btn-action',
            cancelButton: 'btn btn-sm'
        },
        willOpen: () => {
            // Agregar estilos adicionales para inputs en dark mode
            if (isDark) {
                const inputs = document.querySelectorAll('.form-control-custom, .form-select');
                inputs.forEach(input => {
                    input.style.color = '#e2e8f0';
                });
            }
        },
        preConfirm: () => ({
            fecha: document.getElementById('editFecha').value,
            monto: parseFloat(document.getElementById('editMonto').value),
            tipo: document.getElementById('editTipo').value
        })
    });

    /* ---- PROCESAR RESULTADO ---- */
    if (result.isConfirmed) {
        const d = result.value;

        /* ---- VALIDACIONES ---- */
        if (!d.fecha || d.monto <= 0 || isNaN(d.monto)) {
            return Swal.fire('Error', 'Datos inválidos', 'error');
        }

        if (new Date(d.fecha) > new Date()) {
            return Swal.fire('Fecha Inválida', 'No puedes editar con fechas futuras.', 'warning');
        }

        if (d.monto > 999) {
            return Swal.fire('Error', 'Monto excede límite permitido', 'error');
        }

        /* ---- ACTUALIZAR EN FIRESTORE ---- */
        try {
            const fechaObj = new Date(d.fecha + "T12:00:00");
            await updateDoc(doc(db, "ingresos", id), {
                monto: d.monto,
                tipo: d.tipo,
                fecha: fechaObj,
                fecha_str: fechaObj.toISOString()
            });

            /* ---- NOTIFICACIÓN DE ÉXITO ---- */
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                icon: 'success',
                title: 'Actualizado'
            });
            Toast.fire();

            cargarDatos();

        } catch (error) {
            console.error('Error actualizando propina:', error);
            Swal.fire('Error al Actualizar',
                error.message === 'Firebase: Missing or insufficient permissions (firestore/permission-denied).'
                ? 'No tienes permisos para actualizar.'
                : error.message,
                'error');
        }
    }
};

// ============================================================================
// LOGOUT
// ============================================================================
