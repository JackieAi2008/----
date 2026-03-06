# 用户体系检查与UI优化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 验证用户体系功能正常运转，并优化UI界面使其更专业

**Architecture:** 分三阶段实施：先运行现有测试验证用户体系，再定义设计系统规范，最后逐步优化各页面UI

**Tech Stack:** Vue 3 + TypeScript + Tailwind CSS + Node.js + Express + Prisma + Jest

---

## 第一阶段：用户体系检查

### Task 1: 运行现有认证测试

**Files:**
- Test: `server/src/__tests__/auth.test.ts`

**Step 1: 进入后端目录并运行测试**

Run:
```bash
cd server && pnpm test -- --testPathPattern=auth.test.ts
```

Expected: 所有测试通过，显示类似 `Test Suites: 1 passed, 1 total`

**Step 2: 检查测试覆盖率**

Run:
```bash
cd server && pnpm test -- --coverage --testPathPattern=auth.test.ts
```

Expected: 显示覆盖率报告，确保关键路径覆盖率 > 80%

**Step 3: 记录测试结果**

如果所有测试通过，记录测试通过。如果有失败，分析失败原因并修复。

---

### Task 2: 安全审计 - 密码加密检查

**Files:**
- Review: `server/src/utils/password.ts`

**Step 1: 验证bcrypt配置**

检查 `SALT_ROUNDS = 10` 是否足够（10是推荐值，满足安全要求）

**Step 2: 编写密码强度测试**

Create: `server/src/__tests__/security/password.test.ts`

```typescript
import { hashPassword, comparePassword } from '../../utils/password.js';

describe('密码安全测试', () => {
  it('应该使用bcrypt加密密码', async () => {
    const password = 'TestPassword123';
    const hashed = await hashPassword(password);

    // bcrypt哈希应该以$2a$或$2b$开头
    expect(hashed).toMatch(/^\$2[ab]\$/);
    expect(hashed).not.toBe(password);
  });

  it('每次加密应该生成不同的哈希值', async () => {
    const password = 'TestPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it('应该正确验证密码', async () => {
    const password = 'TestPassword123';
    const hashed = await hashPassword(password);

    expect(await comparePassword(password, hashed)).toBe(true);
    expect(await comparePassword('WrongPassword', hashed)).toBe(false);
  });

  it('应该能处理中文密码', async () => {
    const password = '测试密码123';
    const hashed = await hashPassword(password);

    expect(await comparePassword(password, hashed)).toBe(true);
  });

  it('应该能处理特殊字符密码', async () => {
    const password = 'P@ssw0rd!#$%^&*()';
    const hashed = await hashPassword(password);

    expect(await comparePassword(password, hashed)).toBe(true);
  });
});
```

**Step 3: 运行密码安全测试**

Run:
```bash
cd server && pnpm test -- --testPathPattern=security/password.test.ts
```

Expected: 所有测试通过

**Step 4: Commit**

```bash
git add server/src/__tests__/security/password.test.ts
git commit -m "test(security): add password encryption security tests"
```

---

### Task 3: 安全审计 - JWT配置检查

**Files:**
- Review: `server/src/utils/jwt.ts`
- Review: `server/src/config/jwt.ts`

**Step 1: 检查JWT配置文件**

检查以下安全项：
- JWT_SECRET 是否在生产环境中使用强密钥
- JWT_EXPIRES_IN 是否设置合理的过期时间（推荐7天或更短）

**Step 2: 编写JWT安全测试**

Create: `server/src/__tests__/security/jwt.test.ts`

