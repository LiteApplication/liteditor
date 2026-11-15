import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import CallbackView from '@/views/CallbackView.vue'
import EditorView from '@/views/EditorView.vue'
import EditRepoView from '@/views/EditRepoView.vue'
import RepoSelectView from '@/views/RepoSelectView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/callback',
      name: 'callback',
      component: CallbackView,
      meta: { public: true },
    },
    {
      path: '/repos',
      name: 'repos',
      component: RepoSelectView,
      meta: { requiresAuth: true },
    },
    {
      path: '/edit/:owner/:repo',
      name: 'edit',
      component: EditRepoView,
      meta: { requiresAuth: true },
    },
    {
      path: '/editor',
      name: 'editor',
      component: EditorView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    if (to.name === 'edit') {
      try { sessionStorage.setItem('liteditor_redirect', to.fullPath) } catch { /* ignore */ }
    }
    return { name: 'login' }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'repos' }
  }
})

export default router
