import { defineComponent, ref, reactive, onMounted, h, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api, uploadFile, resolveMediaUrl } from '@/lib/api'
import {
  Button, Input, Select, Form, Card, Space, Upload, message, Row, Col,
  Tabs, Table, Modal, Popconfirm, Tooltip,
} from 'ant-design-vue'
import {
  ArrowLeftOutlined, UploadOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, PictureOutlined, SolutionOutlined, TrophyOutlined, CloseOutlined,
  UpOutlined, DownOutlined, HolderOutlined,
} from '@ant-design/icons-vue'
import type { UploadFile as UploadFileType } from 'ant-design-vue'
import { APPLICATION_STAGES, INDUSTRY_FIELDS, COMPANY_TAGS } from '@/lib/constants'
import { fetchCategoryNames } from '@/lib/categories'

/**
 * 企业标签池：可变的标签库，初始值为预设标签，支持增删，持久化到 localStorage。
 * - 删除：从池中移除（包括原本的固定标签）
 * - 添加：自定义标签自动写入池，下次打开其他企业时仍可见
 */
const TAG_POOL_KEY = 'xishu_admin_tag_pool'
function loadTagPool(): string[] {
  try {
    const raw = localStorage.getItem(TAG_POOL_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.filter((t) => typeof t === 'string' && t)
    }
  } catch { /* ignore */ }
  return [...COMPANY_TAGS]
}
function saveTagPool(pool: string[]) {
  try { localStorage.setItem(TAG_POOL_KEY, JSON.stringify(pool)) } catch { /* ignore */ }
}

