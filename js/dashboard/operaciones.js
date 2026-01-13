/**
 * ============================================================================
 * Módulo de Operaciones del Dashboard
 * ============================================================================
 * Descripción: Lógica central del dashboard. Gestiona:
 *              - Carga y visualización de datos de propinas
 *              - CRUD de registros (crear, editar, eliminar)
 *              - Visualización en gráficos y tablas
 *              - Filtrado por período (día, mes, año)
 *              - Ranking global de colaboradores
 *              - Búsqueda de compañeros
 * 
 * Responsabilidades:
 * - Inicializar dashboard y configurar eventos
 * - Gestionar estado de la aplicación (usuarioApp, datos locales)
 * - Operaciones CRUD en Firestore
 * - Renderizado de UI (gráficos, historial, ranking)
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
    limit
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import { db } from "../config/firebase.js";

/* ============================================================================
   ESTADO GLOBAL DE LA APLICACIÓN
   ============================================================================ */

/** @type {Object} Usuario autenticado actualmente */
let usuarioApp = null;

/** @type {Array} Lista de ingresos (propinas) del usuario actual */
let datosLocales = [];

/** @type {Array} Directorio global de usuarios (para buscador) */
let listaUsuariosSistema = [];

/** @type {Object} Instancia actual del gráfico Chart.js */
let miGrafico = null;

/** @type {Date} Fecha de visualización seleccionada */
let fechaVisualizacion = new Date();

/** @type {string} Filtro activo ('dia', 'mes', 'ano') */
let filtroActual = 'dia';

/* ============================================================================
   CONSTANTES DE CONFIGURACIÓN DE NEGOCIO
   ============================================================================ */

/** Porcentaje de comisión que aplica Niubiz sobre pagos con tarjeta: 4.5% */
const TASA_NIUBIZ = 0.045;

/* ============================================================================
   1. UTILIDADES DE SEGURIDAD
   ============================================================================ */

/**
 * Escapa caracteres especiales HTML para prevenir XSS
 * Convierte: <, >, &, ", ' en sus entidades HTML
 * @param {string} texto - Texto a escapar
 * @returns {string} Texto seguro para HTML
 * @private
 */
function escapeHtml(texto) {
    if (!texto || typeof texto !== 'string') return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return texto.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Valida que un nombre sea válido (evita inyecciones)
 * Permite letras, números, espacios, guiones, puntos
 * @param {string} nombre - Nombre a validar
 * @returns {boolean} True si es válido
 * @private
 */
function validarNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return false;
    if (nombre.trim().length < 2 || nombre.trim().length > 50) return false;
    return /^[a-zA-Z0-9\s\-\.áéíóúñ]+$/i.test(nombre.trim());
}

/**
 * Crea un debounce de una función
 * Útil para búsqueda, resize, input, etc.
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Milisegundos de espera
 * @returns {Function} Función debounceada
 * @private
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
    cargarUsuariosSistema();
}

/**
 * Carga el directorio completo de usuarios del sistema
 * Usado para el buscador de compañeros
 * @async
 * @private
 */
async function cargarUsuariosSistema() {
    try {
        const q = query(collection(db, "usuarios"), limit(50));
        const snapshot = await getDocs(q);
        listaUsuariosSistema = snapshot.docs.map(d => d.data());
    } catch (error) {
        console.error("Error cargando directorio de usuarios:", error);
    }
}

/* ============================================================================
   2. CONFIGURACIÓN DE EVENTOS
   ============================================================================ */

