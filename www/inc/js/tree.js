/**
 * Module de gestion de l'arborescence des titres
 */

import { state, setFlatTitles, setCurrentTitre } from './state.js';
import { showToast, showModal, closeModal } from './ui.js';
import { selectTitre, saveContent, cancelEditContent } from './editor.js';
import { captureState } from './history.js';

let pendingParentIndex = null;
let draggedItemIndex = null;

// Track which nodes are expanded (using idTitre as key)
const expandedNodes = new Set();

/**
 * Aplatit l'arbre des titres pour un accès facile
 */
function flattenTitres(titres, parentPath = []) {
    const flat = [];
    titres.forEach((titre, index) => {
        const path = [...parentPath, index];
        flat.push({ titre, path });
        if (titre.titre && titre.titre.length > 0) {
            flat.push(...flattenTitres(titre.titre, path));
        }
    });
    return flat;
}

/**
 * Configure les gestionnaires de drag and drop pour l'arbre
 */
function setupDragAndDrop() {
    const treeItems = document.querySelectorAll('.tree-item');

    treeItems.forEach(item => {
        // Drag start
        item.addEventListener('dragstart', (e) => {
            draggedItemIndex = parseInt(e.target.dataset.index);
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.innerHTML);
        });

        // Drag end
        item.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            // Retirer tous les indicateurs de drop zone
            document.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });
        });

        // Drag over
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const targetIndex = parseInt(e.target.closest('.tree-item').dataset.index);

            // Ne pas permettre de se déposer sur soi-même
            if (targetIndex === draggedItemIndex) {
                return;
            }

            // Ajouter une classe visuelle pour la drop zone
            e.target.closest('.tree-item').classList.add('drop-target');
        });

        // Drag leave
        item.addEventListener('dragleave', (e) => {
            e.target.closest('.tree-item')?.classList.remove('drop-target');
        });

        // Drop
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const targetIndex = parseInt(e.target.closest('.tree-item').dataset.index);

            // Ne rien faire si on drop sur soi-même
            if (targetIndex === draggedItemIndex) {
                return;
            }

            // Vérifier si l'éditeur est actif
            if (state.isEditing) {
                showToast("Veuillez sauvegarder ou annuler vos modifications avant de réorganiser", "error");
                return;
            }

            // Effectuer le déplacement
            moveTitre(draggedItemIndex, targetIndex);

            // Retirer l'indicateur de drop
            e.target.closest('.tree-item').classList.remove('drop-target');
        });
    });
}

/**
 * Déplace un titre d'une position à une autre
 */
function moveTitre(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    captureState("Déplacement de titre");

    const draggedItem = state.flatTitles[fromIndex];
    const targetItem = state.flatTitles[toIndex];

    if (!draggedItem || !targetItem) {
        showToast("Erreur lors du déplacement", "error");
        return;
    }

    // Obtenir les tableaux parents
    const draggedParentPath = draggedItem.path.slice(0, -1);
    const draggedIndexInParent = draggedItem.path[draggedItem.path.length - 1];

    const targetParentPath = targetItem.path.slice(0, -1);
    const targetIndexInParent = targetItem.path[targetItem.path.length - 1];

    // Obtenir le tableau parent du titre déplacé
    let draggedParentArray = state.pluData.titre;
    for (const idx of draggedParentPath) {
        draggedParentArray = draggedParentArray[idx].titre;
    }

    // Obtenir le tableau parent de la cible
    let targetParentArray = state.pluData.titre;
    for (const idx of targetParentPath) {
        targetParentArray = targetParentArray[idx].titre;
    }

    // Retirer l'élément de sa position actuelle
    const [movedTitre] = draggedParentArray.splice(draggedIndexInParent, 1);

    // Si on déplace vers le même parent
    if (JSON.stringify(draggedParentPath) === JSON.stringify(targetParentPath)) {
        // Ajuster l'index cible si nécessaire
        let adjustedTargetIndex = targetIndexInParent;
        if (draggedIndexInParent < targetIndexInParent) {
            adjustedTargetIndex--;
        }
        targetParentArray.splice(adjustedTargetIndex + 1, 0, movedTitre);
    } else {
        // Déplacer vers un autre parent - insérer après la cible
        targetParentArray.splice(targetIndexInParent + 1, 0, movedTitre);
    }

    // Re-rendre l'arbre
    renderTree();
    showToast("Titre déplacé avec succès !");
}

/**
 * Rend l'arbre des titres dans la sidebar
 */
