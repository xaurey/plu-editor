/**
 * Module de gestion de l'éditeur de contenu
 */

import { state, setCurrentTitre, setCurrentContenu } from './state.js';
import { showToast, toggleDisplay, scrollToTop } from './ui.js';
import { tiptapToHtmlArray, htmlArrayToTipTap, splitTipTapBySeparator } from './converters.js';
import { renderTree } from './tree.js';
import { initializeTipTapIfNeeded } from './main.js';
import { captureState } from './history.js';

/**
 * Rend les checkboxes pour les codes INSEE
 */
function renderInseeCheckboxes() {
    const container = document.getElementById('input-insee-checkboxes');
    if (!container) return;

    container.innerHTML = '';

    // Récupérer les codes INSEE disponibles au niveau du PLU
    const availableCodes = state.pluData?.inseeCommune || [];
    const selectedCodes = state.currentTitre?.inseeCommune || [];

    if (availableCodes.length === 0) {
        container.innerHTML = '<span style="color: #95a5a6; font-size: 13px;">Aucune commune définie au niveau du PLU</span>';
        return;
    }

    availableCodes.forEach(code => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '5px';
        label.style.cursor = 'pointer';
        label.style.fontSize = '13px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = code;
        checkbox.checked = selectedCodes.includes(code);
        checkbox.dataset.inseeCode = code;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(code));
        container.appendChild(label);
    });
}

/**
 * Sélectionne un titre dans l'arbre
 */
export function selectTitre(flatIndex) {
    // Validation: vérifier que l'index est valide
    if (flatIndex == null || flatIndex < 0 || flatIndex >= state.flatTitles.length) {
        showToast("Index de titre invalide", "error");
        return;
    }

    setCurrentTitre(flatIndex);

    // Validation: vérifier que le titre existe
    if (!state.currentTitre) {
        showToast("Titre introuvable", "error");
        return;
    }

    setCurrentContenu(null);

    // Mettre à jour l'état actif
    document.querySelectorAll('.tree-item').forEach(item => item.classList.remove('active'));
    const treeItems = document.querySelectorAll('.tree-item');
    if (treeItems[flatIndex]) {
        treeItems[flatIndex].classList.add('active');
    }

    // Afficher l'en-tête de l'éditeur
    toggleDisplay('editor-header', true);
    toggleDisplay('welcome-screen', false);
    toggleDisplay('editor-screen', true);

    // Remplir le formulaire
    document.getElementById('section-title').textContent = state.currentTitre.intitule || 'Sans titre';
    document.getElementById('input-intitule').value = state.currentTitre.intitule || '';
    document.getElementById('input-niveau').value = state.currentTitre.niveau || 1;
    document.getElementById('input-zone').value = (state.currentTitre.idZone || []).join(', ');
    document.getElementById('input-prescription').value = (state.currentTitre.idPrescription || []).join(', ');
    document.getElementById('input-numero').value = state.currentTitre.numero || '';

    // Rendre les checkboxes INSEE
    renderInseeCheckboxes();

    // Réinitialiser l'éditeur TipTap
    if (state.editor) {
        state.editor.commands.setContent('');
    }

    // Rendre la liste de contenu
    renderContentList();
}

/**
 * Rend la liste des contenus
 */
