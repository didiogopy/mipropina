# 🚀 Guía Rápida de Desarrollo

## Cómo Agregar una Nueva Feature

### Caso: Agregar nuevo método de pago "Transferencia"

#### 1. Actualizar Constants
**Archivo:** `js/constants/app-constants.js`

```javascript
export const PAYMENT_METHODS = {
    CASH: { id: 'Efectivo', icon: 'fa-coins', label: 'Efectivo' },
    CARD: { id: 'Tarjeta', icon: 'fa-credit-card', label: 'Tarjeta' },
    DIGITAL: { id: 'Yape/Plin', icon: 'fa-qrcode', label: 'Digital' },
    TRANSFER: { id: 'Transferencia', icon: 'fa-bank', label: 'Transferencia' } // ← NUEVA
};
```

#### 2. Verificar Analytics
**Archivo:** `js/services/analytics-service.js`

- Generalmente no necesita cambios si es otro método de pago
- `calculateByPaymentType()` ya lo maneja automáticamente

#### 3. UI se agrega automáticamente
La interfaz se actualizará automáticamente:
- `PAYMENT_METHODS_ARRAY` incluye la nueva opción
- Cards se generan dinámicamente

---

## Periodos del Dashboard

- El resumen principal muestra un mes y sus ingresos, con navegación mensual.
- El resumen anual es secundario y plegable; su selector cambia el año del historial sin modificar el mes principal.
- En Actividad, los meses se muestran cerrados; al abrir un mes aparecen sus días cerrados y cada día despliega sus registros.
- Los tipos de pago son efectivo, tarjeta y Yape/Plin. Los registros históricos de métodos retirados se agrupan como `Otros` y conservan su importe.

---

## Cómo Agregar un Nuevo Mensaje

**Archivo:** `js/constants/app-constants.js`

```javascript
export const MESSAGES = {
    // ... mensajes existentes
    ERROR_CUSTOM_NEW: 'Tu mensaje de error aquí',
    SUCCESS_OPERATION_X: 'Tu mensaje de éxito aquí'
};
```

**Usar en:**
```javascript
// En app-orchestrator.js
mostrarError(MESSAGES.ERROR_CUSTOM_NEW);
```

---

## Cómo Modificar un Cálculo de Comisión

**Archivo:** `js/services/analytics-service.js`

```javascript
export function calculateCardCommission(cardAmount) {
    const bruto = cardAmount;
    const comision = bruto * BUSINESS_CONFIG.COMMISSION_RATE;  // ← Aquí
    // ...
}
```

O cambiar la tasa en:

**Archivo:** `js/constants/app-constants.js`
```javascript
export const BUSINESS_CONFIG = {
    COMMISSION_RATE: 0.035,  // ← Tasa de comisión actual: 3.5%
    // ...
};
```

---

## Cómo Agregar un Campo Nuevo Al Ingreso

### Caso: Agregar "notas" a cada propina

#### 1. Actualizar formulario HTML (index.html)
```html
<input type="text" id="inputNotas" placeholder="Notas (opcional)">
```

#### 2. Guardar en app-orchestrator.js
```javascript
async function guardarPropina() {
    // ... validaciones ...
    
    const notas = document.querySelector('#inputNotas').value;
    
    await createIngreso(appState.currentUser.uid, {
        // ... otros campos ...
        notas: sanitizeHtml(notas)  // ← Nuevo campo
    });
}
```

#### 3. Renderizar en ui-renderer.js
```javascript
function renderIngresoRow(ingreso, ...) {
    // ...
    return `
        <tr>
            <!-- ... otros campos ... -->
            <td>${ingreso.notas ? '📝 ' + sanitizeHtml(ingreso.notas) : ''}</td>
        </tr>
    `;
}
```

---

## Debugging

### Ver estado actual
```javascript
// En la consola del navegador
console.log(window.appState);  // Instancia del app-orchestrator.js
```

### Verificar errores de Firestore
```javascript
// En app-orchestrator.js, agregar log
try {
    await createIngreso(...);
} catch (error) {
    console.error('Error detallado:', error.message, error.code);
}
```

### Verificar qué se está renderizando
```javascript
// En la consola
const table = document.querySelector('#tablaHistorial');
console.log(table.innerHTML);  // Ver HTML generado
```

---

## Performance Tips

### 1. Lazy Loading de Usuarios
En lugar de cargar todos al inicio:
```javascript
// En storage-service.js
export async function getAllUsers() {
    const q = query(
        collection(db, FIREBASE_CONFIG.COLLECTION_USUARIOS),
        limit(50)  // Limitar cantidad
    );
    // ...
}
```

### 2. Memoización de Cálculos
```javascript
let cachedSummary = null;
let cachedIngresos = null;

export function getCompleteSummary(ingresos) {
    if (cachedIngresos !== ingresos) {
        cachedSummary = computeSummary(ingresos);  // Calcular solo si cambió
        cachedIngresos = ingresos;
    }
    return cachedSummary;
}
```

### 3. Debounce en búsqueda
Ya implementado:
```javascript
// En app-orchestrator.js
inputSearch.addEventListener('input', debounce(handleCompanionSearch, 300));
```

---

## Estructura de Commit

```
feat: agregar nuevo método de pago Transferencia

- Actualizar PAYMENT_METHODS en constants
- Validación automática en analytics-service
- UI se genera dinámicamente

Relates to: #12
```

Tipos:
- `feat:` - Feature nueva
- `fix:` - Bug fix
- `refactor:` - Cambio de código sin cambiar funcionalidad
- `docs:` - Cambios de documentación
- `style:` - Cambios de formato (espacios, punto y coma)
- `perf:` - Mejoras de performance

---

## Checklist Antes de Deploy

- [ ] No hay `console.error` sin manejo
- [ ] Todos los `TODO` están documentados
- [ ] Validaciones están implementadas
- [ ] Mensajes de error son claros
- [ ] Datos se sanitizan (XSS prevention)
- [ ] Código está comentado
- [ ] Tests pasan (si existen)
- [ ] Performance aceptable
- [ ] No hay valores mágicos (usar constants)

---

## Recursos Útiles

- **Firebase Docs:** https://firebase.google.com/docs
- **MDN Web Docs:** https://developer.mozilla.org/
- **Bootstrap 5:** https://getbootstrap.com/
- **Font Awesome:** https://fontawesome.com/

---

**Última actualización:** Marzo 2026  
**Mantenedor:** Equipo de Desarrollo MiPropina
