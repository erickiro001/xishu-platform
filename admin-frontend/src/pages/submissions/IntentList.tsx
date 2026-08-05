import { defineComponent, ref, onMounted, h, computed } from 'vue'
import { api } from '@/lib/api'
import { Card, Table, Tag, Button, Space, Input, Select, Modal, Descriptions, message, Popconfirm } from 'ant-design-vue'
import { EyeOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons-vue'

const statusColors: Record<string, string> = { pending: 'orange', contacted: 'green' }
const statusLabels: Record<string, string> = { pending: '待对接', contacted: '已对接' }
const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待对接' },
  { value: 'contacted', label: '已对接' },
]

export default defineComponent({
  setup() {
    const items = ref<any[]>([])
    const total = ref(0)
    const page = ref(1)
    const loading = ref(true)
    const keyword = ref('')
    const statusFilter = ref('all')
    const pageSize = 20

    const detailVisible = ref(false)
    const detail = ref<any>(null)

    async function fetchData() {
      loading.value = true
      const p = new URLSearchParams({ page: String(page.value), page_size: String(pageSize) })
      if (keyword.value) p.set('keyword', keyword.value)
      const data = await api.get(`/admin/intents?${p}`)
      items.value = data.list as any[]
      total.value = data.total as number
      loading.value = false
    }

    onMounted(() => fetchData())

    const filtered = computed(() =>
      statusFilter.value === 'all' ? items.value : items.value.filter(i => i.status === statusFilter.value)
    )

    async function markContacted(id: number) {
      await api.post(`/admin/intents/${id}/contacted`)
      message.success('已标记为已对接')
      fetchData()
    }

    async function showDetail(id: number) {
      detail.value = await api.get(`/admin/intents/${id}`)
      detailVisible.value = true
    }

    async function doDelete(id: number) {
      await api.del(`/admin/intents/${id}`)
      message.success('已删除')
      fetchData()
    }

    const columns = [
      { title: '公司名称', dataIndex: 'company_name', width: 160 },
      { title: '联系人', dataIndex: 'contact_person', width: 100 },
      { title: '联系电话', dataIndex: 'phone', width: 130 },
      { title: '关联需求', dataIndex: 'demand', width: 200, customRender: ({ text }: any) => text?.title || '-' },
      { title: '提交时间', dataIndex: 'created_at', width: 160, customRender: ({ text }: any) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
      { title: '状态', dataIndex: 'status', width: 100,
        customRender: ({ text }: any) => h(Tag, { color: statusColors[text] || 'default' }, () => statusLabels[text] || text),
      },
      { title: '操作', width: 240, customRender: ({ record }: any) => (
          <Space>
            <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showDetail(record.id)}>详情</Button>
            {record.status === 'pending' && (
              <Popconfirm title="确认已对接?" onConfirm={() => markContacted(record.id)}>
                <Button size="small" type="link" icon={<CheckOutlined />} style="color:#52c41a">已对接</Button>
              </Popconfirm>
            )}
            <Popconfirm title="确认删除? 此操作不可恢复" onConfirm={() => doDelete(record.id)}>
              <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ]

    return () => (
      <div class="page-fade-in">
        <Card bordered={false} title="需求意向管理" extra={
          <Space>
            <Input v-model:value={keyword.value} placeholder="搜索公司/需求" style="width:200px" allowClear
              onPressEnter={() => { page.value = 1; fetchData() }} />
            <Select v-model:value={statusFilter.value} options={statusOptions} style="width:110px" />
            <Button type="primary" onClick={() => { page.value = 1; fetchData() }}>搜索</Button>
          </Space>
        }>
          <Table
            columns={columns}
            dataSource={filtered.value}
            rowKey="id"
            loading={loading.value}
            pagination={{
              current: page.value, pageSize, total: filtered.value.length,
              showSizeChanger: false, onChange: (p: number) => { page.value = p; fetchData() },
            }}
          />
        </Card>

        <Modal v-model:open={detailVisible.value} title="意向详情" footer={null} width={640} destroyOnClose>
          {detail.value && (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="公司名称">{detail.value.company_name}</Descriptions.Item>
              <Descriptions.Item label="联系人">{detail.value.contact_person}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detail.value.phone}</Descriptions.Item>
              <Descriptions.Item label="对接状态">
                <Tag color={statusColors[detail.value.status]}>{statusLabels[detail.value.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>{new Date(detail.value.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="关联需求" span={2}>
                {detail.value.demand ? `${detail.value.demand.title} — ${detail.value.demand.company_name}` : '-'}
              </Descriptions.Item>
              {detail.value.demand && (
                <Descriptions.Item label="需求描述" span={2}>
                  <div style="white-space:pre-wrap;max-height:200px;overflow:auto">{detail.value.demand.description}</div>
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Modal>
      </div>
    )
  },
})
