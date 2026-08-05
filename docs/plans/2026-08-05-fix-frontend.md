# 犀数工场平台前端 + 后端修复 Implementation Plan

> **For agentic workers:** 执行阶段用 subagent 逐任务实现（每任务新 subagent + 主 agent 复审 diff），或用 verification-before-completion 作为收尾验收门控。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 xishu-platform 前端 7 项 + xishu_online 后端 2 项问题：路由 HashRouter、视频懒加载、kimi 插件条件化、reorder 硬编码清除、wangeditor 粘贴 base64 拦截、门户端详情页直连既有接口、首页降量、后端列表字段裁剪。

**Architecture:** 前端（`xishu-platform/前端/` React 18 + `admin-frontend/` Vue 3）与后端（`xishu_online/backend` Go + GORM）双端修复。已验证关键事实：`GET /api/v1/news/:id` 详情接口后端已存在且公网可用，门户端详情页纯前端改动即可从 26MB 降到 1.1MB。

**Tech Stack:** React 18 + Vite 8 + Tailwind / Vue 3 + antd-vue + wangeditor / Go 1.23 + Gin + GORM

**Spec:** `.workbuddy/specs/2026-08-05-fix-frontend/SPEC.md`（xishu-platform 内）

## Global Constraints

- 前端包管理用 yarn（项目约定）
- 两端修改后必须通过 typecheck：`前端: yarn build`（含 tsc -b）、`admin-frontend: yarn build`（含 vue-tsc -b）
- 后端修改后 `go build ./...` 必须通过
- 不动数据模型；后端只改 news 列表接口与 GetNews 状态校验
- 不动管理端分页交互（拖拽排序依赖全量列表）
- 门户端 `useFetch`/`useInfiniteScroll` 签名保持不变（消费方众多）
- 所有代码用 ASCII 引号；中文注释保留
- 提交约定：每任务独立 commit；两个仓库分别提交（xishu-platform / xishu_online）

---

### Task 1: 管理端 reorder 删除硬编码 company_id（零风险先行）

**Files:**
- Modify: `xishu-platform/admin-frontend/src/pages/news/NewsList.tsx:75`
- Modify: `xishu-platform/admin-frontend/src/pages/demands/DemandList.tsx:86`

**Interfaces:**
- Consumes: 无（纯清理）
- Produces: 无

- [ ] **Step 1: 修改 NewsList.tsx**

`old:` `await api.put('/admin/news/reorder', { company_id: 1, ids: list.map((item) => item.id) })`
`new:` `await api.put('/admin/news/reorder', { ids: list.map((item) => item.id) })`

- [ ] **Step 2: 修改 DemandList.tsx**

`old:` `await api.put('/admin/demands/reorder', { company_id: 1, ids: list.map((d) => d.id) })`
`new:` `await api.put('/admin/demands/reorder', { ids: list.map((d) => d.id) })`

- [ ] **Step 3: typecheck**

```bash
cd E:/hxy/project-2026/xishu-platform/admin-frontend && yarn build 2>&1 | tail -5
```
Expected: 构建成功，无类型错误

- [ ] **Step 4: Commit（xishu-platform 仓库）**

```bash
git add admin-frontend/src/pages/news/NewsList.tsx admin-frontend/src/pages/demands/DemandList.tsx
git commit -m "fix(admin): 移除 reorder 请求硬编码的 company_id 字段"
```

---

### Task 2: kimi 调试插件仅开发模式启用

**Files:**
- Modify: `xishu-platform/前端/vite.config.ts:6`

**Interfaces:**
- Consumes: `inspectAttr`（kimi-plugin-inspect-react）
- Produces: 无

- [ ] **Step 1: 条件化插件注册**

`old:`
```ts
import { inspectAttr } from 'kimi-plugin-inspect-react'
// ...
plugins: [inspectAttr(), react()],
```

`new:`
```ts
import { inspectAttr } from 'kimi-plugin-inspect-react'
// ...
const isDev = process.env.NODE_ENV !== 'production'
// ...
plugins: [isDev ? inspectAttr() : null, react()].filter(Boolean),
```

- [ ] **Step 2: typecheck + build**

```bash
cd E:/hxy/project-2026/xishu-platform/前端 && yarn build 2>&1 | tail -5
```
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add 前端/vite.config.ts
git commit -m "build(portal): kimi 调试插件仅开发模式启用，避免注入生产包"
```

---

### Task 3: 门户端 MemoryRouter → HashRouter

**Files:**
- Modify: `xishu-platform/前端/src/main.tsx:3,30-32`

**Interfaces:**
- Consumes: 无
- Produces: 无（路由 API 不变，仅换 Router 类型）

- [ ] **Step 1: 替换 Router**

`old:`
```tsx
import { MemoryRouter } from 'react-router'
// ...
<MemoryRouter>
  <App />
