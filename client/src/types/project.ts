/**
 * 中集智历 - 项目类型定义
 */

// 项目可见性
export type Visibility = 'PUBLIC' | 'PRIVATE'

// 项目成员角色
export type ProjectRole = 'OWNER' | 'MEMBER'

// 项目基础信息
export interface Project {
  id: string
  name: string
  description: string | null
  cover: string | null
  visibility: Visibility
  ownerId: string
  owner?: {
    id: string
    nickname: string
    avatar: string | null
  }
  departmentId?: string
  department?: {
    id: string
    name: string
  }
  members?: ProjectMember[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// 项目成员
export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  joinedAt: string
  user?: {
    id: string
    nickname: string
    avatar: string | null
  }
}

// 项目邀请状态
export type InviteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

// 项目邀请
export interface ProjectInvite {
  id: string
  projectId: string
  inviterId: string
  inviteeId: string
  status: InviteStatus
  expiresAt: string
  createdAt: string
}

// 创建项目请求
export interface CreateProjectRequest {
  name: string
  description?: string
  visibility: Visibility
}

// 更新项目请求
export interface UpdateProjectRequest {
  name?: string
  description?: string
  cover?: string
  visibility?: Visibility
}
