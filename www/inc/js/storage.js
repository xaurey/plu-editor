/**
 * Module de gestion du stockage (import/export de fichiers)
 */

import { state, setPluData } from './state.js';
import { showToast, handleError } from './ui.js';
import { renderTree, generateTitleId } from './tree.js';
import { destroyTipTap } from './main.js';
import { startAutosave, clearAutosave, manualSave } from './autosave.js';
import { clearHistory } from './history.js';
import { storeImage, listPluImages, base64ToBlob, getImageDataUrl } from './images.js';

/**
 * Créer un nouveau PLU
 */
export function createNewPLU() {
    const insee = prompt("Code INSEE de la commune (5 chiffres) :");
    if (!insee || insee.length !== 5) {
        showToast("Code INSEE invalide", "error");
        return;
    }

    // Détruire l'instance TipTap existante pour éviter les fuites mémoire
    destroyTipTap();

    // Réinitialiser l'historique
    clearHistory();

    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const idUrba = `${insee}_PLU_${date}`;

    const pluData = {
        idReglement: `${idUrba}/reglement`,
        nom: `Règlement du Plan Local d'Urbanisme`,
        typeDoc: "PLU",
        lien: "https://www.geoportail-urbanisme.gouv.fr/",
        idUrba: idUrba,
        inseeCommune: [insee],
        titre: []
    };

    setPluData(pluData);
    renderTree();

    // Démarrer l'autosave pour le nouveau PLU
    startAutosave();

    showToast("Nouveau PLU créé avec succès !");
}

/**
 * Charge un PLU depuis un fichier JSON
 */
export async function loadPLU(file) {
    try {
        if (!file) {
            throw new Error("Aucun fichier sélectionné");
        }

        if (!file.name.endsWith('.json')) {
            throw new Error("Le fichier doit être au format JSON");
        }

        const text = await file.text();

        if (!text || text.trim() === '') {
            throw new Error("Le fichier est vide");
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            throw new Error("Le fichier JSON est mal formé");
        }

        // Validation basique de la structure
        if (!data.idReglement || !data.nom || !data.typeDoc) {
            throw new Error("Le fichier JSON ne contient pas les champs requis (idReglement, nom, typeDoc)");
        }

        // Détruire l'instance TipTap existante pour éviter les fuites mémoire
        destroyTipTap();

        // Réinitialiser l'historique
        clearHistory();

        setPluData(data);
        renderTree();

        // Démarrer l'autosave pour le PLU chargé
        startAutosave();

        showToast("PLU chargé avec succès !");
    } catch (error) {
        handleError(error, "chargement du fichier JSON");
    }
}

/**
 * Ajoute l'intitulé comme premier contenu à chaque titre
 * @param {Object} titre - Titre à traiter
 * @param {string} baseId - ID de base pour générer les IDs de contenu
 */
function addIntituleAsFirstContent(titre, baseId) {
    // Créer un contenu avec l'intitulé comme heading
    const headingContent = {
        idContenu: `${baseId}/contenu00`,
        idZone: titre.idZone || ["porteeGenerale"],
        idPrescription: titre.idPrescription || ["nonConcerne"],
        html: [
            {
                tag: `h${titre.niveau}`,
                text: titre.intitule
            }
        ]
    };

    // Vérifier si le premier contenu existe déjà et contient l'intitulé
    if (titre.contenu && titre.contenu.length > 0) {
        const firstContent = titre.contenu[0];
        const hasIntitule = firstContent.html &&
            firstContent.html.length > 0 &&
            firstContent.html[0].tag === `h${titre.niveau}` &&
            firstContent.html[0].text === titre.intitule;

        if (!hasIntitule) {
            // Insérer le nouveau contenu au début
            titre.contenu.unshift(headingContent);

            // Renuméroter tous les contenus
            titre.contenu.forEach((contenu, index) => {
                const contentNumber = String(index + 1).padStart(2, '0');
                const titreIdPart = titre.idTitre.split('/').pop();
                contenu.idContenu = `${baseId}/${titreIdPart}/contenu${contentNumber}`;
            });
        }
    } else {
        // Aucun contenu existant, créer le tableau avec l'intitulé
        titre.contenu = [headingContent];
    }

    // Traiter récursivement les sous-titres
    if (titre.titre && titre.titre.length > 0) {
        titre.titre.forEach(sousTitre => {
            addIntituleAsFirstContent(sousTitre, baseId);
        });
    }
}

