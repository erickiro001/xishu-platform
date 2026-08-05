import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/layouts/AdminLayout.vue'

const Login = () => import('@/pages/Login')
const Dashboard = () => import('@/pages/Dashboard')
const NewsList = () => import('@/pages/news/NewsList')
const NewsEditor = () => import('@/pages/news/NewsEditor')
const CompanyList = () => import('@/pages/companies/CompanyList')
const CompanyEditor = () => import('@/pages/companies/CompanyEditor')
const DemandList = () => import('@/pages/demands/DemandList')
const DemandEditor = () => import('@/pages/demands/DemandEditor')
const DemandSubmissionList = () => import('@/pages/submissions/DemandSubmissionList')
const SolutionApplicationList = () => import('@/pages/submissions/SolutionApplicationList')
const IntentList = () => import('@/pages/submissions/IntentList')
const CategoryList = () => import('@/pages/categories/CategoryList')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: Dashboard, meta: { title: '数据概览' } },
      // 新闻
      { path: 'news', name: 'NewsList', component: NewsList, meta: { title: '新闻动态' } },
      { path: 'news/create', name: 'NewsCreate', component: NewsEditor, meta: { title: '新建新闻' } },
      { path: 'news/:id/edit', name: 'NewsEdit', component: NewsEditor, meta: { title: '编辑新闻' } },
      // 企业
      { path: 'companies', name: 'CompanyList', component: CompanyList, meta: { title: '企业管理' } },
      { path: 'companies/create', name: 'CompanyCreate', component: CompanyEditor, meta: { title: '新建企业' } },
      { path: 'companies/:id/edit', name: 'CompanyEdit', component: CompanyEditor, meta: { title: '编辑企业' } },
      // 需求
      { path: 'demands', name: 'DemandList', component: DemandList, meta: { title: '需求管理' } },
      { path: 'demands/create', name: 'DemandCreate', component: DemandEditor, meta: { title: '新建需求' } },
      { path: 'demands/:id/edit', name: 'DemandEdit', component: DemandEditor, meta: { title: '编辑需求' } },
      // 表单提交
      { path: 'demand-submissions', name: 'DemandSubmissionList', component: DemandSubmissionList, meta: { title: '需求提交管理' } },
      { path: 'solution-applications', name: 'SolutionApplicationList', component: SolutionApplicationList, meta: { title: '方案申请管理' } },
      { path: 'intents', name: 'IntentList', component: IntentList, meta: { title: '需求意向管理' } },
      // 分类配置
      { path: 'categories', name: 'CategoryList', component: CategoryList, meta: { title: '分类配置' } },
    ],
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return next('/login')
  }
  if (to.path === '/login' && auth.isAuthenticated) {
    return next('/dashboard')
  }
  next()
})
