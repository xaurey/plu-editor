/**
 * Module de gestion des métadonnées du PLU
 */

import { state } from './state.js';
import { showToast, showModal, closeModal } from './ui.js';
import { renderTree } from './tree.js';

/**
 * Affiche l'éditeur de métadonnées
 */
export function showMetadataEditor() {
    if (!state.pluData) {
        showToast("Créez d'abord un nouveau PLU", "error");
        return;
    }

    // Remplir les métadonnées actuelles
    document.getElementById('meta-nom').value = state.pluData.nom || '';
    document.getElementById('meta-typeDoc').value = state.pluData.typeDoc || 'PLU';
    document.getElementById('meta-insee').value = (state.pluData.inseeCommune || []).join(', ');
    document.getElementById('meta-siren').value = state.pluData.sirenEpci || '';
    document.getElementById('meta-lien').value = state.pluData.lien || 'https://www.geoportail-urbanisme.gouv.fr/';
    
    // Extraire la date de l'idUrba
    if (state.pluData.idUrba) {
        const match = state.pluData.idUrba.match(/_(\d{8})$/);
        if (match) {
            document.getElementById('meta-date').value = match[1];
        }
    }

    updateMetadataPreview();
    showModal('metadataModal');
}

/**
 * Met à jour l'aperçu des métadonnées
 */
export function updateMetadataPreview() {
    const typeDoc = document.getElementById('meta-typeDoc').value;
    const date = document.getElementById('meta-date').value;
    const insee = document.getElementById('meta-insee').value.split(',')[0].trim();
    const siren = document.getElementById('meta-siren').value.trim();

    let idUrba = '';
    if (typeDoc === 'PLUi' && siren) {
        idUrba = `${siren}_PLUi_${date || 'AAAAMMJJ'}`;
    } else if (insee) {
        idUrba = `${insee}_${typeDoc}_${date || 'AAAAMMJJ'}`;
    }

    document.getElementById('preview-idUrba').textContent = idUrba || '-';
    document.getElementById('preview-idReglement').textContent = idUrba ? `${idUrba}/reglement` : '-';

    // Afficher/masquer le champ SIREN selon le type
    const sirenGroup = document.getElementById('meta-siren-group');
    if (typeDoc === 'PLUi') {
        sirenGroup.style.display = 'block';
    } else {
        sirenGroup.style.display = 'none';
    }
}

/**
 * Sauvegarde les métadonnées
 */
export function saveMetadata() {
    const nom = document.getElementById('meta-nom').value;
    const typeDoc = document.getElementById('meta-typeDoc').value;
    const date = document.getElementById('meta-date').value;
    const inseeText = document.getElementById('meta-insee').value;
    const siren = document.getElementById('meta-siren').value.trim();
    const lien = document.getElementById('meta-lien').value;

    // Validation
    if (!nom) {
        showToast("Le nom du règlement est requis", "error");
        return;
    }

    if (!date || date.length !== 8 || !/^\d{8}$/.test(date)) {
        showToast("La date doit être au format AAAAMMJJ (8 chiffres)", "error");
        return;
    }

    const inseeCommune = inseeText.split(',').map(s => s.trim()).filter(s => s);
    if (inseeCommune.length === 0) {
        showToast("Au moins un code INSEE est requis", "error");
        return;
    }

    // Valider les codes INSEE (5 chiffres chacun)
    for (const code of inseeCommune) {
        if (!/^\d{5}$/.test(code)) {
            showToast(`Code INSEE invalide: ${code} (doit comprendre 5 chiffres)`, "error");
            return;
        }
    }

    if (typeDoc === 'PLUi') {
        if (!siren || !/^\d{9}$/.test(siren)) {
            showToast("Pour un PLUi, le code SIREN est requis (9 chiffres)", "error");
            return;
        }
    }

    // Générer l'idUrba
    let idUrba;
    if (typeDoc === 'PLUi' && siren) {
        idUrba = `${siren}_PLUi_${date}`;
    } else {
        idUrba = `${inseeCommune[0]}_${typeDoc}_${date}`;
    }

    // Mettre à jour les données PLU
    const oldIdUrba = state.pluData.idUrba;
    const oldIdReglement = state.pluData.idReglement;

    state.pluData.nom = nom;
    state.pluData.typeDoc = typeDoc;
    state.pluData.idUrba = idUrba;
    state.pluData.idReglement = `${idUrba}/reglement`;
    state.pluData.inseeCommune = inseeCommune;
    state.pluData.lien = lien;

    if (typeDoc === 'PLUi') {
        state.pluData.sirenEpci = siren;
    } else {
        delete state.pluData.sirenEpci;
    }

    // Mettre à jour tous les IDs de titre si l'idReglement a changé
    if (oldIdReglement !== state.pluData.idReglement) {
        updateAllTitreIds(state.pluData.titre, oldIdReglement, state.pluData.idReglement);
    }

    // Mettre à jour tous les inseeCommune dans les titres
    updateAllInseeCommune(state.pluData.titre, inseeCommune);

    closeModal('metadataModal');
    renderTree();
    showToast("Métadonnées mises à jour avec succès !");
}

/**
 * Met É  jour tous les IDs de titre récursivement
 */
function updateAllTitreIds(titres, oldPrefix, newPrefix) {
    titres.forEach(titre => {
        if (titre.idTitre && titre.idTitre.startsWith(oldPrefix)) {
            titre.idTitre = titre.idTitre.replace(oldPrefix, newPrefix);
        }
        
        // Mettre É  jour les IDs de contenu
        if (titre.contenu) {
            titre.contenu.forEach(contenu => {
                if (contenu.idContenu && contenu.idContenu.startsWith(oldPrefix)) {
                    contenu.idContenu = contenu.idContenu.replace(oldPrefix, newPrefix);
                }
            });
        }

        // Récursion dans les sous-titres
        if (titre.titre && titre.titre.length > 0) {
            updateAllTitreIds(titre.titre, oldPrefix, newPrefix);
        }
    });
}

/**
 * Met É  jour tous les inseeCommune récursivement
 */
function updateAllInseeCommune(titres, inseeCommune) {
    titres.forEach(titre => {
        titre.inseeCommune = inseeCommune;

        // Récursion dans les sous-titres
        if (titre.titre && titre.titre.length > 0) {
            updateAllInseeCommune(titre.titre, inseeCommune);
        }
    });
}

/**
 * Configure les gestionnaires d'événements pour les métadonnées
 */
export function setupMetadataEventHandlers() {
    // Bouton d'ouverture de l'éditeur de métadonnées
    const showMetadataBtn = document.querySelector('[data-action="show-metadata"]');
    if (showMetadataBtn) {
        showMetadataBtn.addEventListener('click', showMetadataEditor);
    }
    
    // Bouton de sauvegarde des métadonnées
    const saveMetadataBtn = document.querySelector('[data-action="save-metadata"]');
    if (saveMetadataBtn) {
        saveMetadataBtn.addEventListener('click', saveMetadata);
    }
    
    // Bouton d'annulation
    const cancelMetadataBtn = document.querySelector('[data-action="cancel-metadata"]');
    if (cancelMetadataBtn) {
        cancelMetadataBtn.addEventListener('click', () => closeModal('metadataModal'));
    }
    
    // Écouter les changements pour mettre à jour l'aperçu
    const metaFields = ['meta-typeDoc', 'meta-date', 'meta-insee', 'meta-siren'];
    metaFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateMetadataPreview);
            field.addEventListener('change', updateMetadataPreview);
        }
    });
}
