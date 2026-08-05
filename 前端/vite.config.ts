import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// 后端服务地址（开发环境通过代理转发，规避跨域问题）
const BACKEND_TARGET = 'http://192.168.3.39:23357'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    proxy: {
      // 接口请求代理到后端，避免开发环境跨域
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      // 后端返回的图片/附件等 CDN 资源
      '/cdn': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