export function renderContentList() {
    const contentList = document.getElementById('content-list');

    // Validation: vérifier que l'élément existe
    if (!contentList) {
        console.error('Element content-list introuvable');
        return;
    }

    contentList.innerHTML = '';

    // Validation: vérifier que le titre actuel existe
    if (!state.currentTitre) {
        contentList.innerHTML = '<p style="color: #95a5a6;">Aucun titre sélectionné</p>';
        return;
    }

    if (!state.currentTitre.contenu || state.currentTitre.contenu.length === 0) {
        contentList.innerHTML = '<p style="color: #95a5a6;">Aucun contenu ajouté</p>';
        return;
    }

    state.currentTitre.contenu.forEach((contenu, index) => {
        const item = document.createElement('div');

        // Afficher les zones et prescriptions spécifiques si différentes du titre
        let specificInfo = '';
        const titreZone = (state.currentTitre.idZone || []).join(', ');
        const titrePrescription = (state.currentTitre.idPrescription || []).join(', ');
        const contenuZone = (contenu.idZone || []).join(', ');
        const contenuPrescription = (contenu.idPrescription || []).join(', ');

        if (contenuZone !== titreZone || contenuPrescription !== titrePrescription) {
            specificInfo = `<div style="font-size: 11px; color: #856404; margin-top: 5px; padding: 5px; background: #fff3cd; border-radius: 3px;">
                <strong>🎯 Spécifique:</strong> Zone: ${contenuZone || 'N/A'} | Prescription: ${contenuPrescription || 'N/A'}
            </div>`;
        }

        item.className = 'content-item';
        item.draggable = true;
        item.dataset.contentIndex = index;
        
        let preview = '';
        if (contenu.html && contenu.html.length > 0) {
            // Fonction pour extraire le texte d'un élément HTML
            const extractText = (element) => {
                if (typeof element === 'string') {
                    return element;
                }
                if (element.text) {
                    return element.text;
                }
                if (element.children && Array.isArray(element.children)) {
                    return element.children.map(extractText).join('');
                }
                return '';
            };
            
            // Extraire le texte du premier élément
            preview = extractText(contenu.html[0]);
            
            if (!preview || preview.trim() === '') {
                preview = 'Contenu HTML';
            }
            
            // Limiter la longueur de l'aperçu
            if (preview.length > 100) {
                preview = preview.substring(0, 100) + '...';
            }
        }

        item.innerHTML = `
            <div class="content-item-header">
                <span class="content-item-type">☰ Contenu ${index + 1}</span>
                <div>
                    <button class="btn btn-secondary" style="padding: 5px 10px; margin-right: 5px;" data-action="edit-content" data-index="${index}">✏️ Éditer</button>
                    <button class="btn btn-secondary" style="padding: 5px 10px; background: #e74c3c;" data-action="delete-content" data-index="${index}">🗑️</button>
                </div>
            </div>
            ${specificInfo}
            <div style="font-size: 14px; color: #555;">${preview}</div>
        `;
        contentList.appendChild(item);
    });

    // Setup drag and drop for content items
    setupContentDragAndDrop();
}

/**
 * Configure le drag and drop pour les contenus
 */
let draggedContentIndex = null;

function setupContentDragAndDrop() {
    const contentItems = document.querySelectorAll('.content-item[draggable="true"]');

    contentItems.forEach(item => {
        // Drag start
        item.addEventListener('dragstart', (e) => {
            draggedContentIndex = parseInt(e.currentTarget.dataset.contentIndex);
            e.currentTarget.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
        });

        // Drag end
        item.addEventListener('dragend', (e) => {
            e.currentTarget.classList.remove('dragging');
            document.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });
        });

        // Drag over
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const targetIndex = parseInt(e.currentTarget.dataset.contentIndex);

            if (targetIndex === draggedContentIndex) {
                return;
            }

            e.currentTarget.classList.add('drop-target');
        });

        // Drag leave
        item.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('drop-target');
        });

        // Drop
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const targetIndex = parseInt(e.currentTarget.dataset.contentIndex);

            if (targetIndex === draggedContentIndex) {
                return;
            }

            // Check if editing
            if (state.isEditing) {
                showToast("Veuillez sauvegarder ou annuler vos modifications avant de réorganiser", "error");
                return;
            }

            moveContenu(draggedContentIndex, targetIndex);
            e.currentTarget.classList.remove('drop-target');
        });
    });
}

/**
 * Déplace un contenu d'une position à une autre
 */
