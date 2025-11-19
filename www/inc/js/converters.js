/**
 * Module de conversion entre TipTap JSON et HTML structuré
 */

import { state } from './state.js';
import { getImageDataUrl, listPluImages } from './images.js';

/**
 * Convertit une data URL en chemin ressources/ en la comparant avec les images stockées
 * @param {string} dataUrl - Data URL de l'image
 * @returns {string|null} - Nom du fichier ou null
 */
function convertDataUrlToRessourcePath(dataUrl) {
    if (!state.pluData?.idUrba) {
        return null;
    }

    // Récupérer toutes les images du PLU
    const images = listPluImages(state.pluData.idUrba);

    // Comparer le data URL avec chaque image
    for (const imageData of images) {
        const storedDataUrl = `data:${imageData.contentType};base64,${imageData.base64}`;
        if (storedDataUrl === dataUrl) {
            return imageData.filename;
        }
    }

    return null;
}

/**
 * Convertit un document TipTap JSON en tableau HTML
 */
export function tiptapToHtmlArray(tiptapDoc) {
    try {
        if (!tiptapDoc || !tiptapDoc.content) {
            return [];
        }

        const htmlArray = [];

        for (const node of tiptapDoc.content) {
            const htmlNode = convertTipTapNode(node);
            if (htmlNode) {
                htmlArray.push(htmlNode);
            }
        }

        return htmlArray;
    } catch (error) {
        console.error('Erreur lors de la conversion TipTap vers HTML:', error);
        return [];
    }
}

/**
 * Convertit un nœud TipTap en objet HTML
 */
function convertTipTapNode(node) {
    if (!node || !node.type) {
        return null;
    }

    switch (node.type) {
        case 'paragraph':
            return convertParagraph(node);
        
        case 'heading':
            return convertHeading(node);
        
        case 'bulletList':
            return convertList(node, 'ul');
        
        case 'orderedList':
            return convertList(node, 'ol');
        
        case 'listItem':
            return convertListItem(node);
        
        case 'table':
            return convertTable(node);
        
        case 'tableRow':
            return convertTableRow(node);
        
        case 'tableCell':
        case 'tableHeader':
            return convertTableCell(node);
        
        case 'image':
            let src = node.attrs?.src || '';

            // Si l'image est une data URL, la convertir en référence ressources/
            if (src.startsWith('data:')) {
                const filename = convertDataUrlToRessourcePath(src);
                if (filename) {
                    src = `ressources/${filename}`;
                }
            }

            return {
                tag: 'img',
                attrs: {
                    src: src,
                    alt: node.attrs?.alt || 'Image'
                }
            };
        
        case 'hardBreak':
            return { tag: 'br' };
        
        case 'text':
            return node.text || '';
        
        default:
            // Pour les types inconnus, essayer de récupérer le contenu
            if (node.content) {
                const children = node.content.map(convertTipTapNode).filter(n => n);
                if (children.length > 0) {
                    return { tag: 'div', children };
                }
            }
            return null;
    }
}

/**
 * Convertit un paragraphe TipTap
 */
function convertParagraph(node) {
    if (!node.content || node.content.length === 0) {
        return { tag: 'p', text: '' };
    }

    const content = convertInlineContent(node.content);
    
    if (typeof content === 'string') {
        return { tag: 'p', text: content };
    } else if (Array.isArray(content)) {
        return { tag: 'p', children: content };
    } else {
        return { tag: 'p', text: '' };
    }
}

/**
 * Convertit un titre TipTap
 */
function convertHeading(node) {
    const level = node.attrs?.level || 1;
    const content = node.content ? convertInlineContent(node.content) : '';
    
    if (typeof content === 'string') {
        return { tag: `h${level}`, text: content };
    } else if (Array.isArray(content)) {
        return { tag: `h${level}`, children: content };
    } else {
        return { tag: `h${level}`, text: '' };
    }
}

/**
 * Convertit une liste TipTap
 */
function convertList(node, tag) {
    if (!node.content) {
        return null;
    }

    const children = node.content
        .map(convertTipTapNode)
        .filter(n => n);

    if (children.length === 0) {
        return null;
    }

    return { tag, children };
}

/**
 * Convertit un élément de liste TipTap
 */
