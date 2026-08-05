import { defineComponent, onMounted, computed } from 'vue'
import { RouterView } from 'vue-router'
import { ConfigProvider, theme as antTheme } from 'ant-design-vue'
import { useThemeStore } from '@/stores/theme'
import zhCN from 'ant-design-vue/locale/zh_CN'

export default defineComponent({
  setup() {
    const themeStore = useThemeStore()
    onMounted(() => themeStore.init())

    const themeConfig = computed(() => ({
      algorithm: themeStore.theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#4f46e5',
        borderRadius: 8,
      },
    }))

    return () => (
      <ConfigProvider locale={zhCN} theme={themeConfig.value}>
        <RouterView />
      </ConfigProvider>
    )
  },
})
