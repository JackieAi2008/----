import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 设置管理员 - 修改这里的邮箱
const TARGET_EMAIL = 'member@test.com'; // 改为您想设置管理员的邮箱

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL }
  });

  if (!user) {
    console.log(`用户 ${TARGET_EMAIL} 不存在`);
    return;
  }

  // 设置为系统管理员
  const updated = await prisma.user.update({
    where: { email: TARGET_EMAIL },
    data: { isAdmin: true }
  });

  console.log(`已将 ${updated.email} (${updated.nickname}) 设置为系统管理员`);
  console.log('请重新登录以生效');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
