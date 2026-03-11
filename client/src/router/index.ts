/**
 * 中集智历 - 路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
      },
      {
        path: 'admin/departments',
        name: 'DepartmentManage',
        component: () => import('@/views/admin/DepartmentManage.vue'),
        meta: { title: '部门管理', requiresAdmin: true }
      },
      {
        path: 'my-department',
        name: 'MyDepartment',
        component: () => import('@/views/department/MyDepartment.vue'),
        meta: { title: '我的部门', requiresDepartmentAdmin: true }
      },
      {
        path: 'my-department/members/:userId/calendar',
        name: 'MemberCalendar',
        component: () => import('@/views/department/MemberCalendar.vue'),
        meta: { title: '成员日历', requiresDepartmentAdmin: true }
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
router.beforeEach(async (to, _from, next) => {
  // 获取token
  const token = localStorage.getItem('token')

  // 需要认证但未登录
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
    return
  }

  // 已登录但访问登录页 - 需要验证token有效性
  if ((to.path === '/login' || to.path === '/register') && token) {
    // 验证token是否仍然有效
    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        await authStore.fetchCurrentUser()
      }
      // token有效，重定向到首页
      next('/')
      return
    } catch {
      // token无效，清除并允许访问登录/注册页
      localStorage.removeItem('token')
      next()
      return
    }
  }

  // 检查部门管理员权限
  if (to.meta.requiresDepartmentAdmin) {
    const authStore = useAuthStore()
    // 如果 store 还没有用户信息，尝试获取
    if (!authStore.user && token) {
      await authStore.fetchCurrentUser()
    }
    // 检查是否是系统管理员或部门管理员
    if (!authStore.isAdmin && !authStore.isDepartmentAdmin) {
      next('/dashboard')
      return
    }
  }

  // 检查系统管理员权限
  if (to.meta.requiresAdmin) {
    const authStore = useAuthStore()
    if (!authStore.user && token) {
      await authStore.fetchCurrentUser()
    }
    if (!authStore.isAdmin) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
