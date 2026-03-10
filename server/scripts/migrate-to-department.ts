/**
 * 中集智历 - 部门数据迁移脚本
 *
 * 用法：
 * 1. 先备份数据库：cp prisma/prisma/data.db prisma/prisma/data.db.backup
 * 2. 运行迁移：npx ts-node scripts/migrate-to-department.ts
 *
 * 可选参数：
 * - DEFAULT_DEPT_NAME: 默认部门名称（默认：默认部门）
 * - DEFAULT_DEPT_DESC: 默认部门描述（默认：迁移时自动创建）
 */
import prisma from '../src/config/database.js'

async function main() {
  console.log('开始部门数据迁移...\  ')

  const defaultDeptName = process.env.DEFAULT_DEPT_NAME || '默认部门'
  const defaultDeptDesc = process.env.DEFAULT_DEPT_DESC || '系统迁移时自动创建'

  try {
    // 1. 查找第一个系统管理员
    const admin = await prisma.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: 'asc' }
  })

    if (!admin) {
    console.log('未找到系统管理员，请先创建一个系统管理员账号')
    return
  }

    console.log(`找到系统管理员: ${admin.nickname} (${admin.email})`)

    // 2. 检查是否已存在默认部门
    let department = await prisma.department.findFirst({
    where: { name: defaultDeptName }
  })

    if (department) {
    console.log(`部门「${defaultDeptName}」已存在`)
  } else {
    // 3. 创建默认部门
    department = await prisma.department.create({
      data: {
        name: defaultDeptName,
        description: defaultDeptDesc,
        adminId: admin.id
      },
      include: {
        admin: {
          select: { id: true, nickname: true, email: true }
        }
      }
    })
    console.log(`创建部门「${defaultDeptName}」，管理员: ${admin.nickname}`)

    // 将管理员加入部门
    await prisma.user.update({
      where: { id: admin.id },
      data: { departmentId: department.id }
    })
    console.log(`已将 ${admin.nickname} 加入部门`)
  }

  // 4. 统计未分配部门的用户
  const usersWithoutDept = await prisma.user.findMany({
    where: {
      departmentId: null,
      isAdmin: false
      },
      select: { id: true, nickname: true, email: true }
    })

    console.log(`发现 ${usersWithoutDept.length} 个用户未分配部门`)

    if (usersWithoutDept.length === 0) {
    console.log('没有需要迁移的用户')
    return
  }

    // 5. 将未分配部门的用户加入默认部门
    const result = await prisma.user.updateMany({
      where: {
        id: { in: usersWithoutDept.map(u => u.id) }
      },
      data: {
        departmentId: department.id
      }
    })

    console.log(`已将 ${result.count} 个用户迁移到部门「${defaultDeptName}」`)

    // 6. 统计未分配部门的项目
    const projectsWithoutDept = await prisma.project.findMany({
      where: {
        departmentId: null,
        deletedAt: null
      },
      select: { id: true, name: true, ownerId: true }
    })

    console.log(`发现 ${projectsWithoutDept.length} 个项目未分配部门`)

    if (projectsWithoutDept.length === 0) {
    console.log('没有需要迁移的项目')
    return
    }

    // 7. 将未分配部门的项目迁移到创建者的部门
    let migratedProjects = 0
    for (const project of projectsWithoutDept) {
    const owner = await prisma.user.findUnique({
      where: { id: project.ownerId },
      select: { departmentId: true }
    })

    if (owner?.departmentId) {
      await prisma.project.update({
        where: { id: project.id },
        data: { departmentId: owner.departmentId }
      })
      migratedProjects++
    }
  }

    console.log(`已将 ${migratedProjects} 个项目迁移到对应用户的部门`)

    // 8. 输出迁移结果
    console.log('\n迁移完成!')
    console.log('='.repeat(50))
    console.log(`部门: ${department.name} (ID: ${department.id})`)
    console.log(`管理员: ${department.admin.nickname} (${department.admin.email})`)
    console.log(`迁移用户数: ${result.count}`)
    console.log(`迁移项目数: ${migratedProjects}`)
    console.log('='.repeat(50))

  } catch (error) {
    console.error('迁移失败:', error)
    process.exit(1)
  }
}

main()
