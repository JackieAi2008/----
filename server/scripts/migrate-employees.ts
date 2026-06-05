/**
 * 员工数据迁移脚本
 *
 * 线上旧用户（邮箱错误）→ 新用户（邮箱正确）
 *   admin@example.com (尹清正)     → qingzheng.yin@cimc.com
 *   sunfengjiao@cimc.com (孙凤娇)  → fengjiao.sun@cimc.com
 *   chenkai@cimc.com (陈楷)        → kai.chen@cimc.com
 *   liujiaxin@cimc.com (刘佳欣)    → jiaxin.liu@cimc.com
 *   (王田是全新用户，无旧数据)
 *
 * 处理：
 * 1. 创建新用户（如果不存在）
 * 2. 迁移所有任务、项目、部门关联
 * 3. 删除旧用户（孙凤娇、陈楷、刘佳欣）
 * 4. admin@example.com 保留但改为系统管理员（不删除）
 *
 * 用法: npx tsx scripts/migrate-employees.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'cimc8888'

// 旧邮箱 → 新信息 的映射
const MIGRATIONS = [
  { oldEmail: 'admin@example.com', nickname: '尹清正', newEmail: 'qingzheng.yin@cimc.com', isAdmin: true, deleteOld: false },
  { oldEmail: 'sunfengjiao@cimc.com', nickname: '孙凤娇', newEmail: 'fengjiao.sun@cimc.com', isAdmin: false, deleteOld: true },
  { oldEmail: 'chenkai@cimc.com', nickname: '陈楷', newEmail: 'kai.chen@cimc.com', isAdmin: false, deleteOld: true },
  { oldEmail: 'liujiaxin@cimc.com', nickname: '刘佳欣', newEmail: 'jiaxin.liu@cimc.com', isAdmin: false, deleteOld: true },
]

// 全新用户（无旧数据匹配）
const NEW_USERS = [
  { nickname: '王田', email: 'wangtian@cimc.com', isAdmin: false },
]

async function main() {
  console.log('========================================')
  console.log('  员工数据迁移脚本')
  console.log('========================================\n')

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  // Step 1: 显示当前用户
  const before = await prisma.user.findMany({
    select: { id: true, email: true, nickname: true, isAdmin: true, departmentId: true },
    orderBy: { createdAt: 'asc' }
  })
  console.log('--- 迁移前用户列表 ---')
  for (const u of before) {
    console.log(`  ${u.nickname} | ${u.email} | admin=${u.isAdmin}`)
  }
  console.log()

  // Step 2: 逐个处理迁移
  for (const mig of MIGRATIONS) {
    const oldUser = await prisma.user.findUnique({ where: { email: mig.oldEmail } })
    let newUser = await prisma.user.findUnique({ where: { email: mig.newEmail } })

    if (!oldUser) {
      console.log(`[跳过] 旧用户 ${mig.nickname} (${mig.oldEmail}) 不存在`)
      // 确保新用户存在
      if (!newUser) {
        newUser = await prisma.user.create({
          data: { email: mig.newEmail, password: hashedPassword, nickname: mig.nickname, isAdmin: mig.isAdmin }
        })
        console.log(`  → 创建新用户: ${mig.newEmail}`)
      }
      continue
    }

    // 创建新用户（如果不存在）
    if (!newUser) {
      newUser = await prisma.user.create({
        data: {
          email: mig.newEmail,
          password: hashedPassword,
          nickname: mig.nickname,
          isAdmin: mig.isAdmin,
          departmentId: oldUser.departmentId || null,
        }
      })
      console.log(`[创建] ${mig.nickname} → ${mig.newEmail}${mig.isAdmin ? ' ★管理员' : ''}`)
    } else {
      // 确保管理员身份
      if (mig.isAdmin && !newUser.isAdmin) {
        await prisma.user.update({ where: { id: newUser.id }, data: { isAdmin: true } })
      }
      // 继承部门
      if (oldUser.departmentId && !newUser.departmentId) {
        await prisma.user.update({ where: { id: newUser.id }, data: { departmentId: oldUser.departmentId } })
      }
      console.log(`[已有] ${mig.nickname} (${mig.newEmail})`)
    }

    const oldId = oldUser.id
    const newId = newUser.id

    if (oldId === newId) {
      console.log('  旧=新，跳过迁移')
      continue
    }

    // 迁移数据
    let count = 0

    await prisma.$transaction(async (tx) => {
      // 任务：被分配的
      const assigned = await tx.task.updateMany({ where: { assigneeId: oldId }, data: { assigneeId: newId } })
      count += assigned.count

      // 任务：创建的
      const created = await tx.task.updateMany({ where: { creatorId: oldId }, data: { creatorId: newId } })
      count += created.count

      // 任务协作者
      const collabs = await tx.taskCollaborator.updateMany({ where: { userId: oldId }, data: { userId: newId } })
      count += collabs.count

      // 项目成员（去重）
      const newMemberships = await tx.projectMember.findMany({ where: { userId: newId }, select: { projectId: true } })
      const newProjectIds = new Set(newMemberships.map(m => m.projectId))
      const oldMemberships = await tx.projectMember.findMany({ where: { userId: oldId } })
      for (const m of oldMemberships) {
        if (newProjectIds.has(m.projectId)) {
          await tx.projectMember.delete({ where: { id: m.id } })
        } else {
          await tx.projectMember.update({ where: { id: m.id }, data: { userId: newId } })
        }
        count++
      }

      // 拥有的项目
      const owned = await tx.project.updateMany({ where: { ownerId: oldId }, data: { ownerId: newId } })
      count += owned.count

      // 评论
      const comments = await tx.comment.updateMany({ where: { userId: oldId }, data: { userId: newId } })
      count += comments.count

      // 部门管理员
      const dept = await tx.department.findUnique({ where: { adminId: oldId } })
      if (dept) {
        await tx.department.update({ where: { id: dept.id }, data: { adminId: newId } })
        count++
      }
    })

    console.log(`  迁移 ${count} 条数据`)

    // 删除旧用户（孙凤娇、陈楷、刘佳欣）
    if (mig.deleteOld) {
      await prisma.$transaction(async (tx) => {
        await tx.securityAnswer.deleteMany({ where: { userId: oldId } })
        await tx.notification.deleteMany({ where: { userId: oldId } })
        await tx.projectMember.deleteMany({ where: { userId: oldId } })
        await tx.taskCollaborator.deleteMany({ where: { userId: oldId } })
        await tx.user.delete({ where: { id: oldId } })
      })
      console.log(`  [删除] 旧用户 ${mig.oldEmail}`)
    }
    console.log()
  }

  // Step 3: 创建全新用户（王田）
  for (const u of NEW_USERS) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } })
    if (!exists) {
      await prisma.user.create({
        data: { email: u.email, password: hashedPassword, nickname: u.nickname, isAdmin: u.isAdmin }
      })
      console.log(`[创建] ${u.nickname} (${u.email})`)
    }
  }

  // Step 4: 处理 admin@example.com（保留但隐藏）
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })
  if (adminUser) {
    // 解除部门关联、部门管理员身份（让尹清正接管）
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { departmentId: null }
    })
    // 如果尹清正还没接管部门管理员，让 admin@example.com 的部门管理权移交给尹清正
    const yinNew = await prisma.user.findUnique({ where: { email: 'qingzheng.yin@cimc.com' } })
    const adminDept = await prisma.department.findUnique({ where: { adminId: adminUser.id } })
    if (adminDept && yinNew) {
      await prisma.department.update({ where: { id: adminDept.id }, data: { adminId: yinNew.id } })
      console.log('[转移] 部门管理员 → 尹清正')
    }
    console.log('[隐藏] admin@example.com 已从部门移除，保留为系统备份管理员')
  }

  // Step 5: 最终验证
  console.log('\n--- 迁移后用户列表 ---\n')
  const after = await prisma.user.findMany({
    select: {
      id: true, email: true, nickname: true, isAdmin: true,
      departmentId: true, department: { select: { name: true } },
      _count: { select: { assignedTasks: true, createdTasks: true, projectMemberships: true, ownedProjects: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  for (const u of after) {
    const tasks = u._count.assignedTasks + u._count.createdTasks
    console.log(`  ${u.nickname} | ${u.email} | admin=${u.isAdmin} | dept=${u.department?.name || 'none'} | tasks=${tasks}`)
  }

  console.log('\n========================================')
  console.log('  迁移完成！')
  console.log('========================================')
}

main()
  .catch((e) => { console.error('迁移失败:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
