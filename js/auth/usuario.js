/**
 * ============================================================================
 * Módulo de Autenticación (Usuario)
 * ============================================================================
 * Descripción: Gestión completa del flujo de autenticación con Google Sign-In.
 *              Maneja login, logout, persistencia de sesión y sincronización
 *              de perfil de usuario con Firestore.
 * 
 * Responsabilidades:
 * - Autenticación con Google
 * - Gestión de sesión de usuario
 * - Sincronización de perfil público en Firestore
 * - Inicialización del dashboard
 * 
 * @module auth/usuario
 */

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { auth, provider, db } from "../config/firebase.js";
import { iniciarDashboard } from "../dashboard/operaciones.js";

/* ============================================================================
   REFERENCIAS A ELEMENTOS DEL DOM
   ============================================================================ */

const btnLogin = document.getElementById('btnLogin');

/* ============================================================================
   CONFIGURACIÓN DE EVENTOS DE AUTENTICACIÓN
   ============================================================================ */

/**
 * Evento: Click en botón de login
 * Inicia el flujo de autenticación con Google Sign-In
 */
if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Autenticación',
                text: error.message
            });
        }
    });
}

/**
 * Función global: Logout
 * Cierra la sesión del usuario actual
 * @global
 */
window.logout = () => {
    // Limpiar listeners de sincronización
    if (window.limpiarListeners) {
        window.limpiarListeners();
    }
    signOut(auth);
};

/* ============================================================================
   LISTENER DE ESTADO DE AUTENTICACIÓN
   ============================================================================ */

/**
 * Monitor de cambios en el estado de autenticación
 * Se ejecuta cuando:
 * - Usuario inicia sesión
 * - Usuario cierra sesión
 * - Se recarga la página (verifica sesión persistente)
 * 
 * @param {Object} user - Objeto del usuario autenticado o null
 */
onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');

    if (user) {
        /* ---- USUARIO AUTENTICADO ---- */

        // Ocultar pantalla de login
        loginScreen.classList.add('d-none');
        appContainer.classList.remove('d-none');

        // Actualizar UI con datos del usuario
        document.getElementById('userName').innerText = user.displayName;
        document.getElementById('userPhoto').src = user.photoURL;

        // Guardar perfil público en Firestore (para búsqueda)
        try {
            await setDoc(
                doc(db, "usuarios", user.uid),
                {
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    email: user.email,
                    lastLogin: new Date()
                },
                { merge: true }
            );
        } catch (error) {
            console.error("Error guardando perfil:", error);
        }

        // Iniciar dashboard y cargar datos
        iniciarDashboard(user);

    } else {
        /* ---- USUARIO NO AUTENTICADO ---- */

        loginScreen.classList.remove('d-none');
        appContainer.classList.add('d-none');
    }
});
