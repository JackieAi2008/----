import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, nickname: true, isAdmin: true }
  });
  console.log('用户列表：');
  users.forEach(u => console.log(`- ${u.email} (${u.nickname}): isAdmin=${u.isAdmin}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
