/**
 * 创建管理员账号
 */
import * as bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('创建管理员账号...')
  console.log('='.repeat(50))

  try {
    // 检查是否已存在
    let admin = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    })

    if (admin) {
    console.log('\n✅ 管理员账号已存在:')
    console.log('   邮箱: admin@example.com')
    console.log('   密码: admin123')
    console.log('   昵称:', admin.nickname)
    return
  }

    // 创建管理员
    const hashedPassword = await bcrypt.hash('admin123', 10)
    admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        nickname: '系统管理员',
        isAdmin: true
      }
    })

    console.log('\n✅ 管理员账号创建成功!')
    console.log('='.repeat(50))
    console.log('   邮箱: admin@example.com')
    console.log('   密码: admin123')
    console.log('   昵称:', admin.nickname)
    console.log('='.repeat(50))
    console.log('\n现在可以使用这些凭据登录系统了!')

  } catch (error) {
    console.error('创建失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
