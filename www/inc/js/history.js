/**
 * Module de gestion de l'historique (undo/redo)
 */

import { state, setPluData } from './state.js';
import { renderTree } from './tree.js';
import { showToast } from './ui.js';

const MAX_HISTORY_SIZE = 50;
const undoStack = [];
const redoStack = [];
let isRestoring = false;

/**
 * Capture l'état actuel avant une modification
 * @param {string} actionName - Nom de l'action pour l'historique
 */
export function captureState(actionName = 'Action') {
    // Ne pas capturer pendant une restoration
    if (isRestoring) {
        return;
    }

    // Ne capturer que si un PLU est chargé
    if (!state.pluData) {
        return;
    }

    try {
        // Créer une copie profonde de l'état
        const snapshot = {
            actionName,
            timestamp: Date.now(),
            pluData: JSON.parse(JSON.stringify(state.pluData))
        };

        // Ajouter au stack d'undo
        undoStack.push(snapshot);

        // Limiter la taille du stack
        if (undoStack.length > MAX_HISTORY_SIZE) {
            undoStack.shift(); // Retirer le plus ancien
        }

        // Vider le stack de redo (nouvelle branche d'historique)
        redoStack.length = 0;

        // Mettre à jour l'UI
        updateHistoryUI();
    } catch (error) {
        console.error('Erreur lors de la capture de l\'état:', error);
    }
}

/**
 * Annule la dernière action (undo)
 */
export function undo() {
    if (undoStack.length === 0) {
        showToast("Rien à annuler", "error");
        return;
    }

    try {
        isRestoring = true;

        // Sauvegarder l'état actuel dans le redo stack
        const currentSnapshot = {
            actionName: 'État actuel',
            timestamp: Date.now(),
            pluData: JSON.parse(JSON.stringify(state.pluData))
        };
        redoStack.push(currentSnapshot);

        // Récupérer le dernier état
        const previousSnapshot = undoStack.pop();

        // Restaurer l'état
        setPluData(previousSnapshot.pluData);
        renderTree();

        showToast(`Annulé: ${previousSnapshot.actionName}`);

        // Mettre à jour l'UI
        updateHistoryUI();
    } catch (error) {
        console.error('Erreur lors du undo:', error);
        showToast("Erreur lors de l'annulation", "error");
    } finally {
        isRestoring = false;
    }
}

/**
 * Rétablit la dernière action annulée (redo)
 */
export function redo() {
    if (redoStack.length === 0) {
        showToast("Rien à rétablir", "error");
        return;
    }

    try {
        isRestoring = true;

        // Sauvegarder l'état actuel dans le undo stack
        const currentSnapshot = {
            actionName: 'État actuel',
            timestamp: Date.now(),
            pluData: JSON.parse(JSON.stringify(state.pluData))
        };
        undoStack.push(currentSnapshot);

        // Récupérer le dernier état annulé
        const nextSnapshot = redoStack.pop();

        // Restaurer l'état
        setPluData(nextSnapshot.pluData);
        renderTree();

        showToast(`Rétabli: ${nextSnapshot.actionName}`);

        // Mettre à jour l'UI
        updateHistoryUI();
    } catch (error) {
        console.error('Erreur lors du redo:', error);
        showToast("Erreur lors du rétablissement", "error");
    } finally {
        isRestoring = false;
    }
}

/**
 * Réinitialise l'historique (lors du chargement d'un nouveau PLU)
 */
export function clearHistory() {
    undoStack.length = 0;
    redoStack.length = 0;
    updateHistoryUI();
}

/**
 * Vérifie si undo est disponible
 * @returns {boolean}
 */
export function canUndo() {
    return undoStack.length > 0;
}

/**
 * Vérifie si redo est disponible
 * @returns {boolean}
 */
export function canRedo() {
    return redoStack.length > 0;
}

/**
 * Met à jour l'interface utilisateur de l'historique
 */
function updateHistoryUI() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
        undoBtn.disabled = !canUndo();
        undoBtn.title = canUndo()
            ? `Annuler: ${undoStack[undoStack.length - 1]?.actionName || 'Action'} (Ctrl+Z)`
            : 'Aucune action à annuler';
    }

    if (redoBtn) {
        redoBtn.disabled = !canRedo();
        redoBtn.title = canRedo()
            ? `Rétablir: ${redoStack[redoStack.length - 1]?.actionName || 'Action'} (Ctrl+Y)`
            : 'Aucune action à rétablir';
    }
}

/**
 * Initialise le module d'historique
 */
export function initHistory() {
    createHistoryButtons();
    updateHistoryUI();
}

/**
 * Crée les boutons undo/redo dans l'interface
 */
function createHistoryButtons() {
    // Chercher la sidebar header
    const sidebarHeader = document.querySelector('.sidebar-actions');
    if (!sidebarHeader) {
        console.warn('Impossible de trouver .sidebar-actions pour ajouter les boutons d\'historique');
        return;
    }

    // Vérifier si les boutons existent déjà
    if (document.getElementById('undo-btn')) {
        return;
    }

    // Créer un conteneur pour les boutons
    const historyContainer = document.createElement('div');
    historyContainer.style.cssText = 'display: flex; gap: 5px; margin-top: 10px;';

    // Bouton Undo
    const undoBtn = document.createElement('button');
    undoBtn.id = 'undo-btn';
    undoBtn.className = 'btn btn-secondary';
    undoBtn.textContent = '↶ Annuler';
    undoBtn.disabled = true;
    undoBtn.addEventListener('click', undo);

    // Bouton Redo
    const redoBtn = document.createElement('button');
    redoBtn.id = 'redo-btn';
    redoBtn.className = 'btn btn-secondary';
    redoBtn.textContent = '↷ Rétablir';
    redoBtn.disabled = true;
    redoBtn.addEventListener('click', redo);

    historyContainer.appendChild(undoBtn);
    historyContainer.appendChild(redoBtn);
    sidebarHeader.appendChild(historyContainer);
}