function moveContenu(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    captureState("Déplacement de contenu");

    const contenus = state.currentTitre.contenu;

    // Remove from original position
    const [movedContenu] = contenus.splice(fromIndex, 1);

    // Insert at new position
    // If moving down, we need to adjust the target index
    const adjustedToIndex = fromIndex < toIndex ? toIndex : toIndex + 1;
    contenus.splice(adjustedToIndex, 0, movedContenu);

    // Re-render the content list
    renderContentList();
    showToast("Contenu déplacé avec succès !");
}

/**
 * Ajoute un nouveau contenu
 */
export function addContent() {
    if (!state.currentTitre) {
        showToast("Sélectionnez d'abord un titre", "error");
        return;
    }

    // Initialiser TipTap si ce n'est pas déjà fait
    initializeTipTapIfNeeded();

    setCurrentContenu(null);
    if (state.editor) {
        state.editor.commands.setContent('');
        document.getElementById('input-contenu-zone').value = '';
        document.getElementById('input-contenu-prescription').value = '';
    }

    // Afficher l'éditeur TipTap
    toggleDisplay('tiptap-editor-zone', true);
    toggleDisplay('content-preview', false);

    // Marquer comme en cours d'édition
    state.isEditing = true;

    showToast("Saisissez le contenu et cliquez sur Enregistrer");
}

/**
 * Édite un contenu existant
 */
export function editContent(index) {
    const contenu = state.currentTitre.contenu[index];
    setCurrentContenu(contenu);

    // Initialiser TipTap si ce n'est pas déjà fait
    initializeTipTapIfNeeded();

    // Convertir le tableau HTML en document TipTap
    const tiptapDoc = htmlArrayToTipTap(contenu.html);
    if (state.editor) {
        state.editor.commands.setContent(tiptapDoc);
        // Charger les zones et prescriptions spécifiques du contenu
        const contenuZone = (contenu.idZone || []).join(', ');
        const contenuPrescription = (contenu.idPrescription || []).join(', ');
        const titreZone = (state.currentTitre.idZone || []).join(', ');
        const titrePrescription = (state.currentTitre.idPrescription || []).join(', ');

        // Si le contenu a les mêmes valeurs que le titre, laisser vide pour indiquer l'héritage
        document.getElementById('input-contenu-zone').value = (contenuZone === titreZone) ? '' : contenuZone;
        document.getElementById('input-contenu-prescription').value = (contenuPrescription === titrePrescription) ? '' : contenuPrescription;
    }

    // Afficher l'éditeur TipTap
    toggleDisplay('tiptap-editor-zone', true);
    toggleDisplay('content-preview', false);

    // Marquer comme en cours d'édition
    state.isEditing = true;

    scrollToTop();
    showToast("Contenu chargé dans l'éditeur");
}

/**
 * Annule l'édition du contenu
 */
export function cancelEditContent() {
    // Cacher l'éditeur et revenir à la liste
    toggleDisplay('tiptap-editor-zone', false);
    toggleDisplay('content-preview', true);

    setCurrentContenu(null);
    if (state.editor) {
        state.editor.commands.setContent('');
        document.getElementById('input-contenu-zone').value = '';
        document.getElementById('input-contenu-prescription').value = '';
    }

    // Marquer comme plus en édition
    state.isEditing = false;

    showToast("Édition annulée");
}

/**
 * Supprime un contenu
 */
export function deleteContent(index) {
    // Validation: vérifier que le titre existe
    if (!state.currentTitre) {
        showToast("Aucun titre sélectionné", "error");
        return;
    }

    // Validation: vérifier que le contenu existe
    if (!state.currentTitre.contenu || !state.currentTitre.contenu[index]) {
        showToast("Contenu introuvable", "error");
        return;
    }

    if (!confirm("Voulez-vous vraiment supprimer ce contenu ?")) return;

    // Capturer l'état avant suppression
    captureState("Suppression de contenu");

    state.currentTitre.contenu.splice(index, 1);
    renderContentList();
    showToast("Contenu supprimé");
}

/**
 * Sauvegarde le contenu
 */
