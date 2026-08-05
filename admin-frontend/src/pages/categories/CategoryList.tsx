import { defineComponent, ref, reactive, onMounted, h, computed, watch } from 'vue'
import { api } from '@/lib/api'
import {
  Button, Input, Form, Card, Space, Table, Modal, Popconfirm,
  Select, Tag, message, InputNumber, Tree,
} from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined,
} from '@ant-design/icons-vue'
import { fetchCategoryTree, type CategoryType, type CategoryTreeNode } from '@/lib/categories'

const TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: 'industry', label: '行业领域' },
  { value: 'application_stage', label: '应用环节' },
  { value: 'demand_category', label: '需求大类' },
]

const TYPE_LABEL: Record<CategoryType, string> = {
  industry: '行业领域',
  application_stage: '应用环节',
  demand_category: '需求大类',
}

interface FlatNode {
  id: number
  type: CategoryType
  name: string
  parent_id: number | null
  sort_order: number
  is_default: boolean
  level: number
  parentName?: string
}

/** 把树拍平成表格行，带层级缩进标识 */
function flattenTree(tree: CategoryTreeNode[], level = 0, parentName?: string): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of tree) {
    result.push({
      id: node.id,
      type: node.type,
      name: node.name,
      parent_id: node.parent_id ?? null,
      sort_order: node.sort_order,
      is_default: node.is_default,
      level,
      parentName,
    })
    if (node.children?.length) {
      result.push(...flattenTree(node.children, level + 1, node.name))
    }
  }
  return result
}

