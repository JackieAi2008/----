/**
 * 批量创建用户脚本
 * 用法: npx tsx scripts/add-users.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'cimc8888'

const users = [
  { email: 'qingzheng.yin@cimc.com', nickname: '尹清正', isAdmin: true },
  { email: 'fengjiao.sun@cimc.com', nickname: '孙凤娇', isAdmin: false },
  { email: 'kai.chen@cimc.com', nickname: '陈楷', isAdmin: false },
  { email: 'wangtian@cimc.com', nickname: '王田', isAdmin: false },
  { email: 'jiaxin.liu@cimc.com', nickname: '刘佳欣', isAdmin: false },
]

async function main() {
  console.log('开始创建用户...\n')

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })

    if (existing) {
      // 已存在则更新 isAdmin 字段
      if (u.isAdmin && !existing.isAdmin) {
        await prisma.user.update({
          where: { email: u.email },
          data: { isAdmin: true, nickname: u.nickname },
        })
        console.log(`[更新] ${u.nickname} (${u.email}) → 设为管理员`)
      } else {
        console.log(`[跳过] ${u.nickname} (${u.email}) 已存在`)
      }
      continue
    }

    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: hashedPassword,
        nickname: u.nickname,
        isAdmin: u.isAdmin,
      },
    })

    console.log(
      `[创建] ${u.nickname} (${u.email})${u.isAdmin ? ' ★管理员' : ''} id=${user.id}`
    )
  }

  console.log('\n全部用户处理完毕!')
}

main()
  .catch((e) => {
    console.error('创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
