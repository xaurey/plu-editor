/**
 * Module de gestion des images dans localStorage
 */

const IMAGE_PREFIX = 'plu_image_';

/**
 * Stocke une image dans localStorage
 * @param {string} idUrba - ID du PLU
 * @param {string} filename - Nom du fichier
 * @param {string} base64Data - Données en base64
 * @param {string} contentType - Type MIME
 * @returns {string} - Clé de stockage
 */
export function storeImage(idUrba, filename, base64Data, contentType) {
    const key = `${IMAGE_PREFIX}${idUrba}_${filename}`;
    const imageData = {
        filename,
        contentType,
        base64: base64Data,
        timestamp: Date.now()
    };

    try {
        localStorage.setItem(key, JSON.stringify(imageData));
        return key;
    } catch (error) {
        console.error('Erreur lors du stockage de l\'image:', error);
        if (error.name === 'QuotaExceededError') {
            throw new Error('Espace de stockage insuffisant pour les images. Essayez d\'exporter le PLU pour libérer de l\'espace.');
        }
        throw error;
    }
}

/**
 * Récupère une image depuis localStorage
 * @param {string} idUrba - ID du PLU
 * @param {string} filename - Nom du fichier
 * @returns {Object|null} - Données de l'image ou null
 */
export function getImage(idUrba, filename) {
    const key = `${IMAGE_PREFIX}${idUrba}_${filename}`;

    try {
        const data = localStorage.getItem(key);
        if (!data) return null;

        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'image:', error);
        return null;
    }
}

/**
 * Convertit une image en data URL
 * @param {string} idUrba - ID du PLU
 * @param {string} filename - Nom du fichier
 * @returns {string|null} - Data URL ou null
 */
export function getImageDataUrl(idUrba, filename) {
    const imageData = getImage(idUrba, filename);
    if (!imageData) return null;

    return `data:${imageData.contentType};base64,${imageData.base64}`;
}

/**
 * Liste toutes les images d'un PLU
 * @param {string} idUrba - ID du PLU
 * @returns {Array} - Liste des images
 */
export function listPluImages(idUrba) {
    const prefix = `${IMAGE_PREFIX}${idUrba}_`;
    const images = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                const data = localStorage.getItem(key);
                if (data) {
                    const imageData = JSON.parse(data);
                    images.push(imageData);
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du listage des images:', error);
    }

    return images;
}

/**
 * Supprime une image du localStorage
 * @param {string} idUrba - ID du PLU
 * @param {string} filename - Nom du fichier
 */
export function deleteImage(idUrba, filename) {
    const key = `${IMAGE_PREFIX}${idUrba}_${filename}`;

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'image:', error);
    }
}

/**
 * Supprime toutes les images d'un PLU
 * @param {string} idUrba - ID du PLU
 */
export function clearPluImages(idUrba) {
    const prefix = `${IMAGE_PREFIX}${idUrba}_`;
    const keysToDelete = [];

    try {
        // Collecter les clés à supprimer
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }

        // Supprimer les clés
        keysToDelete.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.error('Erreur lors de la suppression des images:', error);
    }
}

/**
 * Obtient la taille totale des images stockées (en bytes)
 * @param {string} idUrba - ID du PLU (optionnel)
 * @returns {number} - Taille en bytes
 */
export function getImagesSize(idUrba = null) {
    const prefix = idUrba ? `${IMAGE_PREFIX}${idUrba}_` : IMAGE_PREFIX;
    let totalSize = 0;

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                const data = localStorage.getItem(key);
                if (data) {
                    totalSize += data.length;
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du calcul de la taille:', error);
    }

    return totalSize;
}

/**
 * Convertit base64 en Blob
 * @param {string} base64 - Données en base64
 * @param {string} contentType - Type MIME
 * @returns {Blob}
 */
export function base64ToBlob(base64, contentType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
}