export function saveContent() {
    if (!state.currentTitre) {
        showToast("Sélectionnez d'abord un titre", "error");
        return;
    }

    if (!state.editor) {
        showToast("L'éditeur n'est pas initialisé", "error");
        return;
    }

    // Capturer l'état avant modification
    captureState(state.currentContenu ? "Modification de contenu" : "Ajout de contenu");

    // Mettre à jour les propriétés du titre
    state.currentTitre.intitule = document.getElementById('input-intitule').value;
    state.currentTitre.niveau = parseInt(document.getElementById('input-niveau').value);
    state.currentTitre.idZone = document.getElementById('input-zone').value.split(',').map(s => s.trim()).filter(s => s);
    state.currentTitre.idPrescription = document.getElementById('input-prescription').value.split(',').map(s => s.trim()).filter(s => s);
    state.currentTitre.numero = document.getElementById('input-numero').value;

    // Récupérer les codes INSEE sélectionnés via les checkboxes
    const inseeCheckboxes = document.querySelectorAll('#input-insee-checkboxes input[type="checkbox"]:checked');
    state.currentTitre.inseeCommune = Array.from(inseeCheckboxes).map(cb => cb.value);

    // Validation: au moins un code INSEE doit être sélectionné
    if (state.currentTitre.inseeCommune.length === 0) {
        showToast("Au moins une commune doit être sélectionnée", "error");
        return;
    }

    // Récupérer les zones et prescriptions spécifiques du contenu
    const contenuZoneInput = document.getElementById('input-contenu-zone').value.trim();
    const contenuPrescriptionInput = document.getElementById('input-contenu-prescription').value.trim();

    // Si les champs sont vides, hériter du titre, sinon utiliser les valeurs spécifiques
    const contenuIdZone = contenuZoneInput 
        ? contenuZoneInput.split(',').map(s => s.trim()).filter(s => s)
        : state.currentTitre.idZone;
    const contenuIdPrescription = contenuPrescriptionInput
        ? contenuPrescriptionInput.split(',').map(s => s.trim()).filter(s => s)
        : state.currentTitre.idPrescription;

    // Obtenir le document TipTap et le diviser par séparateurs
    const fullDoc = state.editor.getJSON();
    const docParts = splitTipTapBySeparator(fullDoc);

    if (docParts.length === 0 || (docParts.length === 1 && (!docParts[0].content || docParts[0].content.length === 0))) {
        showToast("Le contenu est vide", "error");
        return;
    }

    // Déterminer l'index de départ pour les nouveaux contenus
    let startIndex;
    if (state.currentContenu) {
        // Édition d'un contenu existant - le remplacer
        const existingIndex = state.currentTitre.contenu.indexOf(state.currentContenu);
        
        // Supprimer l'ancien contenu en cours d'édition
        state.currentTitre.contenu.splice(existingIndex, 1);
        startIndex = existingIndex;
    } else {
        // Ajout de nouveau(x) contenu(s)
        if (!state.currentTitre.contenu) state.currentTitre.contenu = [];
        startIndex = state.currentTitre.contenu.length;
    }

    // Créer des éléments de contenu à partir de chaque partie
    const newContents = [];
    docParts.forEach((docPart, partIndex) => {
        const htmlArray = tiptapToHtmlArray(docPart);

        // Ignorer les parties vides
        if (htmlArray.length === 0) {
            return;
        }

        const contentNumber = String(startIndex + partIndex + 1).padStart(2, '0');
        const baseId = `${state.pluData.idReglement}/${state.currentTitre.idTitre.split('/').pop()}`;

        const newContenu = {
            idContenu: `${baseId}/contenu${contentNumber}`,
            idZone: contenuIdZone,  // Utiliser les valeurs spécifiques au contenu
            idPrescription: contenuIdPrescription,  // Utiliser les valeurs spécifiques au contenu
            html: htmlArray
        };

        newContents.push(newContenu);
    });

    // Insérer les nouveaux contenus à la bonne position
    state.currentTitre.contenu.splice(startIndex, 0, ...newContents);

    // Renuméroter tous les contenus pour assurer une numérotation séquentielle
    state.currentTitre.contenu.forEach((contenu, index) => {
        const contentNumber = String(index + 1).padStart(2, '0');
        const baseId = `${state.pluData.idReglement}/${state.currentTitre.idTitre.split('/').pop()}`;
        contenu.idContenu = `${baseId}/contenu${contentNumber}`;
    });

    setCurrentContenu(null);
    if (state.editor) {
        state.editor.commands.setContent('');
        document.getElementById('input-contenu-zone').value = '';
        document.getElementById('input-contenu-prescription').value = '';
    }

    // Cacher l'éditeur et revenir à la liste
    toggleDisplay('tiptap-editor-zone', false);
    toggleDisplay('content-preview', true);

    // Marquer comme plus en édition
    state.isEditing = false;

    renderTree();
    renderContentList();

    // Afficher le message toast approprié
    if (newContents.length > 1) {
        showToast(`${newContents.length} contenus créés avec succès !`);
    } else {
        showToast("Contenu enregistré avec succès !");
    }
}

