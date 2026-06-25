/**
 * 中集智历 - E2E 测试公共 helper
 *
 * 用法:
 *   import { login, TEST_USERS } from './_helpers'
 */
import type { Page } from '@playwright/test'

export const TEST_USERS = {
  admin: {
    email: 'e2e-admin@example.com',
    password: 'E2EAdmin123'
  },
  member: {
    email: 'e2e-member@example.com',
    password: 'E2EMember123'
  }
} as const

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173'

/**
 * 通过 UI 登录。测试开始前调用,获取已登录的 page。
 * 也可直接调用 request context 走 API,但 UI 登录能额外验证登录页本身没坏。
 */
export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/login`)
  await page.getByLabel(/邮箱/).fill(user.email)
  await page.getByLabel(/密码/).fill(user.password)
  await page.getByRole('button', { name: /登录/ }).click()
  // 等待跳转到 /dashboard 或 / (登录成功标志)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 })
}

/**
 * 通过 localStorage 直接塞 token,跳过 UI 登录(快,但不验证登录页)。
 * 测试场景若不关心登录页本身,推荐用这个。
 */
export async function setAuthToken(page: Page, token: string, user: { id: string; email: string; nickname: string; role: string }) {
  await page.goto(BASE_URL)
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }, { token, user })
}

/**
 * 截图 helper:统一存到 tests/e2e/screenshots/,文件名带 stage + case + 视口。
 */
export async function snapshot(page: Page, stage: string, caseName: string, label = 'main') {
  await page.screenshot({
    path: `tests/e2e/screenshots/${stage}/${caseName}-${label}.png`,
    fullPage: true
  })
}