
// 阶段 1：把王田补进所有项目的 ProjectMember，使“新建任务”负责人下拉能用
// 幂等：若已存在则跳过
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'wangtian@cimc.com' }
  })
  if (!user) {
    console.error('未找到 wangtian@cimc.com 用户，请先创建该账号')
    process.exit(1)
  }
  console.log('王田 user.id =', user.id)

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true }
  })
  console.log('找到 ' + projects.length + ' 个项目')

  let added = 0
  let skipped = 0
  for (const p of projects) {
    const exists = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: p.id, userId: user.id } }
    })
    if (exists) {
      skipped++
      console.log('  [skip] ' + p.name)
      continue
    }
    await prisma.projectMember.create({
      data: { projectId: p.id, userId: user.id, role: 'MEMBER' }
    })
    added++
    console.log('  [add]  ' + p.name)
  }

  console.log('完成：新增 ' + added + ' 条，跳过 ' + skipped + ' 条')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('ERROR:', e.message)
    return prisma.$disconnect().then(() => process.exit(1))
  })
