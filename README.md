# LiteEditor

Un CMS léger intégré directement à vos dépôts GitHub. LiteEditor vous permet de modifier votre contenu Markdown, gérer vos médias, et configurer des modules personnalisés (comme des carrousels) depuis une interface web élégante et simple.

## Configuration : le fichier `.liteditor`

LiteEditor lit un fichier `.liteditor` placé à la racine du dépôt. Ce fichier peut être écrit en JSON ou en YAML, puis il est validé avant d'être utilisé.

La configuration décrit trois choses :

1. où se trouvent les contenus Markdown à éditer,
2. où se trouvent les médias du dépôt,
3. quels champs doivent apparaître dans l'interface pour le contenu global, le frontmatter des documents et les carrousels.

### Structure complète

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets",
  "settings_file": "src/data/site.json",
  "schema": {
    "siteTitle": {
      "label": "Titre du site",
      "type": "short-text"
    },
    "theme": {
      "label": "Thème",
      "type": "selection",
      "options": [
        { "label": "Clair", "value": "light" },
        { "label": "Sombre", "value": "dark" }
      ]
    },
    "featuredLinks": {
      "label": "Liens mis en avant",
      "type": "list",
      "itemSchema": {
        "label": "Lien",
        "type": "object",
        "fields": {
          "label": { "label": "Texte", "type": "short-text" },
          "url": { "label": "URL", "type": "link" }
        }
      }
    }
  },
  "frontmatter": {
    "title": {
      "label": "Titre",
      "type": "short-text"
    },
    "description": {
      "label": "Résumé",
      "type": "long-text"
    },
    "published": {
      "label": "Publié",
      "type": "boolean"
    },
    "cover": {
      "label": "Image de couverture",
      "type": "image"
    },
    "primaryColor": {
      "label": "Couleur principale",
      "type": "color",
      "alpha": true
    }
  },
  "carousels": {
    "homeHero": {
      "label": "Carrousel principal",
      "description": "Diaporama de la page d'accueil",
      "path": "src/assets/carousels/home-hero",
      "schema": {
        "alt": {
          "label": "Texte alternatif",
          "type": "short-text"
        },
        "link": {
          "label": "Lien",
          "type": "link"
        }
      },
      "frontmatter": {
        "autoplay": {
          "label": "Lecture automatique",
          "type": "boolean"
        },
        "interval": {
          "label": "Intervalle (ms)",
          "type": "short-text"
        }
      }
    }
  }
}
```

### Référence des champs

Les champs de `schema`, `frontmatter` et des carrousels partagent le même format de base :

- `label` : libellé affiché dans l'interface.
- `description` : texte d'aide facultatif.
- `type` : type de composant. Si `type` est omis, LiteEditor utilise `short-text`.

Types disponibles :

- `short-text` : champ texte sur une ligne.
- `long-text` : champ texte multilignes.
- `boolean` : interrupteur vrai/faux.
- `image` : sélecteur d'image dans `assets_path`.
- `link` : champ URL sur une ligne, pensé pour les liens relatifs ou absolus.
- `color` : sélecteur de couleur, avec `alpha: true` pour autoriser la transparence.
- `selection` : liste d'options définie par `options: [{ "label": "...", "value": "..." }]`.
- `list` : liste répétable, avec un sous-schéma obligatoire `itemSchema` et une limite optionnelle `max`.
- `object` : groupe de champs imbriqués, défini par `fields`.

Exemple de structure imbriquée :

```json
{
  "faq": {
    "label": "FAQ",
    "type": "list",
    "itemSchema": {
      "label": "Question",
      "type": "object",
      "fields": {
        "question": { "label": "Question", "type": "short-text" },
        "answer": { "label": "Réponse", "type": "long-text" }
      }
    },
    "max": 10
  }
}
```

### Impact sur le dépôt

LiteEditor ne modifie que les fichiers référencés par la configuration. Le fichier `.liteditor` lui-même est lu, validé, puis utilisé comme plan de travail, mais il n'est pas réécrit par l'application.

Les chemins sont toujours interprétés comme des chemins relatifs à la racine du dépôt.

- `content_path` : LiteEditor parcourt récursivement ce dossier et n'affiche que les fichiers Markdown `*.md`. Chaque page est ouverte, éditée puis enregistrée dans le même fichier Markdown.
- `assets_path` : LiteEditor y lit et y dépose les médias. Les uploads d'images créent un fichier dans ce dossier, et le sélecteur d'image ne pointe que vers cette arborescence.
- `settings_file` : si ce champ est présent, LiteEditor lit ce fichier JSON global et le réécrit lors de la sauvegarde des paramètres généraux.
- `carousels` : chaque entrée devient un module autonome. LiteEditor lit et écrit un fichier `carousel.json` dans `path` pour chaque carrousel.

Quand vous créez, renommez, déplacez ou supprimez un document ou un média depuis l'éditeur :

- le fichier Markdown concerné est ajouté, mis à jour ou supprimé dans le dépôt,
- les modifications du frontmatter sont réintégrées dans le même fichier Markdown,
- les médias sont créés ou déplacés dans `assets_path`,
- les liens relatifs dans le contenu Markdown et dans le frontmatter sont réécrits si un document ou un média est déplacé,
- les références de carrousel pointant vers une image renommée sont aussi mises à jour.

Au moment de la validation, LiteEditor crée un commit GitHub sur la branche par défaut du dépôt, en appliquant un nouvel arbre Git qui ne contient que les fichiers modifiés.

### Exemple minimal

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets",
  "frontmatter": {
    "title": {
      "label": "Titre de l'article",
      "type": "short-text",
      "description": "Le titre de l'article."
    }
  }
}
```

---

## Installation et Développement

Ce projet utilise [Vue 3](https://vuejs.org/) ainsi que l'infrastructure rapide procurée par [Vite](https://vite.dev/).

```sh
# Installer et configurer les dépendances
npm install

# Démarrer le serveur de test / développement (Hot-Reloading activé)
npm run dev

# Compiler les ressources minifiées en vue du déploiement en production
npm run build
```
