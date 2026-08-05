import { useLocation, useNavigate } from 'react-router';
import { Home, Lightbulb, ClipboardList, UserPlus } from 'lucide-react';
import type { TabRoute } from '@/types';

const tabs: { path: TabRoute; label: string; Icon: typeof Home }[] = [
  { path: '/', label: '首页', Icon: Home },
  { path: '/solutions', label: '解决方案', Icon: Lightbulb },
  { path: '/demands', label: '需求信息', Icon: ClipboardList },
  { path: '/apply', label: '入驻', Icon: UserPlus },
];

/**
 * 桌面端顶部导航栏。
 * 仅在 md（≥768px）及以上宽度显示，移动端保持隐藏，由 BottomNav 负责导航。
 */
export default function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <header id="desktop-nav" className="hidden md:block fixed top-0 left-0 right-0 z-50 h-16 bg-gradient-to-b from-white/85 to-white/65 backdrop-blur-xl border-b border-white/25 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-center px-6">
        {/* 导航 */}
        <nav className="flex items-center gap-1">
          {tabs.map(({ path, label, Icon }) => {
            const isActive = currentPath === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
