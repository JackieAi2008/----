import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Check all tasks
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      assigneeId: true,
      assignee: { select: { nickname: true, email: true } },
      creatorId: true,
      creator: { select: { nickname: true, email: true } },
      projectId: true,
      project: { select: { name: true } },
      collaborators: {
        select: {
          userId: true,
          user: { select: { nickname: true, email: true } }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`=== Tasks (${tasks.length} total) ===\n`)
  for (const t of tasks) {
    console.log(`[${t.id.substring(0, 8)}] "${t.title}"`)
    console.log(`  status=${t.status} project=${t.project?.name || 'none'}`)
    console.log(`  creator=${t.creator?.nickname} (${t.creator?.email})`)
    console.log(`  assignee=${t.assignee?.nickname || 'none'} (${t.assignee?.email || 'none'})`)
    if (t.collaborators.length > 0) {
      console.log(`  collaborators: ${t.collaborators.map(c => c.user.nickname || c.user.email).join(', ')}`)
    }
    console.log()
  }

  // Check projects
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { nickname: true, email: true } },
      members: {
        select: {
          userId: true,
          user: { select: { nickname: true, email: true } }
        }
      }
    }
  })

  console.log(`\n=== Projects (${projects.length} total) ===\n`)
  for (const p of projects) {
    console.log(`[${p.id.substring(0, 8)}] "${p.name}"`)
    console.log(`  owner=${p.owner?.nickname} (${p.owner?.email})`)
    console.log(`  members: ${p.members.map(m => m.user.nickname || m.user.email).join(', ')}`)
    console.log()
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
