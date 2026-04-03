<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { Markdown } from 'tiptap-markdown'
import { useRepoStore } from '@/stores/repo'
import { computeRelativePath } from '@/utils/paths'
import { useUIStore } from '@/stores/ui'
import FrontmatterPanel from './FrontmatterPanel.vue'
import AssetPickerModal from './AssetPickerModal.vue'
import GitHubImageView from './GitHubImageView.vue'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()

const showFrontmatter = ref(true)
const showLinkModal = ref(false)
const showImageModal = ref(false)
const showDiscardModal = ref(false)
const pendingClosePath = ref<string | null>(null)
const linkUrl = ref('')
const imageCaption = ref('')
const pickedAssetPath = ref<string>('')

const hasFrontmatterSchema = computed(() => Object.keys(repo.config?.frontmatter ?? {}).length > 0)

// Custom Image extension that uses the GitHubImageView node renderer
const GitHubImage = Image.extend({
  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return VueNodeViewRenderer(GitHubImageView as any)
  },
})

// Suppress onUpdate during programmatic setContent
let _settingContent = false

// Tiptap editor
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    GitHubImage,
    Placeholder.configure({ placeholder: 'Start writing…' }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Markdown.configure({
      html: true,              // Allow HTML tags like <br> and <cite> to pass through
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ],
  editorProps: {
    attributes: { class: 'tiptap-content outline-none' },
  },
  onUpdate: ({ editor: e }) => {
    if (_settingContent) return   // ← skip when we're loading content programmatically
    if (repo.activeFile) {
      const md = (e.storage as unknown as Record<string, { getMarkdown: () => string }>)['markdown']?.getMarkdown() ?? ''
      repo.updateFileContent(repo.activeFile.path, md)
    }
  },
})

// Sync content when active file changes
watch(
  () => repo.activeFile?.path,
  async () => {
    if (!editor.value || !repo.activeFile) return
    const contentToSet = repo.activeFile.content
    await nextTick()
    _settingContent = true
    if (editor.value) editor.value.commands.setContent(contentToSet)
    await nextTick()
    _settingContent = false
  },
  { immediate: true },
)

// Rebuild editor theme on dark mode toggle — preserve markdown, don't mark dirty
watch(() => ui.darkMode, async () => {
  if (!editor.value || !repo.activeFile) return
  const md = (editor.value.storage as unknown as Record<string, { getMarkdown: () => string }>)['markdown']?.getMarkdown() ?? ''
  await nextTick()
  _settingContent = true
  editor.value.commands.setContent(md)
  await nextTick()
  _settingContent = false
})

onBeforeUnmount(() => editor.value?.destroy())

// Toolbar helpers
function isActive(name: string, attrs?: Record<string, unknown>) {
  return editor.value?.isActive(name, attrs) ?? false
}
function run(fn: () => void) { fn(); editor.value?.commands.focus() }

// Link modal
const linkSearch = ref('')
const filteredPages = computed(() => {
  const q = linkSearch.value.toLowerCase()
  if (!q) return repo.fileTree.filter(f => f.path.endsWith('.md'))
  return repo.fileTree.filter(f => f.path.endsWith('.md') && (f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)))
})

function openLinkModal() {
  linkUrl.value = editor.value?.getAttributes('link').href as string ?? ''
  linkSearch.value = ''
  showLinkModal.value = true
}
function applyLink() {
  if (!linkUrl.value) {
    editor.value?.chain().focus().unsetLink().run()
  } else {
    editor.value?.chain().focus().setLink({ href: linkUrl.value }).run()
  }
  showLinkModal.value = false
}
function selectPageLink(nodePath: string) {
  if (!repo.activeFile) return
  linkUrl.value = computeRelativePath(repo.activeFile.path, nodePath)
  applyLink()
}

