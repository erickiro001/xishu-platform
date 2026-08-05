import { defineComponent, ref, shallowRef, onBeforeUnmount, watch } from 'vue'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { message } from 'ant-design-vue'
import { uploadFile } from '@/lib/api'

/**
 * 富文本编辑器（基于 wangEditor）
 * - 支持在正文中插入图片（自动上传到后端并以 <img> 形式嵌入）
 * - 通过 v-model 双向绑定 HTML 字符串
 */
export default defineComponent({
  name: 'RichEditor',
  props: {
    modelValue: { type: String, default: '' },
    height: { type: String, default: '420px' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const editorRef = shallowRef<IDomEditor>()
    const valueHtml = ref(props.modelValue)

    // 编辑模式下父组件异步加载数据后，同步到编辑器
    watch(
      () => props.modelValue,
      (v) => {
        if (v !== valueHtml.value) valueHtml.value = v
      },
    )

    const toolbarConfig: Partial<IToolbarConfig> = {
      excludeKeys: ['group-video', 'fullScreen'],
    }

    const editorConfig: Partial<IEditorConfig> = {
      placeholder: '请输入正文内容，可通过工具栏插入图片...',
      MENU_CONF: {
        uploadImage: {
          // 自定义上传：复用后端上传接口
          async customUpload(
            file: File,
            insertFn: (url: string, alt: string, href: string) => void,
          ) {
            try {
              const res = await uploadFile(file)
              if (res?.url) {
                insertFn(res.url, res.file_name || '', res.url)
              } else {
                message.error('图片上传失败')
              }
            } catch (e: any) {
              message.error(e?.message || '图片上传失败')
            }
          },
        },
      },
    }

    const handleCreated = (editor: IDomEditor) => {
      editorRef.value = editor
    }

    const handleChange = (editor: IDomEditor) => {
      emit('update:modelValue', editor.getHtml())
    }

    onBeforeUnmount(() => {
      editorRef.value?.destroy()
    })

    return () => (
      <div style="border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden;">
        <Toolbar
          editor={editorRef.value}
          defaultConfig={toolbarConfig}
          mode="default"
          style="border-bottom: 1px solid #f0f0f0;"
        />
        <Editor
          modelValue={valueHtml.value}
          defaultConfig={editorConfig}
          mode="default"
          style={{ height: props.height, overflowY: 'hidden' }}
          onOnCreated={handleCreated}
          onOnChange={handleChange}
        />
      </div>
    )
  },
})
