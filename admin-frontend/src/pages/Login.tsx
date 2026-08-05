import { defineComponent, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { login } from '@/lib/api'
import { Button, message } from 'ant-design-vue'
import bannerUrl from '@/assets/banner.png'
import logoUrl from '@/assets/logo.png'

export default defineComponent({
  setup() {
    const router = useRouter()
    const auth = useAuthStore()
    const form = reactive({ username: 'admin', password: '' })
    const loading = ref(false)
    const showPwd = ref(false)

    async function handleSubmit() {
      if (!form.username || !form.password) {
        message.error('请输入用户名和密码')
        return
      }
      loading.value = true
      try {
        const data = await login(form.username, form.password)
        auth.setAuth(data.access_token, { id: 0, username: form.username, role: 'admin' })
        message.success('登录成功')
        router.push('/dashboard')
      } catch (e: any) {
        message.error(e.message || '登录失败')
      } finally {
        loading.value = false
      }
    }

    function onKeyEnter(e: KeyboardEvent) {
      if (e.key === 'Enter') handleSubmit()
    }

    return () => (
      <div class="login-bg" style={{ backgroundImage: `url(${bannerUrl})` }}>
        <div id="login-form">
          {/* Logo + Title */}
          <img
            src={logoUrl}
            alt="犀数工场"
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'contain',
              borderRadius: '12px',
              marginBottom: '14px',
              animation: 'reloadA 0.8s ease-out forwards',
              opacity: 0,
              animationDelay: '0.1s',
            }}
          />
          <h1>犀数工场</h1>
          <p class="login-subtitle">AI+制造产业赋能中心管理后台</p>

          {/* Username */}
          <div class="input-wrap in-1">
            <input
              type="text"
              placeholder="请输入用户名"
              value={form.username}
              onInput={(e: Event) => { form.username = (e.target as HTMLInputElement).value }}
              onKeydown={onKeyEnter}
              autocomplete="username"
            />
            {/* User icon */}
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width:'22px',height:'22px',marginRight:'20px',flexShrink:0 }} viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          {/* Password */}
          <div class="input-wrap in-2">
            <input
              type={showPwd.value ? 'text' : 'password'}
              placeholder="请输入密码"
              value={form.password}
              onInput={(e: Event) => { form.password = (e.target as HTMLInputElement).value }}
              onKeydown={onKeyEnter}
              autocomplete="current-password"
            />
            {/* Eye toggle icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ width:'22px',height:'22px',marginRight:'20px',flexShrink:0,cursor:'pointer' }}
              viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              onClick={() => { showPwd.value = !showPwd.value }}
            >
              {showPwd.value ? (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </>
              ) : (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </>
              )}
            </svg>
          </div>

          {/* Submit */}
          <div class="login-btn-wrap">
            <Button
              class="login-btn"
              type="primary"
              loading={loading.value}
              onClick={handleSubmit}
              block
            >
              登 录
            </Button>
          </div>
        </div>
      </div>
    )
  },
})
