import { marked } from 'marked'

/**
 * 新闻文档（Markdown + images 文件夹）一键导入工具
 * - 解析 Markdown，提取标题、作者、发布时间与正文
 * - 将正文中引用的图片转换为 WebP 并编码为 base64 内嵌到 HTML
 */

export interface ImportedNews {
  title: string
  author: string
  date: string
  /** 正文 HTML，图片已内嵌为 base64(webp) */
  content: string
  /** 封面图（首张图片的 base64 webp），可能为空 */
  cover: string
  /** 处理的图片数量 */
  imageCount: number
}

export interface ImportOptions {
  /** 图片最大宽度（超出则等比缩放），默认 1080 */
  maxWidth?: number
  /** WebP 压缩质量 0~1，默认 0.82 */
  quality?: number
}

/** 取文件名（去掉路径） */
function baseName(path: string): string {
  return path.split('/').pop()?.split('\\').pop() ?? path
}

/**
 * 将图片文件转换为 WebP base64 data URL。
 * 浏览器若不支持 webp 导出则回退为 png。
 */
export function imageFileToWebpDataUrl(
  file: File | Blob,
  options: ImportOptions = {},
): Promise<string> {
  const { maxWidth = 1080, quality = 0.82 } = options
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建画布上下文'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      let dataUrl = canvas.toDataURL('image/webp', quality)
      // 部分浏览器不支持 webp 导出，会返回 png；做一次兜底校验
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/png')
      }
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

interface ParsedMeta {
  author: string
  date: string
}

/** 从 blockquote 文本中解析作者/发布时间 */
function parseMeta(text: string): ParsedMeta {
  const authorMatch = text.match(/作者[:：]\s*(.+)/)
  const dateMatch = text.match(/(?:发布时间|时间|日期)[:：]\s*(.+)/)
  return {
    author: authorMatch?.[1]?.trim() ?? '',
    date: dateMatch?.[1]?.trim() ?? '',
  }
}

/**
 * 主入口：传入用户选择的文件列表（Markdown + 图片），返回结构化新闻数据。
 */
export async function importNewsFiles(
  files: File[],
  options: ImportOptions = {},
): Promise<ImportedNews> {
  // 找到 markdown 文件
  const mdFile = files.find((f) => /\.(md|markdown)$/i.test(f.name))
  if (!mdFile) {
    throw new Error('未找到 Markdown(.md) 文件，请选择包含 .md 的文件夹')
  }

  // 建立图片文件索引（按文件名）
  const imageMap = new Map<string, File>()
  for (const f of files) {
    if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(f.name)) {
      imageMap.set(baseName(f.name).toLowerCase(), f)
    }
  }

  const markdown = await mdFile.text()
  const rawHtml = await marked.parse(markdown)

  // 用 DOM 解析处理标题、元信息与图片
  const doc = new DOMParser().parseFromString(rawHtml as string, 'text/html')

  // 标题：第一个 h1
  let title = ''
  const h1 = doc.querySelector('h1')
  if (h1) {
    title = h1.textContent?.trim() ?? ''
    h1.remove()
  }

  // 元信息：第一个 blockquote（作者/发布时间/原文）
  let author = ''
  let date = ''
  const bq = doc.querySelector('blockquote')
  if (bq) {
    const meta = parseMeta(bq.textContent ?? '')
    author = meta.author
    date = meta.date
    bq.remove()
  }

  // 处理图片：转换为 webp base64 并替换 src
  const imgs = Array.from(doc.querySelectorAll('img'))
  let cover = ''
  let processed = 0
  for (const img of imgs) {
    const src = img.getAttribute('src') ?? ''
    const key = baseName(src).toLowerCase()
    const file = imageMap.get(key)
    if (!file) {
      // 找不到对应图片则移除该 img，避免坏链
      img.remove()
      continue
    }
    try {
      const dataUrl = await imageFileToWebpDataUrl(file, options)
      img.setAttribute('src', dataUrl)
      img.removeAttribute('width')
      img.removeAttribute('height')
      if (!cover) cover = dataUrl
      processed += 1
    } catch {
      img.remove()
    }
  }

  const content = doc.body.innerHTML.trim()

  return { title, author, date, content, cover, imageCount: processed }
}
