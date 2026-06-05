const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW9sZndva2wwMDA0OTFzNDZyeXdxYmswIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzc5Mjc5NjMzLCJleHAiOjE3Nzk4ODQ0MzN9.VV2hgzGK1TT57VHfJlVtWU_8GOfqOUigPd7xtXSTKXs';
const USER_ID = 'cmolfwokl000491s46rywqbk0';
const BASE_URL = 'https://zjzl.alaa.org.cn/api';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

async function api(method, path, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  if (!data.success) console.error(`FAIL ${method} ${path}:`, JSON.stringify(data));
  return data;
}

// ===== 1. 删除之前创建的5个项目 =====
const OLD_PROJECT_IDS = [
  '83865c87-470d-4036-ab52-26e2846f29a5', // 2026年党建重点工作
  'd3576289-2455-4ea1-89fa-4f8ce4439d07', // 2026年工会重点工作
  '2e3f58f8-af88-4cf7-be07-7ce9ff186406', // 2026年共青团工作
  '7a9312db-0810-4227-bd4b-4809ce18ad49', // 2026年公益工作
  '79f9ef37-3cfa-427f-860f-701caa1baff7', // 2026年部门工作
];

async function deleteOldProjects() {
  console.log('===== Deleting old projects =====');
  for (const id of OLD_PROJECT_IDS) {
    // 软删除
    const res = await api('DELETE', `/projects/${id}`);
    console.log(`  Soft delete ${id}: ${res.success ? 'OK' : 'FAILED'}`);
    // 永久删除
    const res2 = await api('DELETE', `/projects/${id}/permanent`);
    console.log(`  Permanent delete ${id}: ${res2.success ? 'OK' : 'FAILED'}`);
  }
}

async function createProject(name, description) {
  const res = await api('POST', '/projects', {
    name,
    description,
    visibility: 'PUBLIC'
  });
  console.log(`Project: ${name} => ${res.success ? res.data?.id : 'FAILED'}`);
  return res.data?.id;
}

async function createTask(projectId, task) {
  const body = {
    projectId,
    title: task.title,
    dueDate: task.dueDate,
    assigneeId: USER_ID,
    startDate: task.startDate || undefined,
    description: task.description || undefined,
    priority: 'HIGH',
    visibility: 'PUBLIC',
    reminder: '提前3天',
    tags: task.tags || [],
  };
  Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

  const res = await api('POST', '/tasks', body);
  console.log(`  Task: ${task.title} => ${res.success ? 'OK' : 'FAILED'}`);
  return res.success;
}

