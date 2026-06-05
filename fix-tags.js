const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW9sZndva2wwMDA0OTFzNDZyeXdxYmswIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzc5Mjc5NjMzLCJleHAiOjE3Nzk4ODQ0MzN9.VV2hgzGK1TT57VHfJlVtWU_8GOfqOUigPd7xtXSTKXs';
const BASE_URL = 'https://zjzl.alaa.org.cn/api';
const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` };

async function api(method, path, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return await res.json();
}

// 精确映射：任务标题关键词 -> { category, person }
const taskMeta = {
  '双重管理': { category: '创新工作', person: '孙凤娇' },
  '建党105': { category: '创新工作', person: '孙凤娇' },
  '党员先锋岗': { category: '创新工作', person: '孙凤娇' },
  '政绩观': { category: '创新工作', person: '孙凤娇' },
  '发展党员': { category: '改善工作', person: '孙凤娇' },
  '党内统计': { category: '改善工作', person: '孙凤娇' },
  '信息统计': { category: '改善工作', person: '孙凤娇' },
  '党建工作总结': { category: '创新工作', person: '孙凤娇' },
  '两个清单': { category: '创新工作', person: '陈楷' },
  '宋锦': { category: '改善工作', person: '刘佳欣' },
  '母亲节': { category: '改善工作', person: '刘佳欣' },
  '端午': { category: '改善工作', person: '刘佳欣' },
  '咖啡': { category: '改善工作', person: '刘佳欣' },
  '荔枝': { category: '创新工作', person: '刘佳欣' },
  '荔香': { category: '创新工作', person: '刘佳欣' },
  '送清凉': { category: '改善工作', person: '刘佳欣' },
  '清凉': { category: '改善工作', person: '刘佳欣' },
  '退伍': { category: '改善工作', person: '刘佳欣' },
  '军魂': { category: '改善工作', person: '刘佳欣' },
  '立秋': { category: '创新工作', person: '刘佳欣' },
  '奶茶': { category: '创新工作', person: '刘佳欣' },
  '中秋': { category: '改善工作', person: '刘佳欣' },
  '月满': { category: '改善工作', person: '刘佳欣' },
  '五小': { category: '改善工作', person: '刘佳欣' },
  'QC': { category: '创新工作', person: '刘佳欣' },
  '质量管理': { category: '创新工作', person: '刘佳欣' },
  'AED': { category: '创新工作', person: '刘佳欣' },
  '急救': { category: '创新工作', person: '刘佳欣' },
  '职代会': { category: '改善工作', person: '刘佳欣' },
  '表彰': { category: '改善工作', person: '刘佳欣' },
  '心灵驿站': { category: '改善工作', person: '刘佳欣' },
  '心理': { category: '改善工作', person: '刘佳欣' },
  '团委换届': { category: '改善工作', person: '陈楷' },
  '换届选举': { category: '改善工作', person: '陈楷' },
  '基层团组织': { category: '改善工作', person: '陈楷' },
  '换届建设': { category: '改善工作', person: '陈楷' },
  '五四': { category: '改善工作', person: '陈楷' },
  '青年座谈': { category: '改善工作', person: '陈楷' },
  '青年道': { category: '创新工作', person: '陈楷' },
  '青年集结号': { category: '创新工作', person: '陈楷' },
  '比赛': { category: '创新工作', person: '陈楷' },
  '集爱加油站': { category: '改善工作', person: '陈楷' },
  '爱心树': { category: '改善工作', person: '陈楷' },
  '公益日': { category: '改善工作', person: '陈楷' },
  '公益月': { category: '改善工作', person: '陈楷' },
  '后勤': { category: '创新工作', person: '刘佳欣' },
  'AI': { category: '创新工作', person: '孙凤娇' },
  '10万': { category: '创新工作', person: '陈楷' },
  '视频观察': { category: '创新工作', person: '陈楷' },
};

function findMeta(title) {
  for (const [keyword, meta] of Object.entries(taskMeta)) {
    if (title.includes(keyword)) return meta;
  }
  return null;
}

async function main() {
  const projectsRes = await api('GET', '/projects');
  const projects = projectsRes.data.filter(p => p.name.includes('党群部2026年度'));

  let updated = 0;
  for (const project of projects) {
    const tasksRes = await api('GET', `/tasks?projectId=${project.id}`);
    const tasks = tasksRes.data || [];

    for (const task of tasks) {
      const meta = findMeta(task.title);
      if (!meta) {
        console.log(`  SKIP (no meta): ${task.title}`);
        continue;
      }

      const tags = [meta.category, meta.person];
      const res = await api('PUT', `/tasks/${task.id}`, { tags });
      if (res.success) {
        console.log(`  OK: ${task.title} => ${JSON.stringify(tags)}`);
        updated++;
      } else {
        console.log(`  FAIL: ${task.title}: ${res.message}`);
      }
    }
  }

  console.log(`\nTotal updated: ${updated}`);
}

main().catch(console.error);
