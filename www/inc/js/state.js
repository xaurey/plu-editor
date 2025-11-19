/**
 * Module de gestion de l'état global de l'application
 */

export const state = {
    pluData: null,
    currentTitre: null,
    currentTitreIndex: null,
    currentContenu: null,
    flatTitles: [],
    editor: null,
    isEditing: false  // Flag pour savoir si l'éditeur TipTap est actif
};

/**
 * Réinitialise l'état de l'application
 */
export function resetState() {
    state.pluData = null;
    state.currentTitre = null;
    state.currentTitreIndex = null;
    state.currentContenu = null;
    state.flatTitles = [];
}

/**
 * Met à jour les données PLU
 */
export function setPluData(data) {
    state.pluData = data;
}

/**
 * Met à jour le titre courant
 */
export function setCurrentTitre(index) {
    state.currentTitreIndex = index;
    state.currentTitre = state.flatTitles[index]?.titre || null;
}

/**
 * Met à jour le contenu courant
 */
export function setCurrentContenu(contenu) {
    state.currentContenu = contenu;
}

/**
 * Met à jour l'arbre aplati des titres
 */
export function setFlatTitles(titles) {
    state.flatTitles = titles;
}

/**
 * Initialise l'éditeur TipTap
 */
export function initTipTap(editorInstance) {
    state.editor = editorInstance;
}
