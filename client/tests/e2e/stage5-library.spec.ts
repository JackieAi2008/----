/**
 * 中集智历 - r0 §5 资料库 E2E
 *
 * 对应 r0-plan.md §6:资料库 (2~3 天,覆盖需求 5)
 *
 * 验收点(从 plan 提取):
 * - [ ] LibraryAsset 新表 + 资料库页 + 上传/预览/下载
 * - [ ] 仅图片预览,不做文档类
 * - [ ] 导航新增「资料库」入口
 * - [ ] mime 限制 image/*,默认 10MB
 *
 * 启用时机:§5 dev commit 后。
 */
import { test, expect } from '@playwright/test'
import { BASE_URL, setAuthToken, snapshot } from './_helpers'
import path from 'node:path'
import fs from 'node:fs/promises'

test.describe('r0 §5 - 资料库', () => {
  const ENABLED = false
  const STAGE = 'stage5'

  test.beforeEach(async () => {
    test.skip(!ENABLED, '等 §5 dev commit 后启用')
  })

  test('导航新增「资料库」入口', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await expect(page.getByRole('link', { name: /资料库/ })).toBeVisible()
  })

  test('资料库页 /library 可访问 + 显示列表', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/library`)
    await page.waitForLoadState('networkidle')
    await snapshot(page, STAGE, 'library-list')
  })

  test('上传 PNG 图片 → 出现在列表', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    const fixture = path.resolve('tests/e2e/fixtures/sample.png')
    await test.skip(!await fileExists(fixture), `缺少 fixture: ${fixture}`)

    await page.goto(`${BASE_URL}/library`)
    await page.getByLabel(/上传|选择文件/).setInputFiles(fixture)

    // 等上传完成 + 列表刷新
    await page.waitForResponse(
      (r) => r.url().includes('/api/library') && r.request().method() === 'POST',
      { timeout: 10_000 }
    )
    await expect(page.getByAltText(/sample/)).toBeVisible()
  })

  test('上传 PDF → 应被拒绝(mime 限制 image/*)', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    const fixture = path.resolve('tests/e2e/fixtures/sample.pdf')
    await test.skip(!await fileExists(fixture), `缺少 fixture: ${fixture}`)

    await page.goto(`${BASE_URL}/library`)
    await page.getByLabel(/上传|选择文件/).setInputFiles(fixture)

    // 期望看到拒绝提示
    await expect(page.getByText(/仅支持图片|不支持 PDF|格式不允许/i)).toBeVisible({ timeout: 5000 })
  })

  test('点击列表项 → 预览弹窗显示', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/library`)
    await page.waitForLoadState('networkidle')

    // 假定已有图片
    const firstItem = page.locator('[data-testid^="library-item-"]').first()
    await test.skip((await firstItem.count()) === 0, '资料库为空,前置上传测试')

    await firstItem.click()
    await expect(page.getByRole('dialog').or(page.getByTestId('preview-modal'))).toBeVisible()
    await snapshot(page, STAGE, 'library-preview')
  })

  test('下载:点击下载按钮触发文件下载', async ({ page }) => {
    await page.goto(BASE_URL)
    await setAuthToken(page, 'placeholder-token', {
      id: 'e2e-user', email: 'e2e-admin@example.com', nickname: 'E2E Admin', role: 'ADMIN'
    })

    await page.goto(`${BASE_URL}/library`)
    await page.waitForLoadState('networkidle')

    const firstItem = page.locator('[data-testid^="library-item-"]').first()
    await test.skip((await firstItem.count()) === 0, '资料库为空')

    const downloadPromise = page.waitForEvent('download')
    await firstItem.hover()
    await page.getByRole('button', { name: /下载/ }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.(png|jpe?g|gif|webp)$/i)
  })
})

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}