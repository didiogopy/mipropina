/**
 * ============================================================================
 * UTILIDADES: Validaciones, Formateo y Sanitización
 * ============================================================================
 * Funciones reutilizables para limpiar datos, validar y formatear información
 * con énfasis en seguridad (XSS prevention) y consistencia
 */

import { VALIDATION_RULES, MESSAGES } from '../constants/app-constants.js';

// ============================================================================
// SANITIZACIÓN (XSS Prevention)
// ============================================================================

/**
 * Escapa caracteres especiales HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto seguro para HTML
 */
export function sanitizeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(VALIDATION_RULES.XSS_PATTERN, char => map[char]);
}

// ============================================================================
// VALIDACIONES: DINERO
// ============================================================================

/**
 * Valida monto de propina
 * @param {number|string} amount - Monto a validar
 * @returns {Object} { isValid: boolean, error?: string }
 */
export function validateAmount(amount) {
    const num = parseFloat(amount);
    
    if (isNaN(num)) {
        return { isValid: false, error: MESSAGES.ERROR_INVALID_AMOUNT };
    }
    
    if (num < VALIDATION_RULES.AMOUNT_MIN || num > VALIDATION_RULES.AMOUNT_MAX) {
        return { isValid: false, error: MESSAGES.ERROR_INVALID_AMOUNT };
    }
    
    return { isValid: true };
}

/**
 * Valida que el monto sea número válido con máximo 2 decimales
 * @param {string} amount - Monto a validar
 * @returns {boolean}
 */
export function isValidAmountFormat(amount) {
    return VALIDATION_RULES.AMOUNT_PATTERN.test(amount);
}

// ============================================================================
// VALIDACIONES: FECHAS
// ============================================================================

/**
 * Valida que la fecha sea válida
 * @param {string|Date} date - Fecha a validar
 * @returns {Object} { isValid: boolean, error?: string }
 */
export function validateDate(date) {
    if (!date) {
        return { isValid: false, error: MESSAGES.ERROR_INVALID_DATE };
    }
    
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
        return { isValid: false, error: MESSAGES.ERROR_INVALID_DATE };
    }
    
    return { isValid: true };
}

/**
 * Valida que la fecha no sea futura
 * @param {string|Date} date - Fecha a validar
 * @returns {boolean}
 */
export function isNotFutureDate(date) {
    const d = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d <= today;
}

// ============================================================================
// FORMATEO: DINERO
// ============================================================================

/**
 * Formatea número a formato de moneda (S/ con 2 decimales)
 * @param {number} amount - Monto a formatear
 * @returns {string} Ej: "S/ 150.50"
 */
export function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return 'S/ 0.00';
    return `S/ ${amount.toFixed(2)}`;
}

/**
 * Extrae número de formato de moneda
 * @param {string} formatted - Texto formateado
 * @returns {number} Número extraído
 */
export function parseCurrency(formatted) {
    const match = formatted.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
}

// ============================================================================
// FORMATEO: FECHAS (LOCALE: es-ES)
// ============================================================================

/**
 * Formatea fecha a texto corto (ej: "jue, 29/03")
 * @param {Date} date - Fecha a formatear
 * @returns {string}
 */
export function formatDateShort(date) {
    return new Date(date).toLocaleDateString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
    });
}

/**
 * Formatea fecha a texto largo (ej: "jueves, 29 de marzo de 2026")
 * @param {Date} date - Fecha a formatear
 * @returns {string}
 */
export function formatDateLong(date) {
    return new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Formatea fecha a "mes año" (ej: "marzo de 2026")
 * @param {Date} date - Fecha a formatear
 * @returns {string}
 */
export function formatMonthYear(date) {
    const text = new Date(date).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric'
    });
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formatea hora (ej: "14:30")
 * @param {Date} date - Fecha/hora a formatear
 * @returns {string}
 */
export function formatTime(date) {
    return new Date(date).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================================================
// FORMATEO: OTROS
// ============================================================================

/**
 * Pluraliza una palabra
 * @param {number} count - Cantidad
 * @param {string} singular - Forma singular
 * @param {string} plural - Forma plural
 * @returns {string} Palabra pluralizada
 */
export function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
}

/**
 * Capitaliza la primera letra
 * @param {string} text - Texto a capitalizar
 * @returns {string}
 */
export function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// ============================================================================
// CONVERSIONES: TIPO DE DATO
// ============================================================================

/**
 * Convierte Firestore Timestamp a Date
 * @param {Object} timestamp - Firestore Timestamp o Date o string
 * @returns {Date}
 */
export function toDate(timestamp) {
    if (!timestamp) return new Date();
    
    if (timestamp.toDate instanceof Function) {
        return timestamp.toDate();
    }
    
    if (timestamp instanceof Date) {
        return timestamp;
    }
    
    return new Date(timestamp);
}

/**
 * Convierte Date a ISO string (YYYY-MM-DD)
 * @param {Date} date - Fecha a convertir
 * @returns {string}
 */
export function toISODate(date) {
    const d = new Date(date);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
}