export function renderTree() {
    const tree = document.getElementById('tree');
    tree.innerHTML = '';

    if (!state.pluData || !state.pluData.titre || state.pluData.titre.length === 0) {
        tree.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <p>Aucun titre défini</p>
                <button class="btn btn-primary" data-action="add-root-title">➕ Ajouter un titre</button>
            </div>
        `;
        return;
    }

    // Aplatir l'arbre pour un accès facile
    const flatTitles = flattenTitres(state.pluData.titre);
    setFlatTitles(flatTitles);

    // Rendre l'arbre aplati avec support collapse/expand
    flatTitles.forEach((item, flatIndex) => {
        const { titre, path } = item;
        const niveau = titre.niveau || 1;

        // Check if parent is collapsed - if so, skip rendering this item
        if (path.length > 1) {
            // Get parent path
            const parentPath = path.slice(0, -1);
            const parentItem = flatTitles.find(ft =>
                ft.path.length === parentPath.length &&
                ft.path.every((val, idx) => val === parentPath[idx])
            );
            if (parentItem && !expandedNodes.has(parentItem.titre.idTitre)) {
                return; // Skip rendering - parent is collapsed
            }
        }

        const treeItem = document.createElement('div');
        treeItem.className = `tree-item tree-item-level-${niveau}`;
        treeItem.dataset.index = flatIndex;
        treeItem.dataset.titreId = titre.idTitre;

        // Rendre les items draggables
        treeItem.draggable = true;

        // Check if this node has children
        const hasChildren = titre.titre && titre.titre.length > 0;
        const isExpanded = expandedNodes.has(titre.idTitre);

        // Expand/collapse button if has children
        let expandBtn = '';
        if (hasChildren) {
            const expandIcon = isExpanded ? '▼' : '▶';
            expandBtn = `<button class="tree-expand-btn" data-action="toggle-expand" data-index="${flatIndex}" data-titre-id="${titre.idTitre}">${expandIcon}</button>`;
        }

        // Choisir l'icône selon le niveau
        const icons = ['📂', '📄', '📄', '📄', '📄', '📄'];
        const icon = icons[niveau - 1] || '📄';

        treeItem.innerHTML = `
            ${expandBtn}
            <span class="tree-item-icon">${icon}</span>
            <span class="tree-item-text">${titre.intitule || 'Sans titre'}</span>
            <div class="tree-item-actions">
                <button class="tree-item-btn" data-action="add-sub-title" data-index="${flatIndex}">➕</button>
                <button class="tree-item-btn" data-action="delete-title" data-index="${flatIndex}">❌</button>
            </div>
        `;

        tree.appendChild(treeItem);
    });

    // Bouton pour ajouter un titre racine
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.style.margin = '10px';
    addBtn.textContent = '➕ Ajouter un titre racine';
    addBtn.dataset.action = 'add-root-title';
    tree.appendChild(addBtn);

    // Configurer les gestionnaires de drag and drop
    setupDragAndDrop();
}

/**
 * Toggle expand/collapse state for a node
 */
function toggleNodeExpand(titreId) {
    if (expandedNodes.has(titreId)) {
        expandedNodes.delete(titreId);
    } else {
        expandedNodes.add(titreId);
    }
    renderTree();
}

/**
 * Expand all parent nodes up to a specific node (for navigation)
 */
function expandParentsOfNode(flatIndex) {
    if (!state.flatTitles[flatIndex]) return;

    const { path } = state.flatTitles[flatIndex];

    // Expand all parents
    for (let i = 0; i < path.length - 1; i++) {
        const parentPath = path.slice(0, i + 1);
        const parentItem = state.flatTitles.find(ft =>
            ft.path.length === parentPath.length &&
            ft.path.every((val, idx) => val === parentPath[idx])
        );
        if (parentItem) {
            expandedNodes.add(parentItem.titre.idTitre);
        }
    }
}

/**
 * Affiche le modal de création de nouveau titre
 */
export function showNewTitleModal(parentIndex = null) {
    pendingParentIndex = parentIndex;
    
    // Définir le niveau par défaut en fonction du parent
    if (parentIndex !== null && state.flatTitles[parentIndex]) {
        const parentNiveau = state.flatTitles[parentIndex].titre.niveau || 1;
        document.getElementById('modal-niveau').value = Math.min(parentNiveau + 1, 6);
    } else {
        document.getElementById('modal-niveau').value = '1';
    }
    
    showModal('newTitleModal');
}

/**
 * Confirme la création d'un nouveau titre
 */
export function confirmNewTitle() {
    const intitule = document.getElementById('modal-intitule').value;
    const niveau = parseInt(document.getElementById('modal-niveau').value);

    if (!intitule) {
        showToast("L'intitulé est requis", "error");
        return;
    }

    // Capturer l'état avant création
    captureState("Création de titre");

    // Déterminer l'emplacement parent
    let parentTitreArray;
    let parentIdReglement;
    
    if (pendingParentIndex !== null && state.flatTitles[pendingParentIndex]) {
        // Ajout comme enfant du titre sélectionné
        const parent = state.flatTitles[pendingParentIndex].titre;
        if (!parent.titre) parent.titre = [];
        parentTitreArray = parent.titre;
        parentIdReglement = parent.idTitre;
    } else {
        // Ajout comme titre racine
        parentTitreArray = state.pluData.titre;
        parentIdReglement = state.pluData.idReglement;
    }

    // Générer un ID unique
    const titleCount = parentTitreArray.length + 1;
    const idSuffix = intitule.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 20);
    const idTitre = `${parentIdReglement}/${idSuffix}_${titleCount}`;

    const newTitre = {
        idTitre: idTitre,
        intitule: intitule,
        niveau: niveau,
        numero: "",
        idZone: ["porteeGenerale"],
        idPrescription: ["nonConcerne"],
        inseeCommune: state.pluData.inseeCommune || [],
        contenu: [],
        titre: []
    };

    parentTitreArray.push(newTitre);

    // Auto-expand parent if adding a sub-title
    if (pendingParentIndex !== null && state.flatTitles[pendingParentIndex]) {
        const parent = state.flatTitles[pendingParentIndex].titre;
        expandedNodes.add(parent.idTitre);
    }

    renderTree();
    closeModal('newTitleModal');

    // Réinitialiser le modal
    document.getElementById('modal-intitule').value = '';
    document.getElementById('modal-niveau').value = '1';
    pendingParentIndex = null;

    showToast("Titre créé avec succès !");
}

/**
 * Supprime un titre
 */
export function deleteTitre(flatIndex) {
    // Validation: vérifier que le PLU existe
    if (!state.pluData || !state.pluData.titre) {
        showToast("Aucun PLU chargé", "error");
        return;
    }

    // Validation: vérifier que l'index est valide
    if (flatIndex == null || flatIndex < 0 || flatIndex >= state.flatTitles.length) {
        showToast("Index de titre invalide", "error");
        return;
    }

    // Validation: vérifier que le titre existe
    const flatTitle = state.flatTitles[flatIndex];
    if (!flatTitle || !flatTitle.path) {
        showToast("Titre introuvable", "error");
        return;
    }

    if (!confirm("Voulez-vous vraiment supprimer ce titre et tout son contenu ?")) return;

    // Capturer l'état avant suppression
    captureState("Suppression de titre");

    const { path } = flatTitle;

    // Naviguer vers le tableau parent et supprimer l'élément
    let current = state.pluData.titre;
    for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]] || !current[path[i]].titre) {
            showToast("Erreur: structure de titre invalide", "error");
            return;
        }
        current = current[path[i]].titre;
    }
    current.splice(path[path.length - 1], 1);

    renderTree();

    // Masquer l'éditeur
    document.getElementById('editor-header').style.display = 'none';
    document.getElementById('welcome-screen').style.display = 'block';
    document.getElementById('editor-screen').style.display = 'none';

    showToast("Titre supprimé");
}

/**
 * Génère un ID pour un titre
 */
export function generateTitleId(baseId, intitule, index) {
    const slug = intitule.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 20);
    return `${baseId}/${slug}_${index}`;
}

/**
 * Demande à l'utilisateur s'il veut sauvegarder avant de changer de titre
 * @returns {Promise<boolean>} - True si on peut continuer, false sinon
 */
async function askSaveBeforeSwitch() {
    return new Promise((resolve) => {
        const choice = confirm(
            "Vous avez des modifications non sauvegardées.\n\n" +
            "Cliquez sur OK pour SAUVEGARDER et continuer.\n" +
            "Cliquez sur Annuler pour ABANDONNER les modifications."
        );

        if (choice) {
            // L'utilisateur veut sauvegarder
            try {
                saveContent();
                resolve(true);
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                showToast("Erreur lors de la sauvegarde", "error");
                resolve(false);
            }
        } else {
            // L'utilisateur veut abandonner les modifications
            cancelEditContent();
            resolve(true);
        }
    });
}

/**
 * Configure les gestionnaires d'évènements pour l'arborescence
 */
export function setupTreeEventHandlers() {
    const tree = document.getElementById('tree');

    tree.addEventListener('click', async (e) => {
        const target = e.target;
        const action = target.dataset.action;

        if (action === 'toggle-expand') {
            // Toggle expand/collapse
            const titreId = target.dataset.titreId;
            if (titreId) {
                toggleNodeExpand(titreId);
            }
            e.stopPropagation();
        } else if (action === 'add-root-title') {
            // Vérifier si l'éditeur est actif
            if (state.isEditing) {
                const canProceed = await askSaveBeforeSwitch();
                if (!canProceed) return;
            }
            showNewTitleModal(null);
        } else if (action === 'add-sub-title') {
            // Vérifier si l'éditeur est actif
            if (state.isEditing) {
                const canProceed = await askSaveBeforeSwitch();
                if (!canProceed) return;
            }
            const index = parseInt(target.dataset.index);
            showNewTitleModal(index);
            e.stopPropagation();
        } else if (action === 'delete-title') {
            // Vérifier si l'éditeur est actif
            if (state.isEditing) {
                const canProceed = await askSaveBeforeSwitch();
                if (!canProceed) return;
            }
            const index = parseInt(target.dataset.index);
            deleteTitre(index);
            e.stopPropagation();
        } else if (target.closest('.tree-item') && !target.closest('.tree-item-btn') && !target.closest('.tree-expand-btn')) {
            // Clic sur un élément de l'arbre (pas sur un bouton)
            const treeItem = target.closest('.tree-item');
            const index = parseInt(treeItem.dataset.index);
            if (!isNaN(index)) {
                // Vérifier si l'éditeur est actif
                if (state.isEditing) {
                    const canProceed = await askSaveBeforeSwitch();
                    if (!canProceed) return;
                }
                // Expand parents if needed (for navigation)
                expandParentsOfNode(index);
                selectTitre(index);
            }
        }
    });
}
