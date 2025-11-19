/**
 * Module de gestion de l'interface utilisateur (toast, modals)
 */

/**
 * Affiche une notification toast
 */
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#e74c3c' : '#27ae60';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Affiche un modal
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Ferme un modal
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Configure les gestionnaires pour fermer les modals en cliquant à l'extérieur
 */
export function setupModalClickOutside() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

/**
 * Affiche ou cache un élément
 */
export function toggleDisplay(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * Scroll fluide vers le haut de la page
 */
export function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Gestionnaire d'erreurs centralisé
 * @param {Error} error - L'erreur à gérer
 * @param {string} context - Contexte de l'erreur (ex: "Chargement du PLU")
 * @param {boolean} showToUser - Afficher l'erreur à l'utilisateur via toast
 */
export function handleError(error, context = '', showToUser = true) {
    // Log détaillé en console pour le debugging
    console.error(`[Erreur${context ? ' - ' + context : ''}]:`, error);
    console.error('Stack trace:', error.stack);

    if (showToUser) {
        // Message utilisateur simplifié
        let userMessage = context ? `Erreur lors de ${context}` : 'Une erreur est survenue';

        // Ajouter des détails si disponibles
        if (error.message) {
            userMessage += `: ${error.message}`;
        }

        showToast(userMessage, 'error');
    }

    return false; // Retourne false pour indiquer l'échec
}

/**
 * Wrapper pour exécuter une fonction async avec gestion d'erreur
 * @param {Function} fn - Fonction async à exécuter
 * @param {string} context - Contexte pour le message d'erreur
 * @returns {Promise<any>} - Résultat de la fonction ou null en cas d'erreur
 */
export async function safeAsync(fn, context = '') {
    try {
        return await fn();
    } catch (error) {
        handleError(error, context);
        return null;
    }
}

/**
 * Wrapper pour exécuter une fonction sync avec gestion d'erreur
 * @param {Function} fn - Fonction à exécuter
 * @param {string} context - Contexte pour le message d'erreur
 * @returns {any} - Résultat de la fonction ou null en cas d'erreur
 */
export function safeSync(fn, context = '') {
    try {
        return fn();
    } catch (error) {
        handleError(error, context);
        return null;
    }
}
