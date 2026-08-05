/** 企业分类常量 — 与 admin-frontend/src/lib/constants.ts 保持同步 */

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

export type ApplicationStage = (typeof APPLICATION_STAGES)[number]
export type IndustryField = (typeof INDUSTRY_FIELDS)[number]
