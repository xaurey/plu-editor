/**
 * Point d'entrée principal de l'application PLU Editor
 */

import { Editor } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import { Image } from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import { Table } from 'https://esm.sh/@tiptap/extension-table@2.1.13';
import { TableRow } from 'https://esm.sh/@tiptap/extension-table-row@2.1.13';
import { TableCell } from 'https://esm.sh/@tiptap/extension-table-cell@2.1.13';
import { TableHeader } from 'https://esm.sh/@tiptap/extension-table-header@2.1.13';

import { initTipTap } from './state.js';
import { setupModalClickOutside } from './ui.js';
import { setupTreeEventHandlers, confirmNewTitle } from './tree.js';
import { setupEditorEventHandlers } from './editor.js';
import { setupMetadataEventHandlers } from './metadata.js';
import { setupStorageEventHandlers } from './storage.js';
import { closeModal } from './ui.js';
import { initAutosave } from './autosave.js';
import { initHistory } from './history.js';

/**
 * Initialise l'application au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    // Configurer les gestionnaires d'événements (sans initialiser TipTap)
    setupModalClickOutside();
    setupTreeEventHandlers();
    setupEditorEventHandlers();
    setupMetadataEventHandlers();
    setupStorageEventHandlers();

    // Configurer les boutons des modaux (fermeture et confirmation)
    setupModalButtons();

    // Initialiser l'autosave et l'historique
    initAutosave();
    initHistory();

    // Hide loading indicator - app successfully loaded
    const cdnStatus = document.getElementById('cdn-status');
    if (cdnStatus) {
        cdnStatus.classList.add('cdn-status-hidden');
    }
});

/**
 * Détruit l'instance TipTap pour libérer la mémoire
 */
export function destroyTipTap() {
    if (window.editorInstance) {
        try {
            window.editorInstance.destroy();
        } catch (error) {
            console.error('Erreur lors de la destruction de TipTap:', error);
        }
        window.editorInstance = null;
    }
}

/**
 * Initialise TipTap à la demande (lazy loading)
 */
export function initializeTipTapIfNeeded() {
    // Si TipTap est déjà initialisé, ne rien faire
    if (window.editorInstance) {
        return window.editorInstance;
    }

    // Créer la toolbar personnalisée
    createCustomToolbar();
    
    // Initialiser l'éditeur TipTap avec toutes les extensions
    const editor = new Editor({
        element: document.querySelector('#editor'),
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4, 5, 6]
                },
                horizontalRule: false
            }),
            Image.configure({
                inline: false,
                HTMLAttributes: {
                    class: 'editor-image'
                }
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'tiptap'
            }
        },
        onUpdate: () => {
            updateToolbarState();
        },
        onSelectionUpdate: () => {
            updateToolbarState();
        }
    });
    
    initTipTap(editor);

    // Exposer l'éditeur globalement
    window.editorInstance = editor;

    return editor;
}

/**
 * Crée la toolbar personnalisée pour TipTap
 */
function createCustomToolbar() {
    const toolbar = document.getElementById('editor-toolbar');
    
    const buttons = [
        { label: 'H1', action: 'heading', level: 1 },
        { label: 'H2', action: 'heading', level: 2 },
        { label: 'H3', action: 'heading', level: 3 },
        { label: 'H4', action: 'heading', level: 4 },
        { label: 'H5', action: 'heading', level: 5 },
        { label: 'H6', action: 'heading', level: 6 },
        { type: 'separator' },
        { label: 'Gras', icon: 'B', action: 'bold' },
        { label: 'Italique', icon: 'I', action: 'italic' },
        { label: 'Souligné', icon: 'U', action: 'underline' },
        { type: 'separator' },
        { label: 'Liste à puces', icon: '•', action: 'bulletList' },
        { label: 'Liste numérotée', icon: '1.', action: 'orderedList' },
        { type: 'separator' },
        { label: 'Lien', icon: '🔗', action: 'link' },
        { label: 'Image', icon: '🖼️', action: 'image' },
        { type: 'separator' },
        { label: 'Tableau', icon: '⊞', action: 'table' },
        { label: 'Ajouter ligne', icon: '➕↓', action: 'addRowAfter' },
        { label: 'Ajouter colonne', icon: '➕→', action: 'addColumnAfter' },
        { label: 'Supprimer ligne', icon: '✕↓', action: 'deleteRow' },
        { label: 'Supprimer colonne', icon: '✕→', action: 'deleteColumn' }
    ];
    
    buttons.forEach(btn => {
        if (btn.type === 'separator') {
            const sep = document.createElement('div');
            sep.className = 'separator';
            toolbar.appendChild(sep);
        } else {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = btn.icon || btn.label;
            button.title = btn.label;
            button.dataset.action = btn.action;
            
            if (btn.level) {
                button.dataset.level = btn.level;
            }
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                handleToolbarAction(btn.action, btn.level);
            });
            
            toolbar.appendChild(button);
        }
    });
}

