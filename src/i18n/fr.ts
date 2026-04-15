export default {
  // General / shared
  yes: "Oui",
  no: "Non",
  cancel: "Annuler",
  remove: "Supprimer",
  apply: "Appliquer",
  insert: "Insérer",
  publish: "Publier",
  publishing: "Publication…",
  published: "Publié",
  save: "Enregistrer",
  delete: "Supprimer",
  rename: "Renommer",
  duplicate: "Dupliquer",
  lightMode: "Mode clair",
  darkMode: "Mode sombre",
  signOut: "Se déconnecter",

  // Auth / Login
  login: {
    title: "LiteEditor",
    subtitle: "Un CMS léger pour vos dépôts GitHub",
    cta: "Se connecter avec GitHub",
    loading: "Connexion…",
    error: "Échec de l'authentification",
    desc: "Connectez votre compte GitHub pour commencer à éditer votre contenu directement depuis votre dépôt.",
  },

  // Repo selection
  repos: {
    title: "Sélectionnez un site",
    subtitle: "Choisissez le site que vous souhaitez éditer",
    search: "Rechercher des sites…",
    loading: "Chargement des sites…",
    empty: "Aucun site trouvé.",
    private: "Privé",
    lastPushed: "Poussé",
    errorLoad: "Échec du chargement du dépôt",
    errorIncompatible: "Ce site web n'est pas compatible avec l'éditeur",
    errorContactAdmin: "Veuillez contacter votre administrateur.",
  },

  // Editor header
  editor: {
    unsavedChanges: "Modifications non sauvegardées",
    publish: "Publier",
    discardChangesTitle: "Supprimer les modifications non publiées ?",
    discardChangesMessage: "Cet onglet contient des modifications non publiées.",
    discardChangesHint: "Si vous le fermez maintenant, ces changements seront perdus.",
    publishKeepChanges: "Publier les modifications",
    discardChanges: "Supprimer et fermer",
  },

  // Sidebar
  sidebar: {
    content: "Contenu",
    assets: "Médias",
    general: "Général",
    noFiles: "Aucun fichier markdown trouvé dans",
    noImages: "Aucune image trouvée",
    newRootPage: "Nouvelle page racine",
    newFolder: "Nouveau dossier",
    newPage: "Nouvelle page",
    newPagePrompt: "Nom de la nouvelle page (sera converti en minuscules-avec-tirets.md) :",
    newFolderPrompt: "Nom du nouveau dossier (sera converti en minuscules-avec-tirets) :",
    configError: "Erreur de configuration",
    carousels: "Carrousels",
    addImage: "Ajouter une image",
    newAssetFolder: "Nouveau dossier média",
    newAssetFolderPrompt: "Nom du nouveau dossier média (vous pouvez utiliser / pour imbriquer) :",
  },

  // Context menu
  ctx: {
    rename: "Renommer",
    duplicate: "Dupliquer",
    delete: "Supprimer",
    renamePrompt: "Nouveau nom :",
    deleteConfirm: "Êtes-vous sûr de vouloir supprimer {path} ?",
  },

  // Toolbar
  toolbar: {
    bold: "Gras (Ctrl+B)",
    italic: "Italique (Ctrl+I)",
    underline: "Souligné (Ctrl+U)",
    strike: "Barré",
    bulletList: "Liste à puces",
    orderedList: "Liste numérotée",
    blockquote: "Citation",
    code: "Bloc de code",
    link: "Insérer un lien",
    image: "Insérer une image",
    table: "Insérer un tableau",
    details: "Détails du document",
    paragraph: "Paragraphe",
    heading1: "Titre 1",
    heading2: "Titre 2",
    heading3: "Titre 3",
  },

  // Link modal
  link: {
    title: "Insérer un lien",
    placeholder: "https://exemple.com",
    existingPages: "Lier à une page existante",
    searchPages: "Rechercher des pages…",
    noPages: "Aucune page trouvée.",
  },

  // Image modal
  image: {
    title: "Insérer une image",
    captionPlaceholder: "Légende (facultatif)",
    searchPlaceholder: "Rechercher des images…",
    noImages: "Aucune image trouvée",
    pick: "Choisir une image",
    change: "Changer l'image",
  },

  // Frontmatter panel
  frontmatter: {
    title: "Détails du document",
    noDetails: "Ce fichier n'a pas de détails de document",
  },

  // Settings panel
  settings: {
    title: "Paramètres généraux",
    editing: "Édition de",
    noSchema: "Aucun schéma défini dans le fichier de configuration.",
    unsaved: "Non sauvegardé — cliquez sur",
    unsavedPublish: "Publier",
    unsavedToSave: "pour sauvegarder",
  },

  // Commit drawer
  commit: {
    title: "Réviser & Publier",
    filesWillBePublished: "{n} fichier sera publié | {n} fichiers seront publiés",
    noChanges: "Aucune modification à valider.",
    describeChange: "Décrivez vos modifications :",
    messagePlaceholder: "Décrivez vos changements…",
    cancel: "Annuler",
    statusAdded: "ajouté",
    statusModified: "modifié",
    statusDeleted: "supprimé",
  },

  // Empty workspace
  workspace: {
    selectFile: "Sélectionnez un fichier à éditer",
    availableArticles: "Articles disponibles",
    createArticle: "Créer un nouvel article",
    createArticleHint: "Commencez par une page vide et complétez les champs de contenu.",
    createArticleAction: "Créer l'article",
    openArticle: "Ouvrir l'article",
    newArticlePrompt: "Nom du nouvel article (sera converti en minuscules-avec-tirets.md) :",
  },

  // Carousel editor
  carousel: {
    title: "Éditeur de carrousel",
    noCarousels: "Aucun carrousel configuré dans .liteditor",
    addSlide: "Ajouter une diapositive",
    removeSlide: "Supprimer cette diapositive",
    slideN: "Diapositive {n}",
    metadata: "Métadonnées du carrousel",
    slideImage: "Image",
    pickImage: "Choisir une image",
    changeImage: "Changer l'image",
    alt: "Texte alternatif",
    caption: "Légende",
    altPlaceholder: "Texte alternatif descriptif…",
    captionPlaceholder: "Légende facultative…",
    dragToReorder: "Glisser pour réordonner",
    empty: "Aucune diapositive pour l'instant. Ajoutez-en une !",
  },

  // Field inputs
  field: {
    selectOption: "Choisir…",
    addItem: "Ajouter un élément",
    objectSection: "Champs supplémentaires",
    maxReached: "Maximum {max} éléments atteint",
  },
};