/**
 * Configura todos los event listeners del dashboard
 * Incluye: selección de métodos, filtros, navegación de fechas, buscador
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

    /* ---- Filtros de Período (Día, Mes, Año) ---- */
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });

    /* ---- Navegación de Fechas ---- */
    window.cambiarFecha = (delta) => {
        if (filtroActual === 'dia') {
            fechaVisualizacion.setDate(fechaVisualizacion.getDate() + delta);
        } else if (filtroActual === 'mes') {
            fechaVisualizacion.setMonth(fechaVisualizacion.getMonth() + delta);
        } else if (filtroActual === 'ano') {
            fechaVisualizacion.setFullYear(fechaVisualizacion.getFullYear() + delta);
        }
        actualizarUI();
    };

    /* ---- BUSCADOR DE COMPAÑEROS (Sistema Híbrido con Debounce) ---- */
    const inputSearch = document.getElementById('inputSearchCompanero');
    const btnClear = document.getElementById('btnClearSearch');

    // Aplicar debounce de 300ms para evitar búsquedas excesivas
    const debouncedSearch = debounce((e) => filtrarUsuarios(e.target.value), 300);
    inputSearch.addEventListener('input', debouncedSearch);

    btnClear.addEventListener('click', () => {
        inputSearch.value = '';
        document.getElementById('selectedCompaneroUid').value = '';
        document.getElementById('finalCompaneroName').value = '';
        inputSearch.disabled = false;
        btnClear.classList.add('d-none');
        document.getElementById('searchResults').classList.add('d-none');
        inputSearch.focus();
    });
}

/* ============================================================================
   3. LÓGICA DEL BUSCADOR
   ============================================================================ */

/**
 * Filtra usuarios según el texto ingresado
 * Muestra dropdown con coincidencias + opción de agregar manual
 * SANITIZACIÓN: Escapar displayName para prevenir XSS
 * @param {string} texto - Texto a buscar en names de usuarios
 * @private
 */
function filtrarUsuarios(texto) {
    const dropdown = document.getElementById('searchResults');

    if (texto.length < 1) {
        dropdown.classList.add('d-none');
        return;
    }

    // Buscar coincidencias en directorio
    const coincidencias = listaUsuariosSistema.filter(u =>
        u.displayName.toLowerCase().includes(texto.toLowerCase()) &&
        u.uid !== usuarioApp.uid
    );

    let html = '';

    // Renderizar usuarios encontrados - ESCAPAR displayName para XSS
    coincidencias.forEach(u => {
        const displayNameSeguro = escapeHtml(u.displayName);
        const photoUrl = escapeHtml(u.photoURL || '');
        html += `
        <div class="user-item" onclick="seleccionarUsuario('${u.uid}', '${displayNameSeguro}')">
            <img src="${photoUrl}" alt="${displayNameSeguro}">
            <div class="user-item-info">
                <span class="user-item-name">${displayNameSeguro}</span>
                <span class="user-item-badge text-success"><i class="fas fa-check-circle"></i> Registrado</span>
            </div>
        </div>`;
    });

    // Agregar opción de registro manual - VALIDAR Y ESCAPAR
    const textoSeguro = escapeHtml(texto.substring(0, 50)); // Limitar a 50 caracteres
    if (validarNombre(texto)) {
        html += `
        <div class="user-item add-manual-item" onclick="seleccionarManual('${textoSeguro}')">
            <i class="fas fa-plus"></i>
            <div class="user-item-info">
                <span class="user-item-name">Usar "${textoSeguro}"</span>
                <span class="user-item-badge">Como externo</span>
            </div>
        </div>`;
    }

    dropdown.innerHTML = html;
    dropdown.classList.remove('d-none');
}

/**
 * Selecciona un usuario del directorio
 * @param {string} uid - UID del usuario en Firebase
 * @param {string} nombre - Nombre del usuario (ya escapado en filtrarUsuarios)
 * @global
 */
window.seleccionarUsuario = (uid, nombre) => {
    // Validar nombre antes de fijar selección
    if (!validarNombre(nombre)) {
        Swal.fire('Error', 'Nombre de compañero inválido', 'error');
        return;
    }
    fijarSeleccion(nombre, uid);
};

/**
 * Selecciona un usuario ingresado manualmente
 * @param {string} nombre - Nombre ingresado manualmente
 * @global
 */
