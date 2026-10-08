<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import { api } from '@/api/http'
import { useNotify } from '@/composables/useNotify'
import type { Row } from '@/types/schema'

/** استعلام السجل المدني برقم الهوية (POST id-query) وتعبئة الاسم وتاريخ الميلاد */
const props = defineProps<{ identity?: string | null }>()
const emit = defineEmits<{ found: [person: Row] }>()

const notify = useNotify()
const loading = ref(false)

async function lookup() {
  if (!props.identity || !/^\d{9}$/.test(props.identity)) {
    notify.warn('أدخل رقم هوية صحيحاً من 9 أرقام أولاً')
    return
  }
  loading.value = true
  try {
    const res = await api.post<Row>('id-query', { id: props.identity })
    emit('found', res.data)
    notify.success('تم جلب البيانات من السجل المدني')
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-between gap-3 rounded-lg bg-surface-50 border border-surface-200 px-4 py-2.5">
    <span class="text-sm text-surface-600">أدخل رقم الهوية ثم اضغط استعلام لتعبئة البيانات تلقائياً</span>
    <Button
      type="button"
      label="استعلام"
      icon="pi pi-search"
      size="small"
      severity="secondary"
      outlined
      :loading="loading"
      @click="lookup"
    />
  </div>
</template>
