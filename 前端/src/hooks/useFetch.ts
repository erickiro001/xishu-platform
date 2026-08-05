import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * 通用数据请求 Hook：管理 loading / error 状态，支持重试。
 * fetcher 接收 AbortSignal，组件卸载时自动取消。
 */
export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = []
): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetcher(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        const msg = e instanceof ApiError ? e.message : '加载失败，请稍后重试'
        setError(msg)
        setLoading(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, ...deps])

  return { data, loading, error, reload }
}
