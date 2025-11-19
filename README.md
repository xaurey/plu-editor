# PLU Editor

Un éditeur web pour créer et modifier des Plans Locaux d'Urbanisme (PLU(i)) au format JSON conformes au standard [CNIG SRU Niveau 1 version 2025-10](https://github.com/cnigfr/structuration-reglement-urbanisme)

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1-green.svg)

## 📋 Description

PLU Editor est une application web statique permettant de créer, éditer et exporter des documents d'urbanisme (PLU, PLUi, PSMV) au format JSON structuré selon le standard CNIG SRU Niveau 1. L'application offre une interface intuitive avec :

- **Éditeur WYSIWYG** : Édition de contenu HTML avec TipTap
- **Arborescence hiérarchique** : Navigation dans la structure des titres avec support du drag-and-drop
- **Import/Export** : Conversion entre DOCX et JSON avec gestion des images
- **Sauvegarde automatique** : Protection contre la perte de données via localStorage
- **Historique d'annulation** : Support Undo/Redo pour toutes les modifications

## ✨ Fonctionnalités

### Gestion des Titres
- Création et suppression de titres sur 6 niveaux hiérarchiques
- Réorganisation par glisser-déposer
- Arborescence rétractable avec boutons +/-
- Édition des métadonnées (numéro, intitulé, niveau, communes INSEE)

### Édition de Contenu
- Éditeur de texte riche (TipTap) avec support de :
  - Titres H1-H6
  - Formatage (gras, italique, souligné)
  - Listes (à puces, numérotées)
  - Tableaux
  - Images
  - Liens hypertextes
- Séparation de contenus multiples avec `***`
- Réorganisation des contenus par glisser-déposer
- Zones et prescriptions spécifiques par contenu

### Import/Export
- **Import DOCX** : Conversion automatique avec extraction des métadonnées et images
- **Export ZIP** : Package JSON + dossier `ressources/` avec les images
- **Validation** : Conformité au schéma CNIG SRU Niveau 1

### Métadonnées
- Génération automatique des identifiants (idUrba, idReglement, idTitre, idContenu)
- Support PLU et PLUi (avec SIREN EPCI)
- Validation des codes INSEE (5 chiffres)
- Mise à jour en cascade des IDs

### Persistance
- Sauvegarde automatique dans localStorage
- Récupération après fermeture accidentelle
- Historique d'annulation/rétablissement

## 🚀 Installation et Utilisation

### Prérequis
Aucun ! L'application est entièrement statique et fonctionne directement dans le navigateur.

### Démarrage rapide

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-username/PLU_editor.git
   cd PLU_editor
   ```

2. **Lancer un serveur HTTP**
   ```bash
   cd www
   python -m http.server 8000
   ```
   Ou utilisez n'importe quel serveur HTTP statique (nginx, Apache, etc.)

3. **Ouvrir dans le navigateur**
   ```
   http://localhost:8000/plu-editor.html
   ```

### Premier usage

1. **Créer un nouveau PLU** : Cliquez sur "➕ Nouveau PLU"
2. **Configurer les métadonnées** : Cliquez sur "⚙️ Métadonnées"
   - Remplissez le nom, type de document, date, codes INSEE
   - Pour un PLUi, ajoutez le SIREN de l'EPCI
3. **Ajouter des titres** : Utilisez "➕ Ajouter un titre racine"
4. **Éditer le contenu** : Sélectionnez un titre et ajoutez du contenu
5. **Exporter** : Cliquez sur "💾 Exporter JSON" pour télécharger un ZIP

### Import depuis DOCX

Le fichier DOCX doit respecter le format suivant :

```
#nom Règlement du Plan Local d'Urbanisme
#typeDoc PLU
#inseeCommune 14027
#date 20221220

Titre de niveau 1 (style Titre 1)
Contenu du titre...

Titre de niveau 2 (style Titre 2)
Contenu...
```

Les métadonnées en début de document avec `#clé valeur`

## 🛠️ Technologies

