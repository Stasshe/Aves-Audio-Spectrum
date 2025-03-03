import { createRouter, createWebHistory } from 'vue-router'
import EditorView from '../views/EditorView.vue'

const routes = [
  {
    path: '/',
    name: 'editor',
    component: EditorView
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
