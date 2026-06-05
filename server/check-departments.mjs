import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const departments = await prisma.department.findMany({
    include: {
      admin: { select: { email: true, nickname: true } },
      members: { select: { id: true, email: true, nickname: true } }
    }
  });
  console.log('部门列表：');
  departments.forEach(d => {
    console.log(`\n部门: ${d.name} (${d.description || '无描述'})`);
    console.log(`  管理员: ${d.admin?.email || '无'} (${d.admin?.nickname || '无'})`);
    console.log(`  成员数: ${d.members.length}`);
    d.members.forEach(m => console.log(`    - ${m.email} (${m.nickname})`));
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
