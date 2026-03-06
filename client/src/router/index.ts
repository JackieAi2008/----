/**
 * 中集智历 - 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardPage.vue'),
        meta: { title: '概览' }
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/views/calendar/CalendarPage.vue'),
        meta: { title: '日历' }
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/views/project/ProjectList.vue'),
        meta: { title: '项目列表' }
      },
      {
        path: 'projects/deleted',
        name: 'DeletedProjects',
        component: () => import('@/views/project/DeletedProjects.vue'),
        meta: { title: '已删除的项目' }
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/views/project/ProjectDetail.vue'),
        meta: { title: '项目详情' }
      },
      {
        path: 'tasks/:id',
        name: 'TaskDetail',
        component: () => import('@/views/task/TaskDetail.vue'),
        meta: { title: '任务详情' }
      },
      {
        path: 'tasks/archived',
        name: 'ArchivedTasks',
        component: () => import('@/views/task/ArchivedTasks.vue'),
        meta: { title: '归档任务' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/ReportsPage.vue'),
        meta: { title: '总结归档' }
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('@/views/search/SearchResult.vue'),
        meta: { title: '搜索结果' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/SettingsPage.vue'),
        meta: { title: '设置' }
      }
    ]
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  // 获取token
  const token = localStorage.getItem('token')

  // 需要认证但未登录
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
    return
  }

  // 已登录但访问登录页
  if ((to.path === '/login' || to.path === '/register') && token) {
    next('/')
    return
  }

  next()
})

export default router
