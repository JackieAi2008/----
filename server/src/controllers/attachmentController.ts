/**
 * 中集智历 - 附件控制器
 */
import { Response } from 'express'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middlewares/auth.js'

const prisma = new PrismaClient()

// 附件存储目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

/**
 * @desc    上传附件到任务
 * @route   POST /api/tasks/:taskId/attachments
 * @access  Private
 */
export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.userId!

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      })
    }

    // 检查任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!task) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path)
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }

    // 检查用户是否是项目成员
    if (task.project.members.length === 0) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path)
      return res.status(403).json({
        success: false,
        message: '您不是该项目成员，无法上传附件'
      })
    }

    // 检查附件数量限制（每任务最多20个）
    const existingCount = await prisma.attachment.count({
      where: { taskId }
    })

    if (existingCount >= 20) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        success: false,
        message: '每个任务最多只能上传20个附件'
      })
    }

    // 创建附件记录 - 使用Prisma schema中的正确字段名
    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploaderId: userId
      },
      include: {
        uploader: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      message: '附件上传成功',
      data: attachment
    })
  } catch (error) {
    console.error('上传附件失败:', error)
    // 如果上传出错，尝试删除已上传的文件
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {
        // 忽略删除错误
      }
    }
    res.status(500).json({
      success: false,
      message: '上传附件失败'
    })
  }
}

/**
 * @desc    获取任务附件列表
 * @route   GET /api/tasks/:taskId/attachments
 * @access  Private
 */
export const getAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.userId!

    // 检查任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }

    // 检查用户是否是项目成员
    if (task.project.members.length === 0) {
      return res.status(403).json({
        success: false,
        message: '您没有权限查看该任务的附件'
      })
    }

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: attachments
    })
  } catch (error) {
    console.error('获取附件列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取附件列表失败'
    })
  }
}

/**
 * @desc    下载附件
 * @route   GET /api/attachments/:id/download
 * @access  Private
 */
export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.userId!

    // 获取附件信息
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: {
              include: {
                members: {
                  where: { userId }
                }
              }
            }
          }
        }
      }
    })

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: '附件不存在'
      })
    }

    // 检查用户是否是项目成员
    if (attachment.task.project.members.length === 0) {
      return res.status(403).json({
        success: false,
        message: '您没有权限下载该附件'
      })
    }

    // 使用附件的path字段
    const filePath = attachment.path

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      })
    }

    // 设置响应头 - 使用originalName
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`)
    res.setHeader('Content-Type', attachment.mimeType)

    // 发送文件
    res.sendFile(filePath)
  } catch (error) {
    console.error('下载附件失败:', error)
    res.status(500).json({
      success: false,
      message: '下载附件失败'
    })
  }
}

/**
 * @desc    删除附件
 * @route   DELETE /api/attachments/:id
 * @access  Private
 */
export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.userId!

    // 获取附件信息
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: {
              include: {
                members: {
                  where: { userId }
                }
              }
            }
          }
        }
      }
    })

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: '附件不存在'
      })
    }

    const member = attachment.task.project.members[0]

    // 检查权限：必须是上传者、项目负责人或管理员
    const canDelete =
      attachment.uploaderId === userId ||
      member?.role === 'OWNER' ||
      req.userRole === 'ADMIN'

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: '您没有权限删除该附件'
      })
    }

    // 删除物理文件
    const filePath = attachment.path
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // 删除数据库记录
    await prisma.attachment.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: '附件已删除'
    })
  } catch (error) {
    console.error('删除附件失败:', error)
    res.status(500).json({
      success: false,
      message: '删除附件失败'
    })
  }
}
