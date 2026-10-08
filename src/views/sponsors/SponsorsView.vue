<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import { SPONSORSHIP_TYPES } from '@/utils/options'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
const router = useRouter()

onMounted(() => lookups.ensureConstants('sponsor_student_type'))

const isOtherType = (model: Row) =>
  lookups.constantsOf('sponsor_student_type').find((c) => c.id === model.student_type_id)?.name === 'أخرى'

const columns: ColumnDef[] = [
  { field: 'name', header: 'الكفيل' },
  { field: 'project_number', header: 'رقم المشروع' },
  { field: 'follow_up_entity', header: 'جهة المتابعة' },
  { field: 'sponsorship_type', header: 'نوع الكفالة', type: 'tag' },
  { field: 'start_date', header: 'البداية', type: 'date' },
  { field: 'end_date', header: 'النهاية', type: 'date' },
  {
    field: 'male',
    header: 'حلقات الذكور (متبقي/مطلوب)',
    value: (row) => `${row.remaining_capacity_male ?? '—'} / ${row.required_halaqat_male}`,
  },
  {
    field: 'female',
    header: 'حلقات الإناث (متبقي/مطلوب)',
    value: (row) => `${row.remaining_capacity_female ?? '—'} / ${row.required_halaqat_female}`,
  },
  { field: 'is_active', header: 'فعّال', type: 'bool' },
]

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم الكفيل', required: true },
  { name: 'project_number', label: 'رقم المشروع' },
  { name: 'follow_up_entity', label: 'جهة المتابعة', required: true },
  { name: 'sponsorship_type', label: 'نوع الكفالة', type: 'select', options: SPONSORSHIP_TYPES, optionLabel: 'label', optionValue: 'value', required: true, default: 'دائمة' },
  { name: 'start_date', label: 'تاريخ البداية', type: 'date', required: true },
  { name: 'end_date', label: 'تاريخ النهاية', type: 'date' },
  { name: 'required_halaqat_male', label: 'عدد حلقات الذكور المطلوبة', type: 'number', required: true, min: 0, default: 0 },
  { name: 'required_halaqat_female', label: 'عدد حلقات الإناث المطلوبة', type: 'number', required: true, min: 0, default: 0 },
  { name: 'students_per_halaqa_male', label: 'طلاب كل حلقة (ذكور)', type: 'number', min: 0 },
  { name: 'students_per_halaqa_female', label: 'طالبات كل حلقة (إناث)', type: 'number', min: 0 },
  { name: 'student_type_id', label: 'نوع الطلاب', type: 'select', options: () => lookups.constantsOf('sponsor_student_type'), required: true },
  { name: 'student_type_other_note', label: 'تحديد نوع الطلاب', visible: isOtherType, required: true },
  { name: 'is_active', label: 'الكفيل فعّال', type: 'switch', default: true },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]
</script>

<template>
  <CrudPage
    title="الكفلاء"
    subtitle="الجهات الكافلة للحلقات وحصصها"
    icon="pi pi-heart"
    entity="كفيل"
    endpoint="sponsors"
    permission="sponsors"
    search-placeholder="بحث بالاسم أو رقم المشروع..."
    :columns="columns"
    :fields="fields"
    dialog-width="50rem"
  >
    <template #cell-name="{ row }">
      <RouterLink :to="`/sponsors/${row.id}`" class="font-semibold text-primary-700 hover:underline">{{ row.name }}</RouterLink>
    </template>
    <template #actions="{ row }">
      <Button
        v-tooltip.top="'الحصص والحلقات'"
        icon="pi pi-eye"
        severity="secondary"
        text
        rounded
        aria-label="عرض"
        @click="router.push(`/sponsors/${row.id}`)"
      />
    </template>
  </CrudPage>
</template>
