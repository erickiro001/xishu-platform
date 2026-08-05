import { useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { Home, Lightbulb, ClipboardList, UserPlus } from 'lucide-react';
import type { TabRoute } from '@/types';

const tabs: { path: TabRoute; label: string; Icon: typeof Home }[] = [
  { path: '/', label: '首页', Icon: Home },
  { path: '/solutions', label: '解决方案', Icon: Lightbulb },
  { path: '/demands', label: '需求信息', Icon: ClipboardList },
  { path: '/apply', label: '入驻', Icon: UserPlus },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // 键盘弹出时隐藏导航栏，避免它被顶到键盘上方
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // 视口高度明显小于窗口高度时，认为软键盘已弹出
      setKeyboardOpen(vv.height < window.innerHeight * 0.8);
    };
    vv.addEventListener('resize', onResize);
    onResize();
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const isFormPage = currentPath.includes('/apply/');
  const isDetailPage = currentPath.includes('/company/') || currentPath.includes('/demand/');

  if (isFormPage || isDetailPage || keyboardOpen) return null;

  return (
    <nav id="bottom-nav" className="md:hidden">
      <div className="bottom-nav-inner">
        {tabs.map(({ path, label, Icon }) => {
          const isActive = currentPath === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path, { replace: true })}
              className="bottom-nav-btn"
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  color={isActive ? '#111827' : '#9ca3af'}
                />
                {isActive && (
                  <span className="bottom-nav-dot" />
                )}
              </div>
              <span
                className="bottom-nav-label"
                style={{
                  color: isActive ? '#111827' : '#9ca3af',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
