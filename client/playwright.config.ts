/**
 * 中集智历 - Playwright E2E 配置
 *
 * 配置原则:
 * - baseURL: 本地 vite dev 默认 5173
 * - reuse server: CI 场景下可关 (CI=1) 由调用方启停
 * - 仅 chromium (覆盖桌面 + 响应式三档截图)
 * - screenshot: on (每个用例都截图,方便回归)
 * - trace: on-failure (只在失败时录 trace,加速通过用例)
 * - 截图输出: tests/e2e/screenshots/ (相对项目根,方便纳入 git artifacts)
 */
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests/e2e',
  // 30s 默认超时 — 包含登录跳转 + dashboard 数据加载
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000
  },
  fullyParallel: !isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/e2e/playwright-report' }]
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  },

  // CI 场景下由调用方显式启停 server,本地 dev 自动启
  webServer: isCI
    ? undefined
    : {
        command: 'pnpm dev',
        cwd: '../client',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60 * 1000
      },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
    }
  ],

  // 测试产出目录
  outputDir: 'tests/e2e/test-results'
})