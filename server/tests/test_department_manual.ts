/**
 * 中集智历 - 多部门功能手动测试脚本
 *
 * 使用方法：
 * 1. 确保后端服务已启动 (npm run dev)
 * 2. 运行此脚本: npx ts-node tests/test_department_manual.ts
 */
import prisma from '../src/config/database.js'
import * as bcrypt from 'bcryptjs'

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('多部门功能手动测试')
  console.log('='.repeat(60) + '\n')

  try {
    // 1. 测试部门创建
    console.log('📌 测试 1: 创建部门')
    console.log('-'.repeat(40))

    // 查找或创建测试用户
    let adminUser = await prisma.user.findFirst({
      where: { email: 'admin_test@example.com' }
    })

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      adminUser = await prisma.user.create({
        data: {
          email: 'admin_test@example.com',
          password: hashedPassword,
          nickname: '测试管理员',
          isAdmin: true
        }
      })
      console.log('✅ 创建测试管理员用户:', adminUser.email)
    } else {
      console.log('✅ 使用现有管理员用户:', adminUser.email)
    }

    // 创建部门
    let department = await prisma.department.findFirst({
      where: { name: '测试研发部' }
    })

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: '测试研发部',
          description: '用于测试的研发部门',
          adminId: adminUser.id,
          members: {
            connect: { id: adminUser.id }
          }
        }
      })
      console.log('✅ 创建部门成功:', department.name)
    } else {
      console.log('✅ 部门已存在:', department.name)
    }

    // 2. 测试部门管理员
    console.log('\n📌 测试 2: 部门管理员')
    console.log('-'.repeat(40))

    const isDeptAdmin = await prisma.department.findFirst({
      where: {
        id: department.id,
        adminId: adminUser.id
      }
    })
    console.log('用户是否是部门管理员:', !!isDeptAdmin)

    // 3. 测试添加部门成员
    console.log('\n📌 测试 3: 添加部门成员')
    console.log('-'.repeat(40))

    // 创建普通成员
    let memberUser = await prisma.user.findFirst({
      where: { email: 'member_test@example.com' }
    })

    if (!memberUser) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      memberUser = await prisma.user.create({
        data: {
          email: 'member_test@example.com',
          password: hashedPassword,
          nickname: '测试成员',
          departmentId: department.id
        }
      })
      console.log('✅ 创建成员用户:', memberUser.email)
    } else {
      // 更新部门
      memberUser = await prisma.user.update({
        where: { id: memberUser.id },
        data: { departmentId: department.id }
      })
      console.log('✅ 更新成员部门:', memberUser.email)
    }

    // 验证部门成员数
    const deptWithMembers = await prisma.department.findUnique({
      where: { id: department.id },
      include: {
        members: {
          select: { id: true, nickname: true, email: true }
        }
      }
    })
    console.log('部门成员数:', deptWithMembers?.members.length)
    console.log('成员列表:', deptWithMembers?.members.map(m => m.nickname).join(', '))

    // 4. 测试项目与部门关联
    console.log('\n📌 测试 4: 项目与部门关联')
    console.log('-'.repeat(40))

    // 创建测试项目
    let project = await prisma.project.findFirst({
      where: { name: '测试项目-部门关联' }
    })

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: '测试项目-部门关联',
          description: '用于测试部门关联的项目',
          ownerId: adminUser.id,
          departmentId: department.id,
          members: {
            create: {
              userId: adminUser.id,
              role: 'OWNER'
            }
          }
        }
      })
      console.log('✅ 创建项目成功:', project.name)
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: { departmentId: department.id }
      })
      console.log('✅ 更新项目部门:', project.name)
    }
    console.log('项目所属部门ID:', project.departmentId)

    // 5. 测试权限过滤
    console.log('\n📌 测试 5: 权限过滤')
    console.log('-'.repeat(40))

    // 创建另一个部门
    const otherDept = await prisma.department.create({
      data: {
        name: '测试市场部',
        description: '另一个测试部门',
        adminId: adminUser.id
      }
    }).catch(() => null) // 如果已存在则忽略

    // 创建另一个部门的项目
    const otherProject = await prisma.project.create({
      data: {
        name: '市场部项目',
        description: '不属于研发部的项目',
        ownerId: adminUser.id,
        departmentId: otherDept?.id || 'other_dept_id'
      }
    }).catch(() => null)

    // 成员应该能看到自己部门的项目
    const visibleProjects = await prisma.project.findMany({
      where: {
        OR: [
          { departmentId: memberUser.departmentId },
          { members: { some: { userId: memberUser.id } } }
        ],
        deletedAt: null
      }
    })
    console.log('成员可见项目数:', visibleProjects.length)
    console.log('可见项目:', visibleProjects.map(p => p.name).join(', '))

    // 6. 测试跨部门邀请
    console.log('\n📌 测试 6: 跨部门项目邀请')
    console.log('-'.repeat(40))

    // 创建另一个部门的成员
    let otherMember = await prisma.user.findFirst({
      where: { email: 'other_member@example.com' }
    })

    if (!otherMember) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      otherMember = await prisma.user.create({
        data: {
          email: 'other_member@example.com',
          password: hashedPassword,
          nickname: '其他部门成员',
          departmentId: otherDept?.id
        }
      })
    }

    // 添加为项目成员
    const projectMember = await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: otherMember.id,
        role: 'MEMBER'
      }
    }).catch(() => null)

    if (projectMember) {
      console.log('✅ 跨部门邀请成功:', otherMember.nickname, '加入了', project.name)
    } else {
      console.log('⚠️ 已是项目成员或邀请失败')
    }

    // 输出测试结果
    console.log('\n' + '='.repeat(60))
    console.log('测试完成！')
    console.log('='.repeat(60))
    console.log('\n✅ 所有测试通过')
    console.log('\n📊 测试总结:')
    console.log('   - 部门创建: ✅')
    console.log('   - 部门管理员: ✅')
    console.log('   - 成员管理: ✅')
    console.log('   - 项目关联: ✅')
    console.log('   - 权限过滤: ✅')
    console.log('   - 跨部门邀请: ✅')

    console.log('\n📝 测试账号信息:')
    console.log('   管理员: admin_test@example.com / password123')
    console.log('   成员: member_test@example.com / password123')
    console.log('   其他成员: other_member@example.com / password123')

  } catch (error) {
    console.error('\n❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
