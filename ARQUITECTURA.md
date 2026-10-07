# 🏗️ Arquitectura del Proyecto MiPropina

## Visión General
MiPropina es una aplicación moderna de **registro y seguimiento de propinas** para colaboradores del restaurante Mediterráneo. Está construida con una **arquitectura modular de 3 capas** que separa responsabilidades y facilita mantenimiento a futuro.

---

## 📁 Estructura de Carpetas

```
js/
├── auth/
│   └── usuario.js                 # Gestión de autenticación Google
│
├── config/
│   └── firebase.js                # Configuración de Firebase
│
├── constants/
│   └── app-constants.js           # Todas las constantes y enumeraciones del sistema
│
├── services/                      # 🔴 CAPA DE DATOS
│   ├── storage-service.js         # Operaciones CRUD en Firestore
│   └── analytics-service.js       # Cálculos y análisis de datos
│
├── modules/                       # 🟡 CAPA DE PRESENTACIÓN
│   ├── ui-renderer.js             # Generación de HTML (sin lógica)
│   ├── ui-coordinator.js          # Orquesta las actualizaciones UI
│   └── ui-events.js               # Manejadores de eventos (futuro)
│
├── utils/
│   └── validators.js              # Validaciones, formateo, sanitización
│
└── dashboard/
    ├── app-orchestrator.js        # 🟢 CAPA DE LÓGICA (Orquestador Principal)
    └── operaciones.js             # Legacy (en transición a deprecated)

css/
└── estilos.css

index.html
```

---

## 🔴 CAPA DE DATOS (Services)

### `storage-service.js`
Abstrae **todas las operaciones de Firestore**. Es la única capa que se comunica con la BD.

**Responsabilidades:**
- CRUD de ingresos (propinas)
- Suscripción a cambios en tiempo real
- Manejo centralizado de errores

**Métodos principales:**
```javascript
getIngresosByYear(userId, year)      // Obtiene propinas del año
createIngreso(userId, data)          // Crea nueva propina
updateIngreso(ingresoId, data)       // Actualiza propina
deleteIngreso(ingresoId)             // Elimina propina
subscribeToIngresos(userId, cb)      // Escucha cambios en tiempo real
```

### `analytics-service.js`
**Lógica pura de negocio** sin efectos secundarios. Calcula estadísticas y resúmenes.

**Responsabilidades:**
- Cálculos de totales y promedios
- Cálculo de comisiones de Niubiz
- Agrupación de datos (por mes, día, tipo)
- Generación de estadísticas

**Métodos principales:**
```javascript
calculateTotal(ingresos)             // Total de propinas
calculateByPaymentType(ingresos)     // Resumen por tipo de pago
calculateCardCommission(cardAmount)  // Calcula comisión Niubiz
groupByMonth(ingresos)               // Agrupa por mes
getCompleteSummary(ingresos)         // Resumen completo
```

---

## 🟡 CAPA DE PRESENTACIÓN (Modules)

### `ui-renderer.js`
Genera **HTML puro** sin lógica. Cada función retorna string.

**Responsabilidades:**
- Renderizar componentes HTML
- Aplicar sanitización para XSS
- Formatear datos para visualización
- Templates HTML

**Métodos principales:**
```javascript
renderHistorial(monthGroups, monthsOrdered)  // Tabla historial anual
updatePaymentCard(summary)                    // Tarjeta de pago
renderEmptyState()                            // Estado vacío
```

### `ui-coordinator.js`
**Orquesta las actualizaciones** de UI llamando a servicios y renderizadores.

**Responsabilidades:**
- Coordinar flujo de actualización
- Llamar analytics → renderizado
- Punto de entrada UI

**Métodos principales:**
```javascript
updateAllUI(monthEntries, year, month, yearEntries, historyYear) // Actualiza periodos
updateHistorial(ingresos)            // Actualiza tabla
updatePaymentInfo(ingresos)          // Actualiza tarjeta pago
```

---

## 🟢 CAPA DE LÓGICA (Orquestador Principal)

### `app-orchestrator.js`
**Cerebro de la aplicación**. Orquesta todo usando los servicios y módulos.

**Responsabilidades:**
- Gestionar estado del mes del resumen y año del historial
- Manejadores de eventos
- Flujos de usuario (guardar y eliminar)
- Validación de entrada
- Feedback al usuario

**Estado Global:**
```javascript
appState = {
    currentUser: Object,           // Usuario autenticado
    currentYear: Number,           // Año del mes visible en el resumen
    currentMonth: Number,          // Mes visible en el resumen
    historyYear: Number,           // Año del balance/historial anual
    ingresos: Array,               // Datos del usuario
    unsubscribeIngresos: Function, // Limpieza de listener
    appStatus: String              // Estado de la app
}
```

**Métodos principales:**
```javascript
iniciarDashboard(user)             // Inicialización post-login
guardarPropina()                   // Guarda nueva propina
borrarRegistro(id)                 // Elimina propina
handleMonthChange(delta)           // Cambia mes del resumen
handleYearChange(delta)            // Cambia año del balance anual
```

---

## 📋 Utilidades

### `validators.js`
Funciones de **validación, formateo y sanitización**.

**Categorías:**
- **Sanitización:** `sanitizeHtml()`
- **Validación Dinero:** `validateAmount()`, `isValidAmountFormat()`
- **Validación Fechas:** `validateDate()`, `isNotFutureDate()`
- **Formateo Dinero:** `formatCurrency()`, `parseCurrency()`
- **Formateo Fechas:** `formatDateShort()`, `formatMonthYear()`, `formatTime()`
- **Otros:** `pluralize()`, `capitalize()`, `toDate()`, `toISODate()`

---

## ⚙️ Constants

