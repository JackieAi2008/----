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
