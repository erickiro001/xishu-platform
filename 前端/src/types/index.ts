/* ───────── 前端展示模型 ───────── */
export interface Solution {
  id: string;
  companyName: string;
  logo: string;
  intro: string;
  tags: string[];
  industryField: string;
  applicationLink: string;
  solutionsCount?: number;
  views?: number;
}

export interface Demand {
  id: string;
  title: string;
  company: string;
  description: string;
  category: string;
  publishDate: string;
  interested: boolean;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  image: string;
  date: string;
}

/** 企业详情（含介绍、风采图、方案、案例） */
export interface CompanyDetail {
  id: string;
  name: string;
  logo: string;
  intro: string;
  tags: string[];
  industryField: string;
  applicationLink: string;
  images: string[];
  solutions: CompanySolution[];
  cases: CompanyCase[];
  totalSolutions?: number;
}

export interface CompanySolution {
  id: string;
  title: string;
  desc: string;
  images: string[];  // all images for this solution
}

export interface CompanyCase {
  client: string;
  result: string;
  images: string[];  // all images for this case
}

/** 新闻详情 */
export interface NewsArticleDetail {
  id: string;
  title: string;
  author: string;
  date: string;
  content: string;
  images: string[];
}

export type TabRoute = '/' | '/solutions' | '/demands' | '/apply';

/* ───────── 后端原始数据模型（对应 Swagger） ───────── */
export interface RawCompany {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  logo: string;
  introduction: string;
  tags: string; // JSON 字符串，如 '["高新企业"]'
  industry: string;
  application_stage: string;
  status: string;
  solutions_count?: number;
  views?: number;
}

export interface RawCompanyImage {
  id: number;
  company_id: number;
  url?: string;
  image_url?: string;
  sort_order?: number;
}

export interface RawCompanySolution {
  id: number;
  company_id: number;
  title: string;
  description: string;
  image: string;       // legacy single image (may be absent)
  images?: { id: number; solution_id: number; image_url: string; sort_order: number }[];
  sort_order: number;
}

export interface RawCompanyCase {
  id: number;
  company_id: number;
  client_name: string;
  description: string;
  images?: { id: number; case_id: number; image_url: string; sort_order: number }[];
}

export interface RawCompanyDetail {
  company: RawCompany;
  images: RawCompanyImage[];
  solutions: RawCompanySolution[];
  cases: RawCompanyCase[];
  total_solutions?: number;
}

export interface RawDemand {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  company_name: string;
  description: string;
  category: string;
  status: string;
  published_at: string | null;
  source: string;
}

export interface RawNews {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  author: string;
  content: string;
  cover_image: string;
  images: string; // 逗号分隔的 URL 字符串
  status: string;
  published_at: string | null;
  summary: string;
}

/* ───────── 提交表单数据 ───────── */
export interface DemandSubmissionPayload {
  company_name: string;
  requirement: string;
  contact_person: string;
  phone: string;
  email?: string;
}

export interface SolutionApplicationPayload {
  company_name: string;
  solution_name: string;
  description?: string;
  contact_person: string;
  phone: string;
  email?: string;
}

export interface IntentPayload {
  demand_id: number;
  company_name: string;
  contact_person: string;
  phone: string;
}
