/**
 * 中集智历 - r0 §3 年度看板 E2E
 *
 * 对应 r0-plan.md §3:概览年度看板 (1~2 天,覆盖需求 3)
 *
 * 验收点(从 plan 提取):
 * - [ ] 顶部 4 张年度大卡(默认 2026)
 * - [ ] 年度切换下拉 (2024/2025/2026)
 * - [ ] 切换 ≤ 1.5s 出数
 * - [ ] 无任务的年份 → 显示 0
 * - [ ] 4 张卡数据与后端 SQL 一致(手动对比)
 *
 * 启用时机:§2 dev commit 后,设置 enabled=true。
 */
import { test, expect } from '@playwright/test'
import { BASE_URL, setAuthToken, snapshot } from './_helpers'

test.describe('r0 §3 - 年度看板', () => {
  /**
   * 启用开关:§2 dev commit 后改为 true。
   * 当前 false = 测试被 .skip 跳过,等 dev 交付再启用。
   */
  const ENABLED = false
  const STAGE = 'stage2'

  test.beforeEach(async () => {
    test.skip(!ENABLED, '等 §2 dev commit 后启用')
  })

  test('默认进入 /dashboard 显示 4 张年度大卡 (year=2026)', async ({ page }) => {
    // 这里先用 admin token,实际 §2 dev commit 后再确认具体 user
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    // 4 张年度卡 — title 是 spec 的契约,等 §2 dev 实现确认具体文案
    await expect(page.getByText(/年度总数|全年任务/i)).toBeVisible()
    await expect(page.getByText(/年度待办/i)).toBeVisible()
    await expect(page.getByText(/年度逾期/i)).toBeVisible()
    await expect(page.getByText(/年度完成/i)).toBeVisible()

    await snapshot(page, STAGE, 'dashboard-default-2026')
  })

  test('年度切换下拉可选 2024/2025/2026', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    // 找到年度切换控件 — 是 <select> 还是自定 dropdown 等 §2 dev 实现确认
    const switcher = page.getByRole('combobox', { name: /年度|年份/i }).or(page.getByLabel(/年度|年份/i))
    await expect(switcher).toBeVisible()

    // 列出可选项
    const options = await switcher.locator('option').allTextContents()
    expect(options).toEqual(expect.arrayContaining(['2024', '2025', '2026']))
  })

  test('切换到 2024 → 出数 ≤ 1.5s', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    const switcher = page.getByRole('combobox', { name: /年度|年份/i }).or(page.getByLabel(/年度|年份/i))

    const t0 = Date.now()
    await switcher.selectOption('2024')
    // 等 4 张卡都更新完
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/dashboard/yearly') && resp.url().includes('year=2024'),
      { timeout: 3000 }
    )
    const elapsed = Date.now() - t0
    expect(elapsed).toBeLessThan(1500)
  })

  test('无任务的年份 (2024) → 显示 0', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')

    const switcher = page.getByRole('combobox', { name: /年度|年份/i }).or(page.getByLabel(/年度|年份/i))
    await switcher.selectOption('2024')

    // 4 张卡的值都应该是 0
    await expect(page.getByTestId('yearly-total')).toHaveText('0')
    await expect(page.getByTestId('yearly-todo')).toHaveText('0')
    await expect(page.getByTestId('yearly-overdue')).toHaveText('0')
    await expect(page.getByTestId('yearly-done')).toHaveText('0')

    await snapshot(page, STAGE, 'year-2024-empty')
  })

  test('桌面 1920 / 平板 768 / 手机 375 三档视觉对比无回归', async ({ page }) => {
    for (const viewport of [
      { width: 1920, height: 1080, label: 'desktop-1920' },
      { width: 768, height: 1024, label: 'tablet-768' },
      { width: 375, height: 667, label: 'mobile-375' }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${BASE_URL}/dashboard`)
      await page.waitForLoadState('networkidle')
      await snapshot(page, STAGE, `dashboard-${viewport.label}`, viewport.label)
    }
  })
})