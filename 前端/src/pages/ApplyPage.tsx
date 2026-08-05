import { useNavigate } from 'react-router';

const entries = [
  {
    title: '提供解决方案',
    subtitle: '我有AI方案，服务制造企业',
    path: '/apply/solution-form',
    accent: '#059669',
    bg: '#ECFDF5',
    number: '01',
    icon: 'assets/buttons/solution.png',
  },
  {
    title: '发布需求信息',
    subtitle: '我有业务需求，寻找AI服务商',
    path: '/apply/demand-form',
    accent: '#2563EB',
    bg: '#EFF6FF',
    number: '02',
    icon: 'assets/buttons/demand.png',
  },
];

export default function ApplyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white page-pb-safe page-pt-desktop-nav">
      {/* 顶部 */}
      <div className="px-5 pt-10 pb-6 desktop-container">
        <p className="text-[11px] text-gray-400 font-medium tracking-[0.2em] uppercase">Application</p>
        <h1 className="text-[24px] font-bold text-gray-900 mt-1 tracking-tight">申请入驻</h1>
        <p className="text-[14px] text-gray-500 mt-2 leading-relaxed">
          欢迎加入犀数工场，选择适合您的方式开始
        </p>
      </div>

      {/* 两张入口卡片 - 桌面端两列并排 */}
      <div className="px-5 space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 desktop-container">
        {entries.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full rounded-2xl border border-white/50 p-5 text-left active:scale-[0.98] transition-all duration-200 relative overflow-hidden"
            style={{ 
              background: item.number === '01' 
                ? 'linear-gradient(135deg, rgba(236,253,245,0.75) 0%, rgba(209,250,229,0.65) 40%, rgba(167,243,208,0.55) 70%, rgba(110,231,183,0.70) 100%)'
                : 'linear-gradient(to right, rgba(220,206,237,0.72) 0%, rgba(198,216,230,0.60) 45%, rgba(171,187,209,0.82) 100%)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              boxShadow: item.number === '01'
                ? '0 4px 24px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(52,211,153,0.15)'
                : '0 4px 24px rgba(100,130,160,0.15), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(140,160,190,0.2)',
            }}
          >
            {/* 液态玻璃高光层 */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
              background: item.number === '01'
                ? 'linear-gradient(160deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 50%, rgba(52,211,153,0.08) 100%)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 50%, rgba(140,160,190,0.08) 100%)',
            }} />
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p
                  className="text-[11px] font-bold tracking-wider"
                  style={{ color: item.accent }}
                >
                  {item.number}
                </p>
                <h3 className="text-[17px] font-bold text-gray-900 mt-1">{item.title}</h3>
                <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{item.subtitle}</p>

                <div className="flex items-center gap-1 mt-4">
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: item.accent }}
                  >
                    立即申请
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={item.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* 右侧图片 - 绝对定位到右下角 */}
              <img 
                src={item.icon} 
                alt={item.title} 
                className="absolute bottom-0 right-3 h-[80%] w-auto object-contain"
              />
            </div>
          </button>
        ))}
      </div>

      {/* 入驻流程 */}
      <div className="px-5 mt-10 desktop-container">
        <p className="text-[11px] text-gray-400 font-medium tracking-[0.15em] uppercase mb-5">
          Process
        </p>

        {/* 流程配图 */}
        <img
          src="assets/join.png"
          alt="入驻流程"
          className="w-full md:w-[70%] md:mx-auto h-auto rounded-2xl"
        />
      </div>

      {/* 底部说明 */}
      <div className="px-5 mt-10 desktop-container">
        <div className="rounded-2xl bg-gray-50 p-4 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            提交信息后，我们将在3个工作日内完成审核，审核结果将通过短信通知您。如有疑问请联系平台客服。
          </p>
        </div>
      </div>
    </div>
  );
}