/**
 * Gère les actions de la toolbar
 */
function handleToolbarAction(action, level) {
    const editor = window.editorInstance;
    if (!editor) return;
    
    switch (action) {
        case 'heading':
            editor.chain().focus().toggleHeading({ level }).run();
            break;
        
        case 'bold':
            editor.chain().focus().toggleBold().run();
            break;
        
        case 'italic':
            editor.chain().focus().toggleItalic().run();
            break;
        
        case 'underline':
            editor.chain().focus().toggleUnderline().run();
            break;
        
        case 'bulletList':
            editor.chain().focus().toggleBulletList().run();
            break;
        
        case 'orderedList':
            editor.chain().focus().toggleOrderedList().run();
            break;
        
        case 'link':
            const url = prompt('URL du lien:');
            if (url) {
                editor.chain().focus().setLink({ href: url }).run();
            }
            break;
        
        case 'image':
            const src = prompt('URL de l\'image:');
            if (src) {
                editor.chain().focus().setImage({ src }).run();
            }
            break;
        
        case 'table':
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            break;
        
        case 'addRowAfter':
            editor.chain().focus().addRowAfter().run();
            break;
        
        case 'addColumnAfter':
            editor.chain().focus().addColumnAfter().run();
            break;
        
        case 'deleteRow':
            editor.chain().focus().deleteRow().run();
            break;
        
        case 'deleteColumn':
            editor.chain().focus().deleteColumn().run();
            break;
    }
    
    updateToolbarState();
}

/**
 * Met à jour l'état de la toolbar (boutons actifs)
 */
function updateToolbarState() {
    const editor = window.editorInstance;
    if (!editor) return;
    
    const toolbar = document.getElementById('editor-toolbar');
    const buttons = toolbar.querySelectorAll('button');
    
    buttons.forEach(button => {
        const action = button.dataset.action;
        const level = button.dataset.level;
        
        button.classList.remove('is-active');
        
        if (action === 'heading' && level) {
            if (editor.isActive('heading', { level: parseInt(level) })) {
                button.classList.add('is-active');
            }
        } else if (action === 'bold' && editor.isActive('bold')) {
            button.classList.add('is-active');
        } else if (action === 'italic' && editor.isActive('italic')) {
            button.classList.add('is-active');
        } else if (action === 'underline' && editor.isActive('underline')) {
            button.classList.add('is-active');
        } else if (action === 'bulletList' && editor.isActive('bulletList')) {
            button.classList.add('is-active');
        } else if (action === 'orderedList' && editor.isActive('orderedList')) {
            button.classList.add('is-active');
        } else if (action === 'link' && editor.isActive('link')) {
            button.classList.add('is-active');
        }
        
        // Désactiver les boutons de tableau si on n'est pas dans un tableau
        if (['addRowAfter', 'addColumnAfter', 'deleteRow', 'deleteColumn'].includes(action)) {
            button.disabled = !editor.isActive('table');
        }
    });
}

/**
 * Configure les boutons spécifiques des modaux
 */
function setupModalButtons() {
    // Modal nouveau titre
    const confirmTitleBtn = document.querySelector('[data-action="confirm-new-title"]');
    if (confirmTitleBtn) {
        confirmTitleBtn.addEventListener('click', confirmNewTitle);
    }
    
    const cancelTitleBtn = document.querySelector('[data-action="cancel-new-title"]');
    if (cancelTitleBtn) {
        cancelTitleBtn.addEventListener('click', () => closeModal('newTitleModal'));
    }
}

