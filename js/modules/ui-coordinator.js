/**
 * ============================================================================
 * COORDINADOR DE UI
 * ============================================================================
 * Orquesta actualizaciones de UI usando datos del servicio de análisis
 * Punto de entrada par actualizaciones visuales
 */

import { 
    calculateByPaymentType, 
    getCompleteSummary,
    groupByMonth,
    getMonthsOrdered
} from '../services/analytics-service.js';

import { 
    renderHistorial, 
    updatePaymentCard 
} from './ui-renderer.js';

import { 
    DOM_SELECTORS 
} from '../constants/app-constants.js';
import { formatCurrency } from '../utils/validators.js';

let ingresosChart = null;

// ============================================================================
// ACTUALIZACIÓN COMPLETA DE UI
// ============================================================================

/**
 * Actualiza toda la interfaz con datos nuevos
 * @param {Array} ingresosDelMes - Ingresos del mes seleccionado
 * @param {number} year - Año actual
 */
export function updateAllUI(ingresosDelMes, year, month, ingresosDelAnio = ingresosDelMes, historyYear = year) {
    updateHistorial(ingresosDelAnio, historyYear);
    updatePaymentInfo(ingresosDelMes);
    updateIncomeChart(ingresosDelMes);
    updatePeriodLabel(year, month);
    updateAnnualSummary(ingresosDelAnio, historyYear);
}

function updateIncomeChart(ingresos) {
    const canvas = document.querySelector(DOM_SELECTORS.CHART_CANVAS);
    if (!canvas || typeof Chart === 'undefined') return;

    const byType = calculateByPaymentType(ingresos);
    const entries = Object.entries(byType).filter(([, amount]) => amount > 0);
    const labels = entries.map(([type]) => type);
    const values = entries.map(([, amount]) => amount);
    const colorByType = {
        Efectivo: '#18765e',
        Tarjeta: '#277b78',
        'Yape/Plin': '#d68a25',
        Otros: '#9ba8a1'
    };
    const colors = labels.map(type => colorByType[type] || colorByType.Otros);

    if (!ingresosChart) {
        ingresosChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    borderRadius: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '76%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });
        return;
    }

    ingresosChart.data.labels = labels;
    ingresosChart.data.datasets[0].data = values;
    ingresosChart.data.datasets[0].backgroundColor = colors;
    ingresosChart.update();
}

// ============================================================================
// HISTORIAL
// ============================================================================

/**
 * Actualiza tabla de historial
 * @param {Array} ingresos - Array de ingresos
 */
function updateHistorial(ingresos, year) {
    const tabla = document.querySelector(DOM_SELECTORS.HISTORY_TABLE);
    
    if (!tabla) return;

    const label = document.querySelector(DOM_SELECTORS.HISTORY_LABEL);
    if (label) label.innerText = String(year);
    
    const monthGroups = groupByMonth(ingresos);
    const monthsOrdered = getMonthsOrdered(monthGroups);
    
    tabla.innerHTML = renderHistorial(monthGroups, monthsOrdered);
}

function updateAnnualSummary(ingresos, year) {
    const summary = getCompleteSummary(ingresos);
    const total = document.getElementById('annualTotal');
    const count = document.getElementById('annualCount');
    const yearLabel = document.getElementById('annualYearLabel');
    const typeSummary = document.getElementById('annualTypeSummary');

    if (total) total.innerText = formatCurrency(summary.total);
    if (yearLabel) yearLabel.innerText = String(year);
    if (count) {
        count.innerText = `${summary.count} ${summary.count === 1 ? 'registro' : 'registros'}`;
    }

    if (typeSummary) {
        const byType = Object.entries(summary.byType).filter(([, amount]) => amount > 0);
        typeSummary.innerHTML = byType.length
            ? byType.map(([type, amount]) => `<div class="annual-type-row"><span>${type}</span><strong>${formatCurrency(amount)}</strong></div>`).join('')
            : '<p class="annual-empty">Sin ingresos registrados este año.</p>';
    }
}

// ============================================================================
// INFORMACIÓN DE PAGO
// ============================================================================

/**
 * Actualiza tarjeta de pago y totales
 * @param {Array} ingresos - Array de ingresos
 */
function updatePaymentInfo(ingresos) {
    const summary = getCompleteSummary(ingresos);
    updatePaymentCard(summary);
}

// ============================================================================
// ETIQUETAS Y TEXTOS
// ============================================================================

function updatePeriodLabel(year, month) {
    const label = document.querySelector(DOM_SELECTORS.DATE_LABEL);
    if (!label || month === undefined) return;

    label.innerText = new Date(year, month, 1).toLocaleDateString('es-PE', {
        month: 'long',
        year: 'numeric'
    });
}