/**
 * Exporte le PLU en ZIP (JSON + images)
 */
export async function exportPLU() {
    try {
        if (!state.pluData) {
            throw new Error("Aucun PLU à exporter");
        }

        showToast("Préparation de l'export...");

        // Créer une copie profonde du PLU pour ne pas modifier l'original
        const pluDataCopy = JSON.parse(JSON.stringify(state.pluData));

        // Ajouter l'intitulé comme premier contenu à chaque titre
        if (pluDataCopy.titre && pluDataCopy.titre.length > 0) {
            pluDataCopy.titre.forEach(titre => {
                addIntituleAsFirstContent(titre, pluDataCopy.idReglement);
            });
        }

        // Créer un fichier ZIP
        const zip = new JSZip();

        // Ajouter le fichier JSON (avec les intitulés ajoutés)
        const json = JSON.stringify(pluDataCopy, null, 2);
        zip.file(`${pluDataCopy.idUrba}.json`, json);

        // Récupérer toutes les images du PLU depuis localStorage
        const images = listPluImages(state.pluData.idUrba);

        if (images.length > 0) {
            // Créer le dossier ressources
            const ressourcesFolder = zip.folder("ressources");

            // Ajouter chaque image au dossier ressources
            images.forEach(imageData => {
                const blob = base64ToBlob(imageData.base64, imageData.contentType);
                ressourcesFolder.file(imageData.filename, blob);
            });

            showToast(`Export en cours... (${images.length} image(s))`);
        }

        // Générer le ZIP
        const zipBlob = await zip.generateAsync({ type: "blob" });

        // Télécharger le ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.pluData.idUrba || 'plu'}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Effacer l'autosave après un export manuel réussi
        clearAutosave();

        if (images.length > 0) {
            showToast(`PLU exporté avec succès ! (JSON + ${images.length} image(s))`);
        } else {
            showToast("PLU exporté avec succès !");
        }
    } catch (error) {
        handleError(error, "exportation du PLU");
    }
}

/**
 * Importe un fichier DOCX
 */
export async function importDOCX(file) {
    try {
        if (!file) {
            throw new Error("Aucun fichier sélectionné");
        }

        if (!file.name.endsWith('.docx')) {
            throw new Error("Le fichier doit être au format DOCX");
        }

        showToast("Traitement du fichier DOCX en cours...");

        const arrayBuffer = await file.arrayBuffer();

        // Initialiser le stockage temporaire pour les images
        window.docxImages = [];

        // Options pour mammoth avec support images et formatage
        const options = {
            convertImage: mammoth.images.imgElement(function(image) {
                return image.read("base64").then(function(imageBuffer) {
                    const imageData = {
                        buffer: imageBuffer,
                        contentType: image.contentType,
                        filename: `image_${window.docxImages.length + 1}.${getExtensionFromContentType(image.contentType)}`
                    };
                    window.docxImages.push(imageData);

                    return {
                        src: `ressources/${imageData.filename}`,
                        alt: `Image ${window.docxImages.length}`
                    };
                });
            }),
            styleMap: [
                "b => strong",
                "i => em",
                "u => u"
            ]
        };

        const result = await mammoth.convertToHtml({arrayBuffer: arrayBuffer}, options);

        // Parser le HTML et obtenir le PLU data (qui contient l'idUrba)
        const pluData = parseDOCXHTML(result.value);

        // Stocker les images dans localStorage avec l'idUrba du PLU
        if (window.docxImages && window.docxImages.length > 0) {
            console.log('Stockage de', window.docxImages.length, 'image(s)');
            window.docxImages.forEach(imageData => {
                try {
                    console.log('Stockage de l\'image:', imageData.filename, 'pour le PLU', pluData.idUrba);
                    storeImage(pluData.idUrba, imageData.filename, imageData.buffer, imageData.contentType);
                } catch (error) {
                    console.error(`Erreur lors du stockage de ${imageData.filename}:`, error);
                }
            });

            // Vérifier que les images sont bien stockées
            const storedImages = listPluImages(pluData.idUrba);
            console.log('Images stockées dans localStorage:', storedImages.length, storedImages);

            showToast(`DOCX importé avec succès ! ${window.docxImages.length} image(s) stockée(s)`);
        } else {
            showToast("DOCX importé avec succès !");
        }

        // Nettoyer
        delete window.docxImages;
    } catch (error) {
        handleError(error, "importation du DOCX");
    }
}

