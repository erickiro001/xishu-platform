import { useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { fetchArticle } from '@/lib/services';
import { useFetch } from '@/hooks/useFetch';
import { scrollToY } from '@/hooks/useListRestore';
import { LoadingState, ErrorState } from '@/components/States';
import { isHtmlContent, sanitizeHtml } from '@/lib/utils';

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: article, loading, error, reload } = useFetch(
    (signal) => fetchArticle(id!, signal),
    [id]
  );

  useEffect(() => {
    scrollToY(0);
  }, [id]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-6">
      {/* 顶部导航栏 - 桌面端下移至顶部导航栏(64px)之下 */}
      <div className="sticky top-0 md:top-16 z-10 bg-white/80 backdrop-blur-xl px-4 py-3 shadow-sm">
        <div className="desktop-container">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 active:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span className="text-[15px] font-medium">返回</span>
        </button>
        </div>
      </div>

      {loading && <LoadingState />}
      {!loading && error && (
        <div className="px-4 pt-4 desktop-container">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}
      {!loading && !error && !article && (
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-gray-400">文章不存在</p>
        </div>
      )}

      {/* 文章内容 */}
      {!loading && !error && article && (
        <div className="px-4 pt-4 desktop-container">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* 标题 */}
            <div className="px-5 pt-5 pb-3">
              <h1 className="text-[20px] font-bold text-gray-900 leading-tight">
                {article.title}
              </h1>
            </div>

            {/* 元信息 */}
            <div className="px-5 pb-4 flex items-center gap-3 text-[12px] text-gray-400">
              {article.author && <span>{article.author}</span>}
              {article.author && article.date && <span>•</span>}
              {article.date && <span>{article.date}</span>}
            </div>

            {/* 正文 */}
            <div className="px-5 pb-5">
              {isHtmlContent(article.content) ? (
                /* 富文本：净化后渲染 */
                <div
                  className="rich-text"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
                />
              ) : (
                /* 纯文本：按段落渲染 */
                article.content
                  .split('\n\n')
                  .filter((p) => p.trim())
                  .map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-[15px] text-gray-700 leading-[1.85] mb-4 text-justify whitespace-pre-line"
                    >
                      {paragraph}
                    </p>
                  ))
              )}

              {/* 附加图片：仅纯文本正文时展示独立图片列表，避免与富文本内嵌图重复 */}
              {!isHtmlContent(article.content) && article.images.length > 0 && (
                <div className="mt-6 space-y-3">
                  {article.images.map((image, index) => (
                    <div key={index}>
                      <img
                        src={image}
                        alt={`图片${index + 1}`}
                        className="w-full rounded-xl"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
