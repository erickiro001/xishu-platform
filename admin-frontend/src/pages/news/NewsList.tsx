import { defineComponent, ref, onMounted, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { Button, Input, Select, Table, Tag, Space, Card, Modal, message } from 'ant-design-vue'
import {
  PlusOutlined, SearchOutlined, ExclamationCircleOutlined,
  UpOutlined, DownOutlined, HolderOutlined,
} from '@ant-design/icons-vue'

interface NewsItem {
  id: number
  title: string
  author: string
  status: string
  created_at: string
  published_at: string | null
  sort_order?: number
}

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已下架', color: 'error' },
}

export default defineComponent({
  setup() {
    const router = useRouter()
    const items = ref<NewsItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const keyword = ref('')
    const loading = ref(true)
    const reorderLoading = ref(false)

    // HTML5 拖拽状态
    const dragFrom = ref(-1)

    const statusFilter = ref<string>('all')

    const statusOptions = [
      { value: 'all', label: '全部状态' },
      { value: 'published', label: '已发布' },
      { value: 'draft', label: '草稿' },
      { value: 'archived', label: '已下架' },
    ]

    /** 后端单页有上限，循环翻页取尽全部新闻，再交给前端分页展示 */
    async function fetchData() {
      loading.value = true
      const all: NewsItem[] = []
      let p = 1
      while (true) {
        const q = new URLSearchParams({ page: String(p), page_size: '50' })
        if (keyword.value) q.set('keyword', keyword.value)
        // 按 sort_order 排序，sort_order 相同时按创建时间降序兜底
        q.set('sort', 'sort_order')
        const data = await api.get(`/admin/news?${q}`)
        const list = (data.list as NewsItem[]) ?? []
        all.push(...list)
        if (p * 50 >= (data.total as number) || list.length === 0) break
        p++
      }
      items.value = all
      total.value = all.length
      loading.value = false
    }

    onMounted(() => fetchData())

    /** 按当前列表顺序批量更新排序（调用后端 reorder 接口） */
    async function doReorder(list: NewsItem[]) {
      reorderLoading.value = true
      try {
        await api.put('/admin/news/reorder', { ids: list.map((item) => item.id) })
        fetchData()
      } catch (e: any) {
        message.error(e.message || '排序失败，请确认后端接口已就绪')
      } finally {
        reorderLoading.value = false
      }
    }

    /** 拖拽排序 */
    function onDragNews(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return
      const list = [...items.value]
      const [item] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, item)
      items.value = list
      doReorder(list)
    }

    /** 上移 */
    function moveUp(index: number) {
      if (index <= 0) return
      const list = [...items.value]
      ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
      items.value = list
      doReorder(list)
    }

    /** 下移 */
    function moveDown(index: number) {
      if (index >= items.value.length - 1) return
      const list = [...items.value]
      ;[list[index + 1], list[index]] = [list[index], list[index + 1]]
      items.value = list
      doReorder(list)
    }

    async function action(id: number, act: string) {
      await api.post(`/admin/news/${id}/${act}`)
      message.success(act === 'publish' ? '已发布' : '已下架')
      fetchData()
    }

    function doDelete(id: number) {
      Modal.confirm({
        title: '确认删除',
        icon: h(ExclamationCircleOutlined),
        content: '确定要删除这条新闻吗？此操作不可恢复。',
        okText: '确定',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await api.del(`/admin/news/${id}`)
          message.success('已删除')
          fetchData()
        },
      })
    }

    function onSearch() {
      page.value = 1
      fetchData()
    }

    const filtered = computed(() =>
      statusFilter.value === 'all'
        ? items.value
        : items.value.filter(i => i.status === statusFilter.value)
    )

    const columns = [
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        customRender: ({ text, record }: { text: string; record: NewsItem }) => (
          <a style="cursor:pointer" onClick={() => router.push(`/news/${record.id}/edit`)}>
            {text}
          </a>
        ),
      },
      { title: '作者', dataIndex: 'author', key: 'author', width: 120 },
      {
        title: '状态', dataIndex: 'status', key: 'status', width: 100,
        customRender: ({ text }: { text: string }) => {
          const s = statusMap[text] || statusMap.draft
          return h(Tag, { color: s.color }, () => s.label)
        },
      },
      {
        title: '发布日期', dataIndex: 'published_at', key: 'published_at', width: 140,
        customRender: ({ text }: { text: string | null }) =>
          text ? new Date(text).toLocaleDateString('zh-CN') : '-',
      },
      {
        title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 110,
        customRender: ({ record, index }: { record: NewsItem; index: number }) => {
          // 分页时 index 为页内索引，换算为全量列表中的真实索引
          const realIndex = (page.value - 1) * 50 + index
          return (
            <Space size={0}>
              <span style="font-size:11px;color:#999;margin-right:4px;min-width:16px;text-align:right">
                {record.sort_order != null ? record.sort_order + 1 : '-'}
              </span>
              <Button
                type="text"
                size="small"
                style="padding:0 2px;color:#999"
                disabled={realIndex === 0}
                onClick={(e: MouseEvent) => { e.stopPropagation(); moveUp(realIndex) }}
                icon={<UpOutlined style="font-size:10px" />}
              />
              <Button
                type="text"
                size="small"
                style="padding:0 2px;color:#999"
                disabled={realIndex === filtered.value.length - 1}
                onClick={(e: MouseEvent) => { e.stopPropagation(); moveDown(realIndex) }}
                icon={<DownOutlined style="font-size:10px" />}
              />
              <span
                draggable
                style="cursor:grab;display:inline-flex;align-items:center"
                onDragstart={(e: DragEvent) => {
                  dragFrom.value = realIndex
                  e.dataTransfer!.effectAllowed = 'move'
                }}
                onDragend={() => { dragFrom.value = -1 }}
              >
                <HolderOutlined style="font-size:12px;color:#bbb" />
              </span>
            </Space>
          )
        },
      },
      {
        title: '操作', key: 'action', width: 220, fixed: 'right' as const,
        customRender: ({ record }: { record: NewsItem }) => (
          <Space>
            {record.status !== 'published' && (
              <a onClick={() => action(record.id, 'publish')}>发布</a>
            )}
            {record.status === 'published' && (
              <a onClick={() => action(record.id, 'archive')}>下架</a>
            )}
            <a style="color: #ff4d4f" onClick={() => doDelete(record.id)}>删除</a>
          </Space>
        ),
      },
    ]

    return () => (
      <div class="page-fade-in">
        <Card
          bordered={false}
          title={
            <Space>
              <Input
                v-model:value={keyword.value}
                placeholder="搜索新闻标题..."
                style="width: 200px"
                allowClear
                onPressEnter={onSearch}
                v-slots={{ prefix: () => <SearchOutlined /> }}
              />
              <Button type="primary" onClick={onSearch}>搜索</Button>
              <Select
                v-model:value={statusFilter.value}
                options={statusOptions}
                style="width: 110px"
                onChange={() => { page.value = 1 }}
              />
            </Space>
          }
          extra={
            <Button type="primary" onClick={() => router.push('/news/create')} icon={<PlusOutlined />}>
              新建新闻
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={filtered.value}
            rowKey="id"
            loading={loading.value || reorderLoading.value}
            pagination={{
              current: page.value,
              pageSize: 50,
              showSizeChanger: false,
              showTotal: (t: number) => `共 ${t} 条`,
              onChange: (p: number) => { page.value = p },
            }}
            customRow={(_record, index) => {
              const realIndex = (page.value - 1) * 50 + (index ?? 0)
              return {
                onDragover: (e: DragEvent) => {
                  e.preventDefault()
                  e.dataTransfer!.dropEffect = 'move'
                },
                onDragenter: (e: DragEvent) => { e.preventDefault() },
                onDrop: (e: DragEvent) => {
                  e.preventDefault()
                  if (dragFrom.value >= 0 && dragFrom.value !== realIndex) {
                    onDragNews(dragFrom.value, realIndex)
                  }
                  dragFrom.value = -1
                },
                onDragend: () => { dragFrom.value = -1 },
              }
            }}
          />
        </Card>
      </div>
    )
  },
})
