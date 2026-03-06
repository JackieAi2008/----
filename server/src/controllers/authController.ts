/**
 * 中集智历 - 认证控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import * as authService from '../services/authService.js'
import { ApiError } from '../middlewares/errorHandler.js'

/**
 * 用户登录
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body

  const result = await authService.login(email, password)

  res.json({
    success: true,
    data: result
  })
}

/**
 * 用户注册
 */
export async function register(req: Request, res: Response) {
  const { email, password, nickname, securityQuestion, securityAnswer } = req.body

  const result = await authService.register({
    email,
    password,
    nickname,
    securityQuestion,
    securityAnswer
  })

  res.status(201).json({
    success: true,
    data: result
  })
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      isAdmin: true,
      isBanned: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!user) {
    throw new ApiError(404, '用户不存在')
  }

  res.json({
    success: true,
    data: user
  })
}

/**
 * 修改密码
 */
export async function changePassword(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { oldPassword, newPassword } = req.body

  await authService.changePassword(userId!, oldPassword, newPassword)

  res.json({
    success: true,
    message: '密码修改成功'
  })
}

/**
 * 重置密码
 */
export async function resetPassword(req: Request, res: Response) {
  const { email, securityQuestion, securityAnswer, newPassword } = req.body

  await authService.resetPassword(email, securityQuestion, securityAnswer, newPassword)

  res.json({
    success: true,
    message: '密码重置成功'
  })
}

/**
 * 验证安全问题
 */
export async function verifySecurityQuestion(req: Request, res: Response) {
  const { email, securityQuestion, securityAnswer } = req.body

  const valid = await authService.verifySecurityAnswer(email, securityQuestion, securityAnswer)

  res.json({
    success: true,
    data: { valid }
  })
}

/**
 * 获取用户的安全问题
 */
export async function getSecurityQuestion(req: Request, res: Response) {
  const { email } = req.params

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      securityAnswers: {
        select: { questionIndex: true }
      }
    }
  })

  if (!user) {
    throw new ApiError(404, '该邮箱未注册')
  }

  if (user.securityAnswers.length === 0) {
    throw new ApiError(400, '该用户未设置安全问题')
  }

  res.json({
    success: true,
    data: {
      questionIndex: user.securityAnswers[0].questionIndex
    }
  })
}
