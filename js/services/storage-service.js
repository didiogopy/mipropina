/**
 * ============================================================================
 * SERVICIO DE ALMACENAMIENTO (Data Layer)
 * ============================================================================
 * Abstrae todas las operaciones de Firestore con manejo de errores consistente
 * Centraliza acceso a datos para facilitar testing y mantenimiento
 */

import {
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

import { db } from '../config/firebase.js';
import { FIREBASE_CONFIG, MESSAGES } from '../constants/app-constants.js';

// ============================================================================
// INGRESOS (Propinas)
// ============================================================================

/**
 * Obtiene todos los ingresos del usuario del año actual
 * @param {string} userId - UID del usuario
 * @param {number} year - Año a filtrar
 * @returns {Promise<Array>}
 */
export async function getIngresosByYear(userId, year) {
    try {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        
        const q = query(
            collection(db, FIREBASE_CONFIG.COLLECTION_INGRESOS),
            where('uid', '==', userId),
            where('fecha_str', '>=', startDate.toISOString()),
            where('fecha_str', '<=', endDate.toISOString())
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error obteniendo ingresos:', error);
        throw new Error(MESSAGES.ERROR_LOAD_DATA);
    }
}

/**
 * Crea un nuevo ingreso (propina)
 * @param {string} userId - UID del usuario
 * @param {Object} data - Datos del ingreso
 * @returns {Promise<string>} ID del documento creado
 */
export async function createIngreso(userId, data) {
    try {
        const docRef = await addDoc(collection(db, FIREBASE_CONFIG.COLLECTION_INGRESOS), {
            uid: userId,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        return docRef.id;
    } catch (error) {
        console.error('Error creando ingreso:', error);
        throw new Error(MESSAGES.ERROR_SAVE_DATA);
    }
}

/**
 * Actualiza un ingreso existente
 * @param {string} ingresoId - ID del ingreso
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<void>}
 */
export async function updateIngreso(ingresoId, data) {
    try {
        await updateDoc(doc(db, FIREBASE_CONFIG.COLLECTION_INGRESOS, ingresoId), {
            ...data,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error actualizando ingreso:', error);
        throw new Error(MESSAGES.ERROR_SAVE_DATA);
    }
}

/**
 * Elimina un ingreso
 * @param {string} ingresoId - ID del ingreso a eliminar
 * @returns {Promise<void>}
 */
export async function deleteIngreso(ingresoId) {
    try {
        await deleteDoc(doc(db, FIREBASE_CONFIG.COLLECTION_INGRESOS, ingresoId));
    } catch (error) {
        console.error('Error eliminando ingreso:', error);
        throw new Error(MESSAGES.ERROR_DELETE_DATA);
    }
}

/**
 * Escucha cambios en tiempo real de ingresos del usuario
 * @param {string} userId - UID del usuario
 * @param {Function} callback - Función a ejecutar cuando hay cambios
 * @returns {Function} Unsubscribe function
 */
export function subscribeToIngresos(userId, callback) {
    try {
        const q = query(
            collection(db, FIREBASE_CONFIG.COLLECTION_INGRESOS),
            where('uid', '==', userId)
        );
        
        return onSnapshot(q, snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(data);
        });
    } catch (error) {
        console.error('Error suscribiéndose a ingresos:', error);
        throw new Error(MESSAGES.ERROR_LOAD_DATA);
    }
}

