import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { fetchArticles } from '@/lib/services';
import { useFetch } from '@/hooks/useFetch';
import { getScrollY } from '@/hooks/useListRestore';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import type { Article } from '@/types';

/* 模块级变量：仅在整页刷新时重置，SPA 内部导航时保留 */
let hasPlayedIntro = false;

/* ───────── 滚动触发动画 Hook ───────── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 用双 requestAnimationFrame 确保初始状态(opacity-0)先完成绘制，
          // 再切换到最终状态，保证 CSS transition 在所有浏览器(尤其安卓)都能播放
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setInView(true);
            });
          });
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ───────── 数字计数动画 Hook ───────── */
function useCountUp(target: number, duration = 2000, inView = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, inView]);

  return count;
}

/* ───────── 双千计划数字卡片 ───────── */
function StatCard({
  label,
  sublabel,
  inView,
  delay,
}: {
  label: string;
  sublabel: string;
  inView: boolean;
  delay: number;
}) {
  const count = useCountUp(1000, 2200, inView);

  return (
    <div
      className={`w-36 rounded-2xl border overflow-hidden transition-all duration-700 ${
        inView
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6'
      }`}
      style={{
        transitionDelay: `${delay}ms`,
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderColor: 'rgba(148,163,184,0.12)',
      }}
    >
      {/* 数字 */}
      <div className="px-4 py-3 text-center">
        <div>
          <p className="text-[22px] font-black text-[#1e3a5f] tracking-tight tabular-nums leading-none">
            {count}+
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-none">{sublabel}</p>
        </div>
      </div>
      {/* 底部标签 */}
      <div className="px-3 pb-3 text-center">
        <p className="text-[10px] font-semibold text-gray-700 leading-tight whitespace-nowrap">{label}</p>
      </div>
    </div>
  );
}

