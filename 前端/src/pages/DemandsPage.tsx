import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Building2, Search, ChevronDown, Loader2 } from 'lucide-react';
import { useNavigate, useNavigationType } from 'react-router';
import { fetchDemandsPage, fetchChildCategoryNames } from '@/lib/services';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useListRestore, getListCache } from '@/hooks/useListRestore';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { INDUSTRY_FIELDS, APPLICATION_STAGES } from '@/lib/constants';
import type { Demand } from '@/types';

const PAGE_SIZE = 12;
const CACHE_KEY = 'demands-list';

/** 去除 description 末尾嵌入的 demand-source 注释，避免 UI 中暴露内部标记 */
function stripSourceComment(description: string): string {
  return description.replace(/<!--demand-source:.*?-->\s*$/s, '').trim();
}

export default function DemandsPage() {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagOpen, setTagOpen] = useState(false);

  // 维度切换（决定下拉显示哪个维度的分类），两个维度的筛选可同时生效
  const [dimension, setDimension] = useState<'industry' | 'application'>('industry');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedAppLink, setSelectedAppLink] = useState('');

  // 分类选项从后端动态获取；本地常量兜底避免空闪
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

  // ── 列表状态恢复（仅 POP 导航时使用缓存，PUSH 导航加载新数据） ──
  const restoredRef = useRef(navType === 'POP' ? getListCache<Demand>(CACHE_KEY) : null);
  const hasRestored = Boolean(restoredRef.current);
  const restoredExtra = restoredRef.current?.extra as { visibleCount?: number } | undefined;

  // ── 数据加载：一次拉全量（后端 category 参数为整串精确匹配，无法做维度筛选，故本地过滤） ──
  const [allDemands, setAllDemands] = useState<Demand[]>(() => restoredRef.current?.data ?? []);
  const [visibleCount, setVisibleCount] = useState(() => restoredExtra?.visibleCount ?? PAGE_SIZE);
  const [loading, setLoading] = useState(() => !hasRestored);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadAll = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // 后端单页上限 50，翻页取尽全部需求
      const all: Demand[] = [];
      let p = 1;
      while (true) {
        const result = await fetchDemandsPage(p, 50, undefined, controller.signal);
        if (controller.signal.aborted) return;
        all.push(...result.list);
        if (p * 50 >= result.total || result.list.length === 0) break;
        p++;
      }
      setAllDemands(all);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError('加载失败，请稍后重试');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 首次加载（有缓存则跳过）
  useEffect(() => {
    if (hasRestored) return;
    loadAll();
    return () => abortRef.current?.abort();
  }, [loadAll, hasRestored]);

  // ── 本地过滤：关键词 + 行业领域 + 应用环节 ──
  // 需求 category 存储为「行业领域/xxx|应用环节/yyy」组合格式，用「维度前缀/子分类」子串匹配
  const filteredDemands = useMemo(() => {
    const kw = searchQuery.trim().toLowerCase();
    return allDemands.filter((d) => {
      if (selectedIndustry && !d.category.includes(`行业领域/${selectedIndustry}`)) return false;
      if (selectedAppLink && !d.category.includes(`应用环节/${selectedAppLink}`)) return false;
      if (kw) {
        const text = `${d.title} ${d.company} ${stripSourceComment(d.description)}`.toLowerCase();
        if (!text.includes(kw)) return false;
      }
      return true;
    });
  }, [allDemands, searchQuery, selectedIndustry, selectedAppLink]);

  // 筛选 / 搜索变化时重置可见条数（重新从第1页显示）
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedIndustry, selectedAppLink]);

  // 当前可见列表 + 总数（过滤后）
  const demands = filteredDemands.slice(0, visibleCount);
  const total = filteredDemands.length;
  const hasMore = visibleCount < filteredDemands.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((c) => c + PAGE_SIZE);
  }, []);

  const sentinelRef = useInfiniteScroll({
    hasMore: hasMore && !loading,
    loading,
    onLoadMore: handleLoadMore,
  });

  // 列表状态恢复 hook（unmount 时自动保存 + 恢复滚动位置）
  useListRestore<Demand>({
    cacheKey: CACHE_KEY,
    data: allDemands,
    page: 1,
    hasMore: true,
    extra: { visibleCount },
    restored: restoredRef.current,
  });

  // 错误重试
  const reload = useCallback(() => {
    loadAll();
  }, [loadAll]);

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
    <div className="min-h-screen bg-[#F5F6F8] page-pb-safe">
      {/* Banner：移动端显示，桌面端隐藏 */}
      <div className="w-full md:hidden">
        <img
          src="assets/demandhead.png"
          alt="需求信息"
          className="w-full h-auto object-contain block"
        />
      </div>

      {/* 搜索与筛选条：吸顶（桌面端下移至顶部导航栏 64px 之下，避免被遮挡） */}
      <div className="sticky top-0 md:top-16 z-10 bg-white/95 backdrop-blur-2xl px-4 pt-3 pb-3 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="desktop-container">
        {/* 搜索框 */}
        <div className={`flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2.5 border transition-colors ${isFocused ? 'border-blue-400 bg-white' : 'border-transparent'}`}>
          <Search size={17} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索需求/企业..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          {total > 0 && (
            <span className="text-[12px] text-gray-400 whitespace-nowrap flex-shrink-0">
              共 <b className="text-blue-600 font-semibold">{total}</b> 条需求
            </span>
          )}
        </div>

        {/* 维度切换 + 子分类下拉 */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSwitchDimension('industry')}
              className={`text-sm font-semibold transition-colors flex items-center gap-1 ${dimension === 'industry' ? 'text-blue-600' : 'text-gray-400'}`}
            >
              行业领域
              {hasIndustryFilter && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
            <div className="w-px h-3.5 bg-gray-200" />
            <button
              onClick={() => handleSwitchDimension('application')}
              className={`text-sm font-semibold transition-colors flex items-center gap-1 ${dimension === 'application' ? 'text-emerald-600' : 'text-gray-400'}`}
            >
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

      {/* 需求卡片列表 - 桌面端网格布局 + 居中限宽；增加桌面端 pt 以避让 sticky 筛选条 */}
      <div className="px-4 desktop-container space-y-3 md:space-y-0 pt-3 md:pt-[120px] md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3 md:space-y-0">
        {loading && demands.length === 0 && <LoadingState />}
        {error && demands.length === 0 && <ErrorState message={error} onRetry={reload} />}
        {demands.map((demand) => (
          <div
            key={demand.id}
            onClick={() => navigate(`/demand/${demand.id}`)}
            className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)] border border-gray-100/60 cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all"
          >
            <h3 className="text-[15px] font-bold text-gray-900 leading-snug">
              {demand.title}
            </h3>
            <p className="text-[13px] text-gray-500 leading-[1.75] mt-2 line-clamp-2">
              {stripSourceComment(demand.description)}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                  <Building2 size={13} className="text-blue-500" />
                </div>
                <span className="text-[12px] text-gray-600 font-medium">{demand.company}</span>
              </div>
              <span
                className="px-3 py-[5px] rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200/60"
              >
                感兴趣
              </span>
            </div>
          </div>
        ))}
        {!loading && !error && demands.length === 0 && (
          <EmptyState message="暂无相关需求" />
        )}
      </div>

      {/* 无限滚动哨兵 + 加载指示器 */}
      <div ref={sentinelRef} className="flex justify-center py-6">
        {loading && demands.length > 0 && (
          <Loader2 size={24} className="text-gray-400 animate-spin" />
        )}
        {!loading && !hasMore && demands.length > 0 && (
          <span className="text-[13px] text-gray-400">没有更多了</span>
        )}
      </div>

      {/* 右下角浮动发布按钮 */}
      <button
        onClick={() => navigate('/apply/demand-form')}
        className="fixed fab-bottom-safe right-4 z-40 transition-transform active:scale-95 duration-150"
      >
        <img
          src="assets/buttons/post-demand.png"
          alt="发布需求"
          className="w-auto h-[82px] drop-shadow-xl"
        />
      </button>
    </div>
  );
}
