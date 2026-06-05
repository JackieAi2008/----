import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nickname: true,
      isAdmin: true,
      departmentId: true,
      createdAt: true,
      _count: {
        select: {
          assignedTasks: true,
          createdTasks: true,
          taskCollaborations: true,
          projectMemberships: true,
          ownedProjects: true,
          comments: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log('=== All users ===\n')
  for (const u of users) {
    console.log(`[${u.id}] ${u.nickname} | ${u.email} | admin=${u.isAdmin} | dept=${u.departmentId || 'none'}`)
    console.log(`   assigned=${u._count.assignedTasks} created=${u._count.createdTasks} collab=${u._count.taskCollaborations} projects=${u._count.projectMemberships} owned=${u._count.ownedProjects}`)
    console.log(`   created=${u.createdAt}`)
    console.log()
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