/**
 * Sauvegarde uniquement les métadonnées du titre (sans contenu)
 */
export function saveTitreMetadata() {
    if (!state.currentTitre) {
        showToast("Sélectionnez d'abord un titre", "error");
        return;
    }

    // Capturer l'état avant modification
    captureState("Modification des métadonnées du titre");

    // Mettre à jour les propriétés du titre
    state.currentTitre.intitule = document.getElementById('input-intitule').value;
    state.currentTitre.niveau = parseInt(document.getElementById('input-niveau').value);
    state.currentTitre.idZone = document.getElementById('input-zone').value.split(',').map(s => s.trim()).filter(s => s);
    state.currentTitre.idPrescription = document.getElementById('input-prescription').value.split(',').map(s => s.trim()).filter(s => s);
    state.currentTitre.numero = document.getElementById('input-numero').value;

    // Récupérer les codes INSEE sélectionnés via les checkboxes
    const inseeCheckboxes = document.querySelectorAll('#input-insee-checkboxes input[type="checkbox"]:checked');
    state.currentTitre.inseeCommune = Array.from(inseeCheckboxes).map(cb => cb.value);

    // Validation: au moins un code INSEE doit être sélectionné
    if (state.currentTitre.inseeCommune.length === 0) {
        showToast("Au moins une commune doit être sélectionnée", "error");
        return;
    }

    // Mettre à jour l'affichage de l'en-tête
    document.getElementById('section-title').textContent = state.currentTitre.intitule || 'Sans titre';

    // Rafraîchir l'arbre pour refléter les changements
    renderTree();

    showToast("Métadonnées du titre enregistrées !");
}

/**
 * Configure les gestionnaires d'événements pour l'éditeur
 */
export function setupEditorEventHandlers() {
    // Bouton de sauvegarde des métadonnées du titre
    const saveTitreBtn = document.querySelector('[data-action="save-titre-metadata"]');
    if (saveTitreBtn) {
        saveTitreBtn.addEventListener('click', saveTitreMetadata);
    }

    // Bouton d'ajout de contenu
    const addContentBtn = document.querySelector('[data-action="add-content"]');
    if (addContentBtn) {
        addContentBtn.addEventListener('click', addContent);
    }

    // Bouton de sauvegarde du contenu
    const saveBtn = document.querySelector('[data-action="save-content"]');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveContent);
    }
    
    // Bouton d'annulation
    const cancelBtn = document.querySelector('[data-action="cancel-edit"]');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEditContent);
    }
    
    // Gestion des actions sur les contenus
    const contentList = document.getElementById('content-list');
    contentList.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const index = parseInt(target.dataset.index);
        
        if (action === 'edit-content') {
            editContent(index);
        } else if (action === 'delete-content') {
            deleteContent(index);
        }
    });
}