export default defineComponent({
  setup() {
    const currentType = ref<CategoryType>('industry')
    // 完整的 demand_category 树（含 industry / application_stage 子级）
    const fullTree = ref<CategoryTreeNode[]>([])
    const loading = ref(false)

    // 当前类型对应的父级节点（industry→"行业领域"，application_stage→"应用环节"）
    const PARENT_NAME_MAP: Record<string, string> = {
      industry: '行业领域',
      application_stage: '应用环节',
    }

    // 根据当前 type 从完整树中派生展示数据
    const displayTree = computed<CategoryTreeNode[]>(() => {
      if (currentType.value === 'demand_category') {
        // 需求大类：只显示顶级（行业领域、应用环节），不含子级
        return fullTree.value.map((n) => ({ ...n, children: [] }))
      }
      // industry / application_stage：显示对应父级下的子分类
      const parentName = PARENT_NAME_MAP[currentType.value]
      const parent = fullTree.value.find((n) => n.name === parentName)
      return parent?.children ?? []
    })

    const flatList = computed<FlatNode[]>(() => flattenTree(displayTree.value))

    // 当前类型对应的父分类 id（新建子分类时用）
    const currentParentId = computed<number | undefined>(() => {
      if (currentType.value === 'demand_category') return undefined
      const parentName = PARENT_NAME_MAP[currentType.value]
      return fullTree.value.find((n) => n.name === parentName)?.id
    })

    // -- modal --
    const modalVisible = ref(false)
    const modalEditId = ref<number>(0)
    const modalForm = reactive({
      name: '',
      sort_order: 1,
      parent_id: undefined as number | undefined,
    })
    const modalFormRef = ref()
    const saving = ref(false)

    async function fetchData() {
      loading.value = true
      try {
        // 统一拉取 demand_category 完整树，从中派生各类型数据
        fullTree.value = await fetchCategoryTree('demand_category')
      } catch (e: any) {
        message.error(e.message || '加载失败')
        fullTree.value = []
      } finally {
        loading.value = false
      }
    }

    onMounted(() => fetchData())

    function onTypeChange() {
      // 数据已从完整树派生，无需重新请求
    }

    function openModal(item?: FlatNode) {
      if (item) {
        modalEditId.value = item.id
        modalForm.name = item.name
        modalForm.sort_order = item.sort_order
        modalForm.parent_id = item.parent_id ?? undefined
      } else {
        // 新建默认排序 = 当前最大 + 1
        const maxSort = flatList.value.reduce((m, c) => Math.max(m, c.sort_order || 0), 0)
        modalEditId.value = 0
        modalForm.name = ''
        modalForm.sort_order = maxSort + 1
        // industry / application_stage 的父级 id 从完整树中取
        modalForm.parent_id = currentParentId.value
      }
      modalVisible.value = true
    }

    async function handleSave() {
      try { await modalFormRef.value?.validate() } catch { return }
      saving.value = true
      try {
        const body: any = {
          type: currentType.value,
          name: modalForm.name.trim(),
          sort_order: modalForm.sort_order,
        }
        // industry / application_stage 需要带 parent_id
        if (currentType.value !== 'demand_category' && modalForm.parent_id) {
          body.parent_id = modalForm.parent_id
        }
        if (modalEditId.value) {
          await api.put(`/admin/categories/${modalEditId.value}`, {
            name: modalForm.name.trim(),
            sort_order: modalForm.sort_order,
          })
          message.success('已更新')
        } else {
          await api.post('/admin/categories', body)
          message.success('已添加')
        }
        modalVisible.value = false
        fetchData()
      } catch (e: any) {
        message.error(e.message || '保存失败')
      } finally {
        saving.value = false
      }
    }

    async function handleDelete(id: number) {
      try {
        await api.del(`/admin/categories/${id}`)
        message.success('已删除')
        fetchData()
      } catch (e: any) {
        message.error(e.message || '删除失败')
      }
    }

    const columns = computed(() => [
      {
        title: '名称', dataIndex: 'name', key: 'name',
        customRender: ({ record }: { record: FlatNode }) => {
          const prefix = record.level > 0 ? '└─ '.padStart(record.level * 2 + 3, ' ') : ''
          return h('span', { style: { fontWeight: record.level === 0 ? 600 : 400 } }, `${prefix}${record.name}`)
        },
      },
      { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
      {
        title: '父分类', key: 'parent', width: 120,
        customRender: ({ record }: { record: FlatNode }) =>
          record.parentName ? h(Tag, { color: 'blue' }, () => record.parentName) : h('span', { style: { color: '#bbb' } }, '—'),
      },
      {
        title: '属性', key: 'is_default', width: 100,
        customRender: ({ record }: { record: FlatNode }) =>
          record.is_default
            ? h(Tag, { color: 'default' }, () => '系统默认')
            : h(Tag, { color: 'green' }, () => '自定义'),
      },
      {
        title: '操作', key: 'action', width: 140,
        customRender: ({ record }: { record: FlatNode }) =>
          h(Space, {}, () => [
            h(Button, {
              size: 'small', onClick: () => openModal(record), icon: h(EditOutlined),
            }),
            h(Popconfirm, {
              title: '确认删除该分类？',
              onConfirm: () => handleDelete(record.id),
            }, () => h(Button, {
              size: 'small', danger: true, icon: h(DeleteOutlined),
              disabled: record.is_default,
            })),
          ]),
      },
    ])

    return () => (
      <div class="page-fade-in">
        <Card
          bordered={false}
          title={
            <Space>
              <AppstoreOutlined />
              <span>分类配置</span>
            </Space>
          }
          extra={
            <Space>
              <Select
                v-model:value={currentType.value}
                style="width: 140px"
                options={TYPE_OPTIONS}
                onChange={onTypeChange}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                新增分类
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns.value}
            dataSource={flatList.value}
            rowKey="id"
            loading={loading.value}
            pagination={false}
            size="small"
          />
        </Card>

        <Modal
          v-model:open={modalVisible.value}
          title={modalEditId.value ? `编辑${TYPE_LABEL[currentType.value]}` : `新增${TYPE_LABEL[currentType.value]}`}
          onOk={handleSave}
          confirmLoading={saving.value}
          destroyOnClose
        >
          <Form ref={modalFormRef} model={modalForm} layout="vertical" style="margin-top:12px">
            <Form.Item
              label="分类名称"
              name="name"
              rules={[{ required: true, message: '请输入分类名称', trigger: 'blur' }]}
            >
              <Input
                v-model:value={modalForm.name}
                maxlength={20}
                showCount
                placeholder="输入分类名称"
              />
            </Form.Item>
            <Form.Item label="排序" name="sort_order" tooltip="数字越小越靠前">
              <InputNumber v-model:value={modalForm.sort_order} min={0} max={9999} style="width:100%" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    )
  },
})
