# LiteEditor

Un CMS léger intégré directement à vos dépôts GitHub. LiteEditor vous permet de modifier votre contenu Markdown, gérer vos médias, et configurer des modules personnalisés (comme des carrousels) depuis une interface web élégante et simple.

## Documentation

La documentation pour rendre un site compatible avec LiteEditor (configuration, types de champs, paramètres, carrousels, éléments personnalisés, exemples et compatibilité du schéma) est rédigée en anglais dans [`docs/README.md`](docs/README.md).

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

## Compatibilité du schéma et versions

Un fichier `.liteditor` valide pour une version publiée doit rester valide pour toutes les versions suivantes. Chaque release enregistre donc un instantané du schéma dans `_history/v<version>.schema.json` (JSON Schema généré depuis `src/types/schema.ts`).

- `npm run schema:check` compare le schéma actuel à tous les instantanés. Sont refusés : suppression ou restriction d'un type, d'une valeur d'`enum` ou d'une propriété, propriété devenue obligatoire, rejet des propriétés inconnues. Sont acceptés : nouvelles propriétés optionnelles, nouveaux types de champs, `enum` élargis. Cette vérification tourne aussi en CI avant le build.
- `npm run schema:test` exécute les tests du vérificateur.
- `npm run release -- <patch|minor|major|x.y.z> [--dry-run]` exige un arbre git propre, refuse la release si le schéma est incompatible, incrémente la version, écrit l'instantané, incrémente aussi la version du paquet npm `liteditor` (`packages/liteditor`) si `packages/` a changé depuis la dernière release : elle prend alors la même version que le site (`liteditor-web`), sinon elle garde son retard, crée le commit `release vX.Y.Z` et le tag annoté `vX.Y.Z`. Rien n'est poussé : lancez ensuite `git push && git push origin vX.Y.Z`.

Ne modifiez jamais un fichier de `_history/` existant.

## Éléments personnalisés

Un dépôt peut déclarer des blocs réutilisables, insérables dans les pages (carrousels, encarts…) via la clé optionnelle `elements` de `.liteditor` :

```json
"elements": {
  "slider": {
    "label": "Slider",
    "fields": {
      "heading": { "type": "short-text", "label": "Titre" },
      "text": { "type": "long-text", "label": "Description" },
      "pics": { "type": "list", "itemSchema": { "type": "image" } }
    },
    "display": { "title": "heading", "description": "text", "images": "pics" }
  }
}
```

- `fields` : mêmes types de champs que `schema` / `frontmatter`.
- `display` (tout est optionnel) : champ utilisé comme titre / description (texte) et comme images (`image` ou liste d'`image`). Sans `display`, l'éditeur affiche le `label` de l'élément.
- Dans le Markdown, une instance est un bloc de code clôturé dont l'info est `liteditor-element:<clé>` et dont le contenu est du YAML :

````
```liteditor-element:slider
heading: Soldes
text: Jusqu'à -50 %
pics:
  - ../assets/a.jpg
```
````

Le rendu côté site est à la charge du dépôt, mais inutile d'analyser ces blocs à la main : le paquet npm [`liteditor`](packages/liteditor/README.md) les lit, applique les valeurs par défaut, normalise les chemins d'images et type les données selon vos `fields`.

```sh
npm install liteditor
```

**Avec les blocs** (Astro, Svelte, tout moteur de templates) : `createSite` découpe le corps de chaque page en texte et en éléments.

```ts
import { loadConfig, createSite } from 'liteditor'

const { config } = await loadConfig()
const site = createSite(config)
const page = await site.page('guides/start')

for (const b of page!.blocks) {
  if (b.type === 'markdown') render(b.value)
  else if (b.type === 'element' && b.key === 'slider') Slider(b.data) // data.heading, data.pics…
}
```

**Avec remark** (le corps reste un seul document Markdown) :

```ts
import { remarkLiteditorElements } from 'liteditor/remark'

unified().use(remarkParse).use(remarkLiteditorElements, {
  renderers: {
    slider: (d, { rank }) => `<section class="slider">${escape(d.heading)}</section>`,
  },
  onUnknown: (key, reason) => console.warn(`liteditor-element:${key} ${reason}`),
})
```

Les clés inconnues et le YAML invalide restent visibles comme blocs de code. `npx liteditor check` signale ces cas en CI. Détails, plugin Vite et génération de `.liteditor` depuis le code : [README du paquet](packages/liteditor/README.md).
