import { defineComponent, ref, onMounted, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api, resolveMediaUrl } from '@/lib/api'
import { Button, Input, InputNumber, Select, Table, Tag, Space, Card, Modal, message, Avatar } from 'ant-design-vue'
import {
  PlusOutlined, SearchOutlined, ExclamationCircleOutlined,
  UpOutlined, DownOutlined, HolderOutlined,
} from '@ant-design/icons-vue'
import { INDUSTRY_FIELDS } from '@/lib/constants'
import { fetchCategoryNames } from '@/lib/categories'

interface CompanyItem {
  id: number
  name: string
  logo: string
  industry: string
  application_stage: string
  status: string
  sort_order?: number
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待上架', color: 'default' },
  published: { label: '已上架', color: 'success' },
  archived: { label: '已下架', color: 'error' },
}

const industries = ref<string[]>([...INDUSTRY_FIELDS])

export default defineComponent({
  setup() {
    const router = useRouter()
    const items = ref<CompanyItem[]>([])
    const total = ref(0)
    const page = ref(1)
    const keyword = ref('')
    const industry = ref<string>('all')
    const statusFilter = ref<string>('all')
    const loading = ref(true)
    const reorderLoading = ref(false)

    // HTML5 拖拽状态
    const dragFrom = ref(-1)

    const statusOptions = [
      { value: 'all', label: '全部状态' },
      { value: 'published', label: '已上架' },
      { value: 'archived', label: '已下架' },
      { value: 'pending', label: '待上架' },
    ]

    /** 后端单页有上限，循环翻页取尽全部企业，再交给前端分页展示 */
    async function fetchData() {
      loading.value = true
      const all: CompanyItem[] = []
      let p = 1
      while (true) {
        const q = new URLSearchParams({ page: String(p), page_size: '50' })
        if (keyword.value) q.set('keyword', keyword.value)
        if (industry.value && industry.value !== 'all') q.set('industry', industry.value)
        q.set('sort', 'sort_order')
        const data = await api.get(`/admin/companies?${q}`)
        const list = (data.list as CompanyItem[]) ?? []
        all.push(...list)
        if (p * 50 >= (data.total as number) || list.length === 0) break
        p++
      }
      items.value = all
      total.value = all.length
      loading.value = false
    }

    /** 按当前列表顺序逐个更新 sort_order */
    async function doReorder(list: CompanyItem[]) {
      reorderLoading.value = true
      try {
        await Promise.all(
          list.map((item, i) =>
            api.put(`/admin/companies/${item.id}`, { sort_order: i }),
          ),
        )
        fetchData()
      } catch (e: any) {
        message.error(e.message || '排序失败')
      } finally {
        reorderLoading.value = false
      }
    }

    /** 拖拽排序 */
    function onDragCompany(fromIndex: number, toIndex: number) {
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

    onMounted(() => {
      fetchData()
      fetchCategoryNames('industry').then((names) => {
        if (names.length) industries.value = names
      })
    })

    async function action(id: number, act: string) {
      await api.post(`/admin/companies/${id}/${act}`)
      message.success(act === 'publish' ? '已上架' : '已下架')
      fetchData()
    }

    function doDelete(id: number) {
      Modal.confirm({
        title: '确认删除',
        icon: h(ExclamationCircleOutlined),
        content: '确定要删除该企业吗？此操作不可恢复。',
        okText: '确定',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await api.del(`/admin/companies/${id}`)
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
        title: '企业名称',
        key: 'name',
        customRender: ({ record }: { record: CompanyItem }) => (
          <Space>
            <Avatar src={resolveMediaUrl(record.logo)} size="small">
              {record.name[0]}
            </Avatar>
            <a style="cursor:pointer" onClick={() => router.push(`/companies/${record.id}/edit`)}>
              {record.name}
            </a>
          </Space>
        ),
      },
      { title: '行业', dataIndex: 'industry', key: 'industry', width: 120 },
      { title: '应用环节', dataIndex: 'application_stage', key: 'application_stage', width: 120 },
      {
        title: '状态', dataIndex: 'status', key: 'status', width: 100,
        customRender: ({ text }: { text: string }) => {
          const s = statusMap[text] || statusMap.pending
          return h(Tag, { color: s.color }, () => s.label)
        },
      },
      {
        title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 110,
        customRender: ({ record, index }: { record: CompanyItem; index: number }) => {
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
        title: '操作', key: 'action', width: 180,
        customRender: ({ record }: { record: CompanyItem }) => (
          <Space>
            {record.status !== 'published' && (
              <a onClick={() => action(record.id, 'publish')}>上架</a>
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
                placeholder="搜索企业名称..."
                style="width: 200px"
                allowClear
                onPressEnter={onSearch}
                v-slots={{ prefix: () => <SearchOutlined /> }}
              />
              <Select
                v-model:value={industry.value}
                placeholder="全部行业"
                style="width: 130px"
                allowClear
                onChange={onSearch}
                options={[
                  { value: 'all', label: '全部行业' },
                  ...industries.value.map((v) => ({ value: v, label: v })),
                ]}
              />
              <Select
                v-model:value={statusFilter.value}
                options={statusOptions}
                style="width: 110px"
                onChange={() => { page.value = 1 }}
              />
              <Button type="primary" onClick={onSearch}>搜索</Button>
            </Space>
          }
          extra={
            <Button type="primary" onClick={() => router.push('/companies/create')} icon={<PlusOutlined />}>
              新增企业
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
                    onDragCompany(dragFrom.value, realIndex)
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