window.seleccionarManual = (nombre) => {
    // Validar nombre
    if (!validarNombre(nombre)) {
        Swal.fire('Error', 'Nombre debe tener 2-50 caracteres válidos', 'error');
        return;
    }
    const nombreCapitalizado = nombre.trim().replace(/\b\w/g, l => l.toUpperCase());
    fijarSeleccion(nombreCapitalizado, '');
};

/**
 * Fija la selección del compañero en los campos ocultos
 * Desactiva el input y muestra botón de limpiar
 * @param {string} nombre - Nombre del compañero
 * @param {string} uid - UID del compañero (vacío si es manual)
 * @private
 */
function fijarSeleccion(nombre, uid) {
    const inputSearch = document.getElementById('inputSearchCompanero');
    document.getElementById('selectedCompaneroUid').value = uid;
    document.getElementById('finalCompaneroName').value = nombre;
    inputSearch.value = nombre;
    inputSearch.disabled = true;
    document.getElementById('btnClearSearch').classList.remove('d-none');
    document.getElementById('searchResults').classList.add('d-none');
}

/* ============================================================================
   4. GESTIÓN DE DATOS (CRUD)
   ============================================================================ */

/**
 * Carga todos los ingresos del usuario actual desde Firestore
 * Ordena por fecha descendente
 * @async
 * @private
 */
