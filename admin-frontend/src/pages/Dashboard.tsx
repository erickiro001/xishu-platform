import { defineComponent, ref, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { Card, Row, Col, Statistic, Spin, Empty, Table, Tag, Button } from 'ant-design-vue'
import {
  BankOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'

interface Stats {
  published_companies: number
  published_news: number
  published_demands: number
  total_solutions: number
  pending_submissions: number
}

export default defineComponent({
  setup() {
    const router = useRouter()
    const stats = ref<Stats | null>(null)
    const daily = ref<any[]>([])
    const recent = ref<any[]>([])
    const pendingIntents = ref(0)
    const loading = ref(true)

    onMounted(async () => {
      try {
        const [dashData, intentsData] = await Promise.all([
          api.get('/admin/dashboard/stats'),
          api.get('/admin/intents?page=1&page_size=200').catch(() => null),
        ])
        stats.value = dashData.stats
        daily.value = dashData.daily || []
        // 统计待对接意向数量（后端不支持 status 过滤，客户端计算）
        const intentsList: any[] = intentsData?.list ?? []
        const pendingIntentRows = intentsList
          .filter((i: any) => i.status === 'pending')
          .map((i: any) => ({
            id: i.id,
            title: `${i.company_name} - ${i.demand?.title ?? '需求意向'}`,
            type: 'intent',
            submit_time: i.created_at,
          }))
        pendingIntents.value = pendingIntentRows.length
        // 合并后端最近待处理 + 待对接意向，按时间倒序
        recent.value = [...(dashData.recent || []), ...pendingIntentRows]
          .sort((a, b) => new Date(b.submit_time).getTime() - new Date(a.submit_time).getTime())
      } finally {
        loading.value = false
      }
    })

    const statCards = [
      { title: '已上架企业', value: () => stats.value?.published_companies ?? 0, icon: BankOutlined, color: '#1677ff', path: '/companies' },
      { title: '方案总数', value: () => stats.value?.total_solutions ?? 0, icon: AppstoreOutlined, color: '#13c2c2', path: '/companies' },
      { title: '已发布新闻', value: () => stats.value?.published_news ?? 0, icon: FileTextOutlined, color: '#52c41a', path: '/news' },
      { title: '已发布需求', value: () => stats.value?.published_demands ?? 0, icon: UnorderedListOutlined, color: '#722ed1', path: '/demands' },
      { title: '待处理事项', value: () => (stats.value?.pending_submissions ?? 0) + pendingIntents.value, icon: ClockCircleOutlined, color: '#fa8c16', path: '/intents' },
    ]

    const recentColumns = [
      { title: '标题', dataIndex: 'title', key: 'title' },
      { title: '类型', dataIndex: 'type', key: 'type', width: 100,
        customRender: ({ text }: { text: string }) => {
          const map: Record<string, { color: string; label: string }> = {
            demand_submission: { color: 'blue', label: '需求提交' },
            solution_application: { color: 'purple', label: '方案申请' },
            intent: { color: 'cyan', label: '需求意向' },
          }
          const t = map[text] || { color: 'default', label: text }
          return h(Tag, { color: t.color }, () => t.label)
        },
      },
      { title: '提交时间', dataIndex: 'submit_time', key: 'submit_time', width: 180,
        customRender: ({ text }: { text: string }) => new Date(text).toLocaleString('zh-CN'),
      },
      { title: '操作', key: 'action', width: 80,
        customRender: ({ record }: { record: any }) => {
          const pathMap: Record<string, string> = {
            demand_submission: '/demand-submissions',
            solution_application: '/solution-applications',
            intent: '/intents',
          }
          const path = pathMap[record.type] || '/demand-submissions'
          return h(Button, { type: 'link', size: 'small', onClick: () => router.push(path) }, () => '查看')
        },
      },
    ]

    return () => (
      <div class="page-fade-in">
        <Spin spinning={loading.value}>
          <Row gutter={[16, 16]}>
            {statCards.map((card, i) => {
              const isPending = card.title === '待处理事项'
              return (
                <Col xs={24} sm={12} lg={6} key={i}>
                  {isPending ? (
                    <Card>
                      <Statistic
                        title={card.title}
                        value={card.value()}
                        prefix={h(card.icon, { style: { color: card.color, fontSize: '24px' } })}
                        valueStyle={{ color: card.color }}
                      />
                    </Card>
                  ) : (
                    <div onClick={() => router.push(card.path)} style={{ cursor: 'pointer' }}>
                      <Card hoverable>
                        <Statistic
                          title={card.title}
                          value={card.value()}
                          prefix={h(card.icon, { style: { color: card.color, fontSize: '24px' } })}
                          valueStyle={{ color: card.color }}
                        />
                      </Card>
                    </div>
                  )}
                </Col>
              )
            })}
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col xs={24} lg={12}>
              <Card title="近7天提交趋势">
                {daily.value.length > 0 ? (
                  <div style={{ padding: '8px 8px 0' }}>
                    {/* 数字行 + 柱子行：固定高度区域，柱子从底部向上生长 */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '16px', height: '130px' }}>
                      {daily.value.map((d: any) => {
                        const total = (d.demand_submissions || 0) + (d.solution_apps || 0)
                        const maxVal = Math.max(...daily.value.map((x: any) => (x.demand_submissions || 0) + (x.solution_apps || 0)), 1)
                        const barH = Math.round((total / maxVal) * 100)
                        return (
                          <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#667eea', height: '16px', lineHeight: '16px' }}>
                              {total > 0 ? total : ''}
                            </span>
                            <div style={{
                              width: '28px',
                              height: `${Math.max(barH, 4)}px`,
                              background: 'linear-gradient(180deg, #667eea, #764ba2)',
                              borderRadius: '4px 4px 0 0',
                            }} />
                          </div>
                        )
                      })}
                    </div>
                    {/* 日期行：与柱子对齐，独立在底部 */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px', paddingBottom: '4px' }}>
                      {daily.value.map((d: any) => (
                        <span key={d.date} style={{ width: '28px', fontSize: '11px', color: '#999', textAlign: 'center', flexShrink: 0 }}>
                          {d.date?.slice(5)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="最近待处理">
                {recent.value.length > 0 ? (
                  <Table
                    columns={recentColumns}
                    dataSource={recent.value}
                    rowKey={(r: any) => `${r.type}-${r.id}`}
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <Empty description="暂无待处理记录" />
                )}
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>
    )
  },
})
