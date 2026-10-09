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
import { toCalendarDate } from '../utils/calendar.js';

let ingresosChart = null;
let ingresosChartType = null;

// ============================================================================
// ACTUALIZACIÓN COMPLETA DE UI
// ============================================================================

/**
 * Actualiza toda la interfaz con datos nuevos
 * @param {Array} ingresosDelMes - Ingresos del mes seleccionado
 * @param {number} year - Año actual
 */
export function updateAllUI(ingresosDelMes, year, month, ingresosDelAnio = ingresosDelMes, historyYear = year, mode = 'month', selectedDate = new Date(year, month || 0, 1)) {
    updateHistorial(ingresosDelAnio, historyYear);
    updatePaymentInfo(ingresosDelMes);
    updateIncomeChart(ingresosDelMes, year, month, mode, selectedDate);
    updatePeriodHeader(year, month, mode, selectedDate);
}

function updateIncomeChart(ingresos, year, month, mode, selectedDate) {
    const canvas = document.querySelector(DOM_SELECTORS.CHART_CANVAS);
    if (!canvas || typeof Chart === 'undefined') return;

    const chart = getChartData(ingresos, year, month, mode, selectedDate);
    const emptyState = document.getElementById('chartEmptyState');
    const hasData = chart.datasets.some(dataset => dataset.data.some(value => value > 0));

    if (!hasData) {
        ingresosChart?.destroy();
        ingresosChart = null;
        ingresosChartType = null;
        canvas.hidden = true;
        if (emptyState) emptyState.hidden = false;
        return;
    }

    canvas.hidden = false;
    if (emptyState) emptyState.hidden = true;

    if (ingresosChart && ingresosChartType !== chart.type) {
        ingresosChart.destroy();
        ingresosChart = null;
    }

    if (!ingresosChart) {
        ingresosChart = new Chart(canvas, {
            type: chart.type,
            data: {
                labels: chart.labels,
                datasets: chart.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: chart.showLegend,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: context => ` ${context.dataset.label}: S/ ${Number(context.parsed.y ?? context.parsed).toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#718078',
                            maxTicksLimit: mode === 'month' ? 10 : 12,
                            autoSkip: true
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(113, 128, 120, 0.15)' },
                        ticks: {
                            color: '#718078',
                            callback: value => `S/ ${Number(value).toLocaleString('es-PE')}`
                        }
                    }
                }
            }
        });
        ingresosChartType = chart.type;
        return;
    }

    ingresosChart.config.type = chart.type;
    ingresosChart.data.labels = chart.labels;
    ingresosChart.data.datasets = chart.datasets;
    ingresosChart.options.plugins.legend.display = chart.showLegend;
    ingresosChart.options.scales.x.ticks.maxTicksLimit = mode === 'month' ? 10 : 12;
    ingresosChart.update();
}

function getChartData(ingresos, year, month, mode, selectedDate) {
    const brand = { red: '#E10600', deepRed: '#B00000', yellow: '#FFC400', charcoal: '#2B2421', softYellow: 'rgba(255, 196, 0, 0.28)', softRed: 'rgba(225, 6, 0, 0.12)', muted: '#9A8F87' };

    if (mode === 'day') {
        const byType = calculateByPaymentType(ingresos);
        const labels = Object.keys(byType).filter(type => byType[type] > 0);
        const colors = { Efectivo: brand.yellow, Tarjeta: brand.red, 'Yape/Plin': brand.charcoal, Otros: brand.muted };
        const borders = { Efectivo: brand.deepRed, Tarjeta: brand.deepRed, 'Yape/Plin': brand.charcoal, Otros: brand.charcoal };
        return {
            type: 'bar',
            showLegend: false,
            labels,
            datasets: [{
                label: 'Propinas',
                data: labels.map(type => byType[type]),
                backgroundColor: labels.map(type => colors[type] || brand.muted),
                borderColor: labels.map(type => borders[type] || brand.charcoal),
                borderWidth: 1,
                borderRadius: 5,
                maxBarThickness: 78
            }]
        };
    }

    if (mode === 'month') {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyTotals = Array(daysInMonth).fill(0);
        ingresos.forEach(ingreso => {
            const date = getIngresoDate(ingreso);
            dailyTotals[date.getDate() - 1] += ingreso.monto || 0;
        });
        return {
            type: 'bar',
            showLegend: false,
            labels: dailyTotals.map((_, index) => String(index + 1)),
            datasets: [{
                label: 'Propinas por día',
                data: dailyTotals,
                backgroundColor: dailyTotals.map(value => value > 0 ? brand.red : brand.softYellow),
                borderRadius: 3,
                maxBarThickness: 24
            }]
        };
    }

    const monthlyTotals = Array(12).fill(0);
    ingresos.forEach(ingreso => {
        const date = getIngresoDate(ingreso);
        monthlyTotals[date.getMonth()] += ingreso.monto || 0;
    });
    return {
        type: 'line',
        showLegend: false,
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        datasets: [{
            label: 'Propinas por mes',
            data: monthlyTotals,
            borderColor: brand.red,
            backgroundColor: brand.softRed,
            pointBackgroundColor: brand.yellow,
            pointBorderColor: brand.deepRed,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.3
        }]
    };
}

function getIngresoDate(ingreso) {
    return toCalendarDate(ingreso);
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

function updatePeriodHeader(year, month, mode, selectedDate) {
    const label = document.querySelector(DOM_SELECTORS.DATE_LABEL);
    const title = document.getElementById('balance-title');
    const kicker = document.getElementById('periodKicker');
    const caption = document.getElementById('totalCaption');
    const description = document.getElementById('chartDescription');
    if (!label) return;

    const date = new Date(selectedDate);
    if (mode === 'day') {
        label.innerText = date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (title) title.innerText = 'Estado diario';
        if (kicker) kicker.innerText = 'DÍA SELECCIONADO';
        if (caption) caption.innerText = 'Total del día';
        if (description) description.innerText = 'Distribución de las propinas del día por método de pago.';
    } else if (mode === 'month') {
        label.innerText = date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
        if (title) title.innerText = 'Estado del mes';
        if (kicker) kicker.innerText = 'MES SELECCIONADO';
        if (caption) caption.innerText = 'Total del mes';
        if (description) description.innerText = 'Evolución diaria de tus propinas durante el mes.';
    } else {
        label.innerText = String(year);
        if (title) title.innerText = 'Estado del año';
        if (kicker) kicker.innerText = 'AÑO SELECCIONADO';
        if (caption) caption.innerText = 'Total del año';
        if (description) description.innerText = 'Evolución mensual de tus propinas durante el año.';
    }
}
