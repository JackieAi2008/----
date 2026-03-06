/**
 * 中集智历 - 认证服务
 */
import prisma from '../config/database.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { generateToken } from '../utils/jwt.js'
import { ApiError } from '../middlewares/errorHandler.js'

interface RegisterData {
  email: string
  password: string
  nickname: string
  securityQuestion: number
  securityAnswer: string
}

/**
 * 用户登录
 */
export async function login(email: string, password: string) {
  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    throw new ApiError(401, '邮箱或密码错误')
  }

  if (user.isBanned) {
    throw new ApiError(403, '账号已被禁用')
  }

  // 验证密码
  const valid = await comparePassword(password, user.password)
  if (!valid) {
    throw new ApiError(401, '邮箱或密码错误')
  }

  // 生成token
  const token = generateToken({ userId: user.id, role: user.isAdmin ? 'ADMIN' : 'USER' })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      isAdmin: user.isAdmin
    }
  }
}

/**
 * 用户注册
 */
export async function register(data: RegisterData) {
  const { email, password, nickname, securityQuestion, securityAnswer } = data

  // 检查邮箱是否已注册
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw new ApiError(400, '该邮箱已被注册')
  }

  // 加密密码和安全答案
  const hashedPassword = await hashPassword(password)
  const hashedAnswer = await hashPassword(securityAnswer.toLowerCase())

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nickname
    }
  })

  // 保存安全问题答案
  await prisma.securityAnswer.create({
    data: {
      userId: user.id,
      questionIndex: securityQuestion,
      answer: hashedAnswer
    }
  })

  // 生成token
  const token = generateToken({ userId: user.id, role: 'USER' })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      isAdmin: user.isAdmin
    }
  }
}

/**
 * 修改密码
 */
export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new ApiError(404, '用户不存在')
  }

  // 验证旧密码
  const valid = await comparePassword(oldPassword, user.password)
  if (!valid) {
    throw new ApiError(400, '当前密码错误')
  }

  // 更新密码
  const hashedPassword = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  })
}

/**
 * 重置密码
 */
export async function resetPassword(
  email: string,
  questionIndex: number,
  answer: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { securityAnswers: true }
  })

  if (!user) {
    throw new ApiError(404, '用户不存在')
  }

  // 验证安全问题
  const securityAnswer = user.securityAnswers.find(sa => sa.questionIndex === questionIndex)
  if (!securityAnswer) {
    throw new ApiError(400, '安全问题未设置')
  }

  const valid = await comparePassword(answer.toLowerCase(), securityAnswer.answer)
  if (!valid) {
    throw new ApiError(400, '安全问题答案错误')
  }

  // 更新密码
  const hashedPassword = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  })
}

/**
 * 验证安全问题答案
 */
export async function verifySecurityAnswer(email: string, questionIndex: number, answer: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { securityAnswers: true }
  })

  if (!user) {
    return false
  }

  const securityAnswer = user.securityAnswers.find(sa => sa.questionIndex === questionIndex)
  if (!securityAnswer) {
    return false
  }

  return comparePassword(answer.toLowerCase(), securityAnswer.answer)
}
