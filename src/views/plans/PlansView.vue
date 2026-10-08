<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { api } from '@/api/http'
import CrudPage from '@/components/CrudPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { PERIOD_UNITS, PLAN_TYPES } from '@/utils/options'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const auth = useAuthStore()
const lookups = useLookupsStore()
const notify = useNotify()
const router = useRouter()
const crud = ref<InstanceType<typeof CrudPage> | null>(null)

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم الخطة' },
  { field: 'type_label', header: 'النوع', type: 'tag', severity: (row) => (row.type === 'main' ? 'info' : 'secondary') },
  { field: 'period', header: 'المدة', value: (row) => `${row.period} ${row.period_unit_label ?? ''}` },
  {
    field: 'age',
    header: 'الفئة العمرية',
    value: (row) => (row.age_from != null || row.age_to != null ? `${row.age_from ?? '…'} - ${row.age_to ?? '…'}` : null),
  },
  { field: 'levels_count', header: 'المستويات' },
  { field: 'is_active', header: 'فعّالة', type: 'bool' },
]

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم الخطة', required: true },
  { name: 'type', label: 'نوع الخطة', type: 'select', options: PLAN_TYPES, optionLabel: 'label', optionValue: 'value', required: true, default: 'main' },
  { name: 'period', label: 'المدة', type: 'number', required: true, min: 1 },
  { name: 'period_unit', label: 'وحدة المدة', type: 'select', options: PERIOD_UNITS, optionLabel: 'label', optionValue: 'value', required: true, default: 'year' },
  { name: 'min_period', label: 'أقل مدة', type: 'number', min: 1 },
  { name: 'max_period', label: 'أقصى مدة', type: 'number', min: 1 },
  { name: 'age_from', label: 'العمر من', type: 'number', min: 0 },
  { name: 'age_to', label: 'العمر إلى', type: 'number', min: 0 },
  { name: 'tolerance', label: 'هامش التسامح', type: 'number', min: 0 },
  { name: 'is_active', label: 'الخطة فعّالة', type: 'switch', default: true },
  { name: 'description', label: 'الوصف', type: 'textarea', span: 2 },
]

async function toggleActive(row: Row) {
  try {
    const res = await api.post(`plan/plans/${row.id}/toggle-active`)
    notify.success(res.message)
    await crud.value?.reload()
  } catch (err) {
    notify.error(err)
  }
}

const refreshLookups = () => lookups.refresh('plans')
</script>

<template>
  <CrudPage
    ref="crud"
    title="الخطط الدراسية"
    subtitle="الخطط ومستوياتها ومساراتها"
    icon="pi pi-sitemap"
    entity="خطة"
    endpoint="plan/plans"
    permission="plans"
    :columns="columns"
    :fields="fields"
    @saved="refreshLookups"
    @deleted="refreshLookups"
  >
    <template #cell-name="{ row }">
      <RouterLink :to="`/plans/${row.id}`" class="font-semibold text-primary-700 hover:underline">{{ row.name }}</RouterLink>
    </template>

    <template #actions="{ row }">
      <Button
        v-tooltip.top="'المستويات والطلاب'"
        icon="pi pi-eye"
        severity="secondary"
        text
        rounded
        aria-label="عرض"
        @click="router.push(`/plans/${row.id}`)"
      />
      <Button
        v-if="auth.can('plans.toggle_active')"
        v-tooltip.top="row.is_active ? 'تعطيل' : 'تفعيل'"
        :icon="row.is_active ? 'pi pi-ban' : 'pi pi-check-circle'"
        :severity="row.is_active ? 'warn' : 'success'"
        text
        rounded
        :aria-label="row.is_active ? 'تعطيل' : 'تفعيل'"
        @click="toggleActive(row)"
      />
    </template>
  </CrudPage>
</template>
