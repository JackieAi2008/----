/**
 * 中集智历 - 标签颜色工具
 * 使用预定义颜色列表为标签分配一致的颜色
 */

// 预定义的标签颜色列表（带文字和背景色）
const TAG_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-700', hex: '#DC2626' },
  { bg: 'bg-orange-100', text: 'text-orange-700', hex: '#EA580C' },
  { bg: 'bg-amber-100', text: 'text-amber-700', hex: '#D97706' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700', hex: '#CA8A04' },
  { bg: 'bg-lime-100', text: 'text-lime-700', hex: '#65A30D' },
  { bg: 'bg-green-100', text: 'text-green-700', hex: '#16A34A' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', hex: '#059669' },
  { bg: 'bg-teal-100', text: 'text-teal-700', hex: '#0D9488' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', hex: '#0891B2' },
  { bg: 'bg-sky-100', text: 'text-sky-700', hex: '#0284C7' },
  { bg: 'bg-blue-100', text: 'text-blue-700', hex: '#2563EB' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', hex: '#4F46E5' },
  { bg: 'bg-violet-100', text: 'text-violet-700', hex: '#7C3AED' },
  { bg: 'bg-purple-100', text: 'text-purple-700', hex: '#9333EA' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', hex: '#C026D3' },
  { bg: 'bg-pink-100', text: 'text-pink-700', hex: '#DB2777' },
  { bg: 'bg-rose-100', text: 'text-rose-700', hex: '#E11D48' },
]

/**
 * 通过字符串哈希生成一致的颜色索引
 */
function getStringHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return Math.abs(hash)
}

/**
 * 获取标签的Tailwind CSS类名
 * @param tag 标签名称
 * @returns 包含背景色和文字色的对象
 */
export function getTagColorClasses(tag: string): { bg: string; text: string } {
  const hash = getStringHash(tag)
  const colorIndex = hash % TAG_COLORS.length
  return {
    bg: TAG_COLORS[colorIndex].bg,
    text: TAG_COLORS[colorIndex].text
  }
}

/**
 * 获取标签的十六进制颜色值
 * @param tag 标签名称
 * @returns 十六进制颜色值
 */
export function getTagHexColor(tag: string): string {
  const hash = getStringHash(tag)
  const colorIndex = hash % TAG_COLORS.length
  return TAG_COLORS[colorIndex].hex
}

/**
 * 获取标签的所有颜色信息
 * @param tag 标签名称
 * @returns 包含背景色、文字色和十六进制颜色的对象
 */
export function getTagColorInfo(tag: string): { bg: string; text: string; hex: string } {
  const hash = getStringHash(tag)
  const colorIndex = hash % TAG_COLORS.length
  return TAG_COLORS[colorIndex]
}

/**
 * 获取所有可用颜色（用于颜色选择器）
 */
export function getAllTagColors(): Array<{ bg: string; text: string; hex: string }> {
  return [...TAG_COLORS]
}