/**
 * Obtient l'extension depuis le type de contenu
 */
function getExtensionFromContentType(contentType) {
    const types = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/bmp': 'bmp'
    };
    return types[contentType] || 'png';
}

/**
 * Parse le contenu HTML du DOCX
 */
function parseDOCXHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extraire les métadonnées du début
    const metadata = {};
    const nodes = Array.from(tempDiv.childNodes);
    let contentStartIndex = 0;
    
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.nodeType === 1) {
            const text = node.textContent.trim();
            if (text.startsWith('#')) {
                const match = text.match(/^#(\w+)\s+(.+)$/);
                if (match) {
                    metadata[match[1]] = match[2].trim();
                    contentStartIndex = i + 1;
                }
            } else if (text) {
                break;
            }
        }
    }

    // Validation préliminaire : vérifier si #nom existe (indicateur que le template est suivi)
    if (!metadata.nom) {
        throw new Error("Le docx ne respecte pas le modèle pour pouvoir être importé");
    }

    // Valider les autres métadonnées critiques
    if (!metadata.idUrba) {
        throw new Error("Le docx ne respecte pas le modèle pour pouvoir être importé");
    }
    if (!metadata.typeDoc) {
        throw new Error("Le docx ne respecte pas le modèle pour pouvoir être importé");
    }

    // Parser les codes INSEE (optionnel - peut être ajouté via l'éditeur de métadonnées)
    let inseeCommune = metadata.inseeCommune
        ? metadata.inseeCommune.split(',').map(s => s.trim()).filter(s => s)
        : [];

    // Si aucun code INSEE n'est fourni, utiliser un placeholder que l'utilisateur devra modifier
    if (inseeCommune.length === 0) {
        inseeCommune = ["00000"]; // Placeholder à remplacer via l'éditeur de métadonnées
    }

    // Créer la structure PLU
    const pluData = {
        idReglement: metadata.idReglement || `${metadata.idUrba}/reglement`,
        nom: metadata.nom,
        typeDoc: metadata.typeDoc,
        lien: metadata.lien || "https://www.geoportail-urbanisme.gouv.fr/",
        idUrba: metadata.idUrba,
        inseeCommune: inseeCommune,
        titre: []
    };

    if (metadata.sirenEpci) {
        pluData.sirenEpci = metadata.sirenEpci;
    }

    // Parser le contenu depuis le HTML
    const contentNodes = nodes.slice(contentStartIndex);
    parseTitlesFromHTMLNodes(contentNodes, pluData.titre, pluData, 1);

    setPluData(pluData);
    renderTree();

    // Démarrer l'autosave pour le PLU importé depuis DOCX
    startAutosave();

    // Retourner le pluData pour utilisation (stockage d'images, etc.)
    return pluData;
}

/**
 * Parse les titres depuis les nÅ“uds HTML
 */
