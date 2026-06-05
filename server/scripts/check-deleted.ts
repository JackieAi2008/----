import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Check for soft-deleted tasks
  const deletedTasks = await prisma.task.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, title: true, deletedAt: true }
  })
  console.log(`Soft-deleted tasks: ${deletedTasks.length}`)
  for (const t of deletedTasks) {
    console.log(`  [${t.id.substring(0, 8)}] "${t.title}" deleted=${t.deletedAt}`)
  }

  // Total tasks including deleted
  const totalTasks = await prisma.task.count()
  console.log(`\nTotal tasks (incl deleted): ${totalTasks}`)

  // Check archived tasks via project
  const archivedProjects = await prisma.project.findMany({
    where: { archivedAt: { not: null } },
    select: { id: true, name: true }
  })
  console.log(`\nArchived projects: ${archivedProjects.length}`)
  for (const p of archivedProjects) {
    console.log(`  [${p.id.substring(0, 8)}] "${p.name}"`)
  }

  // Check if there's a separate database or environment
  console.log(`\nDatabase URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`)

  // Check ALL task counts including those in projects
  const projectTaskCounts = await prisma.project.findMany({
    select: {
      name: true,
      _count: { select: { tasks: true } }
    }
  })
  console.log('\nProject task counts:')
  for (const p of projectTaskCounts) {
    console.log(`  ${p.name}: ${p._count.tasks} tasks`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
