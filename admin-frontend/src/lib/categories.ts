/**
 * 分类配置服务
 * 后端统一分类表 categories，通过 type 区分类型，通过 parent_id 构建层级关系：
 * - demand_category: 顶级分类（行业领域、应用环节），parent_id = NULL
 * - industry: 行业领域子分类，parent_id 指向「行业领域」
 * - application_stage: 应用环节子分类，parent_id 指向「应用环节」
 *
 * API 支持 tree=true 参数返回树形结构。
 */
import { api } from './api'

export type CategoryType = 'industry' | 'application_stage' | 'demand_category'

export interface Category {
  id: number
  type: CategoryType
  name: string
  parent_id: number | null
  sort_order: number
  is_default: boolean
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

/**
 * 按类型获取分类列表（平铺，管理端）
 */
export async function fetchCategories(type: CategoryType): Promise<Category[]> {
  try {
    const data = await api.get<Category[]>(`/admin/categories?type=${type}`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * 按类型获取分类树（含子级，管理端）
 */
export async function fetchCategoryTree(type: CategoryType): Promise<CategoryTreeNode[]> {
  try {
    const data = await api.get<CategoryTreeNode[]>(`/admin/categories?type=${type}&tree=true`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** 便捷方法：获取某类型的名称数组（用于下拉框，平铺，去重） */
export async function fetchCategoryNames(type: CategoryType): Promise<string[]> {
  const list = await fetchCategories(type)
  const seen = new Set<string>()
  const names: string[] = []
  for (const c of list) {
    if (c.name && !seen.has(c.name)) {
      seen.add(c.name)
      names.push(c.name)
    }
  }
  return names
}
