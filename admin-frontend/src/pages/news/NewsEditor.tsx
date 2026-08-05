import { defineComponent, ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api, uploadFile } from '@/lib/api'
import { Button, Input, Form, Card, Space, Upload, message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  UploadOutlined,
  SaveOutlined,
  SendOutlined,
  ImportOutlined,
} from '@ant-design/icons-vue'
import RichEditor from '@/components/RichEditor'
import { importNewsFiles } from '@/lib/newsImport'

export default defineComponent({
  setup() {
    const router = useRouter()
    const route = useRoute()
    const isEdit = !!route.params.id
    const saving = ref(false)
    const importing = ref(false)
    const importInputRef = ref<HTMLInputElement>()
    const formRef = ref()
    const formData = reactive({
      title: '',
      author: '',
      content: '',
      cover_image: '',
      images: '[]',
    })

    const rules: Record<string, any> = {
      title: [{ required: true, message: '请输入新闻标题', trigger: 'blur' }],
      author: [{ required: true, message: '请输入作者名称', trigger: 'blur' }],
      content: [{ required: true, message: '请输入正文内容', trigger: 'blur' }],
      cover_image: [{ required: true, message: '请上传封面图片', trigger: 'change' }],
    }

    onMounted(async () => {
      // 允许选择整个文件夹
      if (importInputRef.value) {
        importInputRef.value.setAttribute('webkitdirectory', '')
        importInputRef.value.setAttribute('directory', '')
      }
      if (isEdit) {
        const data = await api.get(`/admin/news/${route.params.id}`)
        Object.assign(formData, data)
      }
    })

    function triggerImport() {
      importInputRef.value?.click()
    }

    async function handleImportFiles(e: Event) {
      const input = e.target as HTMLInputElement
      const files = Array.from(input.files ?? [])
      input.value = '' // 允许重复选择同一文件夹
      if (files.length === 0) return

      importing.value = true
      const hide = message.loading('正在解析文档并转换图片...', 0)
      try {
        const result = await importNewsFiles(files, { maxWidth: 1080, quality: 0.82 })
        formData.title = result.title || formData.title
        formData.author = result.author || formData.author
        formData.content = result.content
        if (result.cover) formData.cover_image = result.cover
        hide()
        message.success(`导入成功：已处理 ${result.imageCount} 张图片`)
      } catch (err: any) {
        hide()
        message.error(err?.message || '导入失败')
      } finally {
        importing.value = false
      }
    }

    async function handleUploadCover(file: File) {
      const result = await uploadFile(file)
      formData.cover_image = result.url
      message.success('封面上传成功')
      return false // Prevent default upload
    }

    async function handleSave(status: 'draft' | 'published') {
      try {
        await formRef.value?.validate()
      } catch {
        return
      }

      saving.value = true
      try {
        if (isEdit) {
          await api.put(`/admin/news/${route.params.id}`, formData)
          if (status === 'published') {
            await api.post(`/admin/news/${route.params.id}/publish`)
          }
        } else {
          const data = await api.post('/admin/news', formData)
          if (status === 'published') {
            await api.post(`/admin/news/${data.id}/publish`)
          }
        }
        message.success(status === 'published' ? '发布成功' : '已保存草稿')
        router.push('/news')
      } catch (e: any) {
        message.error(e.message || '保存失败')
      } finally {
        saving.value = false
      }
    }

    return () => (
      <div class="page-fade-in" style="max-width: 900px">
        <Space direction="vertical" size="large" style="width: 100%">
          <Button type="text" onClick={() => router.push('/news')} icon={<ArrowLeftOutlined />}>
            返回列表
          </Button>

          <Card bordered={false} title={isEdit ? '编辑新闻' : '新建新闻'}>
            <input
              ref={importInputRef}
              type="file"
              multiple
              accept=".md,.markdown,image/*"
              style="display: none"
              onChange={handleImportFiles}
            />

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: 'var(--ant-color-info-bg, #e6f4ff)',
              border: '1px solid var(--ant-color-info-border, #91caff)',
              borderRadius: '8px', padding: '8px 12px', marginBottom: '20px',
            }}>
              <ImportOutlined style={{ color: 'var(--ant-color-info, #1677ff)', fontSize: '16px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary, #555)', whiteSpace: 'nowrap' }}>
                选含 .md 与 images 的文件夹，自动解析并内嵌图片
              </span>
              <Button
                type="primary"
                size="small"
                icon={<ImportOutlined />}
                loading={importing.value}
                onClick={triggerImport}
              >
                选择文件夹
              </Button>
            </div>

            <Form
              ref={formRef}
              model={formData}
              rules={rules}
              layout="vertical"
              style={{ maxWidth: '720px' }}
            >
              <Form.Item label="新闻标题" name="title">
                <Input
                  v-model:value={formData.title}
                  placeholder="输入新闻标题"
                  maxlength={100}
                  showCount
                />
              </Form.Item>

              <Form.Item label="作者" name="author">
                <Input
                  v-model:value={formData.author}
                  placeholder="输入作者名称"
                  maxlength={20}
                />
              </Form.Item>

              <Form.Item label="封面图片" name="cover_image">
                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  maxCount={1}
                  beforeUpload={handleUploadCover}
                  listType="picture-card"
                  showUploadList={{ showPreviewIcon: false }}
                >
                  {formData.cover_image ? null : (
                    <div>
                      <UploadOutlined />
                      <div style="margin-top: 8px">上传封面</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item label="正文内容" name="content">
                <RichEditor
                  modelValue={formData.content}
                  onUpdate:modelValue={(v: string) => {
                    formData.content = v
                  }}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button onClick={() => router.push('/news')}>取消</Button>
                  <Button
                    onClick={() => handleSave('draft')}
                    loading={saving.value}
                    icon={<SaveOutlined />}
                  >
                    保存草稿
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => handleSave('published')}
                    loading={saving.value}
                    icon={<SendOutlined />}
                  >
                    发布
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
