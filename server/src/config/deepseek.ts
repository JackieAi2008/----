/**
 * 中集智历 - DeepSeek AI 配置
 */

function getDeepseekApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY

  if (key) {
    return key
  }

  // 生产环境必须设置
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DEEPSEEK_API_KEY 环境变量未设置！请在生产环境中配置 API Key。')
  }

  console.warn('⚠️ [AI总结] DEEPSEEK_API_KEY 未设置，AI 总结功能将不可用')
  return ''
}

export const deepseekConfig = {
  apiKey: getDeepseekApiKey(),
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  timeout: 30000 // 30秒超时
}