async function main() {
  // Step 1: 删除旧数据
  await deleteOldProjects();

  // Step 2: 创建新项目
  console.log('\n===== Creating New Projects =====');
  const partyId = await createProject('党群部2026年度党建重点工作', '党群部2026年度党建重点工作');
  const unionId = await createProject('党群部2026年度工会重点工作', '党群部2026年度工会重点工作');
  const youthId = await createProject('党群部2026年度共青团重点工作', '党群部2026年度共青团重点工作');
  const charityId = await createProject('党群部2026年度公益重点工作', '党群部2026年度公益重点工作');
  const deptId = await createProject('党群部2026年度部门综合工作', '党群部2026年度部门综合工作');

  // Step 3: 创建任务
  console.log('\n===== Creating Tasks =====');

  // ========== 一、党建重点工作 ==========
  console.log('\n--- 党建重点工作 ---');
  if (partyId) {
    await createTask(partyId, {
      title: '第二批基层党组织双重管理试点工作',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '按六个环节系统推进5个试点板块党委升格，编制《实施办法》《权责手册》，形成试点总结并制定2027年全集团推广计划，报集团党委会审议。\n\n负责人：孙凤娇',
      tags: ['创新工作', '孙凤娇']
    });

    await createTask(partyId, {
      title: '庆祝中国共产党成立105周年暨"党员先锋岗""党员先锋队"表彰大会',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-08-31T23:59:59.000Z',
      description: '评选表彰党员先锋岗75个、党员先锋队30个，发布《深圳市主题党日地图》《中集集团基层党务工作（2.0）》，召开全国视频表彰大会，同步开展慈善募捐、先进事迹全网宣传。\n\n负责人：孙凤娇',
      tags: ['创新工作', '孙凤娇']
    });

    await createTask(partyId, {
      title: '树立和践行正确政绩观学习教育',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-07-31T23:59:59.000Z',
      description: '起草实施方案、下发学习读物，举办党委专题读书班，基层党组织开展专题学习，梳理问题清单建立整改台账，撰写总结评估报告报党委会审议。\n\n负责人：孙凤娇',
      tags: ['创新工作', '孙凤娇']
    });

    await createTask(partyId, {
      title: '2026年度发展党员工作',
      startDate: '2026-06-01T00:00:00.000Z',
      dueDate: '2027-01-31T23:59:59.000Z',
      description: '争取上级发展党员名额、制定分配方案，开展业务培训，完成发展对象确定、培训、政审、预审公示，推进预备党员接收、党委审议、集体宣誓及后续转正继续教育。\n\n负责人：孙凤娇',
      tags: ['改善工作', '孙凤娇']
    });

    await createTask(partyId, {
      title: '党内统计工作',
      startDate: '2026-06-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '按市国资委要求完成6月半年报、12月年度年报报送，梳理党统数据，规范退休、离职党员党组织关系转移流程。\n\n负责人：孙凤娇',
      tags: ['改善工作', '孙凤娇']
    });

    await createTask(partyId, {
      title: '党群信息统计台账建设',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-04-30T23:59:59.000Z',
      description: '设计下发统计表，收集党建、工会、共青团、公益、统战人员信息，审核整理形成联系人台账，建立月度不定期、年度定期更新机制。\n\n负责人：孙凤娇',
      tags: ['改善工作', '孙凤娇']
    });

    await createTask(partyId, {
      title: '基层党组织党建工作总结',
      startDate: '2026-12-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '年底收集汇总基层党建工作总结，视情组织支部书记述职，撰写集团党委年度总结及书记述职报告，上报市国资委党委。\n\n负责人：孙凤娇',
      tags: ['创新工作', '孙凤娇']
    });

    await createTask(partyId, {
      title: '集团党委"两个清单"对照梳理',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-05-31T23:59:59.000Z',
      description: '明确清单梳理标准，全面排查应上会未上会议题，分类梳理、分析原因，形成专题报告上报。\n\n负责人：陈楷',
      tags: ['创新工作', '陈楷']
    });
  }

  // ========== 二、工会重点工作 ==========
  console.log('\n--- 工会重点工作 ---');
  if (unionId) {
    await createTask(unionId, {
      title: '"宋锦寄情·光影传爱"母亲节主题活动',
      startDate: '2026-04-14T00:00:00.000Z',
      dueDate: '2026-05-09T23:59:59.000Z',
      description: '开展总部职工宋锦手工制作、贺卡邮寄，制作发布母亲节主题短视频，汇集全国职工祝福，扩大活动覆盖面与人文关怀。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '"啡尝端午·居家咖啡大师"咖啡文化节',
      startDate: '2026-05-25T00:00:00.000Z',
      dueDate: '2026-06-18T23:59:59.000Z',
      description: '邀请咖啡师开展居家咖啡知识课堂，设置手冲、拉花实操体验，丰富职工业余生活，营造端午节日氛围。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '"荔香中集·情系工会"荔枝品鉴会',
      startDate: '2026-06-01T00:00:00.000Z',
      dueDate: '2026-07-31T23:59:59.000Z',
      description: '组织工会主席参观荔枝基地、现场品鉴，制作产品宣传资料，面向全国工会推广，助力后勤荔枝产品销售。\n\n负责人：刘佳欣',
      tags: ['创新工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '"清凉一夏·关爱同行"夏日送清凉',
      startDate: '2026-06-15T00:00:00.000Z',
      dueDate: '2026-09-30T23:59:59.000Z',
      description: '开展线上职工选品慰问、总部清凉驿站常态化供应、深莞一线职工实地走访慰问，同步推广后勤清凉物资业务。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '"军魂永驻·情暖中集"退伍军人慰问座谈会',
      startDate: '2026-07-17T00:00:00.000Z',
      dueDate: '2026-07-31T23:59:59.000Z',
      description: '建军节前夕召开退伍军人座谈会，发放慰问品、集体合影，通过集团平台宣传报道，弘扬拥军优属传统。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '立秋"秋天的第一杯奶茶"暖心派送',
      startDate: '2026-07-20T00:00:00.000Z',
      dueDate: '2026-08-07T23:59:59.000Z',
      description: '立秋当天合作派发奶茶，开展朋友圈互动抽奖，同步推广后勤茶点业务，传递节气人文关怀。\n\n负责人：刘佳欣',
      tags: ['创新工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '"月满中集·光影代言"中秋拍摄活动',
      startDate: '2026-08-12T00:00:00.000Z',
      dueDate: '2026-09-25T23:59:59.000Z',
      description: '依托园区场景为员工拍摄职业轻写真，由雅昌精修制作实体纪念品，传递企业家文化，增强员工归属感。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '2026年职工"五小"创新成果竞赛',
      startDate: '2026-08-01T00:00:00.000Z',
      dueDate: '2026-10-31T23:59:59.000Z',
      description: '协同行政部、卓越中心做好赛事保障，动员一线及行政物业参赛，争创省级荣誉，激发职工创新活力。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '深圳市质量管理QC小组成果竞赛参赛',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-09-30T23:59:59.000Z',
      description: '协同卓越中心遴选优秀项目参赛，全程辅导对接申报，力争斩获市级奖项，提升集团质量工作影响力。\n\n负责人：刘佳欣',
      tags: ['创新工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: 'AED使用与急救技能培训',
      startDate: '2026-10-01T00:00:00.000Z',
      dueDate: '2026-11-30T23:59:59.000Z',
      description: '协同行政部邀请讲师开展急救理论+实操培训，组织模拟应急演练，对接招商蛇口争取AED设备赞助，培育企业急救骨干。\n\n负责人：刘佳欣',
      tags: ['创新工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '2027年职工代表大会暨年度先进表彰',
      startDate: '2026-11-05T00:00:00.000Z',
      dueDate: '2026-12-10T23:59:59.000Z',
      description: '开展年度先进评优推选，规范召开职代会审议工作报告及经费预决算，现场表彰先进个人，履行民主管理程序。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });

    await createTask(unionId, {
      title: '职工心灵驿站建设运营',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '常态化开展一对一心理咨询、心理讲座、沙龙，创新推出芳香疗愈、颂钵音疗等特色活动，打造职工心理关怀品牌。\n\n负责人：刘佳欣',
      tags: ['改善工作', '刘佳欣']
    });
  }

  // ========== 三、共青团重点工作 ==========
  console.log('\n--- 共青团重点工作 ---');
  if (youthId) {
    await createTask(youthId, {
      title: '集团团委换届选举大会',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-05-20T23:59:59.000Z',
      description: '起草换届方案、推荐委员候选人、报党委审议，筹备会场及会议流程，召开换届大会，会后整理资料备案。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });

    await createTask(youthId, {
      title: '基层团组织换届建设指导',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-08-31T23:59:59.000Z',
      description: '制定基层换届实施方案，部署换届要求，全程指导各基层团组织完成换届选举，汇总备案换届结果，夯实团的基层基础。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });

    await createTask(youthId, {
      title: '"五四"青年系列活动',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-10-31T23:59:59.000Z',
      description: '开展主题团日、青年志愿服务、市级演讲比赛参赛、基层团建排查、青年AI大赛、青年参与五小创新大赛等系列活动。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });

    await createTask(youthId, {
      title: '中集青年座谈会',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-05-20T23:59:59.000Z',
      description: '制定座谈会方案，筛选青年代表、筹备会场流程，在团委换届会后接续举办，搭建党委与青年沟通交流平台。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });

    await createTask(youthId, {
      title: '团市委"青年道"主题活动',
      startDate: '2026-08-01T00:00:00.000Z',
      dueDate: '2026-10-31T23:59:59.000Z',
      description: '对接团市委要求制定活动方案，组织团干部及青年代表参观研学、交流研讨，会后总结上报。\n\n负责人：陈楷',
      tags: ['创新工作', '陈楷']
    });

    await createTask(youthId, {
      title: '打造"青年集结号"青年活动品牌',
      startDate: '2026-06-01T00:00:00.000Z',
      dueDate: '2026-11-30T23:59:59.000Z',
      description: '确定品牌名称及运营方案，建立基层轮值机制，全年开展文体竞赛、交友联谊等青年专属活动。\n\n负责人：陈楷',
      tags: ['创新工作', '陈楷']
    });

    await createTask(youthId, {
      title: '选派青年参加上级共青团各类比赛',
      startDate: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '常态化对接上级赛事，选拔培育青年代表参加演讲比赛、志愿项目服务大赛等，全程做好参赛保障。\n\n负责人：陈楷',
      tags: ['创新工作', '陈楷']
    });
  }

  // ========== 四、公益重点工作 ==========
  console.log('\n--- 公益重点工作 ---');
  if (charityId) {
    await createTask(charityId, {
      title: '"集爱加油站"常态志愿服务活动',
      startDate: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '全年分新春、读书日、儿童节、中秋节开展线下志愿服务，常态化开展线上能量包寄送志愿服务，推动公益长效化。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });

    await createTask(charityId, {
      title: '"集爱加油站"儿童节特别志愿服务',
      startDate: '2026-04-20T00:00:00.000Z',
      dueDate: '2026-05-29T23:59:59.000Z',
      description: '对接深圳市儿童医院，采购慰问物资、招募培训志愿者，开展患儿节日慰问、陪伴互动、领导走访慰问等活动。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });

    await createTask(charityId, {
      title: '"中集爱心树"爱心捐赠活动',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2026-04-24T23:59:59.000Z',
      description: '对接慈善基金会梳理公益数据，筹备场地物料、表彰名单，举办现场表彰、爱心捐赠、领导致辞及宣传总结。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });

    await createTask(charityId, {
      title: '中集公益月及"922中集公益日"系列活动',
      startDate: '2026-07-01T00:00:00.000Z',
      dueDate: '2026-09-22T23:59:59.000Z',
      description: '筹备公益日现场活动，开展公益先进表彰、受助学子分享、公益工作报告发布、公益倡议宣誓等环节。\n\n负责人：陈楷',
      tags: ['改善工作', '陈楷']
    });
  }

  // ========== 五、部门综合工作 ==========
  console.log('\n--- 部门综合工作 ---');
  if (deptId) {
    await createTask(deptId, {
      title: '赋能中集后勤业务开拓计划',
      startDate: '2026-03-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '划分内外客群，围绕四大类产品布局推广，依托全年节日节点开展品鉴、推介、集采对接，力争年度新增营收500万元。\n\n负责人：刘佳欣',
      tags: ['创新工作', '刘佳欣']
    });

    await createTask(deptId, {
      title: '全员AI计划落地推进',
      startDate: '2026-04-01T00:00:00.000Z',
      dueDate: '2027-01-31T23:59:59.000Z',
      description: '收集各部门AI应用方案、组织专题讨论会、举办AI应用分享会、年度述职展示成果，建立AI应用常态化迭代机制。\n\n负责人：孙凤娇',
      tags: ['创新工作', '孙凤娇']
    });

    await createTask(deptId, {
      title: '"10万+"全员视频观察员组计划',
      startDate: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-12-31T23:59:59.000Z',
      description: '全年完成老罗咖啡文创、母亲节、志愿者日等4支主题视频脚本创作、拍摄剪辑及发布，传播中集正能量。\n\n负责人：陈楷',
      tags: ['创新工作', '陈楷']
    });
  }

  console.log('\n===== ALL DONE =====');
}

main().catch(console.error);
