const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW9sZndva2wwMDA0OTFzNDZyeXdxYmswIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzc5Mjc5NjMzLCJleHAiOjE3Nzk4ODQ0MzN9.VV2hgzGK1TT57VHfJlVtWU_8GOfqOUigPd7xtXSTKXs';
const BASE_URL = 'https://zjzl.alaa.org.cn/api';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

async function api(method, path, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return await res.json();
}

async function main() {
  // ===== Step 1: 创建3个用户 =====
  console.log('===== Step 1: Creating users =====');

  const users = [
    { email: 'sunfengjiao@cimc.com', password: 'cimc2026', nickname: '孙凤娇', securityQuestion: 0, securityAnswer: 'cimc' },
    { email: 'liujiaxin@cimc.com', password: 'cimc2026', nickname: '刘佳欣', securityQuestion: 0, securityAnswer: 'cimc' },
    { email: 'chenkai@cimc.com', password: 'cimc2026', nickname: '陈楷', securityQuestion: 0, securityAnswer: 'cimc' },
  ];

  const userMap = {}; // nickname -> userId
  for (const u of users) {
    // 先尝试通过 /auth/register 注册
    let res = await api('POST', '/auth/register', u);
    if (res.success) {
      userMap[u.nickname] = res.data?.user?.id || res.data?.id;
      console.log(`  Registered: ${u.nickname} => ${userMap[u.nickname]}`);
    } else {
      console.log(`  Register failed for ${u.nickname}: ${res.message}`);
      // 再尝试管理员创建
      res = await api('POST', '/users/create', u);
      if (res.success) {
        userMap[u.nickname] = res.data.id;
        console.log(`  Admin created: ${u.nickname} => ${res.data.id}`);
      } else {
        console.log(`  Admin create also failed: ${res.message}`);
        // Try to find existing user by searching
        const searchRes = await api('GET', `/users/search?keyword=${encodeURIComponent(u.nickname)}`);
        if (searchRes.success && searchRes.data?.length > 0) {
          const existing = searchRes.data[0];
          userMap[u.nickname] = existing.id;
          console.log(`  Found existing: ${u.nickname} => ${existing.id}`);
        } else {
          console.log(`  Could not find/create user: ${u.nickname}`);
        }
      }
    }
  }

  console.log('User map:', JSON.stringify(userMap));

  // ===== Step 2: 获取所有项目 =====
  console.log('\n===== Step 2: Getting projects =====');
  const projectsRes = await api('GET', '/projects');
  const projects = projectsRes.data || [];
  console.log(`  Found ${projects.length} projects`);

  // 找到党群部的5个项目
  const targetProjects = projects.filter(p =>
    p.name.includes('党群部2026年度')
  );
  console.log(`  Target projects: ${targetProjects.map(p => p.name).join(', ')}`);

  // ===== Step 3: 将3个用户加入所有项目 =====
  console.log('\n===== Step 3: Adding users to projects =====');
  for (const project of targetProjects) {
    for (const [nickname, userId] of Object.entries(userMap)) {
      const res = await api('POST', `/projects/${project.id}/members`, { userId });
      if (res.success) {
        console.log(`  Added ${nickname} to ${project.name}`);
      } else {
        console.log(`  Add ${nickname} to ${project.name}: ${res.message}`);
      }
    }
  }

  // ===== Step 4: 获取所有任务并重分配 =====
  console.log('\n===== Step 4: Reassigning tasks =====');

  // 负责人映射：根据标签中的名字分配
  const assigneeMap = {
    '孙凤娇': userMap['孙凤娇'],
    '刘佳欣': userMap['刘佳欣'],
    '陈楷': userMap['陈楷'],
  };

  for (const project of targetProjects) {
    // 获取项目任务
    const tasksRes = await api('GET', `/tasks?projectId=${project.id}`);
    const tasks = tasksRes.data || [];

    for (const task of tasks) {
      // 从描述中提取负责人
      const desc = task.description || '';
      const match = desc.match(/负责人：(.+)/);
      let assigneeName = null;
      if (match) {
        assigneeName = match[1].trim();
      }

      const assigneeId = assigneeMap[assigneeName];
      if (!assigneeId) {
        console.log(`  SKIP: ${task.title} (no match for "${assigneeName}")`);
        continue;
      }

      if (task.assigneeId === assigneeId) {
        console.log(`  SKIP: ${task.title} (already correct)`);
        continue;
      }

      const res = await api('PUT', `/tasks/${task.id}`, { assigneeId });
      if (res.success) {
        console.log(`  OK: ${task.title} => ${assigneeName}`);
      } else {
        console.log(`  FAIL: ${task.title}: ${res.message}`);
      }
    }
  }

  console.log('\n===== ALL DONE =====');
}

main().catch(console.error);
