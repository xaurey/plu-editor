/**
 * Module de sauvegarde automatique dans localStorage
 */

import { state } from './state.js';

const AUTOSAVE_KEY = 'plu_editor_autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 secondes
let autosaveTimer = null;
let lastSavedData = null;

/**
 * Démarre l'autosave automatique
 */
export function startAutosave() {
    // Ne démarrer qu'une seule fois
    if (autosaveTimer) {
        return;
    }

    // Sauvegarder immédiatement
    performAutosave();

    // Puis sauvegarder périodiquement
    autosaveTimer = setInterval(() => {
        performAutosave();
    }, AUTOSAVE_INTERVAL);
}

/**
 * Arrête l'autosave automatique
 */
export function stopAutosave() {
    if (autosaveTimer) {
        clearInterval(autosaveTimer);
        autosaveTimer = null;
    }
}

/**
 * Effectue une sauvegarde automatique
 */
function performAutosave() {
    // Ne rien sauvegarder si aucun PLU n'est chargé
    if (!state.pluData) {
        return;
    }

    try {
        // Vérifier si les données ont changé (éviter les sauvegardes inutiles)
        const currentData = JSON.stringify(state.pluData);
        if (currentData === lastSavedData) {
            return; // Aucun changement
        }

        // Créer l'objet de sauvegarde avec métadonnées
        const autosaveData = {
            version: 1,
            timestamp: Date.now(),
            dateFormatted: new Date().toLocaleString('fr-FR'),
            pluData: state.pluData
        };

        // Sauvegarder dans localStorage
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(autosaveData));
        lastSavedData = currentData;

        // Mettre à jour l'indicateur visuel
        updateAutosaveIndicator(autosaveData.timestamp);
    } catch (error) {
        console.error('Erreur lors de l\'autosave:', error);
        // Si localStorage est plein, essayer de nettoyer
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage plein, impossible de sauvegarder');
        }
    }
}

/**
 * Sauvegarde manuelle (appelée lors d'un export par exemple)
 */
export function manualSave() {
    performAutosave();
}

/**
 * Efface la sauvegarde automatique
 */
export function clearAutosave() {
    try {
        localStorage.removeItem(AUTOSAVE_KEY);
        lastSavedData = null;
        updateAutosaveIndicator(null);
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'autosave:', error);
    }
}

/**
 * Récupère la sauvegarde automatique
 * @returns {Object|null} Les données sauvegardées ou null
 */
export function getAutosave() {
    try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (!saved) {
            return null;
        }

        const autosaveData = JSON.parse(saved);

        // Vérifier la structure
        if (!autosaveData.pluData || !autosaveData.timestamp) {
            return null;
        }

        return autosaveData;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'autosave:', error);
        return null;
    }
}

/**
 * Vérifie si une autosave existe
 * @returns {boolean}
 */
export function hasAutosave() {
    return getAutosave() !== null;
}

/**
 * Met à jour l'indicateur visuel d'autosave
 * @param {number|null} timestamp - Timestamp de la dernière sauvegarde ou null
 */
function updateAutosaveIndicator(timestamp) {
    const indicator = document.getElementById('autosave-indicator');
    if (!indicator) {
        return;
    }

    if (timestamp) {
        const date = new Date(timestamp);
        const timeStr = date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        indicator.textContent = `💾 Sauvegardé à ${timeStr}`;
        indicator.style.display = 'block';
        indicator.style.color = '#27ae60';
    } else {
        indicator.textContent = '';
        indicator.style.display = 'none';
    }
}

/**
 * Initialise le module d'autosave
 */
export function initAutosave() {
    // Créer l'indicateur visuel s'il n'existe pas
    createAutosaveIndicator();

    // Démarrer l'autosave dès qu'un PLU est chargé
    if (state.pluData) {
        startAutosave();
    }

    // Vérifier s'il y a une autosave à récupérer
    checkForRecovery();
}

/**
 * Vérifie s'il y a une sauvegarde à récupérer et affiche le modal
 */
function checkForRecovery() {
    const autosaveData = getAutosave();

    // Pas d'autosave ou déjà un PLU chargé
    if (!autosaveData || state.pluData) {
        return;
    }

    // Afficher le modal de récupération
    showRecoveryModal(autosaveData);
}

/**
 * Affiche le modal de récupération
 * @param {Object} autosaveData - Les données de l'autosave
 */
function showRecoveryModal(autosaveData) {
    const modal = document.getElementById('recoveryModal');
    if (!modal) {
        console.error('Modal de récupération introuvable');
        return;
    }

    // Remplir les informations
    const dateElem = document.getElementById('recovery-date');
    const nameElem = document.getElementById('recovery-name');

    if (dateElem) {
        dateElem.textContent = autosaveData.dateFormatted || 'Date inconnue';
    }

    if (nameElem) {
        const pluName = autosaveData.pluData?.nom || 'Document sans nom';
        nameElem.textContent = pluName;
    }

    // Afficher le modal
    modal.classList.add('show');

    // Configurer les boutons
    setupRecoveryButtons();
}

/**
 * Configure les boutons du modal de récupération
 */
function setupRecoveryButtons() {
    const acceptBtn = document.querySelector('[data-action="accept-recovery"]');
    const declineBtn = document.querySelector('[data-action="decline-recovery"]');

    if (acceptBtn) {
        acceptBtn.onclick = () => acceptRecovery();
    }

    if (declineBtn) {
        declineBtn.onclick = () => declineRecovery();
    }
}

/**
 * Accepte la récupération et charge les données
 */
function acceptRecovery() {
    const autosaveData = getAutosave();

    if (!autosaveData || !autosaveData.pluData) {
        console.error('Données de récupération invalides');
        closeRecoveryModal();
        return;
    }

    // Importer les modules nécessaires dynamiquement
    import('./state.js').then(({ setPluData }) => {
        import('./tree.js').then(({ renderTree }) => {
            import('./ui.js').then(({ showToast }) => {
                // Charger les données
                setPluData(autosaveData.pluData);
                renderTree();

                // Démarrer l'autosave
                startAutosave();

                // Fermer le modal
                closeRecoveryModal();

                // Notifier l'utilisateur
                showToast('Travail récupéré avec succès !');
            });
        });
    });
}

/**
 * Refuse la récupération et supprime l'autosave
 */
function declineRecovery() {
    // Supprimer l'autosave
    clearAutosave();

    // Fermer le modal
    closeRecoveryModal();
}

/**
 * Ferme le modal de récupération
 */
function closeRecoveryModal() {
    const modal = document.getElementById('recoveryModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Crée l'indicateur visuel d'autosave dans l'interface
 */
function createAutosaveIndicator() {
    // Vérifier si l'indicateur existe déjà
    if (document.getElementById('autosave-indicator')) {
        return;
    }

    // Créer l'élément
    const indicator = document.createElement('div');
    indicator.id = 'autosave-indicator';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: none;
        z-index: 1000;
    `;

    // Ajouter au body
    document.body.appendChild(indicator);
}
