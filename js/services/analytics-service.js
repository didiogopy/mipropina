/**
 * ============================================================================
 * MÓDULO DE ANÁLISIS DE DATOS
 * ============================================================================
 * Procesa y calcula estadísticas, totales y proyecciones de propinas
 * Abstrae la lógica de negocio de cálculos
 */

import { BUSINESS_CONFIG, PAYMENT_METHODS } from '../constants/app-constants.js';
import { toCalendarDate } from '../utils/calendar.js';

// ============================================================================
// CÁLCULOS BÁSICOS
// ============================================================================

/**
 * Calcula el total de un conjunto de ingresos
 * @param {Array} ingresos - Array de ingresos
 * @returns {number}
 */
export function calculateTotal(ingresos) {
    return ingresos.reduce((sum, ingreso) => sum + (ingreso.monto || 0), 0);
}

/**
 * Calcula resumen por tipo de pago
 * @param {Array} ingresos - Array de ingresos
 * @returns {Object} { Efectivo: number, Tarjeta: number, etc. }
 */
export function calculateByPaymentType(ingresos) {
    const resumen = {};
    
    Object.values(PAYMENT_METHODS).forEach(method => {
        resumen[method.id] = 0;
    });
    resumen.Otros = 0;
    
    ingresos.forEach(ingreso => {
        if (resumen.hasOwnProperty(ingreso.tipo)) {
            resumen[ingreso.tipo] += ingreso.monto;
        } else {
            resumen.Otros += ingreso.monto || 0;
        }
    });
    
    return resumen;
}

/**
 * Calcula comisión de Niubiz para pagos con tarjeta
 * @param {number} cardAmount - Monto de tarjeta
 * @returns {Object} { bruto: number, comision: number, neto: number }
 */
export function calculateCardCommission(cardAmount) {
    const bruto = cardAmount;
    const comision = bruto * BUSINESS_CONFIG.COMMISSION_RATE;
    const neto = bruto - comision;
    
    return {
        bruto: parseFloat(bruto.toFixed(2)),
        comision: parseFloat(comision.toFixed(2)),
        neto: parseFloat(neto.toFixed(2)),
        rate: (BUSINESS_CONFIG.COMMISSION_RATE * 100).toFixed(2)
    };
}

// ============================================================================
// AGRUPACIÓN DE DATOS
// ============================================================================

/**
 * Agrupa ingresos por mes
 * @param {Array} ingresos - Array de ingresos
 * @returns {Object} { "marzo 2026": [...], ... }
 */
export function groupByMonth(ingresos) {
    const grupos = {};
    
    ingresos.forEach(ingreso => {
        const fecha = toCalendarDate(ingreso);
            
        const mes = fecha.toLocaleDateString('es-ES', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        if (!grupos[mes]) grupos[mes] = [];
        grupos[mes].push(ingreso);
    });
    
    return grupos;
}

/**
 * Agrupa ingresos por día dentro de un mes
 * @param {Array} ingresos - Array de ingresos del mes
 * @returns {Object} { "jue, 29/03": [...], ... }
 */
export function groupByDay(ingresos) {
    const grupos = {};
    
    ingresos.forEach(ingreso => {
        const fecha = toCalendarDate(ingreso);
            
        const dia = fecha.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        });
        
        if (!grupos[dia]) grupos[dia] = [];
        grupos[dia].push(ingreso);
    });
    
    return grupos;
}

/**
 * Ordena meses de forma cronológica inversa (más reciente primero)
 * @param {Object} monthGroups - Grupos por mes
 * @returns {Array} Array de meses ordenados
 */
export function getMonthsOrdered(monthGroups) {
    return Object.keys(monthGroups).sort((a, b) => {
        const dateA = toCalendarDate(monthGroups[a][0]);
        const dateB = toCalendarDate(monthGroups[b][0]);
        return dateB - dateA;
    });
}

/**
 * Ordena días de forma cronológica inversa
 * @param {Object} dayGroups - Grupos por día
 * @returns {Array} Array de días ordenados
 */
export function getDaysOrdered(dayGroups) {
    return Object.keys(dayGroups).sort((a, b) => {
        const dateA = toCalendarDate(dayGroups[a][0]);
        const dateB = toCalendarDate(dayGroups[b][0]);
        return dateB - dateA;
    });
}

// ============================================================================
// ESTADÍSTICAS AVANZADAS
// ============================================================================

/**
 * Calcula promedio de propina
 * @param {Array} ingresos - Array de ingresos
 * @returns {number}
 */
export function calculateAverage(ingresos) {
    if (ingresos.length === 0) return 0;
    return calculateTotal(ingresos) / ingresos.length;
}

/**
 * Calcula propina máxima
 * @param {Array} ingresos - Array de ingresos
 * @returns {number}
 */
export function calculateMax(ingresos) {
    if (ingresos.length === 0) return 0;
    return Math.max(...ingresos.map(i => i.monto || 0));
}

/**
 * Calcula propina mínima
 * @param {Array} ingresos - Array de ingresos
 * @returns {number}
 */
export function calculateMin(ingresos) {
    if (ingresos.length === 0) return 0;
    return Math.min(...ingresos.map(i => i.monto || 0));
}

/**
 * Calcula resumen completo de ingresos
 * @param {Array} ingresos - Array de ingresos
 * @returns {Object} Estadísticas completas
 */
export function getCompleteSummary(ingresos) {
    const byType = calculateByPaymentType(ingresos);
    const cardCommission = calculateCardCommission(byType['Tarjeta'] || 0);
    
    return {
        total: calculateTotal(ingresos),
        count: ingresos.length,
        average: calculateAverage(ingresos),
        max: calculateMax(ingresos),
        min: calculateMin(ingresos),
        byType,
        cardCommission,
        otherPayments: calculateTotal(ingresos) - (byType['Tarjeta'] || 0)
    };
}