function convertListItem(node) {
    if (!node.content) {
        return { tag: 'li', text: '' };
    }

    // Si le contenu est un simple paragraphe, extraire son texte
    if (node.content.length === 1 && node.content[0].type === 'paragraph') {
        const content = convertInlineContent(node.content[0].content || []);
        if (typeof content === 'string') {
            return { tag: 'li', text: content };
        } else if (Array.isArray(content)) {
            return { tag: 'li', children: content };
        } else {
            return { tag: 'li', text: '' };
        }
    }

    const children = node.content
        .map(convertTipTapNode)
        .filter(n => n);

    return { tag: 'li', children };
}

/**
 * Convertit un tableau TipTap
 */
function convertTable(node) {
    if (!node.content) {
        return null;
    }

    const children = node.content
        .map(convertTipTapNode)
        .filter(n => n);

    if (children.length === 0) {
        return null;
    }

    return { tag: 'table', children };
}

/**
 * Convertit une ligne de tableau TipTap
 */
function convertTableRow(node) {
    if (!node.content) {
        return null;
    }

    const children = node.content
        .map(convertTipTapNode)
        .filter(n => n);

    if (children.length === 0) {
        return null;
    }

    return { tag: 'tr', children };
}

/**
 * Convertit une cellule de tableau TipTap
 */
function convertTableCell(node) {
    const tag = node.type === 'tableHeader' ? 'th' : 'td';
    
    if (!node.content) {
        return { tag, text: '' };
    }

    // Si le contenu est un simple paragraphe, extraire son texte
    if (node.content.length === 1 && node.content[0].type === 'paragraph') {
        const content = convertInlineContent(node.content[0].content || []);
        if (typeof content === 'string') {
            return { tag, text: content };
        } else if (Array.isArray(content)) {
            return { tag, children: content };
        } else {
            return { tag, text: '' };
        }
    }

    const children = node.content
        .map(convertTipTapNode)
        .filter(n => n);

    return { tag, children };
}

/**
 * Convertit le contenu inline (texte avec formatage)
 * Retourne soit une chaîne simple (si pas de formatage), soit un tableau de nœuds
 */
function convertInlineContent(content) {
    if (!content || content.length === 0) {
        return '';
    }

    // Vérifier s'il y a du formatage
    const hasFormatting = content.some(node => 
        (node.type === 'text' && node.marks && node.marks.length > 0) ||
        node.type === 'hardBreak'
    );

    // Si pas de formatage, retourner une simple chaîne
    if (!hasFormatting) {
        return content.map(node => node.text || '').join('');
    }

    // Sinon, construire un tableau de nœuds structurés
    const result = [];
    
    for (const node of content) {
        if (node.type === 'text') {
            const text = node.text || '';
            
            if (node.marks && node.marks.length > 0) {
                // Appliquer les marques en emboîtant les nœuds
                let currentNode = { text };
                
                // Traiter les marques dans l'ordre inverse pour créer l'emboîtement correct
                for (let i = node.marks.length - 1; i >= 0; i--) {
                    const mark = node.marks[i];
                    let tag = null;
                    let attrs = null;
                    
                    switch (mark.type) {
                        case 'bold':
                            tag = 'strong';
                            break;
                        case 'italic':
                            tag = 'em';
                            break;
                        case 'underline':
                            tag = 'span';
                            attrs = { style: 'text-decoration: underline' };
                            break;
                        case 'link':
                            tag = 'a';
                            attrs = { href: mark.attrs?.href || '' };
                            break;
                    }
                    
                    if (tag) {
                        const newNode = { tag };
                        if (attrs) {
                            newNode.attrs = attrs;
                        }
                        if (currentNode.text !== undefined) {
                            newNode.text = currentNode.text;
                        } else {
                            newNode.children = [currentNode];
                        }
                        currentNode = newNode;
                    }
                }
                
                result.push(currentNode);
            } else {
                // Texte sans formatage - ajouter comme chaîne simple
                result.push(text);
            }
        } else if (node.type === 'hardBreak') {
            result.push({ tag: 'br' });
        }
    }

    return result;
}

/**
 * Convertit un tableau HTML en document TipTap JSON
 */
export function htmlArrayToTipTap(htmlArray) {
    try {
        console.log('htmlArrayToTipTap appelé avec:', htmlArray);

        if (!htmlArray || !Array.isArray(htmlArray)) {
            return {
                type: 'doc',
                content: []
            };
        }

        const content = [];

        for (const element of htmlArray) {
            console.log('Traitement élément:', element);
            const node = convertHtmlToTipTap(element);
            if (node) {
                content.push(node);
            }
        }

        console.log('Document TipTap généré avec', content.length, 'noeuds');

        return {
            type: 'doc',
            content: content
        };
    } catch (error) {
        console.error('Erreur lors de la conversion HTML vers TipTap:', error);
        return {
            type: 'doc',
            content: []
        };
    }
}