</MemoryRouter>
```

`new:`
```tsx
import { HashRouter } from 'react-router'
// ...
<HashRouter>
  <App />
</HashRouter>
```

- [ ] **Step 2: typecheck + build**

```bash
cd E:/hxy/project-2026/xishu-platform/前端 && yarn build 2>&1 | tail -5
```
Expected: 构建成功；注意 `react-router` v7 的 HashRouter 从 `react-router` 导入（当前 import 也来自 `react-router`，保持同源）

- [ ] **Step 3: Commit**

```bash
git add 前端/src/main.tsx
git commit -m "fix(portal): MemoryRouter 换 HashRouter，URL 可分享/刷新不丢路由"
```

---

### Task 4: 门户端详情页直连既有详情接口（26MB → 1.1MB）

**Files:**
- Modify: `xishu-platform/前端/src/lib/services.ts:319-336`（fetchArticle）

**Interfaces:**
- Consumes: `request`（api.ts）、`RawNews`、`mapArticleDetail`
- Produces: `fetchArticle(id, signal): Promise<NewsArticleDetail | null>`（签名不变，行为变更：直连 `/api/v1/news/:id`）

- [ ] **Step 1: 重写 fetchArticle**

`old:`（循环翻页版，services.ts:319-336）
`new:`
```ts
export async function fetchArticle(id: string, signal?: AbortSignal): Promise<NewsArticleDetail | null> {
  // 后端已有公开详情接口，直接按 id 获取（不再循环翻页拉全量）
  const raw = await request<RawNews>(`/api/v1/news/${id}`, { signal })
  if (!raw) return null
  return mapArticleDetail(raw)
}
```

- [ ] **Step 2: typecheck + build**

```bash
cd E:/hxy/project-2026/xishu-platform/前端 && yarn build 2>&1 | tail -5
```
Expected: 构建成功

- [ ] **Step 3: 提交**

```bash
git add 前端/src/lib/services.ts
git commit -m "perf(portal): 详情页直连既有 /api/v1/news/:id 接口，去掉循环翻页拉全量"
```

---

### Task 5: 门户端首页取前 6 条 + AllNews PAGE_SIZE 调整

**Files:**
- Modify: `xishu-platform/前端/src/pages/HomePage.tsx:167`
- Modify: `xishu-platform/前端/src/pages/AllNewsPage.tsx:9`

**Interfaces:**
- Consumes: `fetchArticlesPage`（services.ts）
- Produces: 无

- [ ] **Step 1: 首页改用分页取前 6 条**

`old:` `const { data: articles, loading, error, reload } = useFetch(fetchArticles);`
`new:`
```tsx
const { data: articles, loading, error, reload } = useFetch(
  (signal) => fetchArticlesPage(1, 6, signal).then((r) => r.list),
  []
);
```
同时删除 `import { fetchArticles } from '@/lib/services'`，改为 `import { fetchArticlesPage } from '@/lib/services'`（若 fetchArticles 无其他引用）。

- [ ] **Step 2: AllNewsPage PAGE_SIZE 20 → 12**

`old:` `const PAGE_SIZE = 20;`
`new:` `const PAGE_SIZE = 12;`

- [ ] **Step 3: 确认无残留引用**

```bash
cd E:/hxy/project-2026/xishu-platform/前端 && grep -rn "fetchArticles\b" src/ | grep -v fetchArticlesPage
```
Expected: 无输出（fetchArticles 已无调用点）

- [ ] **Step 4: typecheck + build**

```bash
yarn build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add 前端/src/pages/HomePage.tsx 前端/src/pages/AllNewsPage.tsx
git commit -m "perf(portal): 首页只取前 6 条动态，全部动态页分页 20→12"
```

---

### Task 6: wangeditor 粘贴图片拦截（base64 → 上传换 URL）

**Files:**
- Modify: `xishu-platform/admin-frontend/src/components/RichEditor.tsx:36-58`

**Interfaces:**
- Consumes: `uploadFile`（lib/api.ts）
- Produces: 无

- [ ] **Step 1: 加 base64LimitSize=0 + customPaste 兜底**

在 `editorConfig` 中：
```ts
const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入正文内容，可通过工具栏插入图片...',
  // 禁止粘贴 base64 内嵌：所有图片（含粘贴）一律走上传换取 URL
  base64LimitSize: 0,
  MENU_CONF: {
    uploadImage: {
      // 上传按钮：复用后端上传接口（已有）
      async customUpload(file, insertFn) { /* 现有逻辑 */ },
      // 粘贴图片：拦截 base64，转上传
      async customPaste(editor: IDomEditor, event: ClipboardEvent) {
        const files = Array.from(event.clipboardData?.files ?? [])
          .filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return true // 非图片粘贴走默认
        try {
          for (const file of files) {
            const res = await uploadFile(file)
            if (res?.url) {
              editor.dangerouslyInsertHtml(`<img src="${res.url}" alt="${res.file_name || ''}"/>`)
            }
          }
        } catch (e: any) {
          message.error(e?.message || '粘贴图片上传失败')
        }
        return false // 已处理，阻止默认粘贴
      },
    },
  },
}
```
> 注：若 wangeditor v5 类型定义不含 `customPaste`，回退方案：在编辑器实例创建后监听 paste 事件，检测 `data:image` 拦截（见风险注释）。

- [ ] **Step 2: typecheck + build**

```bash
cd E:/hxy/project-2026/xishu-platform/admin-frontend && yarn build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add admin-frontend/src/components/RichEditor.tsx
git commit -m "fix(admin): wangeditor 粘贴图片拦截，base64 转上传换 URL，堵住数据膨胀源头"
```

---

### Task 7: 后端列表字段裁剪 + GetNews 状态校验（xishu_online）

**Files:**
- Modify: `xishu_online/backend/services/business_service.go:148-161`（ListPublishedNews）
- Modify: `xishu_online/backend/controllers/business_controller.go:271-282`（ListPublishedNews controller，可选）
- Modify: `xishu_online/backend/services/business_service.go:119-130`（GetNews 加 published 校验，可选但建议）

**Interfaces:**
- Consumes: 无
- Produces: `ListPublishedNews` 返回的 list 元素不含 content（列表场景）；`GetNews` 仅返回已发布新闻（详情场景）

- [ ] **Step 1: ListPublishedNews 剔除 content**

`old:`（business_service.go:155-160）
```go
query := db.Model(&models.News{}).Where("status = ?", "published").Order("sort_order ASC")
if keyword != "" {
    query = query.Where("title LIKE ? OR summary LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
}
var news []models.News
return utils.PaginateQuery(query, req, &news)
```

`new:`
```go
query := db.Model(&models.News{}).
    Select("id, created_at, updated_at, title, author, cover_image, images, status, published_at, summary, sort_order").
    Where("status = ?", "published").Order("sort_order ASC")
if keyword != "" {
    query = query.Where("title LIKE ? OR summary LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
}
var news []models.News
return utils.PaginateQuery(query, req, &news)
```
> 注意：`images`（JSON 数组）在列表页也不需要，可一并剔除：`Select` 去掉 `images`。保留 `cover_image`（详情卡要用）。

- [ ] **Step 2: GetNews 增加 published 校验（公开详情接口防泄露草稿）**

`old:`（business_service.go:119-130）
```go
func (s *NewsService) GetNews(id uint) (*models.News, error) {
    db, err := database.GetDB()
    ...
    var news models.News
    if err := db.First(&news, id).Error; err != nil {
        return nil, err
    }
    return &news, nil
}
```

`new:`（在 First 后加状态检查）
```go
    var news models.News
    if err := db.First(&news, id).Error; err != nil {
        return nil, err
    }
    if news.Status != "published" {
        return nil, gorm.ErrRecordNotFound
    }
    return &news, nil
```
> ⚠️ 注意：`GetNews` 同时被管理端 `GET /admin/news/:id` 使用（编辑草稿需要）。**不能全局加校验**——改为新增 `GetPublishedNews(id)` service 方法（仅校验 published），controller 的公开详情接口改调它，管理端详情仍走原 `GetNews`。

修正 Step 2：
- 新增 `NewsService.GetPublishedNews(id uint) (*models.News, error)`：First + status 校验
- 新增 `BusinessController.GetPublishedNews(c *gin.Context)`：调 `newsService.GetPublishedNews`，404 语义
- `routes.go:249` 的 `frontend.GET("/news/:id", bizController.GetPublishedNews)` 改挂新方法

- [ ] **Step 3: 编译**

```bash
cd E:/hxy/project-2026/xishu_online/backend && go build ./... 2>&1 | tail -10
```
Expected: 无错误

- [ ] **Step 4: 本地集成测试跑通**

```bash
cd E:/hxy/project-2026/xishu_online/backend && go test ./tests/... 2>&1 | tail -15
```
Expected: PASS（若 tests 依赖网络可跳过，改用本地起服务 curl 验证）

- [ ] **Step 5: Commit（xishu_online 仓库）**

```bash
cd E:/hxy/project-2026/xishu_online && git add backend/services/business_service.go backend/controllers/business_controller.go backend/api/routes.go && git commit -m "perf(api): 新闻列表剔除 content 字段；公开详情接口校验 published 状态"
```

- [ ] **Step 6: 部署后公网验证（需用户触发部署）**

```bash
curl -s "https://xishu-online.api.show.linktwins.com/api/v1/news?page=1&page_size=50" | python -c "import sys,json; d=json.load(sys.stdin); print('SIZE', len(json.dumps(d)), 'first keys', list(d['data']['list'][0].keys()))"
```
Expected: content 字段不在列表元素 keys 中；响应 < 1MB

---

### Task 8: 首页视频压缩 + 懒加载

**Files:**
- Modify: `xishu-platform/前端/src/pages/HomePage.tsx:266-274`（video 标签）
- Media: `xishu-platform/前端/public/assets/video/video.mp4`（ffmpeg 压缩产出）

**Interfaces:**
- Consumes: 无
- Produces: 压缩后的 video.mp4（目标 ≤ 5MB）

- [ ] **Step 1: ffmpeg 压缩视频**

```bash
ffmpeg -y -i "E:/hxy/project-2026/xishu-platform/前端/public/assets/video/video.mp4" \
  -vf "scale='min(1280,iw)':-2" -c:v libx264 -preset medium -crf 28 -an \
  -movflags +faststart \
  "E:/hxy/project-2026/xishu-platform/前端/public/assets/video/video.compressed.mp4"
```
Expected: 输出文件 ≤ 5MB（若原视频是 40MB，720p + crf 28 + 去音轨应到 2-5MB）
- 验证大小后替换：`mv video.compressed.mp4 video.mp4`

- [ ] **Step 2: video 标签加 preload="none" + poster 优化**

`old:`
```tsx
<video
  controls
  poster="assets/video/cover.png"
  className="w-full h-44 md:h-[360px] object-cover"
  preload="metadata"
>
```

`new:`
```tsx
<video
  controls
  poster="assets/video/cover.png"
  className="w-full h-44 md:h-[360px] object-cover"
  preload="none"
>
```
> preload="metadata" → "none"：页面加载不拉视频任何数据，仅 poster 占位。用户点播放才加载。

- [ ] **Step 3: typecheck + build**

```bash
cd E:/hxy/project-2026/xishu-platform/前端 && yarn build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add 前端/src/pages/HomePage.tsx 前端/public/assets/video/video.mp4
git commit -m "perf(portal): 首页视频压缩至 ~5MB 并 preload=none 懒加载"
```

---

### Task 9: 全量验收（verification-before-completion）

- [ ] **Step 1: 两端构建**

```bash
cd E:/hxy/project-2026/xishu-platform/前端 && yarn build 2>&1 | tail -8
cd E:/hxy/project-2026/xishu-platform/admin-frontend && yarn build 2>&1 | tail -8
cd E:/hxy/project-2026/xishu_online/backend && go build ./... 2>&1 | tail -5
```

- [ ] **Step 2: 检查是否有其他位置的同类问题**

```bash
cd E:/hxy/project-2026/xishu-platform && grep -rn "company_id: 1" admin-frontend/src/
cd E:/hxy/project-2026/xishu-platform && grep -rn "page_size: 10000\|page_size='10000'" 前端/src/
```
Expected: 无残留

- [ ] **Step 3: 门户端部署后实测（需用户部署）**

- 首页下载量：DevTools Network 面板，应 < 2MB
- 刷新 `/news/31`（hash 形式 `/#/news/31`）→ 应停留详情页
- 分享链接 `https://<domain>/#/news/31` → 他人打开直达详情
- 详情页单请求：Network 显示 1 次 `/api/v1/news/31`（不再循环翻页）

- [ ] **Step 4: 更新记忆 + 汇报**

## 执行顺序

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6（前端 6 项，可并行处理）→ Task 7（后端）→ Task 8（视频，需 ffmpeg）→ Task 9（验收）

依赖关系：Task 4/5 不依赖其他；Task 7 后端部署后 Task 9 的公网验证才有意义；Task 6 若 wangeditor 类型不支持 customPaste 需回退方案（见任务内注释）。
