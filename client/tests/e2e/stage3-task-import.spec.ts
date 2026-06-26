/**
 * 中集智历 - r0 §3 任务批量导入 E2E
 *
 * 对应 r0-plan.md §3:任务批量导入 (2~3 天,覆盖需求 4)
 * 拆 3a/3b/3c,本 spec 覆盖整条用户路径(下载模板→上传→预览→确认→失败回滚)。
 *
 * 验收点(从 plan 提取):
 * - [ ] 100 行 Excel ≤ 5s 导入
 * - [ ] 故意制造 1 行错误 → 整批回滚 → 数据库无任何新行
 * - [ ] 失败行可下载 .xlsx,定位精确到单元格
 *
 * 启用时机:§3a/§3b/§3c dev 全部 commit 后。
 */
import { test, expect } from '@playwright/test'
import { BASE_URL, setAuthToken, snapshot } from './_helpers'
import path from 'node:path'
import fs from 'node:fs/promises'

test.describe('r0 §3 - 任务批量导入', () => {
  const ENABLED = false
  const STAGE = 'stage3'

  test.beforeEach(async () => {
    test.skip(!ENABLED, '等 §3a/§3b/§3c dev 交付后启用')
  })

  test('入口可见:导航或项目详情或任务页头部有「批量导入」', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    // 默认放导航 — 三个候选位置之一,等 dev 拍板后这里调整
    await page.goto(`${BASE_URL}/`)
    await expect(page.getByRole('link', { name: /批量导入/i })
      .or(page.getByRole('button', { name: /批量导入/i }))).toBeVisible()
  })

  test('下载模板:模板含 4 个下拉(项目/负责人/优先级/交付成果)', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /批量导入|导入任务/i }).click()
    await page.getByRole('button', { name: /下载模板/ }).click()
    const download = await downloadPromise

    const savePath = path.join('tests/e2e/fixtures', `tasks-template-${Date.now()}.xlsx`)
    await fs.mkdir(path.dirname(savePath), { recursive: true })
    await download.saveAs(savePath)

    const stat = await fs.stat(savePath)
    expect(stat.size).toBeGreaterThan(1024) // 至少 1KB
  })

  test('上传 100 行有效 Excel → 预览显示 100 行成功 → 确认导入 ≤ 5s', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    // 假设前置 fixture 已生成
    const fixture = path.resolve('tests/e2e/fixtures/tasks-valid-100.xlsx')
    await test.skip(!await fileExists(fixture), `缺少 fixture: ${fixture},跑 fixtures/gen-tasks-xlsx.cjs 生成`)

    await page.getByRole('button', { name: /批量导入|导入任务/i }).click()
    await page.getByLabel(/选择文件|上传 Excel/).setInputFiles(fixture)

    // 预览阶段显示 100 行
    await expect(page.getByText(/共 100 行|有效 100 行/)).toBeVisible()

    const t0 = Date.now()
    await page.getByRole('button', { name: /确认导入|开始导入/ }).click()
    await expect(page.getByText(/导入成功|完成/)).toBeVisible({ timeout: 6000 })
    const elapsed = Date.now() - t0
    expect(elapsed).toBeLessThan(5000)
  })

  test('故意 1 行错误 → 整批回滚 → 数据库无新行 + 失败报告可下载', async ({ page, request }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    // 先记下导入前的任务数(用 API 拿 token)
    const tokenRes = await request.get(`${BASE_URL}/api/dashboard/yearly?year=2026`)
    const before = tokenRes.status() === 200 ? await tokenRes.json() : { data: { yearlyTotal: 0 } }

    const fixture = path.resolve('tests/e2e/fixtures/tasks-with-1-error.xlsx')
    await test.skip(!await fileExists(fixture), `缺少 fixture: ${fixture}`)

    await page.getByRole('button', { name: /批量导入|导入任务/i }).click()
    await page.getByLabel(/选择文件|上传 Excel/).setInputFiles(fixture)

    await expect(page.getByText(/失败 1 行|错误 1/)).toBeVisible()

    await page.getByRole('button', { name: /确认导入|开始导入/ }).click()
    await expect(page.getByText(/导入失败|回滚|部分失败/)).toBeVisible({ timeout: 6000 })

    // 验证数据库无新行
    const after = await (await request.get(`${BASE_URL}/api/dashboard/yearly?year=2026`)).json()
    expect(after.data.yearlyTotal).toBe(before.data.yearlyTotal)

    // 失败报告可下载
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /下载失败报告/ }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/失败|fail/i)
  })
})

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}