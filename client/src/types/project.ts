/**
 * 中集智历 - 项目类型定义
 */

// 项目可见性
export type Visibility = 'PUBLIC' | 'PRIVATE'

// 项目成员角色
export type ProjectRole = 'OWNER' | 'MEMBER'

// 项目分类
export type ProjectCategory = 'PARTY_BUILDING' | 'TRADE_UNION' | 'COMMUNIST_YOUTH_LEAGUE' | 'PUBLIC_WELFARE' | 'COMPREHENSIVE'

// 项目分类显示映射
export const PROJECT_CATEGORY_MAP: Record<ProjectCategory, string> = {
  PARTY_BUILDING: '党建工作',
  TRADE_UNION: '工会工作',
  COMMUNIST_YOUTH_LEAGUE: '共青团工作',
  PUBLIC_WELFARE: '公益工作',
  COMPREHENSIVE: '综合工作',
}

// 项目分类选项列表（用于下拉选择）
export const PROJECT_CATEGORY_OPTIONS: { value: ProjectCategory; label: string }[] = [
  { value: 'PARTY_BUILDING', label: '党建工作' },
  { value: 'TRADE_UNION', label: '工会工作' },
  { value: 'COMMUNIST_YOUTH_LEAGUE', label: '共青团工作' },
  { value: 'PUBLIC_WELFARE', label: '公益工作' },
  { value: 'COMPREHENSIVE', label: '综合工作' },
]

// 项目基础信息
export interface Project {
  id: string
  name: string
  description: string | null
  cover: string | null
  visibility: Visibility
  category: ProjectCategory | null
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
  isArchived?: boolean
  archivedAt?: string | null
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
  category?: ProjectCategory
}

// 更新项目请求
export interface UpdateProjectRequest {
  name?: string
  description?: string
  cover?: string
  visibility?: Visibility
  category?: ProjectCategory
}
