import { defineComponent, ref, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { Button, Input, Select, Table, Tag, Space, Card, Modal, Descriptions, message } from 'ant-design-vue'
import {
  SearchOutlined, PlusOutlined, ExclamationCircleOutlined, EyeOutlined,
  UpOutlined, DownOutlined, HolderOutlined,
} from '@ant-design/icons-vue'

interface DemandItem {
  id: number
  title: string
  company_name: string
  status: string
  published_at: string | null
  source: string
  sort_order?: number
}

const statusMap: Record<string, { label: string; color: string }> = {
  published: { label: '已发布', color: 'success' },
  pending_review: { label: '待审核', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
  archived: { label: '已下架', color: 'default' },
}

export default defineComponent({
  setup() {
    const router = useRouter()
    const items = ref<DemandItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const keyword = ref('')
    const loading = ref(true)
    const reorderLoading = ref(false)
    const statusFilter = ref<string>('all')

    const dragFrom = ref(-1)

    const detailVisible = ref(false)
    const detail = ref<any>(null)

    async function showDetail(record: DemandItem) {
      detail.value = record
      detailVisible.value = true
      if ((record as any).description == null) {
        try {
          const d = await api.get(`/admin/demands/${record.id}`)
          detail.value = { ...record, ...(d?.demand ?? d) }
        } catch { /* 拉取失败则展示已有行数据 */ }
      }
    }

    const statusOptions = [
      { value: 'all',            label: '全部状态' },
      { value: 'published',      label: '已发布'   },
      { value: 'pending_review', label: '待审核'   },
      { value: 'rejected',       label: '已驳回'   },
      { value: 'archived',       label: '已下架'   },
    ]

    /** 后端单页有上限，循环翻页取尽全部需求，再交给前端分页展示 */
    async function fetchData() {
      loading.value = true
      const all: DemandItem[] = []
      let p = 1
      while (true) {
        const q = new URLSearchParams({ page: String(p), page_size: '50' })
        if (keyword.value) q.set('keyword', keyword.value)
        if (statusFilter.value !== 'all') q.set('status', statusFilter.value)
        q.set('sort', 'sort_order')
        const data = await api.get(`/admin/demands?${q}`)
        const list = (data.list as DemandItem[]) ?? []
        all.push(...list)
        if (p * 50 >= (data.total as number) || list.length === 0) break
        p++
      }
      items.value = all
      total.value = all.length
      loading.value = false
    }

    async function doReorder(list: DemandItem[]) {
      reorderLoading.value = true
      try {
        await api.put('/admin/demands/reorder', { ids: list.map((d) => d.id) })
        fetchData()
      } catch (e: any) {
        message.error(e.message || '排序失败')
      } finally {
        reorderLoading.value = false
      }
    }

    /** 拖拽排序 */
    function onDragDemand(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return
      const list = [...items.value]
      const [item] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, item)
      items.value = list
      doReorder(list)
    }

    function moveUp(index: number) {
      if (index <= 0) return
      const list = [...items.value]
      ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
      items.value = list
      doReorder(list)
    }

    function moveDown(index: number) {
      if (index >= items.value.length - 1) return
      const list = [...items.value]
      ;[list[index + 1], list[index]] = [list[index], list[index + 1]]
      items.value = list
      doReorder(list)
    }

    onMounted(() => fetchData())

    async function action(id: number, act: string) {
      await api.post(`/admin/demands/${id}/${act}`)
      const labels: Record<string, string> = { approve: '操作成功', reject: '已驳回', archive: '已下架' }
      message.success(labels[act] || '操作成功')
      fetchData()
    }

    async function republish(id: number) {
      await api.post(`/admin/demands/${id}/approve`)
      message.success('已上架')
      fetchData()
    }

    function doDelete(id: number) {
      Modal.confirm({
        title: '确认删除',
        icon: h(ExclamationCircleOutlined),
        content: '确定要删除这条需求吗？此操作不可恢复。',
        okText: '确定',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await api.del(`/admin/demands/${id}`)
          message.success('已删除')
          fetchData()
        },
      })
    }

    function onSearch() {
      page.value = 1
      fetchData()
    }

    function onStatusChange() {
      page.value = 1
      fetchData()
    }

    const columns = [
      { title: '需求标题', dataIndex: 'title', key: 'title', ellipsis: true },
      { title: '发布企业', dataIndex: 'company_name', key: 'company_name', width: 150 },
      {
        title: '状态', dataIndex: 'status', key: 'status', width: 100,
        customRender: ({ text }: { text: string }) => {
          const s = statusMap[text] || statusMap.pending_review
          return h(Tag, { color: s.color }, () => s.label)
        },
      },
      {
        title: '来源', dataIndex: 'source', key: 'source', width: 80,
        customRender: ({ text }: { text: string }) =>
          text === 'user' ? '用户提交' : '管理员',
      },
      {
        title: '日期', dataIndex: 'published_at', key: 'published_at', width: 130,
        customRender: ({ text }: { text: string | null }) =>
          text ? new Date(text).toLocaleDateString('zh-CN') : '-',
      },
      {
        title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 110,
        customRender: ({ record, index }: { record: DemandItem; index: number }) => {
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
                disabled={realIndex === items.value.length - 1}
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
        title: '操作', key: 'action', width: 260,
        customRender: ({ record }: { record: DemandItem }) => (
          <Space>
            <a onClick={() => showDetail(record)}>详情</a>
            <a onClick={() => router.push(`/demands/${record.id}/edit`)}>编辑</a>
            {record.status === 'pending_review' && (
              <>
                <a onClick={() => action(record.id, 'approve')}>通过</a>
                <a style="color: #ff4d4f" onClick={() => action(record.id, 'reject')}>驳回</a>
              </>
            )}
            {record.status === 'published' && (
              <a onClick={() => action(record.id, 'archive')}>下架</a>
            )}
            {(record.status === 'archived' || record.status === 'rejected') && (
              <a onClick={() => republish(record.id)}>上架</a>
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
                placeholder="搜索标题或企业..."
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
                onChange={onStatusChange}
              />
            </Space>
          }
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/demands/create')}>
              新建需求
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={items.value}
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
                    onDragDemand(dragFrom.value, realIndex)
                  }
                  dragFrom.value = -1
                },
                onDragend: () => { dragFrom.value = -1 },
              }
            }}
          />
        </Card>

        <Modal v-model:open={detailVisible.value} title="需求详情" footer={null} width={640} destroyOnClose>
          {detail.value && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="需求标题">{detail.value.title}</Descriptions.Item>
              <Descriptions.Item label="发布企业">{detail.value.company_name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const s = statusMap[detail.value.status] || statusMap.pending_review
                  return h(Tag, { color: s.color }, () => s.label)
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="来源">{detail.value.source === 'user' ? '用户提交' : '管理员'}</Descriptions.Item>
              <Descriptions.Item label="日期">
                {detail.value.published_at ? new Date(detail.value.published_at).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="需求描述">
                <div style="white-space:pre-wrap;max-height:300px;overflow:auto">
                  {detail.value.description || '（暂无描述）'}
                </div>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    )
  },
})