/**
 * Convertit un élément HTML en nœud TipTap
 */
function convertHtmlToTipTap(element) {
    if (typeof element === 'string') {
        return {
            type: 'paragraph',
            content: [{ type: 'text', text: element }]
        };
    }

    switch (element.tag) {
        case 'p':
            return convertHtmlParagraph(element);
        
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            return convertHtmlHeading(element);
        
        case 'ul':
            return {
                type: 'bulletList',
                content: (element.children || [])
                    .map(convertHtmlToTipTap)
                    .filter(n => n)
            };
        
        case 'ol':
            return {
                type: 'orderedList',
                content: (element.children || [])
                    .map(convertHtmlToTipTap)
                    .filter(n => n)
            };
        
        case 'li':
            return {
                type: 'listItem',
                content: [convertHtmlListItemContent(element)]
            };
        
        case 'table':
            return {
                type: 'table',
                content: (element.children || [])
                    .map(convertHtmlToTipTap)
                    .filter(n => n)
            };
        
        case 'tr':
            return {
                type: 'tableRow',
                content: (element.children || [])
                    .map(convertHtmlToTipTap)
                    .filter(n => n)
            };
        
        case 'td':
            return {
                type: 'tableCell',
                content: [convertHtmlTableCellContent(element)]
            };
        
        case 'th':
            return {
                type: 'tableHeader',
                content: [convertHtmlTableCellContent(element)]
            };
        
        case 'img':
            let imgSrc = element.attrs?.src || '';
            console.log('Conversion HTML → TipTap: Image trouvée avec src =', imgSrc);

            // Si l'image est une référence ressources/, la convertir en data URL depuis localStorage
            if (imgSrc.startsWith('ressources/')) {
                const filename = imgSrc.replace('ressources/', '');
                console.log('Image ressources/ détectée, filename =', filename, 'idUrba =', state.pluData?.idUrba);

                if (state.pluData?.idUrba) {
                    const dataUrl = getImageDataUrl(state.pluData.idUrba, filename);
                    console.log('Data URL récupérée:', dataUrl ? 'OK (longueur: ' + dataUrl.length + ')' : 'NON TROUVÉE');
                    if (dataUrl) {
                        imgSrc = dataUrl;
                    }
                }
            }

            console.log('Image finale pour TipTap:', imgSrc.substring(0, 50) + '...');

            return {
                type: 'image',
                attrs: {
                    src: imgSrc,
                    alt: element.attrs?.alt || 'Image'
                }
            };
        
        case 'br':
            return { type: 'hardBreak' };
        
        default:
            return null;
    }
}

/**
 * Convertit un paragraphe HTML
 */
function convertHtmlParagraph(element) {
    if (element.text) {
        const content = parseInlineHtml(element.text);
        return {
            type: 'paragraph',
            content: content
        };
    } else if (element.children) {
        // Vérifier si le paragraphe contient uniquement une image (ou plusieurs images)
        // Dans ce cas, retourner l'image comme nœud de niveau bloc au lieu d'un paragraphe
        const hasOnlyImages = element.children.every(child =>
            (typeof child === 'object' && child.tag === 'img') ||
            (typeof child === 'string' && child.trim() === '')
        );

        if (hasOnlyImages) {
            // Extraire les images et les retourner comme nœuds de niveau bloc
            const images = element.children.filter(child => typeof child === 'object' && child.tag === 'img');

            if (images.length === 1) {
                // Un seul image - retourner directement le nœud image
                const img = images[0];
                let imgSrc = img.attrs?.src || '';
                console.log('Image seule dans paragraphe, conversion en bloc, src =', imgSrc);

                if (imgSrc.startsWith('ressources/')) {
                    const filename = imgSrc.replace('ressources/', '');
                    if (state.pluData?.idUrba) {
                        const dataUrl = getImageDataUrl(state.pluData.idUrba, filename);
                        if (dataUrl) {
                            imgSrc = dataUrl;
                        }
                    }
                }

                return {
                    type: 'image',
                    attrs: {
                        src: imgSrc,
                        alt: img.attrs?.alt || 'Image'
                    }
                };
            }
        }

        // Paragraphe normal avec du contenu mixte
        const content = [];
        for (const child of element.children) {
            if (typeof child === 'string') {
                content.push({ type: 'text', text: child });
            } else if (child.tag === 'br') {
                content.push({ type: 'hardBreak' });
            } else if (child.tag === 'img') {
                // Image inline - convertir en texte avec avertissement
                console.warn('Image trouvée à l\'intérieur d\'un paragraphe avec du texte - TipTap ne supporte pas les images inline');
                // On pourrait ignorer l'image ou la convertir en lien
                // Pour l'instant, on l'ignore
            } else {
                // Pour d'autres types d'éléments, les convertir récursivement
                const converted = convertHtmlToTipTap(child);
                if (converted) {
                    content.push(converted);
                }
            }
        }
        return {
            type: 'paragraph',
            content: content.length > 0 ? content : []
        };
    }

    return {
        type: 'paragraph',
        content: []
    };
}