### `app-constants.js`
Toda configuración centralizada. **No hay valores mágicos**.

**Secciones:**
- `BUSINESS_CONFIG` - Datos de negocio (comisiones, montos)
- `PAYMENT_METHODS` - Tipos de pago con iconos
- `COLORS` - Paleta de colores
- `MESSAGES` - Todos los textos y mensajes
- `VALIDATION_RULES` - Reglas de validación
- `DOM_SELECTORS` - Selectores CSS centralizados
- `FIREBASE_CONFIG` - Configuración Firebase
- `APP_STATES` - Estados posibles de la app
- `ANIMATIONS` - Duraciones de animaciones
- `STORAGE_KEYS` - Claves de localStorage

---

## 🔄 Flujo de Datos

### Lectura de Datos
```
Usuario abre app
    ↓
app-orchestrator.js (iniciarDashboard)
    ↓
storage-service.js (subscribeToingresos)
    ↓
Firestore (Listener en tiempo real)
    ↓
analytics-service.js (groupByMonth, calcular totales)
    ↓
ui-coordinator.js (updateAllUI)
    ↓
ui-renderer.js (render HTML)
    ↓
DOM (Actualización visual)
```

### Escritura de Datos
```
Usuario llena formulario y hace click guardar
    ↓
app-orchestrator.js (guardarPropina)
    ↓
validators.js (validar datos)
    ↓
storage-service.js (createIngreso)
    ↓
Firestore (Guardar documento)
    ↓
Listener detecta cambio
    ↓
(Loop vuelve a "Lectura de Datos")
```

---

## 🔒 Seguridad

### XSS Prevention
- Todo input de usuario pasa por `sanitizeHtml()`
- Caracteres especiales: `&` `<` `>` `"` `'` se escapan
- Implementado en `ui-renderer.js` y `app-orchestrator.js`

### Validación
- Montos: rango 1-999, máximo 2 decimales
- Nombres: 2-50 caracteres, caracteres permitidos
- Fechas: no pueden ser futuras
- Métodos: validación en servidor (Firestore Rules)

### Firebase Security
- Solo usuarios autenticados pueden leer/escribir sus datos
- UID de usuario requerido en todas las queries
- Timestamps de creación/actualización

---

## 🎯 Ventajas de esta Arquitectura

### ✅ Separación de Responsabilidades
- Cada módulo tiene una función clara
- Fácil identificar dónde está el código

### ✅ Testing
- Cada capa puede testearse independientemente
- `analytics-service.js` es lógica pura (determinística)
- Mocks y stubs fáciles de crear

### ✅ Mantenimiento
- Cambios en Firestore → solo `storage-service.js`
- Cambios en UI → solo `ui-renderer.js`
- Nueva funcionalidad → agregar en `app-orchestrator.js`

### ✅ Escalabilidad
- Agregar nuevas features minimiza cambios a código existente
- Refactoring sin afectar otras capas

### ✅ Reusabilidad
- `analytics-service.js` puede usarse en reportes/BI
- `validators.js` reutilizable en backend
- Funciones puras fáciles de reusar

---

## 🚀 Adiciones Futuras Recomendadas

1. **Reportes Avanzados**
   - Crear `reports-service.js`
   - Reutilizar `analytics-service.js`

2. **Sistema de Caché Local**
   - Mejorar `storage-service.js` con IndexedDB
   - Funcionalidad offline

3. **Notificaciones**
   - Crear `notifications-service.js`
   - Toast notifications, alerts

4. **Gráficos Mejorados**
   - Crear `charts-service.js`
   - Inicializar Chart.js en ui-coordinator.js

5. **Internacionalización**
   - Separar strings a `i18n-constants.js`
   - Soporte multi-idioma

6. **Testing**
   - Unit tests: `analytics-service.js`, `validators.js`
   - Integration tests: `storage-service.js`
   - E2E tests: flujos completos

7. **Error Handling Mejorado**
   - Crear `error-handler.js`
   - Logging centralizado

8. **State Management**
   - Considerar Pinia o Redux para estado más complejo
   - Actualmente `appState` en `app-orchestrator.js` es suficiente

---

## 📞 Convenciones de Código

### Naming
- Funciones: `camelCase` - `guardarPropina()`
- Constantes: `UPPER_SNAKE_CASE` - `MAX_TIP_AMOUNT`
- Clases: `PascalCase` - `PaymentService`
- Privadas: prefijo `_` o comentario `@private`

### Imports/Exports
```javascript
// Default export para servicios
export default class StorageService {}

// Named exports para funciones utilidad
export function validateAmount() {}
export function formatCurrency() {}
```

### Comments
- JSDoc para funciones públicas
- Inline comments para lógica compleja
- TODO: para trabajo futuro

### Estructura de Función
```javascript
/**
 * Descripción clara de qué hace
 * @param {type} name - Descripción del parámetro
 * @returns {type} Descripción del retorno
 */
export function nombreFuncion(param) {
    // Validación de entrada
    if (!param) return null;
    
    // Lógica principal
    const resultado = procesarDatos(param);
    
    // Retornar
    return resultado;
}
```

---

## 🧪 Testing

### Unit Testing (Analytics)
```javascript
describe('calculateCardCommission', () => {
    it('debe calcular comisión correctamente', () => {
        const resultado = calculateCardCommission(100);
        expect(resultado.comision).toBe(3.5);
    });
});
```

### Integration Testing (Storage)
```javascript
describe('createIngreso', () => {
    it('debe guardar en Firestore', async () => {
        const id = await createIngreso('uid123', {...});
        expect(id).toBeDefined();
    });
});
```

---

**Última actualización:** Marzo 2026  
**Versión:** 2.0 - Arquitectura Modular  
**Responsable:** GitHub Copilot (Arquitectura Profesional)
