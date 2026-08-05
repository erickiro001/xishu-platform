import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from "dompurify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 判断字符串是否为 HTML 富文本（包含成对/自闭合标签）。
 */
export function isHtmlContent(value: string | null | undefined): boolean {
  if (!value) return false
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/**
 * 净化 HTML 富文本，防止 XSS。保留常见富文本标签与图片。
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  })
}
