import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const backendTarget = 'http://192.168.3.39:23357'
  // 开发模式且没有设置公网地址时，才启用本地代理
  const useProxy = mode === 'development' && !env.VITE_API_BASE_URL

  return {
    base: './',
    plugins: [vue(), vueJsx()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: useProxy
        ? {
            '/api': { target: backendTarget, changeOrigin: true },
            '/cdn': { target: backendTarget, changeOrigin: true },
          }
        : undefined,
    },
  }
})
