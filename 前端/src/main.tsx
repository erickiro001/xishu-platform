import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

/**
 * 适配底部安全区：
 * - 微信小程序 / 企业微信等容器自身已处理底部安全区，页面再叠加会导致导航栏偏高，这里置 0
 * - 普通浏览器维持 CSS 中的 min(env(safe-area-inset-bottom), 34px)
 */
function applySafeAreaFix() {
  const ua = navigator.userAgent.toLowerCase()
  const isMiniProgram =
    ua.includes('miniprogram') ||
    ua.includes('wxwork') ||
    (window as any).__wxjs_environment === 'miniprogram'
  if (isMiniProgram) {
    document.documentElement.style.setProperty('--safe-bottom', '0px')
  }
}

applySafeAreaFix()
// __wxjs_environment 可能在微信 JSSDK 加载后才就绪，延迟再判定一次
window.addEventListener('load', applySafeAreaFix)
setTimeout(applySafeAreaFix, 1000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