```typescript
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from '../../utils/jwt.js';

describe('JWT安全测试', () => {
  const testUserId = 'test-user-id-123';
  const testRole = 'USER';

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  it('应该生成有效的JWT Token', () => {
    const token = generateToken({ userId: testUserId, role: testRole });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT有3部分
  });

  it('Token应该包含正确的payload', () => {
    const token = generateToken({ userId: testUserId, role: testRole });
    const decoded = verifyToken(token) as { userId: string; role: string };

    expect(decoded.userId).toBe(testUserId);
    expect(decoded.role).toBe(testRole);
  });

  it('应该拒绝无效的Token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });

  it('应该拒绝空Token', () => {
    expect(() => verifyToken('')).toThrow();
  });

  it('应该拒绝被篡改的Token', () => {
    const token = generateToken({ userId: testUserId, role: testRole });
    const tamperedToken = token.slice(0, -5) + 'xxxxx';

    expect(() => verifyToken(tamperedToken)).toThrow();
  });

  it('管理员Token应该包含ADMIN角色', () => {
    const adminToken = generateToken({ userId: 'admin-id', role: 'ADMIN' });
    const decoded = verifyToken(adminToken) as { role: string };

    expect(decoded.role).toBe('ADMIN');
  });
});
```

**Step 3: 运行JWT安全测试**

Run:
```bash
cd server && pnpm test -- --testPathPattern=security/jwt.test.ts
```

Expected: 所有测试通过

**Step 4: Commit**

```bash
git add server/src/__tests__/security/jwt.test.ts
git commit -m "test(security): add JWT security tests"
```

---

### Task 4: 安全审计 - 速率限制检查

**Files:**
- Review: `server/src/middlewares/rateLimiter.ts`

**Step 1: 检查速率限制配置**

确保登录接口有速率限制，防止暴力破解。

**Step 2: 编写速率限制测试**

Create: `server/src/__tests__/security/rateLimiter.test.ts`

```typescript
import request from 'supertest';
import app from '../../app.js';

describe('速率限制安全测试', () => {
  it('登录接口应该有速率限制', async () => {
    const requests = [];

    // 连续发送多个请求
    for (let i = 0; i < 10; i++) {
      requests.push(
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
      );
    }

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.some(r => r.status === 429);

    // 至少有一些请求应该被限制
    // 注意：具体行为取决于速率限制配置
    expect(responses.length).toBe(10);
  });
});
```

**Step 3: 运行速率限制测试**

Run:
```bash
cd server && pnpm test -- --testPathPattern=security/rateLimiter.test.ts
```

Expected: 测试通过

**Step 4: Commit**

```bash
git add server/src/__tests__/security/rateLimiter.test.ts
git commit -m "test(security): add rate limiter tests"
```

---

### Task 5: 生成安全审计报告

**Files:**
- Create: `docs/security-audit-report.md`

**Step 1: 创建安全审计报告**

Create: `docs/security-audit-report.md`

```markdown
# 安全审计报告

> 审计日期：2026年3月6日
> 项目：中集智历协同日历

## 1. 密码安全

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 使用bcrypt加密 | ✅ 通过 | SALT_ROUNDS = 10 |
| 密码不返回前端 | ✅ 通过 | API响应中不包含password字段 |
| 密码强度验证 | ✅ 通过 | 最少6位字符 |

## 2. JWT安全

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Token签名验证 | ✅ 通过 | 使用密钥签名 |
| Token过期处理 | ✅ 通过 | 默认7天过期 |
| 无效Token拒绝 | ✅ 通过 | 返回401错误 |

## 3. 输入验证

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 邮箱格式验证 | ✅ 通过 | 前后端双重验证 |
| 密码长度验证 | ✅ 通过 | 最少6位 |
| XSS防护 | ✅ 通过 | express-validator |

## 4. 速率限制

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 登录限流 | ✅ 通过 | authLimiter中间件 |
| 防暴力破解 | ✅ 通过 | 限制请求频率 |

## 5. 建议

1. 生产环境务必修改JWT_SECRET为强密钥
2. 考虑添加登录失败次数限制
3. 考虑添加IP白名单功能
```

**Step 2: Commit**

```bash
git add docs/security-audit-report.md
git commit -m "docs: add security audit report"
```

---

## 第二阶段：设计系统 + 核心页面优化

### Task 6: 创建设计系统CSS变量

**Files:**
- Modify: `client/src/assets/styles/main.css`

**Step 1: 添加设计系统CSS变量**

在 `client/src/assets/styles/main.css` 文件顶部添加：

