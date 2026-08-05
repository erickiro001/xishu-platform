import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { fetchCompanyDetail, fetchCompanyView } from '@/lib/services';
import { useFetch } from '@/hooks/useFetch';
import { LoadingState, ErrorState } from '@/components/States';
import ImageGallery from '@/components/ImageGallery';

type Tab = 'intro' | 'solution' | 'case';

const tabs: { key: Tab; label: string }[] = [
  { key: 'intro', label: '企业介绍' },
  { key: 'solution', label: '解决方案' },
  { key: 'case', label: '案例成效' },
];

export default function CompanyDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('solution');

  const { data: company, loading, error, reload } = useFetch(
    (signal) => fetchCompanyDetail(id!, signal),
    [id]
  );

  // 进入详情页浏览量 +1（fire-and-forget，失败不影响页面）
  useEffect(() => {
    if (!id) return
    fetchCompanyView(id).catch(() => {})
  }, [id]);

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* 头部 - 全屏模式下紧贴顶部，不再避让全局导航栏 */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="desktop-container">
        <div className="flex items-center px-4 h-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 -ml-2 active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          <h1 className="absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900 pointer-events-none">
            {company?.name ?? '企业详情'}
          </h1>
        </div>

        {/* Tab 切换 - 三个选项一行 */}
        <div className="flex px-4 border-b border-gray-100">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${
                activeTab === key ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {label}
              {activeTab === key && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* 内容区域 - 仅避让自身固定头部(108px) */}
      <div className="px-4 pb-5 pt-[108px] desktop-container">
        {loading && <LoadingState />}
        {!loading && error && (
          <ErrorState
            message={error.includes('404') || error.includes('不存在') ? '未找到该企业' : error}
            onRetry={reload}
          />
        )}

        {!loading && !error && company && (
          <>
            {/* ===== 企业介绍 ===== */}
            {activeTab === 'intro' && (
              <div className="space-y-5">
                {/* 企业简介 */}
                <div className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h2 className="text-[15px] font-bold text-gray-900">企业简介</h2>
                  </div>
                  <p className="text-[14px] text-gray-600 leading-[1.9] text-justify whitespace-pre-line">
                    {company.intro || '暂无企业简介'}
                  </p>
                </div>

                {/* 图片展示 */}
                {company.images.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-600 rounded-full" />
                      <h2 className="text-[15px] font-bold text-gray-900">企业风采</h2>
                    </div>
                    <ImageGallery
                      images={company.images}
                      alt="企业图片"
                      className="space-y-3"
                      imageWrapperClass="rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ===== 解决方案 ===== */}
            {activeTab === 'solution' && (
              <div className="space-y-3">
                {company.solutions.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">暂无解决方案</div>
                )}
                {company.solutions.map((sol) => (
                  <div key={sol.id} className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-blue-600 rounded-full" />
                      <h2 className="text-[15px] font-bold text-gray-900">{sol.title}</h2>
                    </div>
                    <p className="text-[14px] text-gray-600 leading-[1.9] whitespace-pre-line">
                      {sol.desc}
                    </p>
                    {sol.images.length > 0 && (
                      <ImageGallery
                        images={sol.images}
                        alt={sol.title}
                        className="mt-4 space-y-3"
                        imageWrapperClass="rounded-xl overflow-hidden"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ===== 案例成效 ===== */}
            {activeTab === 'case' && (
              <div className="space-y-3">
                {company.cases.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">暂无案例成效</div>
                )}
                {company.cases.map((c, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <h3 className="text-[14px] font-semibold text-gray-900">{c.client}</h3>
                    </div>
                    <p className="text-[13px] text-gray-500 leading-relaxed ml-8 whitespace-pre-line">
                      {c.result}
                    </p>
                    {c.images.length > 0 && (
                      <ImageGallery
                        images={c.images}
                        alt="案例图"
                        className="mt-3 ml-8 space-y-2"
                        imageWrapperClass="rounded-xl overflow-hidden"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
