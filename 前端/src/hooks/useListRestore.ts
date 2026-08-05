import { useRef, useEffect, useLayoutEffect, useCallback } from 'react'

/**
 * 滚动容器工具函数。
 * CSS 设置 body { overflow: hidden }、#root { overflow-y: auto }，
 * 因此滚动发生在 #root 元素上，而非 window。所有滚动操作必须针对 #root。
 */

/** 获取滚动容器元素（#root） */
export function getScrollContainer(): HTMLElement | null {
  return document.getElementById('root')
}

/** 获取当前滚动位置 */
export function getScrollY(): number {
  return getScrollContainer()?.scrollTop ?? window.scrollY
}

/** 滚动到指定 Y 位置 */
export function scrollToY(y: number): void {
  const container = getScrollContainer()
  if (container) {
    container.scrollTo(0, y)
  } else {
    window.scrollTo(0, y)
  }
}

/**
 * 列表状态缓存条目
 */
interface CacheEntry<T> {
  data: T[]
  page: number
  hasMore: boolean
  scrollY: number
  extra?: unknown
}

/** 模块级缓存：页面卸载后数据仍在内存中，返回时可恢复 */
const cacheStore: Record<string, CacheEntry<unknown>> = {}

/**
 * 读取并消费缓存（读取后自动删除，避免重复使用）。
 * 用于 useState 的 lazy initializer。
 */
export function getListCache<T>(cacheKey: string): CacheEntry<T> | null {
  const cached = cacheStore[cacheKey] as CacheEntry<T> | undefined
  if (cached) {
    delete cacheStore[cacheKey]
    return cached
  }
  return null
}

/** 检查指定缓存 key 是否有可恢复的数据（不消费） */
export function hasListCache(cacheKey: string): boolean {
  return !!cacheStore[cacheKey]
}

interface UseListRestoreOptions<T> {
  /** 缓存 key，每个列表页唯一 */
  cacheKey: string
  /** 当前列表数据 */
  data: T[]
  /** 当前页码 */
  page: number
  /** 是否还有更多 */
  hasMore: boolean
  /** 额外需要缓存的数据（如搜索索引） */
  extra?: unknown
  /** 缓存数据（来自 getListCache），用于恢复滚动位置 */
  restored: CacheEntry<T> | null
}

/**
 * 列表状态恢复 Hook。
 *
 * 核心问题：React 导航时先更新 DOM（移除旧页面内容、添加新页面内容），
 * 然后才执行 cleanup。此时 #root 的内容已变为新页面（通常更短），
 * 浏览器已把 scrollTop 重置为 0，导致 unmount 时读到的 scrollY=0。
 *
 * 解决方案：用 scroll 事件监听器实时追踪滚动位置到 ref，
 * unmount 时从 ref 读取（而非直接读 DOM），确保拿到的是用户最后的滚动位置。
 */
export function useListRestore<T>({
  cacheKey,
  data,
  page,
  hasMore,
  extra,
  restored,
}: UseListRestoreOptions<T>) {
  // 保存最新状态到 ref，供 unmount 时读取
  const stateRef = useRef({ data, page, hasMore, extra })
  stateRef.current = { data, page, hasMore, extra }

  // ── 实时追踪滚动位置 ──
  // 用户每次滚动都更新 scrollYRef，确保 unmount 时能拿到正确的位置
  // 即使此时 DOM 已被 React 替换为新页面内容（scrollTop 已被浏览器重置为 0）
  const scrollYRef = useRef(0)

  useEffect(() => {
    const container = getScrollContainer()
    if (!container) return

    scrollYRef.current = container.scrollTop

    const handleScroll = () => {
      scrollYRef.current = container.scrollTop
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // unmount 时保存（useLayoutEffect 在浏览器 layout 前执行，尽量减少 DOM 变化的影响）
  useLayoutEffect(() => {
    return () => {
      const { data: d, page: p, hasMore: hm, extra: e } = stateRef.current
      cacheStore[cacheKey] = {
        data: d,
        page: p,
        hasMore: hm,
        scrollY: scrollYRef.current,
        extra: e,
      }
    }
  }, [cacheKey])

  // 恢复滚动位置（仅在有缓存时执行一次）
  // useLayoutEffect 在浏览器绘制前同步滚动，用户不会看到先到顶部再跳转的闪烁
  const restoredRef = useRef(restored)
  useLayoutEffect(() => {
    if (!restoredRef.current) return
    const targetY = restoredRef.current.scrollY
    if (targetY === 0) return

    let attempts = 0
    const maxAttempts = 20

    const tryScroll = () => {
      scrollToY(targetY)
      attempts++
      if (attempts < maxAttempts && Math.abs(getScrollY() - targetY) > 5) {
        if (attempts <= 5) {
          requestAnimationFrame(tryScroll)
        } else {
          setTimeout(tryScroll, 80)
        }
      }
    }

    scrollToY(targetY)
    const raf = requestAnimationFrame(tryScroll)
    return () => cancelAnimationFrame(raf)
  }, [])

  const clearCache = useCallback(() => {
    delete cacheStore[cacheKey]
  }, [cacheKey])

  return { clearCache }
}
