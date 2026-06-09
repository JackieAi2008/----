/**
 * 中集智历 - 数据库种子数据
 * 用于初始化系统默认数据
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化数据库...')

  // 创建系统默认任务类别
  const categories = [
    { name: '党建', color: '#E74C3C' },
    { name: '群团', color: '#3498DB' },
    { name: '行政', color: '#2ECC71' },
    { name: '节假日', color: '#F39C12' }
  ]

  for (const category of categories) {
    const existing = await prisma.taskCategory.findFirst({
      where: { name: category.name, isSystem: true }
    })

    if (!existing) {
      await prisma.taskCategory.create({
        data: {
          name: category.name,
          color: category.color,
          isSystem: true
        }
      })
      console.log(`创建系统类别: ${category.name}`)
    }
  }

  // 创建默认交付成果选项
  const deliverableOptions = ['活动新闻', '活动方案']

  for (const option of deliverableOptions) {
    const existing = await prisma.deliverableOption.findFirst({
      where: { name: option }
    })

    if (!existing) {
      await prisma.deliverableOption.create({
        data: { name: option }
      })
      console.log(`创建交付成果选项: ${option}`)
    }
  }

  // 创建超级管理员账号（可选）
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        nickname: '超级管理员',
        isAdmin: true
      }
    })
    console.log(`创建超级管理员: ${adminEmail}`)
    console.log('请及时修改默认密码!')
  }

  // 创建5个默认项目（党建工作、工会工作、共青团工作、公益工作、综合工作）
  const defaultProjects = [
    { name: '党建工作', category: 'PARTY_BUILDING', description: '党建相关工作项目' },
    { name: '工会工作', category: 'TRADE_UNION', description: '工会相关工作项目' },
    { name: '共青团工作', category: 'COMMUNIST_YOUTH_LEAGUE', description: '共青团相关工作项目' },
    { name: '公益工作', category: 'PUBLIC_WELFARE', description: '公益活动相关工作项目' },
    { name: '综合工作', category: 'COMPREHENSIVE', description: '综合性工作项目' }
  ]

  // 获取管理员用户作为项目owner
  const admin = await prisma.user.findFirst({ where: { isAdmin: true } })
  if (admin) {
    for (const proj of defaultProjects) {
      const existing = await prisma.project.findFirst({
        where: { name: proj.name, deletedAt: null }
      })

      if (!existing) {
        const project = await prisma.project.create({
          data: {
            name: proj.name,
            description: proj.description,
            category: proj.category,
            visibility: 'PUBLIC',
            ownerId: admin.id
          }
        })
        // 添加管理员为项目owner成员
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: admin.id,
            role: 'OWNER'
          }
        })
        console.log(`创建默认项目: ${proj.name} (${proj.category})`)
      }
    }
  }

  console.log('数据库初始化完成!')
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
