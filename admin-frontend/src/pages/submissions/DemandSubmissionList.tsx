import { defineComponent, ref, onMounted, h, computed } from 'vue'
import { api, resolveMediaUrl, downloadWithAuth } from '@/lib/api'
import { Card, Table, Tag, Select, Button, Space, Input, Modal, Descriptions, Popconfirm, message } from 'ant-design-vue'
import { EyeOutlined, DeleteOutlined, DownloadOutlined, FileOutlined, EyeInvisibleOutlined, LoadingOutlined } from '@ant-design/icons-vue'

const statusColors: Record<string, string> = { pending: 'orange', processing: 'blue', processed: 'green' }
const statusLabels: Record<string, string> = { pending: '待处理', processing: '处理中', processed: '已处理' }
const statusFilterOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'processed', label: '已处理' },
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

    // detail modal
    const detailVisible = ref(false)
    const detail = ref<any>(null)
    const previewIndex = ref<number | null>(null)
    const previewBlobUrls = ref<Record<number, string>>({})
    const previewLoading = ref<Record<number, boolean>>({})
    const downloadingIndex = ref<number | null>(null)

    async function togglePreview(i: number, url: string) {
      if (previewIndex.value === i) { previewIndex.value = null; return }
      previewIndex.value = i
      if (!previewBlobUrls.value[i]) {
        previewLoading.value[i] = true
        try {
          const auth = (await import('@/stores/auth')).useAuthStore()
          const headers: Record<string, string> = {}
          if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
          const res = await fetch(url, { headers })
          const blob = await res.blob()
          previewBlobUrls.value[i] = URL.createObjectURL(blob)
        } finally {
          previewLoading.value[i] = false
        }
      }
    }

    async function doDownload(i: number, url: string, name: string) {
      downloadingIndex.value = i
      try {
        await downloadWithAuth(url, name)
      } catch {
        message.error('下载失败，请重试')
      } finally {
        downloadingIndex.value = null
      }
    }

    async function fetchData() {
      loading.value = true
      const p = new URLSearchParams({ page: String(page.value), page_size: String(pageSize) })
      if (keyword.value) p.set('keyword', keyword.value)
      const data = await api.get(`/admin/demand-submissions?${p}`)
      items.value = data.list as any[]
      total.value = data.total as number
      loading.value = false
    }

    onMounted(() => fetchData())

    const filtered = computed(() =>
      statusFilter.value === 'all' ? items.value : items.value.filter(i => i.status === statusFilter.value)
    )

    async function updateStatus(id: number, status: string) {
      await api.put(`/admin/demand-submissions/${id}/status`, { status })
      fetchData()
    }

    async function showDetail(id: number) {
      const data = await api.get(`/admin/demand-submissions/${id}`)
      detail.value = { ...data.submission, attachments: data.attachments ?? [] }
      previewIndex.value = null
      previewBlobUrls.value = {}
      previewLoading.value = {}
      detailVisible.value = true
    }

    async function doDelete(id: number) {
      await api.del(`/admin/demand-submissions/${id}`)
      message.success('已删除')
      fetchData()
    }

    const columns = [
      { title: '企业名称', dataIndex: 'company_name', width: 160 },
      { title: '需求内容', dataIndex: 'requirement', ellipsis: true },
      { title: '联系人', dataIndex: 'contact_person', width: 100 },
      { title: '手机号', dataIndex: 'phone', width: 130 },
      { title: '提交时间', dataIndex: 'created_at', width: 160, customRender: ({ text }: any) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
      { title: '状态', dataIndex: 'status', width: 100,
        customRender: ({ text }: any) => h(Tag, { color: statusColors[text] || 'default' }, () => statusLabels[text] || text),
      },
      { title: '操作', width: 320, customRender: ({ record }: any) => (
          <Space>
            <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showDetail(record.id)}>详情</Button>
            <Select
              size="small"
              value={record.status}
              style="width:90px"
              options={[
                { value: 'pending', label: '待处理' },
                { value: 'processing', label: '处理中' },
                { value: 'processed', label: '已处理' },
              ]}
              onChange={(v: any) => updateStatus(record.id, v)}
            />
            <Popconfirm title="确认删除? 此操作不可恢复" onConfirm={() => doDelete(record.id)}>
              <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ]

    return () => (
      <div class="page-fade-in">
        <Card bordered={false} title="需求提交管理" extra={
          <Space>
            <Input v-model:value={keyword.value} placeholder="搜索企业/联系人" style="width:200px" allowClear
              onPressEnter={() => { page.value = 1; fetchData() }} />
            <Select v-model:value={statusFilter.value} options={statusFilterOptions} style="width:110px" />
            <Button type="primary" onClick={() => { page.value = 1; fetchData() }}>搜索</Button>
          </Space>
        }>
          <Table
            columns={columns}
            dataSource={filtered.value}
            rowKey="id"
            loading={loading.value}
            pagination={{
              current: page.value,
              pageSize,
              total: filtered.value.length,
              showSizeChanger: false,
              onChange: (p: number) => { page.value = p; fetchData() },
            }}
          />
        </Card>

        <Modal v-model:open={detailVisible.value} title="提交详情" footer={null} width={640} destroyOnClose>
          {detail.value && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="企业名称">{detail.value.company_name}</Descriptions.Item>
                <Descriptions.Item label="联系人">{detail.value.contact_person}</Descriptions.Item>
                <Descriptions.Item label="手机号">{detail.value.phone}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{detail.value.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="提交时间" span={2}>{new Date(detail.value.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
                <Descriptions.Item label="状态" span={2}>
                  <Tag color={statusColors[detail.value.status]}>{statusLabels[detail.value.status] || detail.value.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="需求内容" span={2}>
                  <div style="white-space:pre-wrap;max-height:200px;overflow:auto">{detail.value.requirement}</div>
                </Descriptions.Item>
              </Descriptions>
              {detail.value.attachments?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#333' }}>附件</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {detail.value.attachments.map((att: any, i: number) => {
                      const url = resolveMediaUrl(att.download_url)
                      const name = att.file_name || att.download_url?.split('/').pop() || `附件${i + 1}`
                      const isImage = (att.mime_type || '').startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(name)
                      const isPreviewing = previewIndex.value === i
                      const isDownloading = downloadingIndex.value === i
                      return (
                        <div key={i} style={{ borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f9f9f9' }}>
                            {h(FileOutlined, { style: { color: '#1677ff', fontSize: '16px', flexShrink: 0 } })}
                            <span style={{ flex: 1, fontSize: '13px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                            {isImage && (
                              <a style={{ fontSize: '12px', color: '#1677ff', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                onClick={() => togglePreview(i, url)}>
                                {previewLoading.value[i]
                                  ? h(LoadingOutlined, { style: { marginRight: '3px' } })
                                  : h(isPreviewing ? EyeInvisibleOutlined : EyeOutlined, { style: { marginRight: '3px' } })}
                                {isPreviewing ? '收起' : '预览'}
                              </a>
                            )}
                            <a style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: isDownloading ? '#999' : '#1677ff', whiteSpace: 'nowrap', cursor: isDownloading ? 'not-allowed' : 'pointer' }}
                              onClick={() => !isDownloading && doDownload(i, url, name)}>
                              {isDownloading
                                ? h(LoadingOutlined, { style: { fontSize: '13px' } })
                                : h(DownloadOutlined, { style: { fontSize: '13px' } })}
                              {isDownloading ? '下载中...' : '下载'}
                            </a>
                          </div>
                          {isImage && isPreviewing && (
                            <div style={{ padding: '8px', background: '#fff', textAlign: 'center' }}>
                              {previewLoading.value[i]
                                ? h(LoadingOutlined, { style: { fontSize: '24px', color: '#1677ff' } })
                                : <img src={previewBlobUrls.value[i]} alt={name} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '4px' }} />
                              }
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </Modal>
      </div>
    )
  },
})
