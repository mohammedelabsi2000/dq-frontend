<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import AppField from '@/components/AppField.vue'
import { toApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ login: '', password: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  message.value = ''
  errors.value = {}
  try {
    await auth.login(form.login.trim(), form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (err) {
    const apiError = toApiError(err)
    message.value = apiError.message
    for (const [field, messages] of Object.entries(apiError.errors)) {
      errors.value[field] = messages[0]
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-surface-50">
    <div class="hidden lg:flex flex-col justify-between bg-primary-700 text-white p-12">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 grid place-items-center rounded-xl bg-white/15">
          <i class="pi pi-book text-xl" />
        </div>
        <span class="text-lg font-bold">نظام التحفيظ</span>
      </div>
      <div>
        <h2 class="text-3xl font-bold leading-relaxed mb-4">إدارة حلقات التحفيظ والطلاب والخطط الدراسية</h2>
        <p class="text-primary-100 leading-loose">
          متابعة الحلقات والطلاب، تسجيل الإنجاز اليومي، إدارة الخطط والمستويات، الكفالات وطلبات الاعتماد — في مكان واحد.
        </p>
      </div>
      <p class="text-sm text-primary-200">دار القرآن الكريم</p>
    </div>

    <div class="flex items-center justify-center p-6">
      <form class="w-full max-w-sm bg-white rounded-2xl border border-surface-200 p-8 shadow-sm" @submit.prevent="submit">
        <h1 class="text-2xl font-bold text-surface-900 mb-1">تسجيل الدخول</h1>
        <p class="text-sm text-surface-500 mb-6">أدخل رقم الهوية وكلمة المرور للمتابعة</p>

        <Message v-if="message" severity="error" class="mb-4" :closable="false">{{ message }}</Message>

        <div class="flex flex-col gap-4">
          <AppField label="رقم الهوية" :error="errors.login" required>
            <InputText
              v-model="form.login"
              fluid
              autofocus
              inputmode="numeric"
              autocomplete="username"
              :invalid="!!errors.login"
              placeholder="رقم الهوية (9 أرقام)"
            />
          </AppField>

          <AppField label="كلمة المرور" :error="errors.password" required>
            <Password
              v-model="form.password"
              :feedback="false"
              toggle-mask
              fluid
              :invalid="!!errors.password"
              :input-props="{ autocomplete: 'current-password' }"
            />
          </AppField>

          <Button
            type="submit"
            label="دخول"
            icon="pi pi-sign-in"
            :loading="loading"
            :disabled="!form.login || !form.password"
            class="mt-2"
          />
        </div>
      </form>
    </div>
  </div>
</template>
