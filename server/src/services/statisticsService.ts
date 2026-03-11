/**
 * 中集智历 - 统计服务
 */
import prisma from '../config/database.js'

/**
 * 计算部门任务统计
 */
export async function calculateDepartmentTaskStats(departmentId: string) {
  // 获取部门下所有项目ID
  const projects = await prisma.project.findMany({
    where: { departmentId, deletedAt: null },
    select: { id: true }
  })
  const projectIds = projects.map(p => p.id)

  // 统计任务状态
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      deletedAt: null
    },
    select: { status: true, dueDate: true }
  })

  const now = new Date()
  const stats = {
    todo: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0,
    overdue: 0
  }

  for (const task of tasks) {
    switch (task.status) {
      case 'TODO':
        stats.todo++
        if (task.dueDate && new Date(task.dueDate) < now) {
          stats.overdue++
        }
        break
      case 'IN_PROGRESS':
        stats.inProgress++
        break
      case 'DONE':
        stats.done++
        break
      case 'CANCELLED':
        stats.cancelled++
        break
    }
  }

  return stats
}

/**
 * 计算部门项目统计
 */
export async function calculateDepartmentProjectStats(departmentId: string) {
  const projects = await prisma.project.findMany({
    where: { departmentId, deletedAt: null },
    select: { id: true }
  })

  const projectIds = projects.map(p => p.id)
  const totalTasks = await prisma.task.count({
    where: { projectId: { in: projectIds }, deletedAt: null }
  })
  const doneTasks = await prisma.task.count({
    where: { projectId: { in: projectIds }, status: 'DONE', deletedAt: null }
  })

  return {
    active: projects.length,
    completed: 0, // 项目没有完成状态，暂时返回0
    progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  }
}

/**
 * 计算成员工作负载
 */
export async function calculateMemberWorkload(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      deletedAt: null,
      isArchived: false
    },
    select: { status: true }
  })

  return {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length
  }
}

/**
 * 计算全局统计
 */
export async function calculateGlobalStats() {
  const [departments, users, projects, tasks] = await Promise.all([
    prisma.department.count(),
    prisma.user.count({ where: { isBanned: false } }),
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.task.count({ where: { deletedAt: null } })
  ])

  const tasksByStatus = await prisma.task.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: true
  })

  const statusCounts = {
    todo: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0
  }

  for (const item of tasksByStatus) {
    switch (item.status) {
      case 'TODO':
        statusCounts.todo = item._count
        break
      case 'IN_PROGRESS':
        statusCounts.inProgress = item._count
        break
      case 'DONE':
        statusCounts.done = item._count
        break
      case 'CANCELLED':
        statusCounts.cancelled = item._count
        break
    }
  }

  return {
    departments,
    users,
    projects,
    tasks,
    tasksByStatus: statusCounts
  }
}
