/**
 * ============================================================================
 * MÓDULO DE RENDERIZADO UI
 * ============================================================================
 * Genera HTML de componentes sin lógica de negocio
 * Abstrae la presentación del resto del código
 */

import { formatCurrency, formatTime, pluralize } from '../utils/validators.js';
import { toCalendarDate } from '../utils/calendar.js';
import { PAYMENT_METHODS } from '../constants/app-constants.js';

// ============================================================================
// HISTORIAL (TABLA ANUAL DESGLOSABLE)
// ============================================================================

/**
 * Genera HTML del historial anual con meses y días desglosables
 * @param {Object} monthGroups - Grupos de ingresos por mes
 * @param {Array} monthsOrdered - Meses ordenados
 * @returns {string} HTML
 */
export function renderHistorial(monthGroups, monthsOrdered) {
    if (monthsOrdered.length === 0) {
        return '<tr><td colspan="4"><li class="text-center text-adaptive small py-3" style="color: var(--text-main) !important; list-style: none;">Sin propinas registradas</li></td></tr>';
    }
    
    let html = '';
    
    monthsOrdered.forEach((mes, mesIdx) => {
        const filasDelMes = monthGroups[mes];
        const totalMes = filasDelMes.reduce((sum, ingreso) => sum + ingreso.monto, 0);
        const idMes = `accordion-mes-${mesIdx}`;
        const semanas = groupByCalendarWeek(filasDelMes);

        html += renderMonthHeader(mes, idMes, filasDelMes.length, totalMes);

        [...semanas.entries()].forEach(([weekKey, weekEntries], weekIndex) => {
            const idSemana = `${idMes}-semana-${weekIndex}`;
            const totalSemana = weekEntries.reduce((sum, ingreso) => sum + ingreso.monto, 0);
                const weekNumber = getCalendarWeekNumber(weekKey, getIngresoDate(filasDelMes[0]));
                html += renderWeekHeader(idMes, idSemana, weekNumber, formatWeekRange(weekKey, filasDelMes), weekEntries.length, totalSemana);

            const dias = groupByCalendarDay(weekEntries);
            [...dias.entries()].forEach(([dayKey, dayEntries], dayIndex) => {
                const idDia = `${idSemana}-dia-${dayIndex}`;
                const fechaDia = new Date(`${dayKey}T12:00:00`);
                const labelDia = fechaDia.toLocaleDateString('es-PE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                });
                const totalDia = dayEntries.reduce((sum, ingreso) => sum + ingreso.monto, 0);

                html += renderDayHeader(idSemana, idDia, labelDia, dayEntries.length, totalDia);
                dayEntries.forEach((ingreso, index) => {
                    html += renderIngresoRow(ingreso, idDia, index === dayEntries.length - 1);
                });
            });
        });
    });
    
    return html;
}

function getIngresoDate(ingreso) {
    return toCalendarDate(ingreso);
}

function getLocalDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function groupByCalendarWeek(ingresos) {
    const grupos = new Map();

    ingresos.forEach(ingreso => {
        const fecha = getIngresoDate(ingreso);
        const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
        const weekKey = getLocalDateKey(lunes);
        if (!grupos.has(weekKey)) grupos.set(weekKey, []);
        grupos.get(weekKey).push(ingreso);
    });

    return new Map([...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function groupByCalendarDay(ingresos) {
    const grupos = new Map();

    ingresos.forEach(ingreso => {
        const dayKey = getLocalDateKey(getIngresoDate(ingreso));
        if (!grupos.has(dayKey)) grupos.set(dayKey, []);
        grupos.get(dayKey).push(ingreso);
    });

    return new Map([...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function formatWeekRange(weekKey, monthEntries) {
    const monday = new Date(`${weekKey}T12:00:00`);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const referenceDate = getIngresoDate(monthEntries[0]);
    const firstOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const lastOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    const start = monday < firstOfMonth ? firstOfMonth : monday;
    const end = sunday > lastOfMonth ? lastOfMonth : sunday;
    const format = date => date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

    return `${format(start)} – ${format(end)}`;
}

function getCalendarWeekNumber(weekKey, referenceDate) {
    const monday = new Date(`${weekKey}T12:00:00`);
    const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12);
    const firstMonday = new Date(firstDay);
    firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7));
    const mondayDay = Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate());
    const firstMondayDay = Date.UTC(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate());

    return Math.floor((mondayDay - firstMondayDay) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function renderWeekHeader(idMes, idSemana, weekNumber, range, count, total) {
    return `
    <tr class="accordion-item accordion-header-week" data-parent-accordion="${idMes}" data-accordion="${idSemana}" data-accordion-level="week" role="button" tabindex="0" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion('${idSemana}', event)}" onclick="toggleAccordion('${idSemana}', event)">
        <td colspan="4">
            <div class="history-group-heading">
                <div>
                    <strong>Semana ${weekNumber}</strong>
                    <small>${range} · ${count} ${pluralize(count, 'propina', 'propinas')}</small>
                </div>
                <div class="history-group-total">${formatCurrency(total)} <i class="fas fa-chevron-down accordion-icon-week" aria-hidden="true"></i></div>
            </div>
        </td>
    </tr>`;
}

/**
 * Renderiza header del mes (acordeón nivel 1)
 * @private
 */
function renderMonthHeader(mes, id, count, total) {
    const titulo = mes.charAt(0).toUpperCase() + mes.slice(1);
    
    return `
    <tr class="accordion-header" data-accordion="${id}" data-accordion-level="month" role="button" tabindex="0" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion('${id}', event)}" onclick="toggleAccordion('${id}', event)" style="cursor: pointer;">
        <td colspan="4" style="padding: 12px !important;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${titulo}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${count} ${pluralize(count, 'propina', 'propinas')}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 700; color: var(--text-main);">${formatCurrency(total)}</span>
                    <i class="fas fa-chevron-down accordion-icon" style="color: var(--text-muted); transition: transform 0.3s;"></i>
                </div>
            </div>
        </td>
    </tr>
    `;
}

/**
 * Renderiza sub-header del día (acordeón nivel 2)
 * @private
 */
function renderDayHeader(idSemana, idDia, dia, count, total) {
    return `
    <tr class="accordion-item accordion-header-sub" data-parent-accordion="${idSemana}" data-accordion="${idDia}" data-accordion-level="day" role="button" tabindex="0" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion('${idDia}', event)}" onclick="toggleAccordion('${idDia}', event)">
        <td colspan="4" style="padding: 10px 12px !important; margin-left: 16px; background: rgba(211, 47, 47, 0.02); border-left: 3px solid rgba(211, 47, 47, 0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 0.9rem; color: var(--text-main);">${dia}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 600; color: var(--text-main);">${formatCurrency(total)}</span>
                    <i class="fas fa-chevron-down accordion-icon-sub" style="color: var(--text-muted); transition: transform 0.3s; font-size: 0.8rem;"></i>
                </div>
            </div>
        </td>
    </tr>
    `;
}

/**
 * Renderiza fila de ingreso individual
 * @private
 */
function renderIngresoRow(ingreso, idDia, isLast) {
    const knownMethod = PAYMENT_METHODS[Object.keys(PAYMENT_METHODS).find(key => PAYMENT_METHODS[key].id === ingreso.tipo)];
    const method = knownMethod || {
        icon: 'fa-circle-question',
        label: 'Otros ingresos'
    };
    
    const fecha = getIngresoDate(ingreso);
    
    const horaTxt = formatTime(fecha);
    
    let claseAccordion = 'accordion-item';
    if (isLast) claseAccordion += ' accordion-last';
    
    return `
    <tr class="${claseAccordion}" data-parent-accordion="${idDia}">
        <td width="50" style="padding-left: 40px !important;">
            <div style="width:36px; height:36px; background:var(--bg-body); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                <i class="fas ${method.icon}"></i>
            </div>
        </td>
        <td>
            <div style="font-weight:600; font-size:0.9rem;">${method.label}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${horaTxt}</div>
        </td>
        <td class="text-end" style="font-weight:700;">${formatCurrency(ingreso.monto)}</td>
        <td class="text-end" style="min-width:80px;">
            <div class="d-flex justify-content-end">
                <button type="button" onclick="event.stopPropagation(); abrirEdicion('${ingreso.id}')" class="btn-edit-mini" title="Editar propina" aria-label="Editar propina"><i class="fas fa-pen" aria-hidden="true"></i></button>
                <button type="button" onclick="event.stopPropagation(); borrarRegistro('${ingreso.id}')" class="btn-trash-mini" title="Eliminar propina" aria-label="Eliminar propina"><i class="fas fa-trash" aria-hidden="true"></i></button>
            </div>
        </td>
    </tr>
    `;
}

// ============================================================================
// TARJETA DE PROYECCIÓN DE PAGO
// ============================================================================

/**
 * Actualiza tarjeta de resumen de pago
 * @param {Object} summary - Resumen de estadísticas
 */
export function updatePaymentCard(summary) {
    const commission = summary.cardCommission || { bruto: 0, comision: 0, neto: 0, rate: 0 };
    
    const elements = {
        commission: document.getElementById('lblPorcentajeNiubiz'),
        gross: document.getElementById('lblBrutoTarjeta'),
        commissionAmount: document.getElementById('lblComisionNiubiz'),
        net: document.getElementById('lblNetoDeposito'),
        total: document.getElementById('totalLabel')
    };
    
    if (elements.commission) elements.commission.innerText = `-${commission.rate}%`;
    if (elements.gross) elements.gross.innerText = formatCurrency(commission.bruto);
    if (elements.commissionAmount) elements.commissionAmount.innerText = `- ${formatCurrency(commission.comision)}`;
    if (elements.net) elements.net.innerText = formatCurrency(commission.neto);
    if (elements.total) elements.total.innerText = formatCurrency(summary.total || 0);
}

// ============================================================================
// COMPONENTES REUTILIZABLES
// ============================================================================

/**
 * Renderiza una fila vacía de historial
 * @returns {string}
 */
export function renderEmptyState() {
    return '<tr><td colspan="4"><li class="text-center text-adaptive small py-3" style="color: var(--text-main) !important; list-style: none;">Sin propinas registradas</li></td></tr>';
}
