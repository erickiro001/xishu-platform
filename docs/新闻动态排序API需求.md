# 新闻动态排序 API 需求文档

> 编写日期：2026-07-24
> 状态：待后端开发

---

## 一、背景

后台管理系统中，**企业管理**和**需求管理**模块已支持拖拽排序功能，但**新闻动态管理**模块缺少排序能力。需要为新闻动态模块补齐排序功能，使运营人员可以自定义新闻在前端展示的先后顺序。

---

## 二、现状分析

### 2.1 新闻模块当前状态

| 维度 | 现状 |
|------|------|
| 数据库 `sort_order` 字段 | **不存在** |
| 管理端列表排序 | 无排序参数，默认按创建时间返回 |
| 管理端拖拽排序 | 不支持 |
| 排序 API 端点 | **不存在** |
| 前端公开接口排序 | `GET /api/v1/news` 不支持 `sort` 参数 |

### 2.2 参照：已实现排序的模块

**企业模块 (companies) 排序方式：**
- 数据库有 `sort_order` 字段
- 管理端对每条记录逐条 `PUT /admin/companies/{id}` 更新 `sort_order`
- 列表查询传 `?sort=sort_order`

**需求模块 (demands) 排序方式（推荐参照）：**
- 数据库有 `sort_order` 字段
- 管理端通过专用批量接口 `PUT /admin/demands/reorder` 一次性更新所有排序
- 请求体：`{ company_id: 1, ids: [3, 1, 2, 5, 4] }`（按期望顺序排列的 ID 数组）
- 列表查询传 `?sort=sort_order`

---

## 三、需求内容

### 3.1 数据库变更

在 `news` 表新增字段：

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `sort_order` | integer | 0 | 排序序号，数值越小越靠前 |

### 3.2 后端 API 需求

#### 3.2.1 新增：批量排序接口（推荐方案，参照 demands 模块）

```
PUT /admin/news/reorder
```

**请求体：**
```json
{
  "ids": [5, 3, 8, 1, 2]
}
```

- `ids`：按期望展示顺序排列的新闻 ID 数组
- 后端根据数组顺序，将对应新闻的 `sort_order` 依次设为 `0, 1, 2, ...`

**响应：**
```json
{
  "code": 0,
  "msg": "排序成功"
}
```

**方案优点：** 一次请求完成全部排序，避免逐条更新带来的性能问题和数据不一致风险。

#### 3.2.2 修改：列表查询接口支持排序

**管理端接口：**
```
GET /admin/news?page=1&page_size=20&sort=sort_order&keyword=xxx
```

**前端公开接口：**
```
GET /api/v1/news?page=1&page_size=20&sort=sort_order
```

- 新增 `sort` 查询参数，取值 `sort_order` 或 `created_at`（默认）
- `sort=sort_order` 时按 `sort_order ASC, created_at DESC` 排序（`sort_order` 相同时按创建时间降序兜底）

#### 3.2.3 修改：创建新闻时自动赋值 sort_order

新建新闻时，`sort_order` 默认设为当前最大值 + 1（即新文章默认排在最后）。

#### 3.2.4 修改：新闻接口返回 sort_order 字段

所有新闻相关接口（列表、详情）的响应中，增加 `sort_order` 字段。

---

## 四、涉及接口汇总

| 序号 | 方法 | 路径 | 说明 | 变更类型 |
|------|------|------|------|----------|
| 1 | `PUT` | `/admin/news/reorder` | 批量更新新闻排序 | **新增** |
| 2 | `GET` | `/admin/news` | 新闻列表（支持 `sort` 参数） | **修改** |
| 3 | `GET` | `/admin/news/:id` | 新闻详情（返回 `sort_order`） | **修改** |
| 4 | `POST` | `/admin/news` | 创建新闻（自动赋 `sort_order`） | **修改** |
| 5 | `GET` | `/api/v1/news` | 公开新闻列表（支持 `sort` 参数） | **修改** |

---

## 五、前置端改动说明（参考）

接口就绪后，后台管理端需要增加的改动：
1. `NewsList.tsx` `NewsItem` 类型增加 `sort_order?: number`
2. 列表查询时传 `sort=sort_order`
3. 添加拖拽排序列（上移/下移按钮 + HTML5 拖拽）
4. 拖拽完成后调用 `PUT /admin/news/reorder`

改动思路可完全参照已有的 `DemandList.tsx` 实现。

---

## 六、备注

- 优先实现**方案 3.2.1 的批量排序接口**（`PUT /admin/news/reorder`），比逐条 PUT 更高效
- 前端公开接口 `GET /api/v1/news` 需要 `sort` 参数，因为首页"最新动态"需要展示最新文章，而"全部动态"页面可以按自定义排序展示