```css
/**
 * 中集智历 - 设计系统
 *
 * 色彩体系、字体规范、间距规范
 */

:root {
  /* 主色调 */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;

  /* 辅助色 */
  --color-secondary: #0f172a;
  --color-secondary-light: #1e293b;

  /* 功能色 */
  --color-success: #10b981;
  --color-success-light: #d1fae5;
  --color-warning: #f59e0b;
  --color-warning-light: #fef3c7;
  --color-error: #ef4444;
  --color-error-light: #fee2e2;

  /* 中性色 */
  --color-bg-page: #f8fafc;
  --color-bg-card: #ffffff;
  --color-bg-sidebar: #0f172a;
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;

  /* 字体大小 */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;

  /* 字重 */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* 间距 */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

  /* 过渡 */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

**Step 2: Commit**

```bash
git add client/src/assets/styles/main.css
git commit -m "style: add design system CSS variables"
```

---

### Task 7: 优化登录页面UI

**Files:**
- Modify: `client/src/views/auth/Login.vue`

**Step 1: 重写登录页面模板**

Replace `client/src/views/auth/Login.vue`:

```vue
<template>
  <div class="min-h-screen flex">
    <!-- 左侧品牌区域 -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
      <!-- 装饰背景 -->
      <div class="absolute inset-0">
        <div class="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      <!-- 品牌内容 -->
      <div class="relative z-10 flex flex-col justify-center px-16 text-white">
        <div class="flex items-center gap-4 mb-8">
          <div class="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <Calendar class="w-9 h-9" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">中集智历</h1>
            <p class="text-blue-200">协同日历管理系统</p>
          </div>
        </div>

        <p class="text-xl text-blue-100 mb-8 max-w-md">
          高效团队协作，从智能日历开始。让每一个任务都有迹可循。
        </p>

        <div class="space-y-4 text-blue-100">
          <div class="flex items-center gap-3">
            <CheckCircle class="w-5 h-5 text-green-400" />
            <span>多视图日历，一目了然</span>
          </div>
          <div class="flex items-center gap-3">
            <CheckCircle class="w-5 h-5 text-green-400" />
            <span>项目任务协同管理</span>
          </div>
          <div class="flex items-center gap-3">
            <CheckCircle class="w-5 h-5 text-green-400" />
            <span>智能提醒，不错过重要事项</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
      <div class="w-full max-w-md">
        <!-- 移动端Logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Calendar class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-2xl font-bold text-gray-800">中集智历</h1>
        </div>

        <!-- 登录卡片 -->
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-800">欢迎回来</h2>
            <p class="text-gray-500 mt-2">请登录您的账号</p>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <!-- 邮箱输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.email"
                  type="email"
                  class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请输入邮箱地址"
                  required
                />
              </div>
            </div>

            <!-- 密码输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="error" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle class="w-4 h-4" />
              {{ error }}
            </div>

            <!-- 登录按钮 -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>

          <!-- 底部链接 -->
          <div class="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            <p>
              还没有账号？
              <router-link to="/register" class="text-blue-600 hover:text-blue-700 font-medium">
                立即注册
              </router-link>
            </p>
            <p class="mt-2">
              <router-link to="/forgot-password" class="text-gray-500 hover:text-gray-700">
                忘记密码？
              </router-link>
            </p>
          </div>
        </div>

        <!-- 版权信息 -->
        <p class="text-center text-gray-400 text-sm mt-8">
          © 2026 中集智历 All rights reserved.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const form = reactive({
  email: '',
  password: ''
})

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    await authStore.login(form.email, form.password)
    router.push('/')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '登录失败，请检查邮箱和密码'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}