/* ───────── 新闻卡片（独立组件，内部使用 useInView） ───────── */
function ArticleCard({
  article,
  index,
  onClick,
}: {
  article: Article;
  index: number;
  onClick: (id: string) => void;
}) {
  const { ref, inView } = useInView(0.2);
  return (
    <div ref={ref}>
      <button
        onClick={() => onClick(article.id)}
        className={`w-full bg-white rounded-2xl overflow-hidden text-left shadow-[0_1px_6px_rgba(0,0,0,0.04)] border border-gray-100/60 transition-all duration-600 active:scale-[0.98] ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{ transitionDelay: `${index * 120}ms` }}
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
    </div>
  );
}

/* ───────── 主页面 ───────── */
export default function HomePage() {
  const navigate = useNavigate();
  const [hasAnimated, setHasAnimated] = useState(hasPlayedIntro);

  const cardAnim = useInView(0.1);
  const doubleAnim = useInView(0.2);
  const numAnim = useInView(0.3);
  const newsTitleAnim = useInView(0.3);

  const { data: articles, loading, error, reload } = useFetch(fetchArticles);

  // 首次进入播放入场动画后标记，SPA 内部再次进入首页时不再重复播放
  useEffect(() => {
    if (!hasAnimated) {
      const timer = setTimeout(() => {
        hasPlayedIntro = true;
        setHasAnimated(true);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated]);

  // 点击新闻时保存当前滚动位置
  const handleNewsClick = (newsId: string) => {
    sessionStorage.setItem('homePageScrollPosition', getScrollY().toString());
    navigate(`/news/${newsId}`);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] page-pb-safe page-pt-desktop-nav" style={{ isolation: 'isolate' }}>
      {/* ===== 顶部背景图 + 品牌标题 ===== */}
      <div className="relative">
        <img
          src="assets/header-bg.jpg"
          alt="背景"
          className={`w-full h-72 md:h-80 object-cover ${hasAnimated ? '' : 'hero-img-anim'}`}
        />
        {/* Banner 右上角：分享提示（仅移动端显示，引导用户使用微信右上角分享） */}
        <div className="absolute top-3 right-3 z-10 pointer-events-none md:hidden">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide"
            style={{
              color: '#FFFFFF',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              background: 'rgba(0,0,0,0.28)',
              backdropFilter: 'blur(4px) saturate(120%)',
              WebkitBackdropFilter: 'blur(4px) saturate(120%)',
              border: '1px solid rgba(255,255,255,0.4)',
            }}
          >
            点击右上角分享
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#F0F2F5] to-transparent" />

        {/* 标题 */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center pt-2 ${hasAnimated ? '' : 'hero-title-anim'}`}
        >
          <h1
            className="text-white text-[28px] md:text-[36px] font-bold tracking-[0.15em] drop-shadow-lg"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
          >
            犀数工场
          </h1>
          <p
            className="text-white/75 text-[11px] md:text-[13px] tracking-[0.3em] mt-2 font-medium uppercase"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}
          >
            XISHU GONGCHANG
          </p>
        </div>
      </div>

      {/* ===== 白色大圆角卡片 ===== */}
      <div className="px-3 md:px-6 -mt-16 relative z-10 desktop-container" ref={cardAnim.ref}>
        <div
          className={`bg-white rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-700 delay-200 ${
            cardAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* ── 工场介绍 ── */}
          <div className="p-5 md:p-8 pb-4">
            <div
              className={`flex items-center gap-2.5 mb-4 transition-all duration-700 delay-400 ${
                cardAnim.inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <div className="w-1 h-5 bg-blue-600 rounded-full" />
              <h2 className="text-[17px] md:text-[19px] font-bold text-gray-900">展厅介绍</h2>
            </div>

            <p
              className={`text-[14px] md:text-[15px] text-gray-600 leading-[1.95] text-justify transition-all duration-700 delay-500 ${
                cardAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            >
              犀数工场——无锡人工智能展示馆，位于无锡人工智能产业园，作为无锡市制造业人工智能赋能中心（AI+电子信息）的核心落地载体，以"AI赋能无锡智造"为目标，线下设三大展区集中展示龙头企业AI赋能制造业全价值链场景的解决方案，线上构建无限拓展的"共享展厅"，打造"24小时AI+制造业解决方案超市"，目标汇聚1000个解决方案及制造业AI需求，打通供需壁垒，精准赋能合作，形成"能力展示—场景验证—产业升级—生态集聚"新模式。
            </p>
          </div>

          {/* ── 视频播放区域 ── */}
          <div
            className={`px-5 md:px-8 pb-5 transition-all duration-700 delay-600 ${
              cardAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="rounded-2xl overflow-hidden relative">
              <video
                controls
                poster="assets/video/cover.png"
                className="w-full h-44 md:h-[360px] object-cover"
                preload="metadata"
              >
                <source src="assets/video/video.mp4" type="video/mp4" />
                您的浏览器不支持视频播放
              </video>
            </div>
          </div>

          {/* ── 双千计划详细介绍 ── */}
          <div className="px-5 md:px-8 pb-2" ref={doubleAnim.ref}>
            {/* 标题 */}
            <div
              className={`flex items-center gap-2 mb-3 transition-all duration-700 ${
                doubleAnim.inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <h3 className="text-[15px] font-bold text-gray-900">
                双千计划
              </h3>
            </div>

            {/* 描述 */}
            <p
              className={`text-[13px] text-gray-600 leading-[1.95] text-justify transition-all duration-700 delay-200 ${
                doubleAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            >
              犀数工场"双千计划"——目标三年内聚合超过
              <span className="text-blue-600 font-semibold"> 1000 </span>
              个AI+制造解决方案，收集超过
              <span className="text-blue-600 font-semibold"> 1000 </span>
              个制造业企业的AI赋能需求，打通供需匹配通道，加速AI场景落地，赋能制造业数智化转型。
            </p>
          </div>

          {/* ── 两个数字动画卡片 ── */}
          <div className="px-5 md:px-8 pb-6 pt-3" ref={numAnim.ref}>
            <div className="flex justify-center gap-3">
              <StatCard
                label="AI + 制造业解决方案"
                sublabel="优质方案汇聚"
                inView={numAnim.inView}
                delay={0}
              />
              <StatCard
                label="制造企业 AI 需求"
                sublabel="精准需求链接"
                inView={numAnim.inView}
                delay={200}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== 最新动态 ===== */}
      <div className="px-5 md:px-6 mt-8 mb-3 desktop-container" ref={newsTitleAnim.ref}>
        <div
          className={`flex items-center justify-between transition-all duration-700 ${
            newsTitleAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-blue-600 rounded-full" />
            <h3 className="text-[16px] md:text-[18px] font-bold text-gray-900">最新动态</h3>
          </div>
          <button
            onClick={() => navigate('/news/all')}
            className="text-[13px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 transition-colors"
          >
            查看全部
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-3 md:px-6 desktop-container space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && (articles ?? []).length === 0 && (
          <EmptyState message="暂无最新动态" />
        )}
        {!loading &&
          !error &&
          (articles ?? []).map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} onClick={handleNewsClick} />
          ))}
      </div>

      {/* ===== 悬浮入驻按钮 ===== */}
      <button
        onClick={() => navigate('/apply')}
        className="fixed fab-bottom-safe right-4 z-40 transition-transform active:scale-95 duration-150"
      >
        <img 
          src="assets/buttons/apply.png" 
          alt="申请入驻" 
          className="w-auto h-[82px] drop-shadow-xl"
        />
      </button>
    </div>
  );
}
