import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '홈' } },
  {
    path: '/products',
    name: 'catalog',
    component: () => import('@/views/CatalogView.vue'),
    meta: { title: '제품 탐색' },
  },
  {
    path: '/products/:slug',
    name: 'product-detail',
    component: () => import('@/views/ProductDetailView.vue'),
    props: true,
    meta: { title: '제품 상세' },
  },
  {
    path: '/compare',
    name: 'compare',
    component: () => import('@/views/CompareView.vue'),
    meta: { title: '제품 비교' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/admin/AdminHomeView.vue'),
    // UI hint only. Real authorization is enforced on the server and in Supabase RLS (Phase 7).
    meta: { title: '관리자', requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '페이지 없음' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} — TechCompare` : 'TechCompare'
})
