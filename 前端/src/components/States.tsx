import { Loader2, AlertCircle, Inbox } from 'lucide-react'

/** 加载中状态 */
export function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-gray-400 ${className}`}>
      <Loader2 size={28} className="animate-spin mb-3" />
      <span className="text-sm">加载中...</span>
    </div>
  )
}

/** 错误状态，带重试按钮 */
export function ErrorState({
  message = '加载失败，请稍后重试',
  onRetry,
  className = '',
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <AlertCircle size={28} className="text-red-400 mb-3" />
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full text-sm font-medium bg-blue-600 text-white active:scale-95 transition-transform"
        >
          重新加载
        </button>
      )}
    </div>
  )
}

/** 空数据状态 */
export function EmptyState({ message = '暂无数据', className = '' }: { message?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-gray-400 ${className}`}>
      <Inbox size={28} className="mb-3" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