function parseTitlesFromHTMLNodes(nodes, targetArray, pluDataRef, currentLevel) {
    let i = 0;
    
    while (i < nodes.length) {
        const node = nodes[i];
        
        if (node.nodeType !== 1) {
            i++;
            continue;
        }
        
        const tagName = node.tagName.toLowerCase();
        
        // Détecter le niveau de titre
        let headingLevel = 0;
        let headingText = '';
        
        if (tagName.match(/^h[1-6]$/)) {
            headingLevel = parseInt(tagName.substring(1));
            headingText = node.textContent.trim();
        }

        if (headingLevel > 0) {
            if (headingLevel === currentLevel) {
                // Collecter TOUT le contenu jusqu'au prochain titre du même niveau ou supérieur
                const allContentNodes = [];
                let j = i + 1;
                
                while (j < nodes.length) {
                    const nextNode = nodes[j];
                    if (nextNode.nodeType === 1) {
                        const nextTag = nextNode.tagName.toLowerCase();
                        const nextLevel = nextTag.match(/^h([1-6])$/) ? parseInt(nextTag.substring(1)) : 0;
                        
                        if (nextLevel > 0 && nextLevel <= currentLevel) {
                            break;
                        }
                    }
                    
                    allContentNodes.push(nextNode);
                    j++;
                }

                // Créer le titre
                const titleId = generateTitleId(pluDataRef.idReglement, headingText, targetArray.length + 1);
                const newTitle = {
                    idTitre: titleId,
                    intitule: headingText,
                    niveau: headingLevel,
                    numero: "",
                    idZone: ["porteeGenerale"],
                    idPrescription: ["nonConcerne"],
                    inseeCommune: pluDataRef.inseeCommune,
                    contenu: [],
                    titre: []
                };

                // Trouver le premier niveau de sous-titre (si présent)
                let firstSubLevel = 7;
                for (const cNode of allContentNodes) {
                    if (cNode.nodeType === 1) {
                        const cTag = cNode.tagName.toLowerCase();
                        const cLevel = cTag.match(/^h([1-6])$/) ? parseInt(cTag.substring(1)) : 0;
                        
                        if (cLevel > currentLevel && cLevel < firstSubLevel) {
                            firstSubLevel = cLevel;
                        }
                    }
                }

                // Séparer le contenu DIRECT des sous-sections
                const directContentNodes = [];
                const subSectionNodes = [];
                let inSubSection = false;
                
                for (const cNode of allContentNodes) {
                    if (cNode.nodeType === 1) {
                        const cTag = cNode.tagName.toLowerCase();
                        const cLevel = cTag.match(/^h([1-6])$/) ? parseInt(cTag.substring(1)) : 0;
                        
                        if (cLevel === firstSubLevel && !inSubSection) {
                            inSubSection = true;
                        }
                        
                        if (inSubSection) {
                            subSectionNodes.push(cNode);
                        } else {
                            directContentNodes.push(cNode);
                        }
                    } else {
                        if (inSubSection) {
                            subSectionNodes.push(cNode);
                        } else {
                            directContentNodes.push(cNode);
                        }
                    }
                }

                // Parser le contenu direct
                if (directContentNodes.length > 0) {
                    parseContentFromHTMLNodes(directContentNodes, newTitle, titleId, headingLevel);
                }

                // Parser les sous-sections récursivement
                if (subSectionNodes.length > 0 && firstSubLevel < 7) {
                    parseTitlesFromHTMLNodes(subSectionNodes, newTitle.titre, pluDataRef, firstSubLevel);
                }

                targetArray.push(newTitle);
                i = j;
            } else if (headingLevel < currentLevel) {
                return;
            } else {
                i++;
            }
        } else {
            i++;
        }
    }
}

/**
 * Parse le contenu depuis les noeuds HTML
 */
function parseContentFromHTMLNodes(nodes, title, baseId, titleLevel) {
    let contentIndex = 1;
    const htmlArray = [];

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.nodeType !== 1) continue;
        
        const tagName = node.tagName.toLowerCase();
        
        // Ignorer les sous-titres
        if (tagName.match(/^h([1-6])$/)) {
            const level = parseInt(tagName.substring(1));
            if (level > titleLevel) continue;
        }
        
        // Convertir le noeud en objet HTML
        const htmlObj = convertNodeToHtmlObject(node);
        if (htmlObj) {
            htmlArray.push(htmlObj);
        }
    }

    // Créer le contenu à partir du HTML collecté
    if (htmlArray.length > 0) {
        const contentId = `${baseId}/contenu${String(contentIndex).padStart(2, '0')}`;
        
        title.contenu.push({
            idContenu: contentId,
            idZone: title.idZone,
            idPrescription: title.idPrescription,
            html: htmlArray
        });
    }
}

/**
 * Convertit un noeud DOM en objet HTML
 */