export default defineComponent({
  setup() {
    const router = useRouter()
    const route = useRoute()
    const isEdit = !!route.params.id
    const companyId = ref<number>(Number(route.params.id) || 0)
    const saving = ref(false)
    const activeTab = ref('basic')
    const formRef = ref()

    // -- basic form --
    const formData = reactive({
      name: '',
      logo: '',
      introduction: '',
      tags: '[]',
      industry: undefined as string | undefined,
      application_stage: undefined as string | undefined,
    })
    const rules: Record<string, any> = {
      name: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
      industry: [{ required: true, message: '请选择行业领域', trigger: 'change' }],
      application_stage: [{ required: true, message: '请选择应用环节', trigger: 'change' }],
      introduction: [{ required: true, message: '请输入企业简介', trigger: 'blur' }],
    }

    // 行业 / 应用环节从后端分类配置动态获取；初始用本地常量兜底，避免空闪
    const industries = ref<string[]>([...INDUSTRY_FIELDS])
    const stages = ref<string[]>([...APPLICATION_STAGES])

    // -- init：拉取分类 + 编辑时载入企业数据 --
    onMounted(async () => {
      const [industryNames, stageNames] = await Promise.all([
        fetchCategoryNames('industry'),
        fetchCategoryNames('application_stage'),
      ])
      if (industryNames.length) industries.value = industryNames
      if (stageNames.length) stages.value = stageNames

      if (isEdit) {
        const data = await api.get(`/admin/companies/${route.params.id}`)
        Object.assign(formData, data)
        companyId.value = data.id
        fetchImages()
        fetchSolutions()
        fetchCases()
      }
    })

    // -- images --
    const images = ref<any[]>([])
    const imagesLoading = ref(false)
    async function fetchImages() {
      if (!companyId.value) return
      imagesLoading.value = true
      try { images.value = await api.get(`/admin/companies/${companyId.value}/images`) } catch {}
      imagesLoading.value = false
    }
    async function handleUploadImage(file: File) {
      const result = await uploadFile(file)
      await api.post(`/admin/companies/${companyId.value}/images`, { image_url: result.url })
      message.success('图片添加成功')
      fetchImages()
      return false
    }
    async function deleteImage(id: number) {
      await api.del(`/admin/companies/images/${id}`)
      message.success('已删除')
      fetchImages()
    }

    // -- solutions --
    const solutions = ref<any[]>([])
    const solutionLoading = ref(false)
    const solutionModal = ref(false)
    const solutionEditId = ref<number>(0)
    const solutionForm = reactive({ title: '', description: '', imageFiles: [] as any[] })
    const solutionFormRef = ref()
    const solutionRules: Record<string, any> = {
      title: [{ required: true, message: '请输入方案标题', trigger: 'blur' }],
    }
    async function fetchSolutions() {
      if (!companyId.value) return
      solutionLoading.value = true
      try { solutions.value = await api.get(`/admin/companies/${companyId.value}/solutions`) } catch {}
      solutionLoading.value = false
    }
    function openSolutionModal(item?: any) {
      if (item) {
        solutionEditId.value = item.id
        solutionForm.title = item.title
        solutionForm.description = item.description || ''
        solutionForm.imageFiles = (item.images || []).map((img: any, i: number) => ({ uid: -i, name: `图${i+1}`, status: 'done', url: img.image_url, thumbUrl: resolveMediaUrl(img.image_url) }))
      } else {
        solutionEditId.value = 0
        solutionForm.title = ''
        solutionForm.description = ''
        solutionForm.imageFiles = []
      }
      solutionModal.value = true
    }
    async function saveSolution() {
      try { await solutionFormRef.value?.validate() } catch { return }
      const images = solutionForm.imageFiles.map((f: any, i: number) => ({
        image_url: f.url || f.response?.url || '',
        sort_order: i,
      }))
      const body = { title: solutionForm.title, description: solutionForm.description, images, company_id: companyId.value }
      if (solutionEditId.value) {
        await api.put(`/admin/companies/solutions/${solutionEditId.value}`, body)
        message.success('已更新')
      } else {
        await api.post('/admin/companies/solutions', body)
        message.success('已添加')
      }
      solutionModal.value = false
      fetchSolutions()
    }
    async function deleteSolution(id: number) {
      await api.del(`/admin/companies/solutions/${id}`)
      message.success('已删除')
      fetchSolutions()
    }

    // -- solutions reorder --
    const dragSolFrom = ref(-1)
    const dragSolImgFrom = ref(-1)
    const solutionReorderLoading = ref(false)
    const solUploadQueue = ref<File[]>([])
    const solUploading = ref(false)
    async function processSolUploadQueue() {
      if (solUploading.value) return
      solUploading.value = true
      while (solUploadQueue.value.length > 0) {
        const f = solUploadQueue.value.shift()!
        try {
          const result = await uploadFile(f)
          solutionForm.imageFiles.push({ uid: -Date.now(), name: f.name, status: 'done', url: result.url, thumbUrl: resolveMediaUrl(result.url) })
        } catch (e: any) { message.error(e.message || `${f.name} 上传失败`) }
      }
      solUploading.value = false
    }
    async function reorderSolutions(ids: number[]) {
      if (!companyId.value) return
      solutionReorderLoading.value = true
      try {
        await api.put('/admin/companies/solutions/reorder', { company_id: companyId.value, ids })
        fetchSolutions()
      } catch (e: any) { message.error(e.message || '排序失败') }
      finally { solutionReorderLoading.value = false }
    }
    function moveSolutionUp(index: number) {
      if (index <= 0) return
      const list = [...solutions.value]
      ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
      solutions.value = list
      reorderSolutions(list.map((s: any) => s.id))
    }
    function moveSolutionDown(index: number) {
      if (index >= solutions.value.length - 1) return
      const list = [...solutions.value]
      ;[list[index + 1], list[index]] = [list[index], list[index + 1]]
      solutions.value = list
      reorderSolutions(list.map((s: any) => s.id))
    }
    function onDragSolution(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return
      const list = [...solutions.value]
      const [item] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, item)
      solutions.value = list
      reorderSolutions(list.map((s: any) => s.id))
    }

    // -- cases --
    const cases = ref<any[]>([])
    const casesLoading = ref(false)
    const caseModal = ref(false)
    const caseEditId = ref<number>(0)
    const caseForm = reactive({ client_name: '', description: '', imageFiles: [] as any[] })
    const caseFormRef = ref()
    async function fetchCases() {
      if (!companyId.value) return
      casesLoading.value = true
      try { cases.value = await api.get(`/admin/companies/${companyId.value}/cases`) } catch {}
      casesLoading.value = false
    }
    function openCaseModal(item?: any) {
      if (item) {
        caseEditId.value = item.id
        caseForm.client_name = item.client_name
        caseForm.description = item.description || ''
        caseForm.imageFiles = (item.images || []).map((img: any, i: number) => ({ uid: -i, name: `图${i+1}`, status: 'done', url: img.image_url, thumbUrl: resolveMediaUrl(img.image_url) }))
      } else {
        caseEditId.value = 0
        caseForm.client_name = ''
        caseForm.description = ''
        caseForm.imageFiles = []
      }
      caseModal.value = true
    }
    async function saveCase() {
      try { await caseFormRef.value?.validate() } catch { return }
      const images = caseForm.imageFiles.map((f: any, i: number) => ({
        image_url: f.url || f.response?.url || '',
        sort_order: i,
      }))
      const body = { client_name: caseForm.client_name, description: caseForm.description, images, company_id: companyId.value }
      if (caseEditId.value) {
        await api.put(`/admin/companies/cases/${caseEditId.value}`, body)
        message.success('已更新')
      } else {
        await api.post('/admin/companies/cases', body)
        message.success('已添加')
      }
      caseModal.value = false
      fetchCases()
    }
    async function deleteCase(id: number) {
      await api.del(`/admin/companies/cases/${id}`)
      message.success('已删除')
      fetchCases()
    }

    // -- cases reorder --
    const dragCaseFrom = ref(-1)
    const dragCaseImgFrom = ref(-1)
    const caseReorderLoading = ref(false)
    const caseUploadQueue = ref<File[]>([])
    const caseUploading = ref(false)
    async function processCaseUploadQueue() {
      if (caseUploading.value) return
      caseUploading.value = true
      while (caseUploadQueue.value.length > 0) {
        const f = caseUploadQueue.value.shift()!
        try {
          const result = await uploadFile(f)
          caseForm.imageFiles.push({ uid: -Date.now(), name: f.name, status: 'done', url: result.url, thumbUrl: resolveMediaUrl(result.url) })
        } catch (e: any) { message.error(e.message || `${f.name} 上传失败`) }
      }
      caseUploading.value = false
    }
    async function reorderCases(ids: number[]) {
      if (!companyId.value) return
      caseReorderLoading.value = true
      try {
        await api.put('/admin/companies/cases/reorder', { company_id: companyId.value, ids })
        fetchCases()
      } catch (e: any) { message.error(e.message || '排序失败') }
      finally { caseReorderLoading.value = false }
    }
    function moveCaseUp(index: number) {
      if (index <= 0) return
      const list = [...cases.value]
      ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
      cases.value = list
      reorderCases(list.map((c: any) => c.id))
    }
    function moveCaseDown(index: number) {
      if (index >= cases.value.length - 1) return
      const list = [...cases.value]
      ;[list[index + 1], list[index]] = [list[index], list[index + 1]]
      cases.value = list
      reorderCases(list.map((c: any) => c.id))
    }
    function onDragCase(fromIndex: number, toIndex: number) {
      if (fromIndex === toIndex) return
      const list = [...cases.value]
      const [item] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, item)
      cases.value = list
      reorderCases(list.map((c: any) => c.id))
    }

    // -- save basic info --
    async function handleSaveBasic() {
      try { await formRef.value?.validate() } catch { return }
      saving.value = true
      try {
        if (isEdit) {
          await api.put(`/admin/companies/${route.params.id}`, formData)
        } else {
          const data = await api.post('/admin/companies', formData)
          companyId.value = data.id
          message.success('创建成功，请继续完善企业信息')
        }
        if (!isEdit) message.success('创建成功')
        else message.success('更新成功')
      } catch (e: any) { message.error(e.message || '保存失败') }
      finally { saving.value = false }
    }

    const imageColumns = [
      {
        title: '预览', width: 36,
        customRender: ({ record }: any) => h('img', {
          src: resolveMediaUrl(record.image_url),
          alt: '',
          style: { width: 18, height: 18, objectFit: 'cover', borderRadius: 3, display: 'block' },
        }),
      },
      { title: '文件名', dataIndex: 'image_url', ellipsis: true,
        customRender: ({ text }: any) => {
          const name = (text as string).split('/').pop() ?? text
          return h('span', { style: { fontSize: '12px', color: '#666' } }, name)
        },
      },
      {
        title: '排序', dataIndex: 'sort_order', width: 60,
        customRender: ({ record }: any) =>
          h('span', { style: { fontSize: '12px', color: '#666' } }, record.sort_order != null ? record.sort_order + 1 : '-'),
      },
      { title: '操作', width: 72, customRender: ({ record }: any) =>
          h(Popconfirm, { title: '确认删除?', onConfirm: () => deleteImage(record.id) }, () =>
            h(Button, { type: 'link', danger: true, size: 'small', icon: h(DeleteOutlined) }, () => '删除')
          )
      },
    ]

    const solutionColumns = [
      {
        title: '#', width: 40, align: 'center' as const,
        customRender: ({ index }: any) => h('span', { style: { color: '#999', fontSize: 12 } }, (index + 1).toString()),
      },
      {
        title: '排序', width: 80, align: 'center' as const,
        customRender: ({ record, index }: any) => {
          const total = solutions.value.length
          return h(Space, { size: 0 }, () => [
            h(Button, {
              size: 'small', type: 'text',
              disabled: index === 0,
              icon: h(UpOutlined),
              onClick: () => moveSolutionUp(index),
              title: '上移',
            }),
            h(Button, {
              size: 'small', type: 'text',
              disabled: index === total - 1,
              icon: h(DownOutlined),
              onClick: () => moveSolutionDown(index),
              title: '下移',
            }),
          ])
        },
      },
      { title: '标题', dataIndex: 'title' },
      { title: '描述', dataIndex: 'description', ellipsis: true },
      { title: '操作', width: 140, customRender: ({ record }: any) =>
          h(Space, {}, () => [
            h(Button, { size: 'small', onClick: () => openSolutionModal(record), icon: h(EditOutlined) }),
            h(Popconfirm, { title: '确认删除?', onConfirm: () => deleteSolution(record.id) }, () =>
              h(Button, { size: 'small', danger: true, icon: h(DeleteOutlined) })
            ),
          ])
      },
    ]

    const caseColumns = [
      {
        title: '#', width: 40, align: 'center' as const,
        customRender: ({ index }: any) => h('span', { style: { color: '#999', fontSize: 12 } }, (index + 1).toString()),
      },
      {
        title: '排序', width: 80, align: 'center' as const,
        customRender: ({ record, index }: any) => {
          const total = cases.value.length
          return h(Space, { size: 0 }, () => [
            h(Button, {
              size: 'small', type: 'text',
              disabled: index === 0,
              icon: h(UpOutlined),
              onClick: () => moveCaseUp(index),
              title: '上移',
            }),
            h(Button, {
              size: 'small', type: 'text',
              disabled: index === total - 1,
              icon: h(DownOutlined),
              onClick: () => moveCaseDown(index),
              title: '下移',
            }),
          ])
        },
      },
      { title: '客户名称', dataIndex: 'client_name' },
      { title: '成效描述', dataIndex: 'description', ellipsis: true },
      { title: '操作', width: 140, customRender: ({ record }: any) =>
          h(Space, {}, () => [
            h(Button, { size: 'small', onClick: () => openCaseModal(record), icon: h(EditOutlined) }),
            h(Popconfirm, { title: '确认删除?', onConfirm: () => deleteCase(record.id) }, () =>
              h(Button, { size: 'small', danger: true, icon: h(DeleteOutlined) })
            ),
          ])
      },
    ]

    async function handleUploadLogo(file: File) {
      const isReplace = !!formData.logo
      const r = await uploadFile(file)
      formData.logo = r.url
      message.success(isReplace ? 'Logo 已更新' : '上传成功')
      return false // 阻止默认上传
    }

    // 企业 Logo 上传：已有 Logo 时显示预览 + 重新上传
    const renderLogo = () => (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {formData.logo && (
          <div style={{
            width: '104px', height: '104px', borderRadius: '8px', overflow: 'hidden',
            border: '1px solid var(--ant-color-border, #d9d9d9)', flexShrink: 0,
            background: '#fafafa',
          }}>
            <img src={resolveMediaUrl(formData.logo)} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )}
        <Upload
          accept="image/jpeg,image/png,image/webp"
          maxCount={1}
          showUploadList={false}
          beforeUpload={handleUploadLogo as any}
        >
          {formData.logo ? (
            <Button icon={<UploadOutlined />}>重新上传</Button>
          ) : (
            <div style={{
              width: '104px', height: '104px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '4px',
              border: '1px dashed var(--ant-color-border, #d9d9d9)', borderRadius: '8px',
              color: 'var(--ant-color-text-secondary, #888)', cursor: 'pointer',
            }}>
              <UploadOutlined />
              <span style={{ fontSize: '12px' }}>上传</span>
            </div>
          )}
        </Upload>
      </div>
    )

    // 标签选择器：点击预设标签选中/取消 + 自定义输入，最多 3 个
    // 标签池可持久化：删除预设标签、新增自定义标签都会保存到 localStorage
    const customTagInput = ref('')
    const tagPool = ref<string[]>(loadTagPool())

    /** 从标签池中永久删除一个标签（同时从当前已选中移除） */
    const removeTagFromPool = (tag: string) => {
      tagPool.value = tagPool.value.filter((t) => t !== tag)
      saveTagPool(tagPool.value)
      // 同步从当前已选标签中移除
      let selected: string[] = []
      try { selected = JSON.parse(formData.tags) } catch { selected = [] }
      if (selected.includes(tag)) {
        formData.tags = JSON.stringify(selected.filter((t) => t !== tag))
      }
      message.success(`已从标签库移除「${tag}」`)
    }

    /** 添加自定义标签：加入当前已选 + 持久化到标签池 */
    const addCustomTag = () => {
      const val = customTagInput.value.trim()
      if (!val) return
      let selected: string[] = []
      try { selected = JSON.parse(formData.tags) } catch { selected = [] }
      if (selected.includes(val)) { message.warning('标签已存在'); return }
      if (selected.length >= 3) { message.warning('最多选择 3 个标签'); return }
      selected = [...selected, val]
      formData.tags = JSON.stringify(selected)
      customTagInput.value = ''
      // 持久化到标签池（若不存在则追加）
      if (!tagPool.value.includes(val)) {
        tagPool.value = [...tagPool.value, val]
        saveTagPool(tagPool.value)
      }
    }

    const renderTagPicker = () => {
      const MAX = 3
      let selected: string[] = []
      try { selected = JSON.parse(formData.tags) } catch { selected = [] }

      const toggle = (tag: string) => {
        const idx = selected.indexOf(tag)
        if (idx >= 0) {
          selected = selected.filter(t => t !== tag)
        } else {
          if (selected.length >= MAX) {
            message.warning(`最多选择 ${MAX} 个标签`)
            return
          }
          selected = [...selected, tag]
        }
        formData.tags = JSON.stringify(selected)
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 标签库：点击切换选中，右侧 × 永久删除 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {tagPool.value.map(tag => {
              const active = selected.includes(tag)
              return (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 6px 3px 10px', borderRadius: '4px', fontSize: '13px',
                    userSelect: 'none',
                    border: `1px solid ${active ? '#1677ff' : '#d9d9d9'}`,
                    background: active ? '#e6f4ff' : '#fafafa',
                    color: active ? '#1677ff' : '#595959',
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  <span onClick={() => toggle(tag)} style={{ cursor: 'pointer' }}>
                    {tag}
                  </span>
                  <Tooltip title="从标签库永久删除" mouseEnterDelay={0.4}>
                    <span
                      onClick={(e: Event) => { e.stopPropagation(); removeTagFromPool(tag) }}
                      style={{
                        cursor: 'pointer', lineHeight: 1, fontSize: '10px',
                        opacity: 0.5, display: 'inline-flex', alignItems: 'center',
                        padding: '2px', borderRadius: '2px',
                      }}
                    >
                      <CloseOutlined />
                    </span>
                  </Tooltip>
                </span>
              )
            })}
            {tagPool.value.length === 0 && (
              <span style={{ fontSize: '12px', color: '#bbb' }}>标签库为空，可在右侧添加</span>
            )}
          </div>

          {/* 已选的自定义标签（不在标签池中的，理论上不会出现，保留兼容） */}
          {selected.filter(t => !tagPool.value.includes(t)).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selected.filter(t => !tagPool.value.includes(t)).map(tag => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', borderRadius: '4px', fontSize: '13px',
                    border: '1px solid #1677ff', background: '#e6f4ff',
                    color: '#1677ff', fontWeight: 600, userSelect: 'none',
                  }}
                >
                  {tag}
                  <span onClick={() => toggle(tag)} style={{ cursor: 'pointer', lineHeight: 1, fontSize: '12px', opacity: 0.7 }}>✕</span>
                </span>
              ))}
            </div>
          )}

          {/* 自定义标签输入 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              v-model:value={customTagInput.value}
              size="small"
              placeholder="添加自定义标签（自动保存到标签库）"
              style={{ width: '240px' }}
              maxlength={10}
              onPressEnter={addCustomTag}
            />
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addCustomTag}>添加</Button>
            {selected.length > 0 && (
              <span style={{ fontSize: '12px', color: '#999' }}>
                已选 {selected.length}/{MAX}
              </span>
            )}
          </div>
        </div>
      )
    }

    return () => (
      <div class="page-fade-in" style="max-width:960px">
        <Space direction="vertical" size="large" style="width:100%">
          <Button type="text" onClick={() => router.push('/companies')} icon={<ArrowLeftOutlined />}>
            返回列表
          </Button>

          {!isEdit && <Card bordered={false} title="新增企业">
            <Form ref={formRef} model={formData} rules={rules} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="企业名称" name="name">
                    <Input v-model:value={formData.name} maxlength={50} showCount />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="行业领域" name="industry">
                    <Select v-model:value={formData.industry} options={industries.value.map(v => ({ value: v, label: v }))} placeholder="选择行业" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="应用环节" name="application_stage">
                <Select v-model:value={formData.application_stage} options={stages.value.map(v => ({ value: v, label: v }))} placeholder="选择环节" />
              </Form.Item>
              <Form.Item label="企业Logo">
                {renderLogo()}
              </Form.Item>
              <Form.Item label="企业简介" name="introduction">
                <Input.TextArea v-model:value={formData.introduction} rows={5} maxlength={500} showCount />
              </Form.Item>
              <Form.Item label="标签">
                {renderTagPicker()}
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button onClick={() => router.push('/companies')}>取消</Button>
                  <Button type="primary" onClick={handleSaveBasic} loading={saving.value}>创建</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>}

          {isEdit && (
            <Card bordered={false}>
              <Tabs v-model:activeKey={activeTab.value}>
                <Tabs.TabPane key="basic" tab="基本信息">
                  <Form ref={formRef} model={formData} rules={rules} layout="vertical" style="maxWidth:640px;margin-top:16px">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="企业名称" name="name">
                          <Input v-model:value={formData.name} maxlength={50} showCount />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="行业领域" name="industry">
                          <Select v-model:value={formData.industry} options={industries.value.map(v => ({ value: v, label: v }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="应用环节" name="application_stage">
                      <Select v-model:value={formData.application_stage} options={stages.value.map(v => ({ value: v, label: v }))} />
                    </Form.Item>
                    <Form.Item label="企业Logo">
                      {renderLogo()}
                    </Form.Item>
                    <Form.Item label="企业简介" name="introduction">
                      <Input.TextArea v-model:value={formData.introduction} rows={5} maxlength={500} showCount />
                    </Form.Item>
                    <Form.Item label="标签">
                      {renderTagPicker()}
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" onClick={handleSaveBasic} loading={saving.value}>保存</Button>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>

                <Tabs.TabPane key="images" tab={<><PictureOutlined /> 企业风采</>}>
                  <Space direction="vertical" style="width:100%;margin-top:16px">
                    <Upload accept="image/jpeg,image/png" maxCount={1} beforeUpload={handleUploadImage} showUploadList={false}>
                      <Button type="dashed" icon={<PlusOutlined />}>添加图片</Button>
                    </Upload>
                    {imagesLoading.value ? (
                      <span style={{ fontSize: '13px', color: '#999' }}>加载中...</span>
                    ) : images.value.length === 0 ? (
                      <span style={{ fontSize: '13px', color: '#bbb' }}>暂无图片</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                        {images.value.map((img: any) => (
                          <div key={img.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <img
                              src={resolveMediaUrl(img.image_url)}
                              alt=""
                              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0', display: 'block' }}
                            />
                            <Popconfirm title="确认删除?" onConfirm={() => deleteImage(img.id)}>
                              <Button type="link" danger size="small" style={{ padding: 0, fontSize: '12px', height: 'auto' }}>删除</Button>
                            </Popconfirm>
                          </div>
                        ))}
                      </div>
                    )}
                  </Space>
                </Tabs.TabPane>

                <Tabs.TabPane key="solutions" tab={<><SolutionOutlined /> 解决方案</>}>
                  <Space direction="vertical" style="width:100%;margin-top:16px">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openSolutionModal()}>添加方案</Button>
                    <Table
                      columns={solutionColumns}
                      dataSource={solutions.value}
                      rowKey="id"
                      loading={solutionLoading.value || solutionReorderLoading.value}
                      pagination={false}
                      size="small"
                      customRow={(record, index) => ({
                        draggable: true,
                        style: { cursor: 'grab' },
                        onDragstart: (e: DragEvent) => {
                          dragSolFrom.value = index!
                          e.dataTransfer!.effectAllowed = 'move'
                        },
                        onDragover: (e: DragEvent) => {
                          e.preventDefault()
                          e.dataTransfer!.dropEffect = 'move'
                        },
                        onDragenter: (e: DragEvent) => { e.preventDefault() },
                        onDrop: (e: DragEvent) => {
                          e.preventDefault()
                          if (dragSolFrom.value >= 0 && dragSolFrom.value !== index) {
                            onDragSolution(dragSolFrom.value, index!)
                          }
                          dragSolFrom.value = -1
                        },
                        onDragend: () => { dragSolFrom.value = -1 },
                      })}
                    />
                  </Space>
                </Tabs.TabPane>

                <Tabs.TabPane key="cases" tab={<><TrophyOutlined /> 案例成效</>}>
                  <Space direction="vertical" style="width:100%;margin-top:16px">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCaseModal()}>添加案例</Button>
                    <Table
                      columns={caseColumns}
                      dataSource={cases.value}
                      rowKey="id"
                      loading={casesLoading.value || caseReorderLoading.value}
                      pagination={false}
                      size="small"
                      customRow={(record, index) => ({
                        draggable: true,
                        style: { cursor: 'grab' },
                        onDragstart: (e: DragEvent) => {
                          dragCaseFrom.value = index!
                          e.dataTransfer!.effectAllowed = 'move'
                        },
                        onDragover: (e: DragEvent) => {
                          e.preventDefault()
                          e.dataTransfer!.dropEffect = 'move'
                        },
                        onDragenter: (e: DragEvent) => { e.preventDefault() },
                        onDrop: (e: DragEvent) => {
                          e.preventDefault()
                          if (dragCaseFrom.value >= 0 && dragCaseFrom.value !== index) {
                            onDragCase(dragCaseFrom.value, index!)
                          }
                          dragCaseFrom.value = -1
                        },
                        onDragend: () => { dragCaseFrom.value = -1 },
                      })}
                    />
                  </Space>
                </Tabs.TabPane>
              </Tabs>
            </Card>
          )}
        </Space>

        {/* Solution Modal */}
        <Modal v-model:open={solutionModal.value} title={solutionEditId.value ? '编辑方案' : '添加方案'} onOk={saveSolution} destroyOnClose>
          <Form ref={solutionFormRef} model={solutionForm} rules={solutionRules} layout="vertical">
            <Form.Item label="方案标题" name="title">
              <Input v-model:value={solutionForm.title} maxlength={50} placeholder="输入方案标题" />
            </Form.Item>
            <Form.Item label="方案描述">
              <Input.TextArea v-model:value={solutionForm.description} rows={3} maxlength={500} showCount />
            </Form.Item>
            <Form.Item label="配图" name="imageFiles">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                {/* 可拖拽排序的图片预览列表 */}
                {solutionForm.imageFiles.map((f: any, i: number) => (
                  <div
                    key={f.uid}
                    draggable
                    style={{
                      position: 'relative', width: 72, height: 72, borderRadius: 6,
                      border: '1px solid #d9d9d9', overflow: 'hidden', cursor: 'grab',
                    }}
                    onDragstart={(e: DragEvent) => { dragSolImgFrom.value = i; e.dataTransfer!.effectAllowed = 'move' }}
                    onDragover={(e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'move' }}
                    onDragenter={(e: DragEvent) => { e.preventDefault() }}
                    onDrop={(e: DragEvent) => {
                      e.preventDefault()
                      if (dragSolImgFrom.value >= 0 && dragSolImgFrom.value !== i) {
                        const list = [...solutionForm.imageFiles]
                        const [item] = list.splice(dragSolImgFrom.value, 1)
                        list.splice(i, 0, item)
                        solutionForm.imageFiles = list
                      }
                      dragSolImgFrom.value = -1
                    }}
                    onDragend={() => { dragSolImgFrom.value = -1 }}
                  >
                    {f.status === 'uploading' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 12 }}>上传中...</div>
                    ) : (
                      <img src={f.thumbUrl || f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <div
                      onClick={() => {
                        const idx = solutionForm.imageFiles.indexOf(f)
                        if (idx > -1) solutionForm.imageFiles.splice(idx, 1)
                      }}
                      style={{
                        position: 'absolute', top: 0, right: 0, width: 16, height: 16,
                        background: 'rgba(255,77,79,0.9)', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        borderRadius: '0 6px 0 6px', fontSize: 10, lineHeight: 1, fontWeight: 'bold',
                      }}
                    >×</div>
                  </div>
                ))}
                {solutionForm.imageFiles.length < 10 && (
                  <Upload
                    listType="picture-card"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    showUploadList={false}
                    beforeUpload={async (f: UploadFileType) => {
                      solUploadQueue.value.push(f as any)
                      processSolUploadQueue()
                      return false
                    }}
                  >
                    <div style="display:flex;align-items:center;justify-content:center;flex-direction:column;width:72px;height:72px"><PlusOutlined style="font-size:18px" /><div style="margin-top:6px">上传</div></div>
                  </Upload>
                )}
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Case Modal */}
        <Modal v-model:open={caseModal.value} title={caseEditId.value ? '编辑案例' : '添加案例'} onOk={saveCase} destroyOnClose>
          <Form ref={caseFormRef} model={caseForm} layout="vertical">
            <Form.Item label="客户名称" name="client_name" rules={[{ required: true, message: '请输入客户名称' }]}>
              <Input v-model:value={caseForm.client_name} maxlength={50} />
            </Form.Item>
            <Form.Item label="成效描述" name="description" rules={[{ required: true, message: '请输入成效描述' }]}>
              <Input.TextArea v-model:value={caseForm.description} rows={3} maxlength={500} showCount />
            </Form.Item>
            <Form.Item label="配图">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                {/* 可拖拽排序的图片预览列表 */}
                {caseForm.imageFiles.map((f: any, i: number) => (
                  <div
                    key={f.uid}
                    draggable
                    style={{
                      position: 'relative', width: 72, height: 72, borderRadius: 6,
                      border: '1px solid #d9d9d9', overflow: 'hidden', cursor: 'grab',
                    }}
                    onDragstart={(e: DragEvent) => { dragCaseImgFrom.value = i; e.dataTransfer!.effectAllowed = 'move' }}
                    onDragover={(e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'move' }}
                    onDragenter={(e: DragEvent) => { e.preventDefault() }}
                    onDrop={(e: DragEvent) => {
                      e.preventDefault()
                      if (dragCaseImgFrom.value >= 0 && dragCaseImgFrom.value !== i) {
                        const list = [...caseForm.imageFiles]
                        const [item] = list.splice(dragCaseImgFrom.value, 1)
                        list.splice(i, 0, item)
                        caseForm.imageFiles = list
                      }
                      dragCaseImgFrom.value = -1
                    }}
                    onDragend={() => { dragCaseImgFrom.value = -1 }}
                  >
                    {f.status === 'uploading' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 12 }}>上传中...</div>
                    ) : (
                      <img src={f.thumbUrl || f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <div
                      onClick={() => {
                        const idx = caseForm.imageFiles.indexOf(f)
                        if (idx > -1) caseForm.imageFiles.splice(idx, 1)
                      }}
                      style={{
                        position: 'absolute', top: 0, right: 0, width: 16, height: 16,
                        background: 'rgba(255,77,79,0.9)', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        borderRadius: '0 6px 0 6px', fontSize: 10, lineHeight: 1, fontWeight: 'bold',
                      }}
                    >×</div>
                  </div>
                ))}
                {caseForm.imageFiles.length < 10 && (
                  <Upload
                    listType="picture-card"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    showUploadList={false}
                    beforeUpload={async (f: UploadFileType) => {
                      caseUploadQueue.value.push(f as any)
                      processCaseUploadQueue()
                      return false
                    }}
                  >
                    <div style="display:flex;align-items:center;justify-content:center;flex-direction:column;width:72px;height:72px"><PlusOutlined style="font-size:18px" /><div style="margin-top:6px">上传</div></div>
                  </Upload>
                )}
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    )
  },
})
