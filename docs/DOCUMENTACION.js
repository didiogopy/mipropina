/**
 * ============================================================================
 * DOCUMENTACIÓN DE PROYECTO: MiPropina - Portal de Colaborador
 * ============================================================================
 * 
 * DESCRIPCIÓN DEL PROYECTO
 * ========================
 * MiPropina es una aplicación web moderna para que colaboradores de
 * Mediterráneo rastreen, visualicen y gestionen sus propinas de manera
 * segura, intuitiva y accesible. Incluye autenticación con Google,
 * sincronización en tiempo real con Firestore, y dashboards analíticos.
 * 
 * TECNOLOGÍAS PRINCIPALES
 * ========================
 * • Frontend: HTML5 + CSS3 + JavaScript (ES6+)
 * • Frameworks: Bootstrap 5.3.0, Chart.js
 * • Backend/DB: Firebase (Auth + Firestore)
 * • UI/UX: SweetAlert2, Font Awesome, Plus Jakarta Sans
 * • Arquitectura: Módulos ES6, componentes reutilizables
 * 
 * ============================================================================
 * ESTRUCTURA DE CARPETAS
 * ============================================================================
 * 
 * MiPropina/
 * ├── index.html                 (Archivo principal con estructura HTML)
 * ├── css/
 * │   └── estilos.css           (Sistema completo de estilos)
 * └── js/
 *     ├── auth/
 *     │   └── usuario.js        (Autenticación y sesión)
 *     ├── config/
 *     │   └── firebase.js       (Configuración de Firebase)
 *     └── dashboard/
 *         └── operaciones.js    (Lógica principal del dashboard)
 * 
 * ============================================================================
 * ARQUITECTURA Y PATRONES
 * ============================================================================
 * 
 * 1. SEPARACIÓN DE RESPONSABILIDADES
 *    ✓ config/firebase.js: Solo inicialización de servicios
 *    ✓ auth/usuario.js: Solo flujo de autenticación
 *    ✓ dashboard/operaciones.js: Lógica de negocio
 *    ✓ estilos.css: Presentación visual
 * 
 * 2. MODULARIDAD
 *    ✓ Cada archivo es un módulo ES6 independiente
 *    ✓ Exportación/importación de funciones necesarias
 *    ✓ Evita variables globales innecesarias
 * 
 * 3. DESIGN TOKENS EN CSS
 *    ✓ Variables CSS reutilizables (:root)
 *    ✓ Temas oscuro/claro mediante [data-theme]
 *    ✓ Espaciado, tipografía, colores centralizados
 * 
 * 4. RESPONSIVE DESIGN
 *    ✓ Mobile-first approach
 *    ✓ Breakpoints: 576px (mobile), 768px (tablet)
 *    ✓ Flexbox y Grid para layouts adaptativos
 * 
 * 5. ESTADO GLOBAL
 *    ✓ Variables en operaciones.js:
 *      - usuarioApp: Usuario autenticado
 *      - datosLocales: Propinas del usuario
 *      - listaUsuariosSistema: Directorio para búsqueda
 *      - fechaVisualizacion: Fecha seleccionada
 *      - filtroActual: Período (día/mes/año)
 * 
 * ============================================================================
 * FLUJOS PRINCIPALES
 * ============================================================================
 * 
 * 1. AUTENTICACIÓN (usuario.js)
 *    ┌─────────────────────────────────────────────┐
 *    │ 1. Usuario click en "Acceder con Google"   │
 *    │ 2. Firebase muestra popup de Google Sign-In │
 *    │ 3. onAuthStateChanged detecta usuario       │
 *    │ 4. Guardar perfil en Firestore (merge)      │
 *    │ 5. Iniciar dashboard                        │
 *    └─────────────────────────────────────────────┘
 * 
 * 2. GUARDAR PROPINA (operaciones.js)
 *    ┌──────────────────────────────────────────────┐
 *    │ 1. Usuario selecciona método de pago        │
 *    │ 2. Ingresa fecha y monto                    │
 *    │ 3. Si es "Corredor", busca compañero       │
 *    │ 4. Validar datos (monto, compañero, etc)   │
 *    │ 5. addDoc() a collection "ingresos"        │
 *    │ 6. Mostrar notificación de éxito           │
 *    │ 7. Recargar datos (cargarDatos)            │
 *    └──────────────────────────────────────────────┘
 * 
 * 3. VISUALIZACIÓN DE DATOS (operaciones.js)
 *    ┌──────────────────────────────────────────────┐
 *    │ 1. Filtrar datos por período (día/mes/año) │
 *    │ 2. Renderizar gráfico doughnut (Chart.js)  │
 *    │ 3. Mostrar totales por tipo de pago        │
 *    │ 4. Calcular proyección de pago (comisión)  │
 *    │ 5. Mostrar historial en tabla               │
 *    │ 6. Calcular ranking global de corredores    │
 *    └──────────────────────────────────────────────┘
 * 
 * 4. EDICIÓN DE PROPINA (operaciones.js)
 *    ┌──────────────────────────────────────────────┐
 *    │ 1. Usuario click en ícono de editar        │
 *    │ 2. SweetAlert modal abre con formulario    │
 *    │ 3. Usuario edita campos (fecha, monto, etc)│
 *    │ 4. Validar datos nuevamente               │
 *    │ 5. updateDoc() al documento en Firestore   │
 *    │ 6. Recargar interfaz                       │
 *    └──────────────────────────────────────────────┘
 * 
 * ============================================================================
 * COLECCIONES DE FIRESTORE
 * ============================================================================
 * 
 * 1. Collection: "usuarios"
 *    Propósito: Directorio público para búsqueda de compañeros
 *    Documento: {uid}
 *    Campos:
 *    ├── uid (string): Firebase UID
 *    ├── displayName (string): Nombre del usuario
 *    ├── photoURL (string): URL de foto de perfil
 *    ├── email (string): Email
 *    └── lastLogin (timestamp): Último acceso
 * 
 * 2. Collection: "ingresos"
 *    Propósito: Registro de todas las propinas
 *    Documento: {uid del ingreso} (auto-generado)
 *    Campos:
 *    ├── uid (string): Firebase UID del usuario propietario
 *    ├── monto (number): Cantidad registrada
 *    ├── tipo (string): "Efectivo"|"Tarjeta"|"Corredor"|"Yape/Plin"
 *    ├── fecha (timestamp): Fecha del ingreso
 *    ├── fecha_str (string): ISO format para consultas
 *    ├── companero (string): Nombre si es Corredor
 *    ├── companero_uid (string): UID si es Corredor registrado
 *    └── timestamp (timestamp): Fecha de creación
 * 
 * ============================================================================
 * REGLAS DE NEGOCIO
 * ============================================================================
 * 
 * PROPINAS DE CORREDOR
 * ├── Monto máximo: S/50
 * ├── Requiere: Búsqueda de compañero
 * └── Se acumula en ranking global
 * 
 * OTRAS PROPINAS (Efectivo, Tarjeta, Digital)
 * ├── Monto máximo: S/999
 * └── No requiere compañero
 * 
 * TARJETAS (Comisión Niubiz)
 * ├── Porcentaje: 4.5%
 * ├── Cálculo: Bruto - (Bruto × 0.045) = Neto
 * └── Mostrado en "Pago Quincena"
 * 
 * VALIDACIONES
 * ├── Monto > 0
 * ├── Método seleccionado
 * ├── Fecha válida
 * └── Si Corredor: compañero obligatorio
 * 
 * ============================================================================
 * COMPONENTES PRINCIPALES
 * ============================================================================
 * 
 * 1. PANTALLA DE LOGIN
 *    ├── Logo y branding
 *    ├── Botón Google Sign-In
 *    └── Copyright
 * 
 * 2. HEADER DASHBOARD
 *    ├── Título "Mis Ingresos"
 *    ├── Píldora de usuario (expandible)
 *    └── Botón logout
 * 
 * 3. TARJETA BALANCE TOTAL
 *    ├── Filtros período (Hoy/Mes/Año)
 *    ├── Navegación de fechas (← →)
 *    ├── Gráfico doughnut
 *    └── Pago Quincena (con comisión)
 * 
 * 4. FORMULARIO REGISTRO
 *    ├── Tarjetas método (4 opciones)
 *    ├── Input fecha
 *    ├── Input monto
 *    ├── Búsqueda compañero (Corredor)
 *    └── Botón guardar
 * 
 * 5. RANKING GLOBAL
 *    ├── Top 5 compañeros
 *    ├── Coronas para medallas
 *    ├── Avatar + nombre + total
 *    └── Dinámico según datos
 * 
 * 6. HISTORIAL RECIENTE
 *    ├── Tabla con últimos 10 registros
 *    ├── Icono tipo, tipo, fecha, compañero
 *    ├── Monto y botones editar/eliminar
 *    └── Hover effects
 * 
 * ============================================================================
 * ESTILOS Y TEMAS
 * ============================================================================
 * 
 * TEMA CLARO (light)
 * ├── Background: #f8fafc
 * ├── Tarjetas: rgba(255, 255, 255, 0.9)
 * ├── Texto: #0f172a
 * └── Acentos: #D32F2F (rojo Mediterráneo)
 * 
 * TEMA OSCURO (dark)
 * ├── Background: #0f172a
 * ├── Tarjetas: rgba(30, 41, 59, 0.75)
 * ├── Texto: #ffffff
 * └── Acentos: #D32F2F (mismo rojo)
 * 
 * CARACTERÍSTICAS DE DISEÑO
 * ├── Glassmorphism: blur + transparencia
 * ├── Responsive: Mobile-first
 * ├── Accesible: Contrastes WCAG AA
 * ├── Animaciones: Transiciones suaves (cubic-bezier)
 * └── Tipografía: Plus Jakarta Sans (Google Fonts)
 * 
 * ============================================================================
 * MEJORES PRÁCTICAS IMPLEMENTADAS
 * ============================================================================
 * 
 * JAVASCRIPT
 * ✓ Módulos ES6 (import/export)
 * ✓ Funciones puras donde posible
 * ✓ Comentarios JSDoc
 * ✓ Nombres descriptivos
 * ✓ Manejo de errores (try-catch)
 * ✓ Variables con scope apropiado
 * ✓ Separación de concerns
 * 
 * CSS
 * ✓ Design Tokens (variables CSS)
 * ✓ BEM-like naming conventions
 * ✓ Media queries organizadas
 * ✓ Comentarios estructurales
 * ✓ Gradientes y efectos modernos
 * ✓ Responsive tipografía
 * 
 * HTML
 * ✓ Estructura semántica
 * ✓ ARIA labels donde necesario
 * ✓ Comentarios HTML
 * ✓ Atributos descriptivos
 * ✓ Estructura de datos clara
 * 
 * FIRESTORE
 * ✓ Índices apropiados
 * ✓ Estructura denormalizada (balance)
 * ✓ Campos de auditoria (lastLogin, timestamp)
 * ✓ Merge: true para actualizaciones sin perder datos
 * 
 * ============================================================================
 * OPTIMIZACIONES Y MEJORAS FUTURAS
 * ============================================================================
 * 
 * PERFORMANCE
 * □ Debounce en buscador (500ms)
 * □ Paginación en historial (vs. mostrar 10 siempre)
 * □ Lazy loading de imágenes
 * □ Service Workers para offline
 * 
 * SEGURIDAD
 * □ Sanitizar inputs (XSS)
 * □ Validar en backend
 * □ Rate limiting en búsqueda
 * □ Variables de entorno para config
 * 
 * FEATURES
 * □ Exportar a CSV
 * □ Gráficos mensuales/anuales
 * □ Notificaciones push
 * □ Darkmode switch con persistencia
 * □ Búsqueda avanzada con filtros
 * □ Compartir ranking en redes
 * 
 * UX/DESIGN
 * □ Skeleton loaders
 * □ Empty states mejorados
 * □ Onboarding tutorial
 * □ Tooltips informativos
 * □ Dark/Light theme transición smooth
 * 
 * ============================================================================
 * CÓMO EJECUTAR
 * ============================================================================
 * 
 * 1. CLONAR O DESCARGAR PROYECTO
 *    git clone [repositorio]
 *    cd MiPropina
 * 
 * 2. ABRIR EN SERVIDOR LOCAL
 *    # Con Python 3
 *    python -m http.server 8000
 * 
 *    # Con Node.js
 *    npx http-server
 * 
 * 3. ACCEDER EN NAVEGADOR
 *    http://localhost:8000
 * 
 * 4. USAR GOOGLE SIGN-IN
 *    Click en "Acceder con Google"
 *    Seleccionar cuenta
 *    Dashboard se carga automáticamente
 * 
 * ============================================================================
 * DEPENDENCIAS EXTERNAS
 * ============================================================================
 * 
 * CDN - PRODUCCIÓN
 * ├── Bootstrap 5.3.0 (CSS Grid)
 * ├── Font Awesome 6.4.0 (Iconos)
 * ├── Google Fonts (Plus Jakarta Sans)
 * ├── Chart.js (Gráficos)
 * ├── SweetAlert2 (Modales)
 * └── Firebase 9.22.0 (Auth + Firestore)
 * 
 * NINGUNA DEPENDENCIA NPM REQUERIDA (vanilla JavaScript)
 * 
 * ============================================================================
 * VARIABLES DE FIRESTORE A CONSIDERAR
 * ============================================================================
 * 
 * Límite actual de usuarios: 50 (en cargarUsuariosSistema)
 * ✓ Optimizar con paginación para 500+ usuarios
 * 
 * Índice recomendado en "ingresos":
 * ├── uid (ascending)
 * ├── fecha (descending)
 * └── tipo (ascending) - para filtros
 * 
 * ============================================================================
 * NOTAS IMPORTANTES
 * ============================================================================
 * 
 * 1. Firebase Config está en cliente (seguro si restricciones activas)
 * 2. Google Auth válido solo con dominio autorizado
 * 3. Firestore tiene reglas de seguridad (verificar en Console)
 * 4. Imágenes de usuarios se cargan de Google (CDN)
 * 5. Datos persisten en navegador (localStorage para tema)
 * 6. Tabla de historial muestra últimos 10 registros (no pagina)
 * 
 * ============================================================================
 * LICENCIA Y AUTORÍA
 * ============================================================================
 * 
 * Proyecto: MiPropina
 * Autor: Equipo de Desarrollo
 * Año: 2025
 * Empresa: Mediterráneo
 * Estado: En producción
 * 
 * ============================================================================
 */
