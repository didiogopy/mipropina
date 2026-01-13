/**
 * ============================================================================
 * Firebase Configuration Module
 * ============================================================================
 * Descripción: Inicialización y configuración de Firebase para autenticación
 *              y base de datos Firestore.
 * 
 * Responsabilidades:
 * - Inicializar Firebase con credenciales del proyecto
 * - Exportar instancias de servicios (Auth, Firestore)
 * - Configurar proveedores de autenticación (Google)
 * 
 * @module config/firebase
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/**
 * Configuración de Firebase
 * @type {Object}
 * @property {string} apiKey - Clave API del proyecto
 * @property {string} authDomain - Dominio de autenticación
 * @property {string} projectId - ID del proyecto
 * @property {string} storageBucket - Bucket de almacenamiento
 * @property {string} messagingSenderId - ID del servicio de mensajería
 * @property {string} appId - ID de la aplicación
 * @property {string} measurementId - ID de medición
 */
const firebaseConfig = {
    apiKey: "AIzaSyD31nlDN-fgFITYEAWSWu06efhdBhQYhh8",
    authDomain: "propinasapp-997da.firebaseapp.com",
    projectId: "propinasapp-997da",
    storageBucket: "propinasapp-997da.firebasestorage.app",
    messagingSenderId: "209507412096",
    appId: "1:209507412096:web:d9f847b839321139e8de65",
    measurementId: "G-HK9PMYJC44"
};

/* ============================================================================
   INICIALIZACIÓN DE SERVICIOS
   ============================================================================ */

/** Instancia principal de Firebase */
const app = initializeApp(firebaseConfig);

/** Instancia de Firestore para acceso a base de datos */
export const db = getFirestore(app);

/** Instancia de Auth para autenticación de usuarios */
export const auth = getAuth(app);

/** Proveedor de Google Sign-In */
export const provider = new GoogleAuthProvider();
