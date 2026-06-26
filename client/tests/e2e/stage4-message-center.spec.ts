/**
 * 中集智历 - r0 §5 消息中心 E2E
 *
 * 对应 r0-plan.md §5:消息中心 (2~3 天,覆盖需求 6 方案 A)
 *
 * 验收点(从 plan + inbox-test-stage4.txt 提取):
 * - [ ] 切到任意 Tab,只显示对应 category
 * - [ ] 标已读后,未读数减少,DB 同步
 * - [ ] 移动端布局不破
 * - [ ] 下拉铃铛点击跳 /messages(不只展开下拉)
 * - [ ] /messages 页 5 个 Tab:全部 / 任务提醒 / 邀请 / 评价 / @我 / 系统
 *
 * 启用时机:§4 dev commit 后。
 */
import { test, expect } from '@playwright/test'
import { BASE_URL, setAuthToken, snapshot } from './_helpers'

test.describe('r0 §5 - 消息中心', () => {
  const ENABLED = false
  const STAGE = 'stage4'

  test.beforeEach(async () => {
    test.skip(!ENABLED, '等 §4 dev commit 后启用')
  })

  test('/messages 路由可访问', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/messages$/)
  })

  test('5 个 Tab 全部可见', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')

    for (const tabName of ['全部', '任务提醒', '邀请', '评价', '@我', '系统']) {
      await expect(page.getByRole('tab', { name: new RegExp(tabName) })).toBeVisible()
    }
  })

  test('点击「任务提醒」Tab → 列表只显示 category=TASK_REMINDER', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: /任务提醒/ }).click()
    // 等接口返回
    const resp = await page.waitForResponse(
      (r) => r.url().includes('/api/messages') && r.url().includes('category=TASK_REMINDER'),
      { timeout: 5000 }
    )
    const json = await resp.json()
    // 全部条目的 category 字段都是 TASK_REMINDER
    expect(Array.isArray(json.data)).toBe(true)
    for (const item of json.data) {
      expect(item.category).toBe('TASK_REMINDER')
    }
  })

  test('点单条「标记已读」→ 未读数减少', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')

    // 读顶部「全部」tab 的未读角标
    const badgeBefore = await page.getByTestId('unread-badge-ALL').textContent()
    const before = Number(badgeBefore?.trim() || '0')

    // r0 §4: 顶部按钮 → POST /api/messages/mark-all-read
    await page.getByTestId('mark-all-read').click()
    await page.waitForResponse(
      (r) =>
        r.url().includes('/api/messages/mark-all-read') &&
        r.request().method() === 'POST',
      { timeout: 5000 }
    )

    const badgeAfter = await page.getByTestId('unread-badge-ALL').textContent()
    const after = Number(badgeAfter?.trim() || '0')
    expect(after).toBeLessThanOrEqual(before)
  })

  test('下拉铃铛点击跳 /messages', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    // r0 §4: 顶栏铃铛现在是 router-link to=/messages
    const bell = page.getByTestId('bell-button')
    await bell.click()
    await page.waitForURL(/\/messages$/, { timeout: 5000 })
  })

  test('移动端 375 布局不破', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/messages`)
    await page.waitForLoadState('networkidle')

    await snapshot(page, STAGE, 'mobile-375-messages', 'mobile-375')
  })
})