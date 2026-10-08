<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { api, toApiError } from '@/api/http'
import AppField from '@/components/AppField.vue'
import PageHeader from '@/components/PageHeader.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import SchemaForm from '@/components/SchemaForm.vue'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import type { FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
const notify = useNotify()

onMounted(() => lookups.ensure('branches', 'regions', 'centers'))

const fileField: FieldDef = { name: 'file', label: 'ملف Excel', type: 'file', accept: '.xlsx,.xls', required: true, span: 2 }

// ── استيراد بسيط إلى حلقة ─────────────────────────────────────────────
const simple = ref<Row>({ file: null, halaqa_id: null })
const simpleErrors = ref<Record<string, string>>({})
const simpleLoading = ref(false)

// ── استيراد مع العلاقات (مركز + حلقة) ─────────────────────────────────
const related = ref<Row>({ file: null, branch_id: null, region_id: null, center_id: null, halaqa_id: null })
const relatedErrors = ref<Record<string, string>>({})
const relatedLoading = ref(false)
const failedRows = ref<Row[]>([])

const locationFields: FieldDef[] = [
  { name: 'branch_id', label: 'الفرع', type: 'select', options: () => lookups.lists.branches, resets: ['region_id', 'center_id', 'halaqa_id'] },
  { name: 'region_id', label: 'المنطقة', type: 'select', options: (m) => lookups.regionsOf(m.branch_id), resets: ['center_id', 'halaqa_id'] },
  {
    name: 'center_id',
    label: 'المركز',
    type: 'select',
    options: (m) => (m.region_id ? lookups.centersOf(m.region_id) : []),
    required: true,
    resets: ['halaqa_id'],
    span: 2,
  },
]

const failedColumns = computed(() => {
  const keys = new Set<string>()
  failedRows.value.forEach((row) => Object.keys(row ?? {}).forEach((key) => keys.add(key)))
  return [...keys]
})

const cell = (value: unknown) =>
  value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)

function flatten(errors: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0]]))
}

async function importSimple() {
  simpleLoading.value = true
  simpleErrors.value = {}
  try {
    const res = await api.upload('students/import', simple.value)
    notify.success(res.message)
    simple.value = { file: null, halaqa_id: null }
  } catch (err) {
    const apiError = toApiError(err)
    simpleErrors.value = flatten(apiError.errors)
    notify.error(apiError)
  } finally {
    simpleLoading.value = false
  }
}

async function importRelated() {
  relatedLoading.value = true
  relatedErrors.value = {}
  failedRows.value = []
  try {
    const { file, center_id, halaqa_id } = related.value
    const res = await api.upload('students/import-with-relations', { file, center_id, halaqa_id })
    notify.success(res.message)
  } catch (err) {
    const apiError = toApiError(err)
    relatedErrors.value = flatten(apiError.errors)
    failedRows.value = Array.isArray(apiError.data?.failed_rows) ? apiError.data.failed_rows : []
    notify.error(apiError)
  } finally {
    relatedLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl">
    <PageHeader title="استيراد الطلاب" subtitle="استيراد بيانات الطلاب من ملفات Excel" back="/students" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <form class="bg-white rounded-xl border border-surface-200 p-5 flex flex-col gap-4" @submit.prevent="importSimple">
        <div>
          <h2 class="font-semibold text-surface-900">استيراد إلى حلقة</h2>
          <p class="text-sm text-surface-500 mt-1">يضيف الطلاب الموجودين في الملف إلى الحلقة المحددة.</p>
        </div>
        <AppField label="الحلقة" required :error="simpleErrors.halaqa_id">
          <RemoteSelect v-model="simple.halaqa_id" endpoint="halaqas" option-label="name" :invalid="!!simpleErrors.halaqa_id" />
        </AppField>
        <SchemaForm :key="String(simple.file === null)" v-model="simple" :fields="[fileField]" :errors="simpleErrors" />
        <div class="flex justify-end">
          <Button type="submit" label="استيراد" icon="pi pi-upload" :loading="simpleLoading" :disabled="!simple.file || !simple.halaqa_id" />
        </div>
      </form>

      <form class="bg-white rounded-xl border border-surface-200 p-5 flex flex-col gap-4" @submit.prevent="importRelated">
        <div>
          <h2 class="font-semibold text-surface-900">استيراد مع العلاقات</h2>
          <p class="text-sm text-surface-500 mt-1">يربط الطلاب بمسجد المركز والحلقة المحددة، ويُظهر الصفوف التي تعذّر استيرادها.</p>
        </div>
        <SchemaForm v-model="related" :fields="locationFields" :errors="relatedErrors" />
        <AppField label="الحلقة" required :error="relatedErrors.halaqa_id">
          <RemoteSelect
            v-model="related.halaqa_id"
            endpoint="halaqas"
            :params="{ center_id: related.center_id }"
            option-label="name"
            :disabled="!related.center_id"
            :invalid="!!relatedErrors.halaqa_id"
          />
        </AppField>
        <SchemaForm v-model="related" :fields="[fileField]" :errors="relatedErrors" />
        <div class="flex justify-end">
          <Button
            type="submit"
            label="استيراد"
            icon="pi pi-upload"
            :loading="relatedLoading"
            :disabled="!related.file || !related.center_id || !related.halaqa_id"
          />
        </div>
      </form>
    </div>

    <div v-if="failedRows.length" class="bg-white rounded-xl border border-red-200 p-5 mt-5">
      <Message severity="error" :closable="false" class="mb-4">
        تعذّر استيراد {{ failedRows.length }} صفاً — راجع التفاصيل أدناه ثم أعد المحاولة.
      </Message>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-start border-b border-surface-200">
              <th v-for="key in failedColumns" :key="key" class="p-2 text-start font-semibold whitespace-nowrap">{{ key }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in failedRows" :key="index" class="border-b border-surface-100">
              <td v-for="key in failedColumns" :key="key" class="p-2 align-top">{{ cell(row[key]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
