/** 企业分类常量 — 与前端 src/lib/constants.ts 保持同步 */

export const APPLICATION_STAGES = [
  '研发设计',
  '生产制造',
  '运维服务',
  '质量检测',
  '供应链管理',
  '其他',
] as const

export const INDUSTRY_FIELDS = [
  '人工智能',
  '智能终端',
  '产业数字化',
  '云计算服务',
  'AIGC应用',
  '智慧互联',
  '其他',
] as const

/** 企业标签预设（最多选 3 个） */
export const COMPANY_TAGS = [
  '高新技术企业',
  '独角兽企业',
  '专精特新企业',
  '瞪羚企业',
  'A轮融资',
  '科技型中小企业',
  '专精特新小巨人',
  '准独角兽',
  '全球化企业',
  '初创科技企业',
] as const

export type CompanyTag = (typeof COMPANY_TAGS)[number]