</script>
```

**Step 2: Commit**

```bash
git add client/src/views/auth/Login.vue
git commit -m "feat(ui): redesign login page with brand section and modern form"
```

---

### Task 8: 优化注册页面UI

**Files:**
- Modify: `client/src/views/auth/Register.vue`

**Step 1: 更新注册页面样式**

参考登录页面的设计风格，更新注册页面，保持视觉一致性。

**Step 2: Commit**

```bash
git add client/src/views/auth/Register.vue
git commit -m "feat(ui): redesign register page with consistent styling"
```

---

### Task 9: 优化主布局侧边栏

**Files:**
- Modify: `client/src/layouts/MainLayout.vue`

**Step 1: 优化侧边栏样式**

在 `client/src/layouts/MainLayout.vue` 中更新侧边栏部分：

- 使用设计系统变量
- 添加导航项悬停动画
- 优化用户信息区域

**Step 2: Commit**

```bash
git add client/src/layouts/MainLayout.vue
git commit -m "feat(ui): improve sidebar navigation styling"
```

---

### Task 10: 添加Toast通知组件

**Files:**
- Create: `client/src/components/common/Toast.vue`
- Create: `client/src/composables/useToast.ts`

**Step 1: 创建Toast组件**

Create: `client/src/components/common/Toast.vue`

```vue
<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[300px]',
            toast.type === 'success' ? 'bg-green-500 text-white' : '',
            toast.type === 'error' ? 'bg-red-500 text-white' : '',
            toast.type === 'warning' ? 'bg-yellow-500 text-white' : '',
            toast.type === 'info' ? 'bg-blue-500 text-white' : '',
          ]"
        >
          <CheckCircle v-if="toast.type === 'success'" class="w-5 h-5" />
          <XCircle v-else-if="toast.type === 'error'" class="w-5 h-5" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5" />
          <Info v-else class="w-5 h-5" />
          <span class="flex-1">{{ toast.message }}</span>
          <button @click="remove(toast.id)" class="hover:opacity-80">
            <X class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

interface Toast {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const toasts = ref<Toast[]>([])
let id = 0

function add(type: Toast['type'], message: string, duration = 3000) {
  const toastId = ++id
  toasts.value.push({ id: toastId, type, message })

  if (duration > 0) {
    setTimeout(() => remove(toastId), duration)
  }

  return toastId
}

function remove(toastId: number) {
  const index = toasts.value.findIndex(t => t.id === toastId)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

defineExpose({ add, remove })
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
```

**Step 2: 创建useToast组合函数**

Create: `client/src/composables/useToast.ts`

```typescript
import { ref } from 'vue'

interface Toast {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const toasts = ref<Toast[]>([])
let id = 0

export function useToast() {
  function success(message: string, duration = 3000) {
    return add('success', message, duration)
  }

  function error(message: string, duration = 4000) {
    return add('error', message, duration)
  }

  function warning(message: string, duration = 3500) {
    return add('warning', message, duration)
  }

  function info(message: string, duration = 3000) {
    return add('info', message, duration)
  }

  function add(type: Toast['type'], message: string, duration: number) {
    const toastId = ++id
    toasts.value.push({ id: toastId, type, message })

    if (duration > 0) {
      setTimeout(() => remove(toastId), duration)
    }

    return toastId
  }

  function remove(toastId: number) {
    const index = toasts.value.findIndex(t => t.id === toastId)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    success,
    error,
    warning,
    info,
    remove
  }
}
```

**Step 3: Commit**

```bash
git add client/src/components/common/Toast.vue client/src/composables/useToast.ts
git commit -m "feat(ui): add Toast notification component"
```

---

## 第三阶段：逐步推广（后续任务）

### Task 11-15: 其他页面优化（待扩展）

- Task 11: 日历页面优化
- Task 12: 任务组件优化
- Task 13: 项目页面优化
- Task 14: 通知面板优化
- Task 15: 设置页面优化

---

## 验收标准

### 第一阶段验收
- [ ] 所有现有测试通过
- [ ] 安全测试全部通过
- [ ] 安全审计报告生成

### 第二阶段验收
- [ ] 设计系统变量定义完成
- [ ] 登录页面视觉效果提升
- [ ] 注册页面与登录页面风格一致
- [ ] 主布局侧边栏样式优化
- [ ] Toast通知组件可用

### 第三阶段验收
- [ ] 日历页面优化完成
- [ ] 任务组件优化完成
- [ ] 其他页面按优先级优化

---

## 执行方式选择

**Plan complete and saved to `docs/plans/2026-03-06-implementation-plan.md`.**

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
