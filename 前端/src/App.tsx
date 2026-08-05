import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router'
import BottomNav from './components/BottomNav'
import DesktopNav from './components/DesktopNav'
import HomePage from './pages/HomePage'
import SolutionsPage from './pages/SolutionsPage'
import DemandsPage from './pages/DemandsPage'
import ApplyPage from './pages/ApplyPage'
import DemandFormPage from './pages/DemandFormPage'
import SolutionFormPage from './pages/SolutionFormPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import DemandDetailPage from './pages/DemandDetailPage'
import NewsDetailPage from './pages/NewsDetailPage'
import AllNewsPage from './pages/AllNewsPage'
import { scrollToY } from './hooks/useListRestore'

/** 列表页路径集合：POP 导航到这些页面时跳过 scrollTo(0,0)，由 useListRestore 恢复滚动位置 */
const LIST_PAGE_PATHS = new Set(['/solutions', '/demands'])

/* 路由切换时滚动归位：滚动容器是 #root（CSS overflow-y: auto），非 window。
   后退导航（POP）到列表页时跳过重置，由 useListRestore 恢复滚动位置。 */
function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (pathname === '/') {
      const saved = sessionStorage.getItem('homePageScrollPosition')
      if (saved) {
        scrollToY(parseInt(saved, 10))
        sessionStorage.removeItem('homePageScrollPosition')
      } else {
        scrollToY(0)
      }
      return
    }

    if (pathname === '/news/all') {
      const saved = sessionStorage.getItem('allNewsScrollPosition')
      if (saved) {
        scrollToY(parseInt(saved, 10))
        sessionStorage.removeItem('allNewsScrollPosition')
      } else {
        scrollToY(0)
      }
      return
    }

    // 后退/前进导航到列表页：跳过 scrollTo(0,0)，由 useListRestore 恢复滚动位置
    if (navType === 'POP' && LIST_PAGE_PATHS.has(pathname)) return

    scrollToY(0)
  }, [pathname, navType])

  return null
}

export default function App() {
  const { pathname } = useLocation()
  const hideGlobalNav = pathname.startsWith('/company/')

  return (
    <>
      <ScrollToTop />
      {!hideGlobalNav && <DesktopNav />}
      <div className="min-h-screen bg-[#F8F9FA]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/company/:id" element={<CompanyDetailPage />} />
          <Route path="/demands" element={<DemandsPage />} />
          <Route path="/demand/:id" element={<DemandDetailPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/news/all" element={<AllNewsPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/apply/demand-form" element={<DemandFormPage />} />
          <Route path="/apply/solution-form" element={<SolutionFormPage />} />
        </Routes>
      </div>
      {!hideGlobalNav && <BottomNav />}
    </>
  )
}