/**
 * Convertit un titre HTML
 */
function convertHtmlHeading(element) {
    const level = parseInt(element.tag.substring(1));
    const text = element.text || '';
    
    if (text.includes('<')) {
        // Contient du HTML inline
        const content = parseInlineHtml(text);
        return {
            type: 'heading',
            attrs: { level },
            content: content
        };
    }
    
    return {
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: text }]
    };
}

/**
 * Convertit le contenu d'un élément de liste HTML
 */
function convertHtmlListItemContent(element) {
    if (element.text) {
        const content = parseInlineHtml(element.text);
        return {
            type: 'paragraph',
            content: content
        };
    } else if (element.children) {
        const content = [];
        for (const child of element.children) {
            if (typeof child === 'string') {
                content.push({ type: 'text', text: child });
            }
        }
        return {
            type: 'paragraph',
            content: content.length > 0 ? content : []
        };
    }

    return {
        type: 'paragraph',
        content: []
    };
}

/**
 * Convertit le contenu d'une cellule de tableau HTML
 */
function convertHtmlTableCellContent(element) {
    if (element.text) {
        const content = parseInlineHtml(element.text);
        return {
            type: 'paragraph',
            content: content
        };
    } else if (element.children) {
        const content = [];
        for (const child of element.children) {
            if (typeof child === 'string') {
                content.push({ type: 'text', text: child });
            }
        }
        return {
            type: 'paragraph',
            content: content.length > 0 ? content : []
        };
    }

    return {
        type: 'paragraph',
        content: []
    };
}

/**
 * Parse le HTML inline et retourne un tableau de nœuds TipTap
 */
function parseInlineHtml(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    
    const content = [];
    
    Array.from(tempDiv.childNodes).forEach(node => {
        if (node.nodeType === 3) {
            // Nœud texte
            if (node.textContent) {
                content.push({ type: 'text', text: node.textContent });
            }
        } else if (node.nodeType === 1) {
            // Nœud élément
            const tagName = node.tagName.toLowerCase();
            const text = node.textContent;
            
            if (!text) return;
            
            const textNode = { type: 'text', text: text };
            const marks = [];
            
            if (tagName === 'strong' || tagName === 'b') {
                marks.push({ type: 'bold' });
            } else if (tagName === 'em' || tagName === 'i') {
                marks.push({ type: 'italic' });
            } else if (tagName === 'u') {
                marks.push({ type: 'underline' });
            } else if (tagName === 'a') {
                marks.push({
                    type: 'link',
                    attrs: { href: node.getAttribute('href') || '' }
                });
            }
            
            if (marks.length > 0) {
                textNode.marks = marks;
            }
            
            content.push(textNode);
        }
    });
    
    return content.length > 0 ? content : [];
}

/**
 * Divise un document TipTap par séparateurs ("---" sur sa propre ligne)
 */
export function splitTipTapBySeparator(tiptapDoc) {
    if (!tiptapDoc || !tiptapDoc.content) {
        return [tiptapDoc];
    }

    const parts = [];
    let currentPart = { type: 'doc', content: [] };
    
    for (const node of tiptapDoc.content) {
        // Chercher les paragraphes qui contiennent uniquement "***"
        if (node.type === 'paragraph' && node.content && node.content.length === 1) {
            const textNode = node.content[0];
            if (textNode.type === 'text' && textNode.text) {
                const trimmed = textNode.text.trim();
                if (trimmed === '***') {
                    // C'est un séparateur
                    if (currentPart.content.length > 0) {
                        parts.push(currentPart);
                    }
                    currentPart = { type: 'doc', content: [] };
                    continue;
                }
            }
        }
        
        currentPart.content.push(node);
    }
    
    // Ajouter la dernière partie si non vide
    if (currentPart.content.length > 0) {
        parts.push(currentPart);
    }
    
    // Si aucun séparateur trouvé, retourner le document entier
    if (parts.length === 0) {
        return [tiptapDoc];
    }
    
    return parts;
}