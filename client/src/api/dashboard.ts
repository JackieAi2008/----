/**
 * 中集智历 - 仪表盘 API
 */
import { get } from '@/utils/request'
import type { User } from '@/types/user'
import type { ProjectCategory } from '@/types/project'

// 通用仪表盘数据类型（用于个人仪表盘）
export interface DashboardData {
  todayTasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string
    project?: { id: string; name: string }
    category?: { id: string; name: string; color: string }
  }>
  overdueTasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string
    project?: { id: string; name: string }
    category?: { id: string; name: string; color: string }
  }>
  upcomingTasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string
    project?: { id: string; name: string }
    category?: { id: string; name: string; color: string }
  }>
  weekTasksCount: number
  monthStats: {
    total: number
    done: number
    completionRate: number
  }
  projectCount: number
  recentProjects: Array<{
    id: string
    name: string
    description?: string
    taskCount: number
    visibility?: 'PUBLIC' | 'PRIVATE'
    category?: ProjectCategory | null
    _count?: { tasks: number }
  }>
}

// 工作统计数据类型
export interface WorkStats {
  daily: Array<{
    date: string
    created: number
    completed: number
  }>
  weekly: Array<{
    week: string
    created: number
    completed: number
  }>
  monthly: Array<{
    month: string
    created: number
    completed: number
  }>
  statusStats?: Array<{
    status: string
    count: number
  }>
  projectStats?: Array<{
    projectId: string
    projectName: string
    count: number
  }>
}

/**
 * 获取个人仪表盘数据
 */
export async function getDashboard() {
  const response = await get<DashboardData>('/dashboard')
  return response.data
}

/**
 * 获取工作统计数据
 */
export async function getWorkStats(range?: 'day' | 'week' | 'month' | { startDate: string; endDate: string }) {
  if (!range) {
    const response = await get<WorkStats>('/dashboard/stats')
    return response.data
  }
  if (typeof range === 'string') {
    const response = await get<WorkStats>(`/dashboard/stats?range=${range}`)
    return response.data
  }
  const response = await get<WorkStats>(`/dashboard/stats?startDate=${range.startDate}&endDate=${range.endDate}`)
  return response.data
}

// 部门仪表盘数据类型
export interface DepartmentDashboard {
  department: {
    id: string
    name: string
    description?: string
    adminId: string
  }
  statistics: {
    tasks: {
      todo: number
      inProgress: number
      done: number
      cancelled: number
      overdue: number
    }
    projects: {
      active: number
      completed: number
    }
    members: {
      total: number
      activeThisWeek: number
    }
  }
  members: Array<User & {
    workload: {
      total: number
      todo: number
      inProgress: number
      done: number
    }
  }>
  projects: Array<{
    id: string
    name: string
    progress: number
    taskCount: number
  }>
  recentTasks: Array<{
    id: string
    title: string
    status: string
    dueDate: string
    assignee: {
      id: string
      nickname: string
    }
    project?: {
      id: string
      name: string
    }
  }>
}

// 系统管理仪表盘数据类型
export interface AdminDashboard {
  overview: {
    departments: number
    users: number
    projects: number
    tasks: number
    tasksByStatus: {
      todo: number
      inProgress: number
      done: number
      cancelled: number
    }
  }
  departments: Array<{
    id: string
    name: string
    memberCount: number
    projectCount: number
    taskStats: {
      todo: number
      inProgress: number
      done: number
    }
  }>
}

// 成员详情数据类型
export interface MemberDetail {
  user: User
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string
    project: {
      id: string
      name: string
    }
  }>
  calendar: Array<{
    date: string
    taskCount: number
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate: string
      project?: {
        id: string
        name: string
      }
    }>
  }>
}

/**
 * 获取部门仪表盘数据
 */
export async function getDepartmentDashboard(departmentId: string) {
  const response = await get<DepartmentDashboard>(`/departments/${departmentId}/dashboard`)
  return response.data
}

/**
 * 获取系统管理仪表盘数据
 */
export async function getAdminDashboard() {
  const response = await get<AdminDashboard>('/admin/dashboard')
  return response.data
}

/**
 * 获取成员详情
 */
export async function getMemberDetail(departmentId: string, userId: string) {
  const response = await get<MemberDetail>(`/departments/${departmentId}/members/${userId}`)
  return response.data
}