function convertNodeToHtmlObject(node) {
    if (node.nodeType === 3) {
        return node.textContent.trim();
    }
    
    if (node.nodeType !== 1) return null;
    
    const tagName = node.tagName.toLowerCase();
    
    const tagMap = {
        'div': 'p',
        'span': 'span',
        'p': 'p',
        'ul': 'ul',
        'ol': 'ol',
        'li': 'li',
        'strong': 'strong',
        'b': 'strong',
        'em': 'em',
        'i': 'em',
        'u': 'u',
        'table': 'table',
        'thead': 'thead',
        'tbody': 'tbody',
        'tr': 'tr',
        'td': 'td',
        'th': 'th',
        'img': 'img',
        'a': 'a',
        'br': 'br'
    };
    
    const mappedTag = tagMap[tagName];
    if (!mappedTag) return null;
    
    const obj = { tag: mappedTag };
    
    if (mappedTag === 'img') {
        obj.attrs = {
            src: node.getAttribute('src') || '',
            alt: node.getAttribute('alt') || ''
        };
        return obj;
    }
    
    if (mappedTag === 'a') {
        obj.attrs = {
            href: node.getAttribute('href') || ''
        };
        obj.text = node.textContent.trim();
        return obj;
    }
    
    if (mappedTag === 'br') {
        return obj;
    }
    
    const childNodes = Array.from(node.childNodes);
    
    if (childNodes.length === 1 && childNodes[0].nodeType === 3) {
        obj.text = childNodes[0].textContent.trim();
        if (!obj.text) return null;
        return obj;
    }
    
    // Vérifier le formatage inline
    let hasInlineFormatting = false;
    for (const child of childNodes) {
        if (child.nodeType === 1) {
            const childTag = child.tagName.toLowerCase();
            if (['strong', 'b', 'em', 'i', 'u', 'a'].includes(childTag)) {
                hasInlineFormatting = true;
                break;
            }
        }
    }
    
    if (hasInlineFormatting && ['p', 'li', 'td', 'th'].includes(mappedTag)) {
        obj.text = buildInlineHTML(node);
        if (!obj.text) return null;
        return obj;
    }
    
    const children = [];
    for (const child of childNodes) {
        const childObj = convertNodeToHtmlObject(child);
        if (childObj) {
            children.push(childObj);
        }
    }
    
    if (children.length === 0) {
        const text = node.textContent.trim();
        if (text) {
            obj.text = text;
        } else {
            return null;
        }
    } else {
        obj.children = children;
    }
    
    return obj;
}

/**
 * Construit le HTML inline à partir d'un noeud
 */
function buildInlineHTML(node) {
    let html = '';
    
    for (const child of node.childNodes) {
        if (child.nodeType === 3) {
            html += child.textContent;
        } else if (child.nodeType === 1) {
            const tag = child.tagName.toLowerCase();
            if (tag === 'strong' || tag === 'b') {
                html += `<strong>${child.textContent}</strong>`;
            } else if (tag === 'em' || tag === 'i') {
                html += `<em>${child.textContent}</em>`;
            } else if (tag === 'u') {
                html += `<u>${child.textContent}</u>`;
            } else if (tag === 'a') {
                const href = child.getAttribute('href') || '';
                html += `<a href="${href}">${child.textContent}</a>`;
            } else {
                html += child.textContent;
            }
        }
    }
    
    return html.trim();
}

/**
 * Configure les gestionnaires d'évènements pour le stockage
 */
export function setupStorageEventHandlers() {
    // Nouveau PLU
    const newPLUBtn = document.querySelector('[data-action="new-plu"]');
    if (newPLUBtn) {
        newPLUBtn.addEventListener('click', createNewPLU);
    }
    
    // Charger JSON
    const loadJSONBtn = document.querySelector('[data-action="load-json"]');
    const fileInput = document.getElementById('fileInput');
    if (loadJSONBtn && fileInput) {
        loadJSONBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                loadPLU(file);
            }
        });
    }
    
    // Importer DOCX
    const importDOCXBtn = document.querySelector('[data-action="import-docx"]');
    const docxInput = document.getElementById('docxInput');
    if (importDOCXBtn && docxInput) {
        importDOCXBtn.addEventListener('click', () => docxInput.click());
        docxInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importDOCX(file);
            }
        });
    }
    
    // Exporter JSON
    const exportBtn = document.querySelector('[data-action="export-plu"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPLU);
    }
}
