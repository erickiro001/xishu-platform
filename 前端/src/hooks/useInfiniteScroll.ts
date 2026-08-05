import { useRef, useEffect } from 'react'

interface UseInfiniteScrollOptions {
  /** 是否还有更多数据可加载 */
  hasMore: boolean
  /** 是否正在加载中 */
  loading: boolean
  /** 触发加载下一页的回调 */
  onLoadMore: () => void
  /** 触发距离阈值（距底部多少像素时触发），默认 200 */
  threshold?: number
}

/**
 * 无限滚动 Hook：监听页面滚动，接近底部时自动触发 onLoadMore。
 *
 * 用法：
 *   const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore })
 *   // 在列表末尾渲染 <div ref={sentinelRef} />
 *
 * 桌面端网格布局下内容可能不够长，哨兵始终在视口内，
 * IntersectionObserver 不会重复触发，因此加载完成后会主动检查哨兵位置，
 * 若仍在视口内且有更多数据则继续加载，直到内容撑满视口。
 */
export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  threshold = 200,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(loading)
  const hasMoreRef = useRef(hasMore)
  const onLoadMoreRef = useRef(onLoadMore)

  // 保持 ref 最新，避免 effect 依赖变化导致频繁重新绑定
  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current && hasMoreRef.current) {
          onLoadMoreRef.current()
        }
      },
      // rootMargin 让哨兵在进入视口前 threshold 像素时就触发
      { rootMargin: `${threshold}px` },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [threshold])

  // 加载完成后：如果哨兵仍在视口内且有更多数据，主动触发下一页
  // 解决桌面端网格布局内容不够长、IntersectionObserver 不重复触发的问题
  useEffect(() => {
    if (loading || !hasMore) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    // 等待 DOM 渲染（新数据追加）后再检查
    const raf = requestAnimationFrame(() => {
      const rect = sentinel.getBoundingClientRect()
      const windowHeight = window.innerHeight
      // 哨兵在视口内（含 threshold 缓冲区）→ 继续加载
      if (rect.top < windowHeight + threshold) {
        onLoadMoreRef.current()
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [loading, hasMore, threshold])

  return sentinelRef
}
