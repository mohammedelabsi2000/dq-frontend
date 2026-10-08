<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ToggleSwitch from 'primevue/toggleswitch'
import { api } from '@/api/http'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { dash } from '@/utils/format'
import type { Row } from '@/types/schema'

/** إعدادات الاعتماد التلقائي: GET/PUT settings + سجل الحركات */
const auth = useAuthStore()
const notify = useNotify()

const settings = ref<Record<string, { value: boolean; opened_at: string | null; closed_at: string | null }>>({})
const loading = ref(true)
const savingKey = ref<string | null>(null)

// المفاتيح تأتي من الخادم؛ التسمية تُستنتج من اسم المفتاح
function describe(key: string) {
  if (key.includes('halaqa')) {
    return { title: 'الاعتماد التلقائي للحلقات', text: 'عند التفعيل تُعتمد الحلقات الجديدة مباشرة دون المرور بطلبات الاعتماد.' }
  }
  if (key.includes('student')) {
    return { title: 'الاعتماد التلقائي للطلاب', text: 'عند التفعيل يُعتمد الطلاب الجدد مباشرة دون المرور بطلبات الاعتماد.' }
  }
  return { title: key, text: '' }
}

async function load() {
  try {
    settings.value = (await api.get('settings')).data ?? {}
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}

async function toggle(key: string, value: boolean) {
  savingKey.value = key
  try {
    const res = await api.put('settings', { [key]: value })
    settings.value = res.data ?? settings.value
    notify.success(res.message)
  } catch (err) {
    notify.error(err)
    await load()
  } finally {
    savingKey.value = null
  }
}

const historyDialog = ref(false)
const historyTitle = ref('')
const history = ref<Row[]>([])
const historyLoading = ref(false)

async function openHistory(key: string) {
  historyTitle.value = describe(key).title
  history.value = []
  historyDialog.value = true
  historyLoading.value = true
  try {
    history.value = (await api.get<Row[]>('settings/history', { key })).data ?? []
  } catch (err) {
    notify.error(err)
  } finally {
    historyLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-3xl">
    <PageHeader title="الإعدادات" subtitle="إعدادات الاعتماد التلقائي" icon="pi pi-cog" />

    <div v-if="loading" class="text-center py-16 text-surface-500"><i class="pi pi-spin pi-spinner text-3xl" /></div>

    <div v-for="(setting, key) in settings" :key="key" class="bg-white rounded-xl border border-surface-200 p-5 mb-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="font-semibold text-surface-900">{{ describe(String(key)).title }}</h2>
          <p class="text-sm text-surface-500 mt-1">{{ describe(String(key)).text }}</p>
        </div>
        <ToggleSwitch
          :model-value="setting.value"
          :disabled="!auth.can('settings.update') || savingKey === key"
          @update:model-value="toggle(String(key), $event)"
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-surface-100 text-xs text-surface-500">
        <span>آخر تفعيل: {{ dash(setting.opened_at) }} · آخر إيقاف: {{ dash(setting.closed_at) }}</span>
        <Button label="سجل الحركات" icon="pi pi-history" size="small" severity="secondary" text @click="openHistory(String(key))" />
      </div>
    </div>

    <Dialog v-model:visible="historyDialog" modal :header="`سجل: ${historyTitle}`" :style="{ width: '32rem' }" :breakpoints="{ '640px': '96vw' }">
      <div v-if="historyLoading" class="text-center py-8 text-surface-500"><i class="pi pi-spin pi-spinner text-2xl" /></div>
      <p v-else-if="!history.length" class="text-center py-8 text-surface-500">لا توجد حركات مسجلة</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-surface-200">
            <th class="p-2 text-start font-semibold">من</th>
            <th class="p-2 text-start font-semibold">إلى</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in history" :key="log.id" class="border-b border-surface-100">
            <td class="p-2" dir="ltr">{{ dash(log.start_dt) }}</td>
            <td class="p-2" dir="ltr">{{ log.end_dt ?? 'مستمر' }}</td>
          </tr>
        </tbody>
      </table>
    </Dialog>
  </div>
</template>
