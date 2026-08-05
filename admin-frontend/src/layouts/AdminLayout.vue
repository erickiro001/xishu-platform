<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import logoUrl from '@/assets/logo.png'
import {
  DashboardOutlined,
  FileTextOutlined,
  BankOutlined,
  UnorderedListOutlined,
  SendOutlined,
  FormOutlined,
  AimOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const collapsed = ref(false)

const selectedKeys = ref<string[]>([route.path])
const openKeys = ref<string[]>([])

watch(() => route.path, (path) => {
  selectedKeys.value = [path]
})

const menuItems = [
  { key: '/dashboard', icon: DashboardOutlined, label: '数据概览' },
  { key: '/news', icon: FileTextOutlined, label: '新闻动态' },
  { key: '/companies', icon: BankOutlined, label: '企业管理' },
  { key: '/demands', icon: UnorderedListOutlined, label: '需求管理' },
  { key: '/intents', icon: AimOutlined, label: '需求意向' },
  { key: '/demand-submissions', icon: SendOutlined, label: '需求提交' },
  { key: '/solution-applications', icon: FormOutlined, label: '方案申请' },
  { key: '/categories', icon: AppstoreOutlined, label: '分类配置' },
]

function onMenuClick({ key }: { key: string }) {
  router.push(key)
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      :style="{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10 }"
    >
      <div class="logo-container">
        <img :src="logoUrl" alt="犀数工场" class="logo-img" />
        <span v-if="!collapsed" class="logo-text">犀数工场</span>
      </div>
      <a-menu
        theme="dark"
        mode="inline"
        :selected-keys="selectedKeys"
        :open-keys="openKeys"
        @click="onMenuClick"
        style="margin-top: 4px"
      >
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
      <div style="position: absolute; bottom: 0; width: 100%; padding: 8px">
        <a-menu theme="dark" mode="inline" :selectable="false" style="border-inline-end: none">
          <a-menu-item key="logout" @click="handleLogout">
            <template #icon>
              <LogoutOutlined />
            </template>
            <span>退出登录</span>
          </a-menu-item>
        </a-menu>
      </div>
    </a-layout-sider>

    <a-layout :style="{ marginLeft: collapsed ? '80px' : '200px', transition: 'margin-left 0.2s' }">
      <a-layout-header style="background: var(--ant-layout-body-bg, #f5f5f5); padding: 0 24px; display: flex; align-items: center; border-bottom: 1px solid var(--ant-border-color, #f0f0f0)">
        <component
          :is="collapsed ? MenuUnfoldOutlined : MenuFoldOutlined"
          style="font-size: 18px; cursor: pointer"
          @click="collapsed = !collapsed"
        />
        <h1 style="margin: 0 16px; font-size: 18px; font-weight: 600">
          {{ route.meta.title || '犀数工场' }}
        </h1>
        <div style="margin-left: auto; font-size: 14px; color: var(--ant-text-color-secondary, #666)">
          管理员
        </div>
      </a-layout-header>
      <a-layout-content style="margin: 24px; padding: 24px; background: var(--ant-body-bg, #fff); border-radius: 8px; min-height: 280px; overflow: auto">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
