<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { api } from '@/api/http'
import PageHeader from '@/components/PageHeader.vue'
import SchemaForm from '@/components/SchemaForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useSubmit } from '@/composables/useSubmit'
import { dash } from '@/utils/format'
import type { FieldDef, Row } from '@/types/schema'

const auth = useAuthStore()
const { saving, errors, submit } = useSubmit()

const emptyForm = (): Row => ({ old_password: null, new_password: null, new_password_confirmation: null })
const form = ref<Row>(emptyForm())

const fields: FieldDef[] = [
  { name: 'old_password', label: 'كلمة المرور الحالية', type: 'password', required: true, span: 2 },
  { name: 'new_password', label: 'كلمة المرور الجديدة', type: 'password', required: true },
  { name: 'new_password_confirmation', label: 'تأكيد كلمة المرور الجديدة', type: 'password', required: true },
]

async function changePassword() {
  const res = await submit(() => api.post('change-password', form.value))
  if (res) form.value = emptyForm()
}

const info = [
  { label: 'الاسم الكامل', value: () => auth.user?.full_name },
  { label: 'رقم الهوية', value: () => auth.user?.identity },
  { label: 'البريد الإلكتروني', value: () => auth.user?.email },
  { label: 'الجوال', value: () => auth.user?.phone },
  { label: 'الجنس', value: () => auth.user?.gender },
  { label: 'المسجد', value: () => auth.user?.mosque?.name },
]
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader title="الملف الشخصي" icon="pi pi-user" />

    <div class="bg-white rounded-xl border border-surface-200 p-5 mb-5">
      <h2 class="font-semibold text-surface-800 mb-4">بياناتي</h2>
      <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="item in info" :key="item.label">
          <dt class="text-xs text-surface-500 mb-1">{{ item.label }}</dt>
          <dd class="font-medium text-surface-900">{{ dash(item.value()) }}</dd>
        </div>
      </dl>
      <div class="mt-5 flex flex-wrap items-center gap-2">
        <span class="text-xs text-surface-500">الأدوار:</span>
        <Tag v-for="role in auth.roles" :key="role" :value="role" />
        <span v-if="!auth.roles.length" class="text-sm text-surface-500">لا يوجد</span>
      </div>
      <div v-if="auth.user?.user_scopes?.length" class="mt-3 flex flex-wrap items-center gap-2">
        <span class="text-xs text-surface-500">النطاقات:</span>
        <Tag
          v-for="scope in auth.user.user_scopes"
          :key="`${scope.type}-${scope.id}`"
          :value="scope.name"
          severity="secondary"
        />
      </div>
    </div>

    <form class="bg-white rounded-xl border border-surface-200 p-5" @submit.prevent="changePassword">
      <h2 class="font-semibold text-surface-800 mb-4">تغيير كلمة المرور</h2>
      <SchemaForm v-model="form" :fields="fields" :errors="errors" />
      <div class="flex justify-end mt-5">
        <Button type="submit" label="تغيير كلمة المرور" icon="pi pi-lock" :loading="saving" />
      </div>
    </form>
  </div>
</template>
