/**
 * 业务数据服务：封装各前端接口的请求与「后端模型 → 前端模型」映射
 */
import { request, resolveMediaUrl } from './api'
import type { PaginatedData } from './api'
import type {
  Solution,
  CompanyDetail,
  Demand,
  Article,
  NewsArticleDetail,
  RawCompany,
  RawCompanyDetail,
  RawDemand,
  RawNews,
  DemandSubmissionPayload,
  SolutionApplicationPayload,
  IntentPayload,
} from '@/types'

/* ───────── 工具函数 ───────── */
function parseTags(tags: string | string[] | undefined): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try {
    const parsed = JSON.parse(tags)
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
  } catch {
    // 非 JSON：按逗号分隔兜底
    return tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return []
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  // 取 ISO 字符串的日期部分
  const d = new Date(value)
  if (isNaN(d.getTime())) return value.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function splitImages(images: string | undefined): string[] {
  if (!images) return []
  return images
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(resolveMediaUrl)
}

/** 去除 HTML 标签，得到纯文本（用于列表摘要兜底） */
function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ───────── 映射函数 ───────── */
function mapCompany(c: RawCompany): Solution {
  return {
    id: String(c.id),
    companyName: c.name ?? '',
    logo: resolveMediaUrl(c.logo),
    intro: c.introduction ?? '',
    tags: parseTags(c.tags),
    industryField: c.industry ?? '',
    applicationLink: c.application_stage ?? '',
    solutionsCount: c.solutions_count,
    views: c.views,
  }
}

function mapCompanyDetail(d: RawCompanyDetail): CompanyDetail {
  const c = d.company
  return {
    id: String(c.id),
    name: c.name ?? '',
    logo: resolveMediaUrl(c.logo),
    intro: c.introduction ?? '',
    tags: parseTags(c.tags),
    industryField: c.industry ?? '',
    applicationLink: c.application_stage ?? '',
    images: (d.images ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((img) => resolveMediaUrl(img.url ?? img.image_url))
      .filter(Boolean),
    solutions: (d.solutions ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s) => ({
        id: String(s.id),
        title: s.title ?? '',
        desc: s.description ?? '',
        // backend returns a nested images array; fall back to legacy single image field
        images: (s.images ?? [])
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((img) => resolveMediaUrl(img.image_url))
          .filter(Boolean)
          .concat(
            (!s.images?.length && s.image) ? [resolveMediaUrl(s.image)] : []
          ),
      })),
    cases: (d.cases ?? []).map((cs) => ({
      client: cs.client_name ?? '',
      result: cs.description ?? '',
      images: (cs.images ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((img) => resolveMediaUrl(img.image_url))
        .filter(Boolean),
    })),
    totalSolutions: d.total_solutions,
  }
}

function mapDemand(d: RawDemand): Demand {
  return {
    id: String(d.id),
    title: d.title ?? '',
    company: d.company_name ?? '',
    description: d.description ?? '',
    category: d.category ?? '',
    publishDate: formatDate(d.published_at ?? d.created_at),
    interested: false,
  }
}

function mapArticleSummary(n: RawNews): Article {
  return {
    id: String(n.id),
    title: n.title ?? '',
    summary: n.summary || stripHtml(n.content).slice(0, 60) || '',
    image: resolveMediaUrl(n.cover_image),
    date: formatDate(n.published_at ?? n.created_at),
  }
}

function mapArticleDetail(n: RawNews): NewsArticleDetail {
  const extra = splitImages(n.images)
  const cover = resolveMediaUrl(n.cover_image)
  const images = cover ? [cover, ...extra.filter((i) => i !== cover)] : extra
  return {
    id: String(n.id),
    title: n.title ?? '',
    author: n.author ?? '',
    date: formatDate(n.published_at ?? n.created_at),
    content: n.content ?? '',
    images,
  }
}

/* ───────── 企业 / 解决方案 ───────── */
export async function fetchSolutions(signal?: AbortSignal): Promise<Solution[]> {
  const data = await request<PaginatedData<RawCompany>>('/api/v1/companies', {
    query: { page: 1, page_size: 100 },
    signal,
  })
  return (data?.list ?? []).map(mapCompany)
}

/** 分页获取企业列表，返回映射后的数据 + 总数 + 是否还有下一页 */
export async function fetchSolutionsPage(
  page: number,
  pageSize: number,
  filters?: {
    keyword?: string;
    industry?: string;
    application_stage?: string;
  },
  signal?: AbortSignal,
): Promise<{ list: Solution[]; total: number; hasMore: boolean; totalSolutions?: number }> {
  const query: Record<string, string | number | undefined> = { page, page_size: pageSize };
  if (filters?.keyword) query.keyword = filters.keyword;
  if (filters?.industry) query.industry = filters.industry;
  if (filters?.application_stage) query.application_stage = filters.application_stage;

  const data = await request<PaginatedData<RawCompany>>('/api/v1/companies', { query, signal });
  const list = (data?.list ?? []).map(mapCompany);
  const total = data?.total ?? 0;
  const hasMore = page * pageSize < total;
  return { list, total, hasMore, totalSolutions: data?.total_solutions };
}

/* ───────── 分类配置 ───────── */
/** 分类类型：industry / application_stage / demand_category */
export type CategoryType = 'industry' | 'application_stage' | 'demand_category'

export interface CategoryTreeNode {
  id: number
  name: string
  type: CategoryType
  sort_order: number
  children?: CategoryTreeNode[]
}

/**
 * 按类型获取分类树（公开接口，tree=true）。
 * demand_category 树包含两个顶级（行业领域 / 应用环节）及其子分类。
 */
export async function fetchCategoryTree(type: CategoryType, signal?: AbortSignal): Promise<CategoryTreeNode[]> {
  try {
    const data = await request<CategoryTreeNode[]>('/api/v1/categories', {
      query: { type, tree: 'true' },
      signal,
    })
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * 获取某父级下的子分类名称列表（公开接口）。
 * 从 demand_category 树中按父级名称提取子分类。
 */
export async function fetchChildCategoryNames(
  parentName: '行业领域' | '应用环节',
  signal?: AbortSignal,
): Promise<string[]> {
  const tree = await fetchCategoryTree('demand_category', signal)
  const parent = tree.find((n) => n.name === parentName)
  return parent?.children?.map((c) => c.name) ?? []
}

export async function fetchCompanyDetail(id: string, signal?: AbortSignal): Promise<CompanyDetail> {
  const data = await request<RawCompanyDetail>(`/api/v1/companies/${id}`, { signal })
  return mapCompanyDetail(data)
}

/* ───────── 需求 ───────── */
export async function fetchDemands(signal?: AbortSignal): Promise<Demand[]> {
  const data = await request<PaginatedData<RawDemand>>('/api/v1/demands', {
    query: { page: 1, page_size: 10000 },
    signal,
  })
  return (data?.list ?? []).map(mapDemand)
}

/** 分页获取需求列表，返回映射后的数据 + 总数 + 是否还有下一页
 *  filters.category 格式约定：与需求记录 category 字段存储格式一致，
 *  如「行业领域/智能制造」「应用环节/生产优化」，多维度用 | 连接（如「行业领域/智能制造|应用环节/生产优化」）
 */
export async function fetchDemandsPage(
  page: number,
  pageSize: number,
  filters?: {
    keyword?: string;
    category?: string;
  },
  signal?: AbortSignal,
): Promise<{ list: Demand[]; total: number; hasMore: boolean }> {
  const query: Record<string, string | number | undefined> = { page, page_size: pageSize };
  if (filters?.keyword) query.keyword = filters.keyword;
  if (filters?.category) query.category = filters.category;

  const data = await request<PaginatedData<RawDemand>>('/api/v1/demands', { query, signal });
  const list = (data?.list ?? []).map(mapDemand);
  const total = data?.total ?? 0;
  const hasMore = page * pageSize < total;
  return { list, total, hasMore };
}

export async function fetchDemand(id: string, signal?: AbortSignal): Promise<Demand | null> {
  // 后端无单条公开详情接口，循环翻页查找（后端单页上限 50 条）
  let page = 1
  let hasMore = true
  while (hasMore) {
    if (signal?.aborted) return null
    const data = await request<PaginatedData<RawDemand>>('/api/v1/demands', {
      query: { page, page_size: 50 },
      signal,
    })
    const list = data?.list ?? []
    const found = list.find((d) => String(d.id) === id)
    if (found) return mapDemand(found)
    hasMore = page * 50 < (data?.total ?? 0)
    page++
  }
  return null
}

/* ───────── 新闻 ───────── */
export async function fetchArticles(signal?: AbortSignal): Promise<Article[]> {
  const data = await request<PaginatedData<RawNews>>('/api/v1/news', {
    query: { page: 1, page_size: 10000 },
    signal,
  })
  return (data?.list ?? []).map(mapArticleSummary)
}

/** 分页获取新闻列表，返回映射后的数据 + 总数 + 是否还有下一页 */
export async function fetchArticlesPage(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<{ list: Article[]; total: number; hasMore: boolean }> {
  const data = await request<PaginatedData<RawNews>>('/api/v1/news', {
    query: { page, page_size: pageSize },
    signal,
  })
  const list = (data?.list ?? []).map(mapArticleSummary)
  const total = data?.total ?? 0
  const hasMore = page * pageSize < total
  return { list, total, hasMore }
}

export async function fetchArticle(id: string, signal?: AbortSignal): Promise<NewsArticleDetail | null> {
  // 后端无单条公开详情接口，循环翻页查找（后端单页上限 50 条）
  let page = 1
  let hasMore = true
  while (hasMore) {
    if (signal?.aborted) return null
    const data = await request<PaginatedData<RawNews>>('/api/v1/news', {
      query: { page, page_size: 50 },
      signal,
    })
    const list = data?.list ?? []
    const raw = list.find((n) => String(n.id) === id)
    if (raw) return mapArticleDetail(raw)
    hasMore = page * 50 < (data?.total ?? 0)
    page++
  }
  return null
}

/* ───────── 表单提交 ───────── */
/** 把表单字段 + 附件组装为 multipart/form-data */
function buildSubmissionForm(fields: Record<string, string | undefined>, files: File[] = []): FormData {
  const formData = new FormData()
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') formData.append(k, v)
  })
  // 后端附件字段名为 attachments，支持多个
  files.forEach((file) => formData.append('attachments', file))
  return formData
}

export async function submitDemand(payload: DemandSubmissionPayload, files: File[] = []): Promise<void> {
  const formData = buildSubmissionForm(
    {
      company_name: payload.company_name,
      requirement: payload.requirement,
      contact_person: payload.contact_person,
      phone: payload.phone,
      email: payload.email,
    },
    files,
  )
  await request('/api/v1/demand-submissions', { method: 'POST', formData })
}

export async function submitSolutionApplication(payload: SolutionApplicationPayload, files: File[] = []): Promise<void> {
  const formData = buildSubmissionForm(
    {
      company_name: payload.company_name,
      solution_name: payload.solution_name,
      description: payload.description,
      contact_person: payload.contact_person,
      phone: payload.phone,
      email: payload.email,
    },
    files,
  )
  await request('/api/v1/solution-applications', { method: 'POST', formData })
}

export async function submitIntent(payload: IntentPayload): Promise<void> {
  await request('/api/v1/intents', { method: 'POST', body: payload })
}
