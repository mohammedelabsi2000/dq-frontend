<script setup lang="ts">
import { onMounted } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
onMounted(() => lookups.ensure('surahs'))

const columns: ColumnDef[] = [
  { field: 'sort_order', header: 'الترتيب', width: '6rem' },
  { field: 'name', header: 'اسم الجزء' },
  {
    field: 'start',
    header: 'البداية',
    value: (row) => `${lookups.surahName(row.start_surah_id) || row.start_surah_id} — آية ${row.start_aya}`,
  },
  {
    field: 'end',
    header: 'النهاية',
    value: (row) => `${lookups.surahName(row.end_surah_id) || row.end_surah_id} — آية ${row.end_aya}`,
  },
]

const surahOptions = () => lookups.lists.surahs
const ayaHelp = (surahId?: number | null) => {
  const count = lookups.versesCount(surahId)
  return count ? `من 1 إلى ${count}` : undefined
}

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم الجزء', required: true },
  { name: 'sort_order', label: 'الترتيب', type: 'number', required: true, min: 0 },
  { name: 'start_surah_id', label: 'سورة البداية', type: 'select', options: surahOptions, optionLabel: 'name_ar', required: true },
  { name: 'start_aya', label: 'آية البداية', type: 'number', required: true, min: 1 },
  { name: 'end_surah_id', label: 'سورة النهاية', type: 'select', options: surahOptions, optionLabel: 'name_ar', required: true },
  { name: 'end_aya', label: 'آية النهاية', type: 'number', required: true, min: 1 },
]

const toForm = (row: Row) => ({
  name: row.name,
  sort_order: row.sort_order,
  start_surah_id: row.start_surah_id,
  start_aya: row.start_aya,
  end_surah_id: row.end_surah_id,
  end_aya: row.end_aya,
})

const refreshLookups = () => lookups.refresh('customJuz')
</script>

<template>
  <CrudPage
    title="الأجزاء المخصصة"
    subtitle="تقسيمات مخصصة للقرآن تُستخدم في مساقات الحفظ"
    icon="pi pi-clone"
    entity="جزء"
    endpoint="custom-juz"
    permission="custom_juzs"
    order-by="asc"
    :columns="columns"
    :fields="fields"
    :to-form="toForm"
    @saved="refreshLookups"
    @deleted="refreshLookups"
  >
    <template #form-bottom="{ model }">
      <p v-if="ayaHelp(model.start_surah_id) || ayaHelp(model.end_surah_id)" class="text-xs text-surface-500">
        <span v-if="ayaHelp(model.start_surah_id)">آيات سورة البداية: {{ ayaHelp(model.start_surah_id) }}</span>
        <span v-if="ayaHelp(model.end_surah_id)"> · آيات سورة النهاية: {{ ayaHelp(model.end_surah_id) }}</span>
      </p>
    </template>
  </CrudPage>
</template>
