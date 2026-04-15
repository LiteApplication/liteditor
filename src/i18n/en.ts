export default {
  // General / shared
  yes: "Yes",
  no: "No",
  cancel: "Cancel",
  remove: "Remove",
  apply: "Apply",
  insert: "Insert",
  publish: "Publish",
  publishing: "Publishing…",
  published: "Published",
  save: "Save",
  delete: "Delete",
  rename: "Rename",
  duplicate: "Duplicate",
  lightMode: "Light mode",
  darkMode: "Dark mode",
  signOut: "Sign out",

  // Auth / Login
  login: {
    title: "LiteEditor",
    subtitle: "A lightweight CMS for GitHub repositories",
    cta: "Sign in with GitHub",
    loading: "Signing in…",
    error: "Authentication failed",
    desc: "Connect your GitHub account to start editing your content directly from your repository.",
  },

  // Repo selection
  repos: {
    title: "Select a repository",
    subtitle: "Choose the repository you want to edit",
    search: "Search repositories…",
    loading: "Loading repositories…",
    empty: "No repositories found.",
    private: "Private",
    lastPushed: "Pushed",
    errorLoad: "Failed to load repository",
    errorIncompatible: "This website is not compatible with the editor",
    errorContactAdmin: "Please contact your administrator.",
  },

  // Editor header
  editor: {
    unsavedChanges: "Unsaved changes",
    publish: "Publish",
    discardChangesTitle: "Discard unsaved changes?",
    discardChangesMessage: "This tab has unpublished changes.",
    discardChangesHint: "If you close it now, those changes will be lost.",
    publishKeepChanges: "Publish changes",
    discardChanges: "Discard and close",
  },

  // Sidebar
  sidebar: {
    content: "Content",
    assets: "Assets",
    general: "General",
    noFiles: "No markdown files found in",
    noImages: "No images found",
    newRootPage: "New Root Page",
    newFolder: "New Folder",
    newPage: "New Page",
    newPagePrompt: "New page name (will be converted to lowercase-with-dashes.md):",
    newFolderPrompt: "New folder name (will be converted to lowercase-with-dashes):",
    configError: "Config error",
    carousels: "Carousels",
    addImage: "Add Image",
    newAssetFolder: "New asset folder",
    newAssetFolderPrompt: "New asset folder name (you can use / for nesting):",
  },

  // Context menu
  ctx: {
    rename: "Rename",
    duplicate: "Duplicate",
    delete: "Delete",
    renamePrompt: "New name:",
    deleteConfirm: "Are you sure you want to delete {path}?",
  },

  // Toolbar
  toolbar: {
    bold: "Bold (Ctrl+B)",
    italic: "Italic (Ctrl+I)",
    underline: "Underline (Ctrl+U)",
    strike: "Strikethrough",
    bulletList: "Bullet list",
    orderedList: "Numbered list",
    blockquote: "Quote",
    code: "Code block",
    link: "Insert link",
    image: "Insert image",
    table: "Insert table",
    details: "Document details",
    paragraph: "Paragraph",
    heading1: "Heading 1",
    heading2: "Heading 2",
    heading3: "Heading 3",
  },

  // Link modal
  link: {
    title: "Insert link",
    placeholder: "https://example.com",
    existingPages: "Link to an existing page",
    searchPages: "Search pages…",
    noPages: "No pages found.",
  },

  // Image modal
  image: {
    title: "Insert image",
    captionPlaceholder: "Caption (optional)",
    searchPlaceholder: "Search images…",
    noImages: "No images found",
    pick: "Pick an image",
    change: "Change image",
  },

  // Frontmatter panel
  frontmatter: {
    title: "Document details",
    noDetails: "This file has no document details",
  },

  // Settings panel
  settings: {
    title: "General Settings",
    editing: "Editing",
    noSchema: "No schema defined in the configuration file.",
    unsaved: "Unsaved — click",
    unsavedPublish: "Publish",
    unsavedToSave: "to save",
  },

  // Commit drawer
  commit: {
    title: "Review & Publish",
    filesWillBePublished: "{n} file will be published | {n} files will be published",
    noChanges: "No changes to commit.",
    describeChange: "Describe what you changed:",
    messagePlaceholder: "Describe your changes…",
    cancel: "Cancel",
    statusAdded: "added",
    statusModified: "modified",
    statusDeleted: "deleted",
  },

  // Empty workspace
  workspace: {
    selectFile: "Select a file to edit",
    availableArticles: "Available articles",
    createArticle: "Create a new article",
    createArticleHint: "Start from a fresh page and fill in the content fields.",
    createArticleAction: "Create article",
    openArticle: "Open article",
    newArticlePrompt: "New article name (will be converted to lowercase-with-dashes.md):",
  },

  // Carousel editor
  carousel: {
    title: "Carousel editor",
    noCarousels: "No carousels configured in .liteditor",
    addSlide: "Add a slide",
    removeSlide: "Remove this slide",
    slideN: "Slide {n}",
    metadata: "Carousel metadata",
    slideImage: "Image",
    pickImage: "Pick an image",
    changeImage: "Change image",
    alt: "Alt text",
    caption: "Caption",
    altPlaceholder: "Descriptive alt text…",
    captionPlaceholder: "Optional caption…",
    dragToReorder: "Drag to reorder",
    empty: "No slides yet. Add one!",
  },

  // Field inputs
  field: {
    selectOption: "Select…",
    addItem: "Add item",
    objectSection: "Additional fields",
    maxReached: "Maximum {max} items reached",
  },
};
