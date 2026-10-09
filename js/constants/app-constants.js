/**
 * ============================================================================
 * CONSTANTES Y CONFIGURACIÓN GLOBAL DE LA APLICACIÓN
 * ============================================================================
 * Centraliza todos los valores, enumeraciones y configuraciones del sistema
 * para evitar valores mágicos dispersos en el código
 */

// ============================================================================
// DATOS DE NEGOCIO
// ============================================================================

export const BUSINESS_CONFIG = {
    COMMISSION_RATE: 0.035,                    // Tasa de comisión de tarjeta: 3.5%
    MIN_TIP_AMOUNT: 1,                         // Monto mínimo permitido
    MAX_TIP_AMOUNT: 999,                       // Monto máximo permitido
    BUSINESS_NAME: 'Mediterráneo',
    BUSINESS_TAG: 'Portal Colaborador'
};

// ============================================================================
// MÉTODOS DE PAGO
// ============================================================================

export const PAYMENT_METHODS = {
    CASH: { id: 'Efectivo', icon: 'fa-coins', label: 'Efectivo' },
    CARD: { id: 'Tarjeta', icon: 'fa-credit-card', label: 'Tarjeta' },
    DIGITAL: { id: 'Yape/Plin', icon: 'fa-qrcode', label: 'Digital' }
};

export const PAYMENT_METHODS_ARRAY = Object.values(PAYMENT_METHODS);

// ============================================================================
// COLORES Y TEMAS
// ============================================================================

export const COLORS = {
    PRIMARY: '#E10600',           // Rojo Mediterráneo
    SECONDARY: '#FFC400',         // Amarillo Mediterráneo
    SUCCESS: '#FFC400',           // Amarillo Mediterráneo
    WARNING: '#FFC400',           // Amarillo Mediterráneo
    DANGER: '#B00000',            // Rojo oscuro
    LIGHT_BG: '#fff9ed',
    DARK_BG: '#1f1a18'
};

// ============================================================================
// MENSAJES Y TEXTOS
// ============================================================================

export const MESSAGES = {
    // Errores
    ERROR_INVALID_AMOUNT: 'El monto debe estar entre S/ 1 y S/ 999',
    ERROR_INVALID_DATE: 'Selecciona una fecha válida',
    ERROR_REQUIRED_FIELD: 'Este campo es requerido',
    ERROR_METHOD_REQUIRED: 'Selecciona un método de pago',
    ERROR_LOAD_DATA: 'Error al cargar datos',
    ERROR_SAVE_DATA: 'Error al guardar propina',
    ERROR_DELETE_DATA: 'Error al eliminar propina',
    ERROR_NETWORK: 'Error de conexión',
    
    // Éxitos
    SUCCESS_SAVED: '✓ Propina registrada',
    SUCCESS_DELETED: '✓ Propina eliminada',
    SUCCESS_UPDATED: '✓ Propina actualizada',
    
    // Confirmación
    CONFIRM_DELETE: '¿Eliminar esta propina?',
    CONFIRM_DELETE_BTN: 'Sí, eliminar',
    
    // Generales
    NO_DATA: 'Sin propinas registradas',
    LOADING: 'Cargando...',
    YEAR: 'Año',
    ANNUAL_SUMMARY: `${new Date().getFullYear()}`
};

// ============================================================================
// VALIDACIONES
// ============================================================================

export const VALIDATION_RULES = {
    AMOUNT_MIN: 1,
    AMOUNT_MAX: 999,
    AMOUNT_PATTERN: /^\d+(\.\d{1,2})?$/,
    XSS_PATTERN: /[&<>"']/g
};

// ============================================================================
// SELECTORS DE DOM
// ============================================================================

export const DOM_SELECTORS = {
    // Contenedores principales
    LOGIN_SCREEN: '#loginScreen',
    APP_CONTAINER: '#appContainer',
    DASHBOARD_HEADER: '.dashboard-header',
    
    // Formulario
    INPUT_AMOUNT: '#inputMonto',
    INPUT_DATE: '#inputFecha',
    BTN_SAVE: '#btnGuardar',
    
    // Métodos de pago
    METHOD_CARDS: '.method-card',
    
    // Historial y datos
    HISTORY_TABLE: '#tablaHistorial',
    HISTORY_LABEL: '#labelModoHistorial',
    
    // Gráficos y totales
    CHART_CANVAS: '#miGrafico',
    TOTAL_LABEL: '#totalLabel',
    DATE_LABEL: '#labelFechaActual',
    
    // Pago quincena
    PAYMENT_CARD: '.payment-summary-card',
    COMMISSION_BADGE: '#lblPorcentajeNiubiz',
    GROSS_LABEL: '#lblBrutoTarjeta',
    COMMISSION_LABEL: '#lblComisionNiubiz',
    NET_LABEL: '#lblNetoDeposito',
    
    // Usuario
    USER_PHOTO: '#userPhoto',
    USER_NAME: '#userName',
    
    // Tema
    THEME_BTN: '.theme-pill',
    THEME_ICON: '#themeIcon',
    THEME_TEXT: '#themeText'
};

// ============================================================================
// FIREBASE COLLECTIONS Y DOCUMENTOS
// ============================================================================

export const FIREBASE_CONFIG = {
    COLLECTION_INGRESOS: 'ingresos'
};

// ============================================================================
// ESTADOS DE LA APLICACIÓN
// ============================================================================

export const APP_STATES = {
    AUTHENTICATING: 'authenticating',
    AUTHENTICATED: 'authenticated',
    UNAUTHENTICATED: 'unauthenticated',
    LOADING_DATA: 'loading_data',
    DATA_READY: 'data_ready',
    ERROR: 'error'
};

// ============================================================================
// MODOS DE VISUALIZACIÓN
// ============================================================================

export const VIEW_MODES = {
    ANNUAL: 'annual'  // Siempre visualizamos por año
};

// ============================================================================
// ANIMACIONES
// ============================================================================

export const ANIMATIONS = {
    FAST: 150,        // ms
    NORMAL: 300,      // ms
    SLOW: 500         // ms
};

// ============================================================================
// LOCALSTORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
    THEME: 'app_theme',
    LAST_YEAR: 'app_last_year',
    USER_CACHE: 'app_user_cache'
};
