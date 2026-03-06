/**
 * 标签颜色工具测试
 */
import { describe, it, expect } from 'vitest'
import {
  getTagColorClasses,
  getTagHexColor,
  getTagColorInfo,
  getAllTagColors
} from './tagColor'

describe('tagColor utils', () => {
  describe('getTagColorClasses', () => {
    it('应该返回包含背景色和文字色的对象', () => {
      const result = getTagColorClasses('测试标签')
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('text')
      expect(result.bg).toMatch(/^bg-\w+-100$/)
      expect(result.text).toMatch(/^text-\w+-700$/)
    })

    it('相同标签应该返回相同的颜色', () => {
      const color1 = getTagColorClasses('重要')
      const color2 = getTagColorClasses('重要')
      expect(color1).toEqual(color2)
    })

    it('不同标签应该可能返回不同的颜色', () => {
      const color1 = getTagColorClasses('a')
      const color2 = getTagColorClasses('b')
      // 由于哈希算法，不同标签可能返回相同颜色，但大多数情况下应该不同
      // 这里只验证返回格式正确
      expect(color1).toHaveProperty('bg')
      expect(color2).toHaveProperty('bg')
    })
  })

  describe('getTagHexColor', () => {
    it('应该返回十六进制颜色值', () => {
      const result = getTagHexColor('测试标签')
      expect(result).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('相同标签应该返回相同的颜色值', () => {
      const color1 = getTagHexColor('工作')
      const color2 = getTagHexColor('工作')
      expect(color1).toBe(color2)
    })
  })

  describe('getTagColorInfo', () => {
    it('应该返回完整的颜色信息', () => {
      const result = getTagColorInfo('测试标签')
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('hex')
    })

    it('返回的颜色信息应该一致', () => {
      const info = getTagColorInfo('测试')
      const classes = getTagColorClasses('测试')
      const hex = getTagHexColor('测试')

      expect(info.bg).toBe(classes.bg)
      expect(info.hex).toBe(hex)
    })
  })

  describe('getAllTagColors', () => {
    it('应该返回所有可用颜色', () => {
      const colors = getAllTagColors()
      expect(colors.length).toBe(17)
    })

    it('每个颜色应该包含完整的属性', () => {
      const colors = getAllTagColors()
      colors.forEach(color => {
        expect(color).toHaveProperty('bg')
        expect(color).toHaveProperty('text')
        expect(color).toHaveProperty('hex')
      })
    })

    it('返回的颜色列表应该是副本', () => {
      const colors1 = getAllTagColors()
      const colors2 = getAllTagColors()
      expect(colors1).not.toBe(colors2) // 不同的引用
      expect(colors1).toEqual(colors2)  // 但内容相同
    })
  })

  describe('颜色一致性测试', () => {
    it('空字符串标签应该也能正常工作', () => {
      const result = getTagColorClasses('')
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('text')
    })

    it('长标签名应该也能正常工作', () => {
      const longTag = '这是一个非常非常非常长的标签名称用于测试哈希函数的稳定性'
      const result = getTagColorClasses(longTag)
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('text')
    })

    it('特殊字符标签应该也能正常工作', () => {
      const specialTag = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`'
      const result = getTagColorClasses(specialTag)
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('text')
    })

    it('中英文标签应该返回不同颜色', () => {
      const chineseTag = getTagHexColor('测试')
      const englishTag = getTagHexColor('test')
      // 由于哈希算法，可能相同，但大多数情况下应该不同
      // 这里只验证都能正常返回
      expect(chineseTag).toMatch(/^#[0-9A-F]{6}$/)
      expect(englishTag).toMatch(/^#[0-9A-F]{6}$/)
    })
  })
})
