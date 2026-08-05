import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { fetchArticlesPage } from '@/lib/services';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { getScrollY } from '@/hooks/useListRestore';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import type { Article } from '@/types';

const PAGE_SIZE = 20;

export default function AllNewsPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (targetPage: number) => {
    // 取消上一次请求
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const result = await fetchArticlesPage(targetPage, PAGE_SIZE, controller.signal);
      setArticles((prev) => [...prev, ...result.list]);
      setHasMore(result.hasMore);
      setError(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadData(1);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadData]);

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadData(nextPage);
  }, [loading, hasMore, page, loadData]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: handleLoadMore });

  const handleNewsClick = (newsId: string) => {
    sessionStorage.setItem('allNewsScrollPosition', getScrollY().toString());
    navigate(`/news/${newsId}`);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] page-pb-safe page-pt-desktop-nav">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="desktop-container flex items-center h-11 px-5 md:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors mr-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[16px] font-bold text-gray-900">全部动态</h1>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-3 md:px-6 desktop-container py-4">
        {/* 错误状态 */}
        {error && !loading && (
          <ErrorState message={error} onRetry={() => { setArticles([]); setPage(1); loadData(1); }} />
        )}

        {/* 空状态 */}
        {!loading && !error && articles.length === 0 && (
          <EmptyState message="暂无动态" />
        )}

        {/* 文章列表 */}
        {articles.length > 0 && (
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => handleNewsClick(article.id)}
                className="w-full bg-white rounded-2xl overflow-hidden text-left shadow-[0_1px_6px_rgba(0,0,0,0.04)] border border-gray-100/60 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex gap-3 p-3">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-24 h-[72px] rounded-xl object-cover flex-shrink-0 bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-[14px] font-semibold text-gray-900 line-clamp-1 mb-1">
                      {article.title}
                    </h4>
                    <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                    <span className="text-[11px] text-gray-400 mt-1.5">{article.date}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 加载中 */}
        {loading && <LoadingState />}

        {/* 无限滚动哨兵 / 没有更多提示 */}
        {!loading && !error && articles.length > 0 && (
          <div ref={sentinelRef} className="h-1" />
        )}
        {!loading && !hasMore && articles.length > 0 && (
          <p className="text-center text-[12px] text-gray-400 pt-4 pb-2">— 已加载全部动态 —</p>
        )}
      </div>
    </div>
  );
}
