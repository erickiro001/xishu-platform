import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, Loader2, Eye } from 'lucide-react';
import { useNavigate, useNavigationType } from 'react-router';
import { fetchSolutionsPage, fetchChildCategoryNames } from '@/lib/services';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useListRestore, getListCache } from '@/hooks/useListRestore';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { INDUSTRY_FIELDS, APPLICATION_STAGES } from '@/lib/constants';
import type { Solution } from '@/types';

const PAGE_SIZE = 12;
const CACHE_KEY = 'solutions-list';

export default function SolutionsPage() {
  const [dimension, setDimension] = useState<'industry' | 'application'>('industry');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedAppLink, setSelectedAppLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const navigate = useNavigate();
  const navType = useNavigationType();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(140);

  // ── 列表状态恢复（仅 POP 导航时使用缓存，PUSH 导航加载新数据） ──
  const restoredRef = useRef(navType === 'POP' ? getListCache<Solution>(CACHE_KEY) : null);
  const hasRestored = Boolean(restoredRef.current);

  // ── 无限滚动数据加载 ──
  const [companies, setCompanies] = useState<Solution[]>(() => restoredRef.current?.data ?? []);
  const [page, setPage] = useState(() => restoredRef.current?.page ?? 1);
  const [hasMore, setHasMore] = useState(() => restoredRef.current?.hasMore ?? true);
  const [loading, setLoading] = useState(() => !hasRestored);
  const [error, setError] = useState<string | null>(null);
  const [totalSolutions, setTotalSolutions] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!append) setLoading(true);
    setError(null);

    try {
      const filters = {
        keyword: searchQuery.trim() || undefined,
        industry: selectedIndustry || undefined,
        application_stage: selectedAppLink || undefined,
      };
      const result = await fetchSolutionsPage(pageNum, PAGE_SIZE, filters, controller.signal);
      if (controller.signal.aborted) return;
      const newItems = append ? [...companies, ...result.list] : result.list;
      setCompanies(newItems);
      setHasMore(result.hasMore);
      setPage(pageNum);

      if (result.totalSolutions != null) setTotalSolutions(result.totalSolutions);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError('加载失败，请稍后重试');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [companies, searchQuery, selectedIndustry, selectedAppLink]);

  // 首次加载 / 筛选变化触发重新加载
  const prevFiltersRef = useRef({ keyword: '', industry: '', appLink: '' });
  useEffect(() => {
    const curr = {
      keyword: searchQuery.trim(),
      industry: selectedIndustry,
      appLink: selectedAppLink,
    };
    // 首次挂载：有缓存则跳过，无缓存加载第1页
    if (hasRestored) {
      // 有缓存时，只在筛选条件与初始不同时重新加载
      const prev = prevFiltersRef.current;
      if (prev.keyword !== curr.keyword || prev.industry !== curr.industry || prev.appLink !== curr.appLink) {
        prevFiltersRef.current = curr;
        loadPage(1, false);
      }
      return;
    }
    prevFiltersRef.current = curr;
    loadPage(1, false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedIndustry, selectedAppLink, hasRestored]);

  const handleLoadMore = useCallback(() => {
    loadPage(page + 1, true);
  }, [page, loadPage]);

  const sentinelRef = useInfiniteScroll({
    hasMore: hasMore && !loading,
    loading,
    onLoadMore: handleLoadMore,
  });

  // 列表状态恢复 hook（unmount 时自动保存 + 恢复滚动位置）
  useListRestore<Solution>({
    cacheKey: CACHE_KEY,
    data: companies,
    page,
    hasMore,
    restored: restoredRef.current,
  });

  const reload = useCallback(() => {
    loadPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 分类选项从后端动态获取（demand_category 树的子级），与管理后台保持一致；本地常量兜底避免空闪
  const [industryFields, setIndustryFields] = useState<string[]>(['全部', ...INDUSTRY_FIELDS]);
  const [applicationLinks, setApplicationLinks] = useState<string[]>(['全部', ...APPLICATION_STAGES]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchChildCategoryNames('行业领域'),
      fetchChildCategoryNames('应用环节'),
    ]).then(([names1, names2]) => {
      if (cancelled) return;
      if (names1.length) setIndustryFields(['全部', ...names1]);
      if (names2.length) setApplicationLinks(['全部', ...names2]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const measure = () => {
      if (!headerRef.current) return;
      const desktopNavOffset = window.innerWidth >= 768 ? 64 : 0;
      setHeaderHeight(headerRef.current.offsetHeight + desktopNavOffset);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [companies, loading, error]);

  const currentTags = dimension === 'industry' ? industryFields : applicationLinks;
  const currentSelected = dimension === 'industry' ? selectedIndustry : selectedAppLink;
  const hasIndustryFilter = !!selectedIndustry;
  const hasAppFilter = !!selectedAppLink;

  const handleToggleTag = (tag: string) => {
    if (tag === '全部') {
      if (dimension === 'industry') setSelectedIndustry('');
      else setSelectedAppLink('');
      return;
    }
    if (dimension === 'industry') {
      setSelectedIndustry(prev => prev === tag ? '' : tag);
    } else {
      setSelectedAppLink(prev => prev === tag ? '' : tag);
    }
  };

  const handleSwitchDimension = (d: 'industry' | 'application') => {
    setDimension(d);
  };

  return (
    <div className="min-h-screen page-pb-safe relative">
      {/* 固定背景层 */}
      <div className="fixed inset-0 z-0">
        <img 
          src="assets/01.jpg" 
          alt="" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
      </div>

      {/* 搜索与筛选 */}
      <div ref={headerRef} className="fixed top-0 md:top-16 left-0 right-0 z-10 bg-white/95 backdrop-blur-2xl px-4 md:px-6 pt-3 pb-3 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="desktop-container">
          <div className={`flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2.5 border transition-colors md:max-w-md ${isFocused ? 'border-blue-400 bg-white' : 'border-transparent'}`}>
            <Search size={17} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="搜索企业/方案/标签..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none" />
            {totalSolutions > 0 && (
              <span className="text-[12px] text-gray-400 whitespace-nowrap flex-shrink-0">
                共 <b className="text-blue-600 font-semibold">{totalSolutions}</b> 个方案
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <button onClick={() => handleSwitchDimension('industry')} className={`text-sm font-semibold transition-colors flex items-center gap-1 ${dimension === 'industry' ? 'text-blue-600' : 'text-gray-400'}`}>
                行业领域
                {hasIndustryFilter && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </button>
              <div className="w-px h-3.5 bg-gray-200" />
              <button onClick={() => handleSwitchDimension('application')} className={`text-sm font-semibold transition-colors flex items-center gap-1 ${dimension === 'application' ? 'text-emerald-600' : 'text-gray-400'}`}>
                应用环节
                {hasAppFilter && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>
            </div>

            {/* 子分类：单选下拉，点击选中/取消，不自动关闭 */}
            <Popover open={tagOpen} onOpenChange={setTagOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border bg-white transition-colors ${
                    currentSelected
                      ? (dimension === 'industry' ? 'border-blue-300 text-blue-600' : 'border-emerald-300 text-emerald-600')
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {currentSelected || '全部分类'}
                  <ChevronDown size={14} className={`transition-transform duration-200 ${tagOpen ? 'rotate-180' : ''}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2">
                <div className="grid grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto">
                  {currentTags.map((tag) => {
                    const isSelected = tag === '全部' ? !currentSelected : currentSelected === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => handleToggleTag(tag)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 text-center ${
                          isSelected
                            ? (dimension === 'industry' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white')
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {currentSelected && (
                  <button
                    onClick={() => handleToggleTag('全部')}
                    className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    清除选择
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* 桌面端占位：顶部导航栏(64px)高度，避免筛选栏被遮挡 */}
      <div className="hidden md:block h-16" />

      {/* 公司卡片 - 左右布局 + 液态玻璃 */}
      <div
        className="px-3 md:px-6 desktop-container space-y-2.5 md:space-y-0 relative z-[1] md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3"
        style={{ paddingTop: headerHeight + 12 }}
      >
        {loading && companies.length === 0 && <LoadingState />}
        {error && companies.length === 0 && <ErrorState message={error} onRetry={reload} />}
        {companies.map((company) => (
          <div key={company.id} onClick={() => navigate(`/company/${company.id}`)} className="w-full text-left active:scale-[0.97] transition-transform duration-150 cursor-pointer">
            <div className="relative overflow-hidden rounded-2xl border border-white/50 h-[136px]" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(20px) saturate(150%)', WebkitBackdropFilter: 'blur(20px) saturate(150%)', boxShadow: '0 2px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
              {/* 高光层 */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%)' }} />

              <div className="relative flex items-start gap-3 p-3">
                {/* 左侧：Logo - 顶对齐公司名称 */}
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-white/50 shadow-sm">
                  {company.logo && <img src={company.logo} alt={company.companyName} className="w-full h-full object-contain p-1" />}
                </div>

                {/* 右侧：名称 + 3行介绍 + Tags */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-gray-900 leading-tight line-clamp-1">{company.companyName}</h3>
                  <p className="text-[12px] text-gray-500 leading-[1.65] mt-1 line-clamp-3" style={{ minHeight: 'calc(12px * 1.65 * 3)' }}>{company.intro}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {company.tags.map((tag, i) => (
                      <span key={tag} className="text-[10px] px-1.5 py-[2px] rounded font-medium border" style={{ background: i === 0 ? 'rgba(251,191,36,0.12)' : i === 1 ? 'rgba(192,132,252,0.12)' : 'rgba(96,165,250,0.12)', borderColor: i === 0 ? 'rgba(251,191,36,0.2)' : i === 1 ? 'rgba(192,132,252,0.2)' : 'rgba(96,165,250,0.2)', color: i === 0 ? '#B45309' : i === 1 ? '#7E22CE' : '#2563EB' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 浏览量 - 左下角 */}
              <span className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[11px] text-gray-400">
                <Eye size={12} className="text-gray-400" />
                {(company.viewCount ?? 0).toLocaleString()}
              </span>

              {/* 查看详情 - 右下角小字 */}
              <span className="absolute bottom-2.5 right-3 text-[11px] font-medium text-blue-500">
                查看详情 ›
              </span>
            </div>
          </div>
        ))}

        {!loading && !error && companies.length === 0 && <EmptyState message="暂无相关企业" />}
      </div>

      {/* 无限滚动哨兵 + 加载指示器 */}
      <div ref={sentinelRef} className="flex justify-center py-6 relative z-[1]">
        {loading && companies.length > 0 && (
          <Loader2 size={24} className="text-gray-400 animate-spin" />
        )}
        {!loading && !hasMore && companies.length > 0 && (
          <span className="text-[13px] text-gray-400">没有更多了</span>
        )}
      </div>

      {/* 悬浮按钮 */}
      <button 
        onClick={() => navigate('/apply/solution-form')} 
        className="fixed fab-bottom-safe right-4 z-40 transition-transform active:scale-95 duration-150"
      >
        <img 
          src="assets/buttons/provide-solution.png" 
          alt="提供方案" 
          className="w-auto h-[82px] drop-shadow-xl"
        />
      </button>
    </div>
  );
}