async function cargarDatos() {
    if (!usuarioApp) return;

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
        calcularRankingGlobal();
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

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

    const companeroName = document.getElementById('finalCompaneroName').value;
    const companeroUid = document.getElementById('selectedCompaneroUid').value;

    /* ---- VALIDACIÓN ---- */
    if (!metodo || isNaN(monto) || monto <= 0) {
        return Swal.fire('Error', 'Ingresa un monto válido.', 'warning');
    }

    if (metodo === 'Corredor') {
        if (monto > 50) {
            return Swal.fire('Tope Excedido', 'El apoyo de corredor no debe superar S/50.', 'warning');
        }
        if (!companeroName || !validarNombre(companeroName)) {
            return Swal.fire('Requerido', 'Nombre de compañero inválido (2-50 caracteres).', 'warning');
        }
    } else {
        if (monto > 999) {
            return Swal.fire('Error', 'Monto excede el límite permitido.', 'error');
        }
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
            companero: metodo === 'Corredor' ? companeroName : null,
            companero_uid: (metodo === 'Corredor' && companeroUid) ? companeroUid : null,
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
   5. RANKING GLOBAL
   ============================================================================ */

/**
 * Calcula y muestra el ranking global de apoyos (propinas de corredor)
 * Muestra top 5 con montos acumulados
 * @async
 * @private
 */
async function calcularRankingGlobal() {
    const lista = document.getElementById('listaRanking');
    lista.innerHTML = '<li class="text-center small py-3"><i class="fas fa-spinner fa-spin"></i> Cargando top...</li>';

    try {
        /* ---- CARGAR PROPINAS DE CORREDOR ---- */
        const q = query(
            collection(db, "ingresos"),
            where("tipo", "==", "Corredor"),
            orderBy("fecha", "desc"),
            limit(200)
        );
        const snapshot = await getDocs(q);
        const todos = snapshot.docs.map(d => d.data());

        /* ---- AGRUPAR POR COMPAÑERO ---- */
        const donadores = {};
        todos.forEach(d => {
            const key = d.companero_uid || d.companero;
            if (!donadores[key]) {
                donadores[key] = { nombre: d.companero, monto: 0, foto: null };
            }
            donadores[key].monto += d.monto;
        });

        /* ---- ENRIQUECER CON DATOS DE PERFIL ---- */
        Object.keys(donadores).forEach(key => {
            const userReg = listaUsuariosSistema.find(u => u.uid === key);
            if (userReg) {
                donadores[key].nombre = userReg.displayName;
                donadores[key].foto = userReg.photoURL;
            }
        });

        /* ---- ORDENAR Y OBTENER TOP 5 ---- */
        const ranking = Object.values(donadores)
            .sort((a, b) => b.monto - a.monto)
            .slice(0, 5);

        /* ---- RENDERIZAR LISTA ---- */
        lista.innerHTML = '';
        if (ranking.length === 0) {
            lista.innerHTML = '<li class="text-center text-adaptive small py-3" style="color: var(--text-main) !important;">Sin donaciones aún</li>';
            return;
        }

        ranking.forEach((d, i) => {
            const colors = ['text-warning', 'text-secondary', 'text-warning'];
            const icon = i < 3 
                ? `<i class="fas fa-crown ${colors[i]}"></i>` 
                : `<span class="small fw-bold text-muted">#${i + 1}</span>`;

            const avatar = d.foto
                ? `<img src="${d.foto}" class="rank-avatar">`
                : `<div class="rank-avatar d-inline-flex align-items-center justify-content-center bg-dark text-white small">${d.nombre.charAt(0)}</div>`;

            lista.innerHTML += `
            <li class="ranking-item">
                <div class="d-flex align-items-center">
                    <span class="me-2" style="width:20px; text-align:center;">${icon}</span>
                    ${avatar}
                    <span class="fw-bold text-adaptive text-truncate" style="max-width: 120px;">${d.nombre}</span>
                </div>
                <span class="badge-status">S/${d.monto.toFixed(0)}</span>
            </li>`;
        });

    } catch (error) {
        console.error("Error calculando ranking:", error);
        lista.innerHTML = '<li class="text-center small text-danger">Requiere Índice</li>';
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
    renderizarHistorial(datosLocales.slice(0, 10));
}

/**
 * Filtra datos según el período activo (día, mes, año)
 * @returns {Array} Array de datos filtrados
 * @private
 */
function filtrarDatosPorFecha() {
    const ref = fechaVisualizacion;

    return datosLocales.filter(d => {
        const f = d.fecha && d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha_str);

        if (filtroActual === 'dia') {
            return f.toDateString() === ref.toDateString();
        } else if (filtroActual === 'mes') {
            return f.getMonth() === ref.getMonth() && f.getFullYear() === ref.getFullYear();
        } else if (filtroActual === 'ano') {
            return f.getFullYear() === ref.getFullYear();
        }
    });
}

/**
 * Renderiza el gráfico doughnut con distribución de propinas
 * Muestra: Efectivo, Tarjeta, Corredor, Yape/Plin
 * @param {Array} datos - Datos a visualizar
 * @private
 */
function renderizarGrafico(datos) {
    const resumen = {
        'Efectivo': 0,
        'Tarjeta': 0,
        'Corredor': 0,
        'Yape/Plin': 0
    };

    let total = 0;

    /* ---- SUMAR DATOS POR TIPO ---- */
    datos.forEach(d => {
        if (resumen[d.tipo] !== undefined) {
            resumen[d.tipo] += d.monto;
        }
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
 * Renderiza la tabla de historial con botones de editar/eliminar
 * @param {Array} lista - Datos a mostrar en historial
 * @private
 */
function renderizarHistorial(lista) {
    const tabla = document.getElementById('tablaHistorial');
    if (!tabla) return;

    /* ---- LISTA VACÍA ---- */
    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4"><li class="text-center text-adaptive small py-3" style="color: var(--text-main) !important; list-style: none;">Sin historial aún</li></td></tr>';
        return;
    }

    tabla.innerHTML = '';

    /* ---- RENDERIZAR FILAS ---- */
    lista.forEach(d => {
        /* ---- CONVERTIR FECHA ---- */
        const fecha = d.fecha && d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha_str || d.fecha);
        const fechaTxt = fecha.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });

        /* ---- ICONO SEGÚN TIPO ---- */
        let iconClass = 'fa-coins';
        if (d.tipo === 'Tarjeta') iconClass = 'fa-credit-card';
        if (d.tipo === 'Corredor') iconClass = 'fa-running';
        if (d.tipo === 'Yape/Plin') iconClass = 'fa-qrcode';

        /* ---- PREPARAR DATOS PARA MODAL (ENCODED) ---- */
        const dataStr = encodeURIComponent(JSON.stringify({
            monto: d.monto,
            tipo: d.tipo,
            fecha: d.fecha_str.split('T')[0],
            companero: d.companero || '',
            companero_uid: d.companero_uid || ''
        }));

        /* ---- RENDERIZAR FILA ---- */
        tabla.innerHTML += `
        <tr>
            <td width="50">
                <div style="width:36px; height:36px; background:var(--bg-body); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                    <i class="fas ${iconClass}"></i>
                </div>
            </td>
            <td>
                <div style="font-weight:600; font-size:0.9rem;">${d.tipo}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${fechaTxt} ${d.companero ? '• ' + d.companero : ''}</div>
            </td>
            <td class="text-end" style="font-weight:700;">S/${d.monto.toFixed(2)}</td>
            <td class="text-end" style="min-width:80px;">
                <div class="d-flex justify-content-end">
                    <button onclick="abrirEdicion('${d.id}', '${dataStr}')" class="btn-edit-mini"><i class="fas fa-pen"></i></button>
                    <button onclick="borrarRegistro('${d.id}')" class="btn-trash-mini"><i class="fas fa-times"></i></button>
                </div>
            </td>
        </tr>`;
    });
}

/* ============================================================================
   7. MANEJADORES DE EVENTOS
   ============================================================================ */

/**
 * Maneja click en tarjeta de método de pago
 * Muestra/oculta búsqueda de compañero según tipo
 * @param {Event} e - Evento del click
 * @private
 */
function handleMethodClick(e) {
    document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');

    const tipo = e.currentTarget.getAttribute('data-tipo');
    const divComp = document.getElementById('divCompanero');

    if (tipo === 'Corredor') {
        divComp.classList.remove('d-none');
        divComp.classList.add('fade-in');
    } else {
        divComp.classList.add('d-none');
    }

    setFechaHoyInput();
    document.getElementById('inputMonto').focus();
}

/**
 * Maneja click en botones de filtro de período
 * @param {Event} e - Evento del click
 * @private
 */
function handleFilterClick(e) {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    const btnId = e.target.id;
    filtroActual = btnId === 'btnDia' ? 'dia' : btnId === 'btnMes' ? 'mes' : 'ano';

    fechaVisualizacion = new Date();
    actualizarUI();
}

/**
 * Actualiza la etiqueta de fecha según el filtro activo
 * Muestra: "Hoy", "Enero de 2026", "2026"
 * @private
 */
function actualizarEtiquetaFecha() {
    const lbl = document.getElementById('labelFechaActual');

    if (filtroActual === 'dia') {
        lbl.innerText = fechaVisualizacion.toDateString() === new Date().toDateString()
            ? "Hoy"
            : fechaVisualizacion.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });

    } else if (filtroActual === 'mes') {
        const fechaFormato = fechaVisualizacion.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        lbl.innerText = fechaFormato.charAt(0).toUpperCase() + fechaFormato.slice(1);

    } else {
        lbl.innerText = fechaVisualizacion.getFullYear();
    }
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
    document.getElementById('inputSearchCompanero').value = '';
    document.getElementById('inputSearchCompanero').disabled = false;
    document.getElementById('btnClearSearch').classList.add('d-none');
    document.getElementById('selectedCompaneroUid').value = '';
    document.getElementById('finalCompaneroName').value = '';
    document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
    document.getElementById('divCompanero').classList.add('d-none');
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
 * Permite cambiar: fecha, monto, tipo, compañero
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
                <label class="small text-muted-adaptive d-block mb-2"><i class="far fa-calendar me-2"></i>Fecha</label>
                <div class="input-group-custom">
                    <span class="currency"><i class="far fa-calendar"></i></span>
                    <input type="date" id="editFecha" class="form-control-custom" value="${data.fecha}">
                </div>
            </div>

            <div class="mb-3">
                <label class="small text-muted-adaptive d-block mb-2"><i class="fas fa-coins me-2"></i>Monto (S/)</label>
                <div class="input-group-custom">
                    <span class="currency">S/</span>
                    <input type="number" id="editMonto" class="form-control-custom" value="${data.monto}" step="0.50" min="0">
                </div>
            </div>

            <div class="mb-3">
                <label class="small text-muted-adaptive d-block mb-2"><i class="fas fa-wallet me-2"></i>Método</label>
                <div class="input-group-custom">
                    <span class="currency"><i class="fas fa-wallet"></i></span>
                    <select id="editTipo" class="form-control-custom form-select">
                        <option value="Efectivo" ${data.tipo === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="Tarjeta" ${data.tipo === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
                        <option value="Corredor" ${data.tipo === 'Corredor' ? 'selected' : ''}>Corredor</option>
                        <option value="Yape/Plin" ${data.tipo === 'Yape/Plin' ? 'selected' : ''}>Digital</option>
                    </select>
                </div>
            </div>

            <div id="divEditCompanero" class="${data.tipo === 'Corredor' ? '' : 'd-none'} fade-in">
                <label class="small text-muted-adaptive d-block mb-2"><i class="fas fa-user me-2"></i>Compañero(a)</label>
                <div class="position-relative">
                    <div class="input-group-custom">
                        <span class="currency"><i class="fas fa-search"></i></span>
                        <input type="text" id="editInputSearch" class="form-control-custom"
                               placeholder="Buscar..." autocomplete="off"
                               value="${data.companero || ''}"
                               style="padding-left: 50px;">
                        <button type="button" id="editBtnClear" class="btn btn-sm text-muted position-absolute end-0 top-50 translate-middle-y me-3 ${data.companero ? '' : 'd-none'}" style="z-index: 10; border: none; background: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="editSearchResults" class="search-dropdown d-none" style="max-height: 200px;"></div>
                </div>
                <input type="hidden" id="editSelectedUid" value="${data.companero_uid || ''}">
                <input type="hidden" id="editFinalName" value="${data.companero || ''}">
            </div>
        </div>
    `;

    const result = await Swal.fire({
        title: '<i class="fas fa-pen me-2"></i>Editar Propina',
        html: htmlForm,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#D32F2F',
        cancelButtonColor: '#64748b',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#ffffff' : '#0f172a',
        customClass: {
            popup: 'glass-card',
            title: 'fw-bold',
            confirmButton: 'btn btn-action',
            cancelButton: 'btn btn-sm'
        },

        didOpen: () => {
            configuraEditoresEventos(data);
        },

        preConfirm: () => ({
            fecha: document.getElementById('editFecha').value,
            monto: parseFloat(document.getElementById('editMonto').value),
            tipo: document.getElementById('editTipo').value,
            companero: document.getElementById('editFinalName').value,
            companero_uid: document.getElementById('editSelectedUid').value
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

        if (d.tipo === 'Corredor') {
            if (d.monto > 50) {
                return Swal.fire('Alto', 'Máximo S/50 para corredor', 'warning');
            }
            if (!d.companero || !validarNombre(d.companero)) {
                return Swal.fire('Falta nombre', 'Nombre de compañero inválido (2-50 caracteres).', 'warning');
            }
        } else {
            if (d.monto > 999) {
                return Swal.fire('Error', 'Monto excede límite permitido', 'error');
            }
        }

        /* ---- ACTUALIZAR EN FIRESTORE ---- */
        try {
            const fechaObj = new Date(d.fecha + "T12:00:00");
            await updateDoc(doc(db, "ingresos", id), {
                monto: d.monto,
                tipo: d.tipo,
                companero: d.tipo === 'Corredor' ? d.companero : null,
                companero_uid: (d.tipo === 'Corredor' && d.companero_uid) ? d.companero_uid : null,
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

/**
 * Configura los eventos del formulario de edición
 * (Cambio de tipo de propina, buscador de compañeros, etc.)
 * MEJORADO: Sanitización XSS en buscador
 * @param {Object} data - Datos actuales del registro
 * @private
 */
function configuraEditoresEventos(data) {
    const select = document.getElementById('editTipo');
    const divComp = document.getElementById('divEditCompanero');
    const input = document.getElementById('editInputSearch');
    const dropdown = document.getElementById('editSearchResults');
    const hiddenUid = document.getElementById('editSelectedUid');
    const hiddenName = document.getElementById('editFinalName');
    const btnClear = document.getElementById('editBtnClear');

    /* ---- CAMBIO DE TIPO (Mostrar/Ocultar Compañero) ---- */
    select.addEventListener('change', (e) => {
        if (e.target.value === 'Corredor') {
            divComp.classList.remove('d-none');
            divComp.classList.add('fade-in');
            setTimeout(() => input.focus(), 100);
        } else {
            divComp.classList.add('d-none');
            hiddenUid.value = '';
            hiddenName.value = '';
        }
    });

    /* ---- BUSCADOR DE COMPAÑEROS (CON DEBOUNCE) ---- */
    const debouncedSearch = debounce((texto) => {
        if (texto.length < 1) {
            dropdown.classList.add('d-none');
            return;
        }

        /* ---- FILTRAR USUARIOS ---- */
        const coincidencias = listaUsuariosSistema.filter(u =>
            u.displayName.toLowerCase().includes(texto.toLowerCase()) &&
            u.uid !== usuarioApp.uid
        );

        let html = '';

        /* ---- RENDERIZAR COINCIDENCIAS - ESCAPAR XSS ---- */
        coincidencias.forEach(u => {
            const displayNameSeguro = escapeHtml(u.displayName);
            const photoUrl = escapeHtml(u.photoURL || '');
            html += `
            <div class="user-item" data-uid="${u.uid}" data-name="${displayNameSeguro}">
                <img src="${photoUrl}" alt="${displayNameSeguro}" style="pointer-events:none;">
                <div class="user-item-info" style="pointer-events:none;">
                    <span class="user-item-name">${displayNameSeguro}</span>
                    <span class="user-item-badge"><i class="fas fa-check-circle"></i> Registrado</span>
                </div>
            </div>`;
        });

        /* ---- OPCIÓN MANUAL - VALIDADA ---- */
        if (validarNombre(texto)) {
            const textoSeguro = escapeHtml(texto.substring(0, 50));
            html += `
            <div class="user-item add-manual-item" data-uid="" data-name="${textoSeguro}">
                <i class="fas fa-plus" style="pointer-events:none;"></i>
                <div class="user-item-info" style="pointer-events:none;">
                    <span class="user-item-name">Usar "${textoSeguro}"</span>
                    <span class="user-item-badge">Externo</span>
                </div>
            </div>`;
        }

        dropdown.innerHTML = html;
        dropdown.classList.remove('d-none');
    }, 300);

    input.addEventListener('input', (e) => debouncedSearch(e.target.value));

    /* ---- SELECCIÓN DE USUARIO ---- */
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.user-item');
        if (item) {
            const uid = item.dataset.uid;
            const name = item.dataset.name.replace(/\b\w/g, l => l.toUpperCase());

            // Validar antes de fijar
            if (!validarNombre(name)) {
                Swal.fire('Error', 'Nombre inválido', 'error');
                return;
            }

            input.value = name;
            hiddenUid.value = uid;
            hiddenName.value = name;

            input.disabled = true;
            btnClear.classList.remove('d-none');
            dropdown.classList.add('d-none');
        }
    });

    /* ---- BOTÓN LIMPIAR ---- */
    btnClear.addEventListener('click', (e) => {
        e.preventDefault();
        input.value = '';
        hiddenUid.value = '';
        hiddenName.value = '';
        input.disabled = false;
        btnClear.classList.add('d-none');
        input.focus();
    });

    if (data.companero) input.disabled = true;
}
