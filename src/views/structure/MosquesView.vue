<script setup lang="ts">
import { onMounted } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
onMounted(() => lookups.ensure('branches', 'regions'))

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم المسجد' },
  { field: 'region.name', header: 'المنطقة' },
  { field: 'region.branch.name', header: 'الفرع' },
  { field: 'centers_count', header: 'عدد المراكز' },
  { field: 'notes', header: 'ملاحظات' },
]

const branchField: FieldDef = {
  name: 'branch_id',
  label: 'الفرع',
  type: 'select',
  options: () => lookups.lists.branches,
  resets: ['region_id'],
}
const regionField: FieldDef = {
  name: 'region_id',
  label: 'المنطقة',
  type: 'select',
  options: (model) => lookups.regionsOf(model.branch_id),
}

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم المسجد', required: true, span: 2 },
  branchField,
  { ...regionField, required: true },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
  {
    name: 'create_center',
    label: 'إنشاء مركز بنفس الاسم تابع لهذا المسجد',
    type: 'switch',
    span: 2,
  },
]

const toForm = (row: Row) => ({
  name: row.name,
  branch_id: row.region?.branch?.id ?? null,
  region_id: row.region?.id ?? null,
  notes: row.notes,
  create_center: false,
})

// branch_id للفلترة المتتابعة فقط ولا يُرسل للخادم
const toPayload = ({ branch_id: _branch, ...payload }: Row) => payload

const refreshLookups = () => lookups.refresh('mosques', 'centers')
</script>

<template>
  <CrudPage
    title="المساجد"
    icon="pi pi-map-marker"
    entity="مسجد"
    endpoint="mosques"
    permission="mosques"
    :columns="columns"
    :fields="fields"
    :filters="[branchField, regionField]"
    :to-form="toForm"
    :to-payload="toPayload"
    dialog-width="38rem"
    @saved="refreshLookups"
    @deleted="refreshLookups"
  />
</template>
