import { defineComponent, ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/lib/api'
import { fetchCategoryNames } from '@/lib/categories'
import { Button, Input, Form, Card, Space, Select, message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

/**
 * 需求分类格式：行业领域/智能制造|应用环节/生产优化
 * - 用 "|" 分隔两个维度
 * - 每个维度用 "/" 分隔父级和子级
 */

interface DemandDetail {
  id: number
  title: string
  company_name: string
  category: string
  description: string
}

const SOURCE_PATTERN = /<!--demand-source:(.*?)-->\s*$/

function parseCategory(category: string) {
  const industry = category.match(/行业领域\/([^|]+)/)?.[1]?.trim() || undefined
  const stage = category.match(/应用环节\/(.+)$/)?.[1]?.trim() || undefined
  return { industry, stage }
}

function parseSource(description: string): { cleanDescription: string; source: string } {
  const m = description.match(SOURCE_PATTERN)
  if (!m) return { cleanDescription: description, source: '' }
  const source = m[1].trim()
  const cleanDescription = description.slice(0, m.index).trim()
  return { cleanDescription, source }
}

export default defineComponent({
  setup() {
    const router = useRouter()
    const route = useRoute()
    const demandId = computed(() => route.params.id as string | undefined)
    const isEdit = computed(() => Boolean(demandId.value))

    const saving = ref(false)
    const loading = ref(false)
    const formRef = ref()

    // 行业领域子分类 & 应用环节子分类
    const industryOptions = ref<string[]>([])
    const stageOptions = ref<string[]>([])

    // 两个独立选择
    const selectedIndustry = ref<string | undefined>(undefined)
    const selectedStage = ref<string | undefined>(undefined)

    const formData = reactive({
      title: '',
      company_name: '',
      category: '' as string,
      description: '',
      source: '',
    })
    const rules: Record<string, any> = {
      title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
      company_name: [{ required: true, message: '请输入发布企业名称', trigger: 'blur' }],
      description: [{ required: true, message: '请输入详细描述', trigger: 'blur' }],
    }

    async function loadDetail() {
      if (!isEdit.value) return
      loading.value = true
      try {
        const data = await api.get<DemandDetail>(`/admin/demands/${demandId.value}`)
        const detail = (data as any)?.demand ?? data
        formData.title = detail.title ?? ''
        formData.company_name = detail.company_name ?? ''
        formData.category = detail.category ?? ''
        const { cleanDescription, source } = parseSource(detail.description ?? '')
        formData.description = cleanDescription
        formData.source = source
        const { industry, stage } = parseCategory(formData.category)
        selectedIndustry.value = industry
        selectedStage.value = stage
      } catch (e: any) {
        message.error(e.message || '加载详情失败')
      } finally {
        loading.value = false
      }
    }

    onMounted(async () => {
      const [industries, stages] = await Promise.all([
        fetchCategoryNames('industry'),
        fetchCategoryNames('application_stage'),
      ])
      industryOptions.value = industries
      stageOptions.value = stages
      await loadDetail()
    })

    /** 两个选择变化时，组合成 category 字符串 */
    function updateCategory() {
      const parts: string[] = []
      if (selectedIndustry.value) parts.push(`行业领域/${selectedIndustry.value}`)
      if (selectedStage.value) parts.push(`应用环节/${selectedStage.value}`)
      formData.category = parts.join('|')
    }

    function onIndustryChange() { updateCategory() }
    function onStageChange() { updateCategory() }

    async function handleSubmit() {
      try { await formRef.value?.validate() } catch { return }
      saving.value = true
      try {
        // 来源作为隐藏标记嵌入需求描述，不新增 API 字段
        const source = formData.source.trim()
        const payload = {
          title: formData.title,
          company_name: formData.company_name,
          category: formData.category,
          description: formData.description.trim() + (source ? `\n<!--demand-source:${source}-->` : ''),
        }
        if (isEdit.value) {
          await api.put(`/admin/demands/${demandId.value}`, payload)
          message.success('需求已更新')
        } else {
          await api.post('/admin/demands', payload)
          message.success('需求已发布')
        }
        router.push('/demands')
      } catch (e: any) { message.error(e.message || '保存失败') }
      finally { saving.value = false }
    }

    return () => (
      <div class="page-fade-in" style="max-width:720px">
        <Space direction="vertical" size="large" style="width:100%">
          <Button type="text" onClick={() => router.push('/demands')} icon={<ArrowLeftOutlined />}>返回列表</Button>
          <Card bordered={false} title={isEdit.value ? '编辑需求' : '新建需求'} loading={loading.value}>
            <Form ref={formRef} model={formData} rules={rules} layout="vertical">
              <Form.Item label="需求标题" name="title">
                <Input v-model:value={formData.title} maxlength={50} showCount placeholder="输入需求标题" />
              </Form.Item>
              <Form.Item label="发布企业" name="company_name">
                <Input v-model:value={formData.company_name} maxlength={30} showCount placeholder="输入发布企业名称" />
              </Form.Item>

              {/* 行业领域 + 应用环节，两个均为选填 */}
              <Form.Item label="需求分类（选填）" name="category">
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                  <div style="flex:1;min-width:200px">
                    <div style="font-size:12px;color:#666;margin-bottom:4px">行业领域</div>
                    <Select
                      v-model:value={selectedIndustry.value}
                      placeholder="选择行业领域"
                      options={industryOptions.value.map((v) => ({ value: v, label: v }))}
                      onChange={onIndustryChange}
                      allow-clear
                      show-search
                      style="width:100%"
                    />
                  </div>
                  <div style="flex:1;min-width:200px">
                    <div style="font-size:12px;color:#666;margin-bottom:4px">应用环节</div>
                    <Select
                      v-model:value={selectedStage.value}
                      placeholder="选择应用环节"
                      options={stageOptions.value.map((v) => ({ value: v, label: v }))}
                      onChange={onStageChange}
                      allow-clear
                      show-search
                      style="width:100%"
                    />
                  </div>
                </div>
                {formData.category && (
                  <div style="margin-top:6px;font-size:12px;color:#888">
                    已选分类：{formData.category.replace(/\|/g, '；').replace(/\//g, ' · ')}
                  </div>
                )}
              </Form.Item>

              <Form.Item label="详细描述" name="description">
                <Input.TextArea v-model:value={formData.description} rows={8} maxlength={2000} showCount placeholder="输入需求详细描述" />
              </Form.Item>
              <Form.Item label="来源（选填）" name="source">
                <Input v-model:value={formData.source} maxlength={100} showCount placeholder="请输入需求来源，如某机构/平台" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button onClick={() => router.push('/demands')}>取消</Button>
                  <Button type="primary" onClick={handleSubmit} loading={saving.value}>
                    {isEdit.value ? '保存修改' : '发布需求'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      </div>
    )
  },
})
