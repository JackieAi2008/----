import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== 用户权限检查 ===\n');

  const users = await prisma.user.findMany({
    include: {
      department: { select: { id: true, name: true } }
    }
  });

  for (const user of users) {
    // 检查是否是部门管理员
    const managedDepartment = await prisma.department.findUnique({
      where: { adminId: user.id },
      select: { id: true, name: true }
    });

    const isDepartmentAdmin = !!managedDepartment;

    console.log(`用户: ${user.email} (${user.nickname})`);
    console.log(`  - 系统管理员 (isAdmin): ${user.isAdmin}`);
    console.log(`  - 部门管理员 (isDepartmentAdmin): ${isDepartmentAdmin}`);
    console.log(`  - 所属部门: ${user.department?.name || '无'}`);
    console.log(`  - 管理的部门: ${managedDepartment?.name || '无'}`);

    // 显示可见菜单
    const menus = [];
    if (user.isAdmin) {
      menus.push('部门管理', '用户管理');
    }
    if (isDepartmentAdmin && !user.isAdmin) {
      menus.push('我的部门');
    }
    console.log(`  - 可见管理菜单: ${menus.length > 0 ? menus.join(', ') : '无'}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