// Image modal
function openImageModal() {
  pickedAssetPath.value = ''
  imageCaption.value = ''
  showImageModal.value = true
}
function insertImage() {
  if (!pickedAssetPath.value) return
  let src = pickedAssetPath.value
  if (repo.activeFile?.path) {
    src = computeRelativePath(repo.activeFile.path, pickedAssetPath.value)
  }
  editor.value?.chain().focus().setImage({ src, alt: imageCaption.value }).run()
  showImageModal.value = false
}

// Tab bar helpers
const isDirty = (path: string) => {
  const f = repo.stagedFiles.get(path)
  if (!f) return false
  return f.content !== f.originalContent ||
    JSON.stringify(f.frontmatter) !== JSON.stringify(f.originalFrontmatter)
}

function requestCloseFile(path: string) {
  if (isDirty(path)) {
    pendingClosePath.value = path
    showDiscardModal.value = true
    return
  }
  repo.closeFile(path)
}

function discardPendingChanges() {
  if (!pendingClosePath.value) return
  repo.closeFile(pendingClosePath.value)
  pendingClosePath.value = null
  showDiscardModal.value = false
}

function publishPendingChanges() {
  pendingClosePath.value = null
  showDiscardModal.value = false
  ui.commitDrawerOpen = true
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">

    <!-- File tab bar -->
    <div v-if="repo.stagedFiles.size > 0"
      class="flex-shrink-0 flex items-center overflow-x-auto border-b px-2 pt-1 gap-0.5"
      :class="ui.darkMode ? 'bg-surface-900/50 border-surface-800' : 'bg-surface-50 border-surface-200'">
      <button v-for="[path, file] in repo.stagedFiles" :key="path"
        @click="repo.activeFilePath = path; ui.settingsOpen = false"
        class="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs whitespace-nowrap transition-all duration-100 relative group cursor-pointer flex-shrink-0 border border-b-0 hover:scale-[1.01]"
        :class="repo.activeFilePath === path
          ? (ui.darkMode ? 'bg-surface-950 border-surface-700 text-white' : 'bg-white border-surface-200 text-surface-900')
          : (ui.darkMode ? 'border-transparent text-surface-500 hover:text-surface-300' : 'border-transparent text-surface-400 hover:text-surface-600')">
        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200"
          :class="isDirty(path) ? 'bg-brand-400' : 'bg-transparent'"></span>
        <span class="max-w-32 truncate">{{ file.path.split('/').pop() }}</span>
        <span role="button" @click.stop="requestCloseFile(path)"
          class="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 rounded flex items-center justify-center transition-all duration-100 cursor-pointer hover:bg-surface-700/50 hover:scale-110 active:scale-90">
          <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      </button>
    </div>
    
        <Teleport to="body">
          <div v-if="showDiscardModal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
            @click.self="showDiscardModal = false">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDiscardModal = false"></div>
            <div class="relative z-50 w-full max-w-md rounded-2xl border overflow-hidden"
              :class="ui.darkMode ? 'bg-surface-900 border-surface-700 shadow-2xl' : 'bg-white border-surface-200 shadow-2xl'">
              <div class="px-5 py-4 border-b" :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
                <h3 class="text-base font-semibold">{{ t('editor.discardChangesTitle') }}</h3>
                <p class="mt-1 text-sm" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-600'">
                  {{ t('editor.discardChangesMessage') }}
                </p>
              </div>
    
              <div class="px-5 py-4 space-y-2">
                <p class="text-sm" :class="ui.darkMode ? 'text-surface-300' : 'text-surface-700'">
                  {{ t('editor.discardChangesHint') }}
                </p>
              </div>
    
              <div class="flex items-center justify-end gap-2 px-5 py-4 border-t"
                :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
                <button type="button" @click="showDiscardModal = false"
                  class="px-4 py-2 rounded-lg text-sm border transition-all duration-150 cursor-pointer"
                  :class="ui.darkMode ? 'border-surface-700 text-surface-300 hover:bg-surface-800' : 'border-surface-200 text-surface-700 hover:bg-surface-50'">
                  {{ t('cancel') }}
                </button>
                <button type="button" @click="publishPendingChanges"
                  class="px-4 py-2 rounded-lg text-sm border transition-all duration-150 cursor-pointer"
                  :class="ui.darkMode ? 'border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20' : 'border-brand-500/30 bg-brand-50 text-brand-700 hover:bg-brand-100'">
                  {{ t('editor.publishKeepChanges') }}
                </button>
                <button type="button" @click="discardPendingChanges"
                  class="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 cursor-pointer"
                  :class="ui.darkMode ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'">
                  {{ t('editor.discardChanges') }}
                </button>
              </div>
            </div>
          </div>
        </Teleport>

    <!-- Empty state -->
    <div v-if="!repo.activeFile" class="flex-1 flex flex-col items-center justify-center gap-3"
      :class="ui.darkMode ? 'text-surface-700' : 'text-surface-300'">
      <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm font-medium">{{ t('workspace.selectFile') }}</p>
    </div>

    <!-- Editor + Frontmatter -->
    <div v-else class="flex-1 flex overflow-hidden">

      <!-- Left: toolbar + editor -->
      <div class="flex-1 flex flex-col overflow-hidden">

        <!-- ── Toolbar ─────────────────────────────────────────────────── -->
        <div class="flex-shrink-0 flex items-center gap-0.5 px-3 py-1.5 border-b flex-wrap"
          :class="ui.darkMode ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'">

          <!-- Heading selector -->
          <select @change="(e) => {
            const v = (e.target as HTMLSelectElement).value
            if (v === '0') editor?.chain().focus().setParagraph().run()
            else editor?.chain().focus().setHeading({ level: parseInt(v) as 1 | 2 | 3 }).run()
          }"
            :value="isActive('heading', { level: 1 }) ? '1' : isActive('heading', { level: 2 }) ? '2' : isActive('heading', { level: 3 }) ? '3' : '0'"
            class="text-xs px-2 py-1 rounded-md border cursor-pointer font-medium outline-none transition-all duration-150 hover:scale-[1.02]"
            :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-200' : 'bg-surface-50 border-surface-200 text-surface-700'">
            <option value="0">{{ t('toolbar.paragraph') }}</option>
            <option value="1">{{ t('toolbar.heading1') }}</option>
            <option value="2">{{ t('toolbar.heading2') }}</option>
            <option value="3">{{ t('toolbar.heading3') }}</option>
          </select>

          <div class="w-px h-5 mx-1" :class="ui.darkMode ? 'bg-surface-700' : 'bg-surface-200'"></div>

          <!-- Bold -->
          <button @click="run(() => editor?.chain().focus().toggleBold().run())"
            :class="['toolbar-btn', isActive('bold') ? 'toolbar-btn-active' : '']" :title="t('toolbar.bold')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
              <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
            </svg>
          </button>
          <!-- Italic -->
          <button @click="run(() => editor?.chain().focus().toggleItalic().run())"
            :class="['toolbar-btn', isActive('italic') ? 'toolbar-btn-active' : '']" :title="t('toolbar.italic')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>
          <!-- Underline -->
          <button @click="run(() => editor?.chain().focus().toggleUnderline().run())"
            :class="['toolbar-btn', isActive('underline') ? 'toolbar-btn-active' : '']" :title="t('toolbar.underline')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 4v6a6 6 0 0 0 12 0V4" />
              <line x1="4" y1="20" x2="20" y2="20" />
            </svg>
          </button>
          <!-- Strike -->
          <button @click="run(() => editor?.chain().focus().toggleStrike().run())"
            :class="['toolbar-btn', isActive('strike') ? 'toolbar-btn-active' : '']" :title="t('toolbar.strike')">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
              <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
          </button>

          <div class="w-px h-5 mx-1" :class="ui.darkMode ? 'bg-surface-700' : 'bg-surface-200'"></div>

          <!-- Bullet list -->
          <button @click="run(() => editor?.chain().focus().toggleBulletList().run())"
            :class="['toolbar-btn', isActive('bulletList') ? 'toolbar-btn-active' : '']"
            :title="t('toolbar.bulletList')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="3" cy="6" r="1" fill="currentColor" />
              <circle cx="3" cy="12" r="1" fill="currentColor" />
              <circle cx="3" cy="18" r="1" fill="currentColor" />
            </svg>
          </button>
          <!-- Ordered list -->
          <button @click="run(() => editor?.chain().focus().toggleOrderedList().run())"
            :class="['toolbar-btn', isActive('orderedList') ? 'toolbar-btn-active' : '']"
            :title="t('toolbar.orderedList')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <path d="M4 6h1v4" />
              <path d="M4 10h2" />
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
            </svg>
          </button>
          <!-- Blockquote -->
          <button @click="run(() => editor?.chain().focus().toggleBlockquote().run())"
            :class="['toolbar-btn', isActive('blockquote') ? 'toolbar-btn-active' : '']"
            :title="t('toolbar.blockquote')">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
            </svg>
          </button>
          <!-- Code block -->
          <button @click="run(() => editor?.chain().focus().toggleCodeBlock().run())"
            :class="['toolbar-btn', isActive('codeBlock') ? 'toolbar-btn-active' : '']" :title="t('toolbar.code')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>

          <div class="w-px h-5 mx-1" :class="ui.darkMode ? 'bg-surface-700' : 'bg-surface-200'"></div>

          <!-- Link -->
          <button @click="openLinkModal" :class="['toolbar-btn', isActive('link') ? 'toolbar-btn-active' : '']"
            :title="t('toolbar.link')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <!-- Image -->
          <button @click="openImageModal" class="toolbar-btn" :title="t('toolbar.image')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <!-- Table -->
          <button
            @click="run(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())"
            :class="['toolbar-btn', isActive('table') ? 'toolbar-btn-active' : '']" :title="t('toolbar.table')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 10h18M10 3v18m-6-15h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </button>

          <div class="flex-1"></div>

          <!-- Frontmatter toggle -->
          <button v-if="repo.activeFile" @click="showFrontmatter = !showFrontmatter"
            :class="['toolbar-btn', showFrontmatter ? 'toolbar-btn-active' : '']" :title="t('toolbar.details')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </div>

        <!-- ── Word-style editor page ──────────────────────────────────── -->
        <div class="flex-1 overflow-auto py-10 px-6" :class="ui.darkMode ? 'bg-surface-950' : 'bg-surface-100'">
          <div class="max-w-3xl mx-auto min-h-full rounded-sm shadow-xl"
            :class="ui.darkMode ? 'bg-[#1e1e2e]' : 'bg-white'" style="padding: 60px 80px;">
            <EditorContent :editor="editor" />
          </div>
        </div>
      </div>

      <!-- ── Frontmatter right panel ─────────────────────────────────────── -->
      <Transition name="slide-fade">
        <div v-if="showFrontmatter && hasFrontmatterSchema" class="w-72 flex-shrink-0 overflow-hidden">
          <FrontmatterPanel />
        </div>
      </Transition>
    </div>

    <!-- ── Link modal ────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showLinkModal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showLinkModal = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative z-50 w-full max-w-sm rounded-2xl border flex flex-col overflow-hidden"
            style="max-height: 80vh;"
            :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200 shadow-2xl'">
            <div class="p-5 pb-4 space-y-4 border-b" :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
              <h4 class="font-semibold text-sm">{{ t('link.title') }}</h4>
              <input v-model="linkUrl" type="url" :placeholder="t('link.placeholder')" @keydown.enter="applyLink"
                class="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono transition-all duration-150"
                :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500'
                  : 'bg-surface-50 border-surface-200 focus:border-brand-400'" />
            </div>

            <!-- Page selector inside link modal -->
            <div class="flex-1 overflow-y-auto px-2 py-2 border-b"
              :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
              <div class="px-3 pb-2 pt-1">
                <p class="text-xs font-semibold mb-2" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">{{
                  t('link.existingPages') }}</p>
                <input v-model="linkSearch" type="text" :placeholder="t('link.searchPages')"
                  class="w-full px-3 py-1.5 mb-2 rounded border outline-none text-xs transition-all duration-150"
                  :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-200 focus:border-brand-500' : 'bg-surface-100 border-surface-200 focus:border-brand-400'" />
              </div>
              <div class="space-y-0.5 max-h-48 overflow-y-auto">
                <button v-for="page in filteredPages" :key="page.path" @click="selectPageLink(page.path)"
                  class="w-full text-left px-3 py-1.5 rounded-lg text-xs truncate transition-all duration-100 cursor-pointer hover:scale-[1.01]"
                  :class="ui.darkMode ? 'hover:bg-surface-800 text-surface-300' : 'hover:bg-surface-100 text-surface-700'">
                  {{ page.name }} <span class="opacity-50 ml-1">({{ page.path.split('/').slice(0, -1).join('/') || '/'
                  }})</span>
                </button>
                <p v-if="filteredPages.length === 0" class="text-xs text-center py-2 opacity-50">{{ t('link.noPages') }}
                </p>
              </div>
            </div>

            <div class="flex gap-2 justify-end p-5 pt-4">
              <button @click="showLinkModal = false"
                class="px-4 py-2 text-sm rounded-lg border cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                :class="ui.darkMode ? 'border-surface-700 text-surface-400 hover:text-white' : 'border-surface-200 text-surface-500 hover:text-surface-900'">
                {{ t('cancel') }}
              </button>
              <button v-if="isActive('link')"
                @click="() => { editor?.chain().focus().unsetLink().run(); showLinkModal = false }"
                class="px-4 py-2 text-sm rounded-lg cursor-pointer text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]">
                {{ t('remove') }}
              </button>
              <button @click="applyLink"
                class="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style="background: linear-gradient(135deg,#3b61ff,#1e3ef5);">
                {{ t('apply') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Image modal ───────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showImageModal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showImageModal = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative z-50 w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col"
            style="height: 540px;"
            :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200 shadow-2xl'">
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
              :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
              <h4 class="font-semibold text-sm">{{ t('image.title') }}</h4>
              <button @click="showImageModal = false"
                class="p-1 rounded cursor-pointer transition-all duration-150 hover:scale-110 active:scale-90"
                :class="ui.darkMode ? 'text-surface-400 hover:text-white' : 'text-surface-400 hover:text-surface-700'">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <!-- Asset picker -->
            <div class="flex-1 overflow-hidden">
              <AssetPickerModal v-model="pickedAssetPath" />
            </div>
            <!-- Caption + insert -->
            <div class="flex-shrink-0 px-5 py-3 border-t space-y-2"
              :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
              <input v-model="imageCaption" type="text" :placeholder="t('image.captionPlaceholder')"
                class="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150" :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500'
                  : 'bg-surface-50 border-surface-200 focus:border-brand-400'" />
              <div class="flex gap-2 justify-end">
                <button @click="showImageModal = false"
                  class="px-4 py-2 text-sm rounded-lg border cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  :class="ui.darkMode ? 'border-surface-700 text-surface-400 hover:text-white' : 'border-surface-200 text-surface-500'">
                  {{ t('cancel') }}
                </button>
                <button @click="insertImage" :disabled="!pickedAssetPath"
                  class="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer text-white disabled:opacity-40 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  style="background: linear-gradient(135deg,#3b61ff,#1e3ef5);">
                  {{ t('insert') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
/* Toolbar button styles */
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  transition: all 0.15s;
  cursor: pointer;
  flex-shrink: 0;
  color: v-bind("ui.darkMode ? '#9898af' : '#4e4e69'");
}

.toolbar-btn:hover {
  background: v-bind("ui.darkMode ? '#38384f' : '#e4e4ed'");
  color: v-bind("ui.darkMode ? '#fff' : '#14141c'");
  transform: scale(1.1);
}

.toolbar-btn:active {
  transform: scale(0.9);
}

.toolbar-btn-active {
  background: v-bind("ui.darkMode ? '#1e3ef522' : '#e0e9ff'") !important;
  color: #3b61ff !important;
}

/* Tiptap editor prose styles */
.tiptap-content {
  color: v-bind("ui.darkMode ? '#d1d5db' : '#1a1a2e'");
  line-height: 1.8;
  font-size: 16px;
  min-height: 400px;
}

.tiptap-content>*+* {
  margin-top: 0.85em;
}

.tiptap-content h1 {
  font-size: 2em;
  font-weight: 700;
  line-height: 1.2;
  color: v-bind("ui.darkMode ? '#f9fafb' : '#0a0a10'");
  margin-top: 1.2em;
}

.tiptap-content h2 {
  font-size: 1.5em;
  font-weight: 700;
  line-height: 1.3;
  color: v-bind("ui.darkMode ? '#f3f4f6' : '#14141c'");
  margin-top: 1em;
}

.tiptap-content h3 {
  font-size: 1.2em;
  font-weight: 600;
  color: v-bind("ui.darkMode ? '#e5e7eb' : '#23232f'");
  margin-top: 0.8em;
}

.tiptap-content p {
  margin-bottom: 0;
}

.tiptap-content strong {
  font-weight: 700;
}

.tiptap-content em {
  font-style: italic;
}

.tiptap-content u {
  text-decoration: underline;
}

.tiptap-content s {
  text-decoration: line-through;
}

.tiptap-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875em;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: v-bind("ui.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'");
}

.tiptap-content pre {
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  background: v-bind("ui.darkMode ? '#0a0a10' : '#f0f0f5'");
}

.tiptap-content pre code {
  background: none;
  padding: 0;
}

.tiptap-content blockquote {
  border-left: 3px solid #3b61ff;
  padding: 0.25em 0 0.25em 1em;
  opacity: 0.8;
  font-style: italic;
}

.tiptap-content ul,
.tiptap-content ol {
  padding-left: 1.5em;
}

.tiptap-content li {
  margin-bottom: 0.3em;
}

.tiptap-content li p {
  margin: 0;
}

.tiptap-content a {
  color: #6089ff;
  text-decoration: underline;
  cursor: pointer;
}

.tiptap-content img {
  max-width: 100%;
  border-radius: 8px;
  margin: 1em 0;
  display: block;
  transition: transform 0.2s ease;
}

.tiptap-content img:hover {
  transform: scale(1.01);
}

.tiptap-content img+em {
  display: block;
  text-align: center;
  font-size: 0.85em;
  margin-top: -0.5em;
  opacity: 0.6;
}

.tiptap-content hr {
  border: none;
  border-top: 1px solid v-bind("ui.darkMode ? '#38384f' : '#e4e4ed'");
  margin: 1.5em 0;
}

.tiptap-content table {
  border-collapse: collapse;
  min-width: 100%;
  border-radius: 4px;
  overflow: hidden;
  margin: 1.5em 0;
}

.tiptap-content th,
.tiptap-content td {
  border: 1px solid v-bind("ui.darkMode ? '#38384f' : '#e4e4ed'");
  padding: 0.5em 0.75em;
}

.tiptap-content th {
  background: v-bind("ui.darkMode ? '#1a1a2e' : '#f8f8fa'");
  font-weight: 600;
  text-align: left;
}

.tiptap-content table.selectedCell {
  outline: 2px solid #3b61ff;
}

/* Placeholder */
.tiptap-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: v-bind("ui.darkMode ? '#38384f' : '#d1d1de'");
}
</style>