- **Frontend** : HTML5, CSS3, JavaScript ES6+ (modules)
- **Éditeur** : [TipTap](https://tiptap.dev/) v2.1.13
- **Conversion DOCX** : [Mammoth.js](https://github.com/mwilliamson/mammoth.js)
- **Export ZIP** : [JSZip](https://stuk.github.io/jszip/)
- **CDN** : esm.sh pour les modules TipTap
- **Stockage** : localStorage (navigateur)

## 📁 Structure du Projet

```
PLU_editor/
├── www/
│   ├── plu-editor.html          # Page principale
│   ├── inc/
│   │   ├── js/
│   │   │   ├── main.js          # Point d'entrée, initialisation TipTap
│   │   │   ├── state.js         # Gestion d'état global
│   │   │   ├── tree.js          # Arborescence et navigation
│   │   │   ├── editor.js        # Édition de contenu
│   │   │   ├── metadata.js      # Gestion des métadonnées
│   │   │   ├── storage.js       # Import/Export DOCX et JSON
│   │   │   ├── converters.js    # Conversion TipTap ↔ HTML
│   │   │   ├── images.js        # Gestion des images (localStorage)
│   │   │   ├── ui.js            # Composants UI (modals, toasts)
│   │   │   ├── autosave.js      # Sauvegarde automatique
│   │   │   └── history.js       # Historique Undo/Redo
│   │   └── css/
│   │       ├── plu-editor.css   # Styles principaux
│   │       └── tiptap.css       # Styles éditeur TipTap
│   └── example/
│       └── exemple-plu.json     # Exemple de PLU
├── schema/
│   └── schema-sru-niveau1-v2025.json  # Schéma JSON CNIG
├── CLAUDE.md                    # Instructions pour Claude Code
└── README.md                    # Ce fichier
```

## 📖 Utilisation Avancée

### Séparation de Contenus

Pour créer plusieurs contenus en une seule édition, tapez `***` sur une ligne seule :

```
Premier contenu avec du texte...

***

Deuxième contenu séparé automatiquement...
```

### Zones et Prescriptions

- **Niveau Titre** : Définit les zones/prescriptions par défaut
- **Niveau Contenu** : Peut surcharger avec des valeurs spécifiques
- Format prescriptions : `TYPEPSC-STYPEPSC` ou `TYPEPSC-STYPEPSC-NATURE`

### Réorganisation

- **Titres** : Glissez-déposez dans l'arborescence pour réorganiser
- **Contenus** : Glissez-déposez les blocs pour changer l'ordre
- **Prévention** : Impossible de réorganiser pendant l'édition

### Raccourcis

- Sauvegarde automatique toutes les 30 secondes
- Avertissement si modifications non sauvegardées
- Récupération automatique au rechargement

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment participer :

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

### Guidelines

- Suivre la structure modulaire ES6 existante
- Commenter les fonctions complexes
- Tester l'import/export DOCX et JSON
- Valider contre le schéma CNIG

## 🐛 Problèmes Connus

- Les source maps TipTap peuvent générer des erreurs 500 (sans impact sur le fonctionnement)
- Le CDN esm.sh peut occasionnellement être indisponible (un indicateur de chargement s'affiche)

## 📝 Standard CNIG

Ce projet implémente le standard **CNIG SRU (Structuration du Règlement d'Urbanisme) Niveau 1 version 2025-10**.

Références :
- [CNIG - Standards Urbanisme](https://cnig.gouv.fr/)
- [CNIG - Standard SRU Niveau 1](https://github.com/cnigfr/structuration-reglement-urbanisme)
- [Géoportail de l'Urbanisme](https://www.geoportail-urbanisme.gouv.fr/)

## 📄 Licence

Ce projet est distribué sous la licence **GNU General Public License v3.0** (GPL-3.0).

```
PLU Editor - Éditeur de Plans Locaux d'Urbanisme
Copyright (C) 2024

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👤 Auteur

[**X. Aurey**](https://github.com/xaurey)

## 🙏 Remerciements

- [TipTap](https://tiptap.dev/) pour l'éditeur WYSIWYG
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) pour la conversion DOCX
- [JSZip](https://stuk.github.io/jszip/) pour la génération de fichiers ZIP
- CNIG pour le standard SRU

---

**Note** : Ce projet n'a pas de lien officiel avec le CNIG. C'est un outil indépendant facilitant la création de documents conformes au standard.
