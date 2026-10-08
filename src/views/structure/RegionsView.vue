<script setup lang="ts">
import { onMounted } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
onMounted(() => lookups.ensure('branches'))

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم المنطقة' },
  { field: 'branch.name', header: 'الفرع' },
  { field: 'mosques_count', header: 'عدد المساجد' },
  { field: 'notes', header: 'ملاحظات' },
]

const branchField: FieldDef = {
  name: 'branch_id',
  label: 'الفرع',
  type: 'select',
  options: () => lookups.lists.branches,
}

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم المنطقة', required: true },
  { ...branchField, required: true },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const toForm = (row: Row) => ({ name: row.name, branch_id: row.branch?.id ?? null, notes: row.notes })
const refreshLookups = () => lookups.refresh('regions')
</script>

<template>
  <CrudPage
    title="المناطق"
    subtitle="المناطق التابعة للفروع"
    icon="pi pi-map"
    entity="منطقة"
    endpoint="regions"
    permission="regions"
    :base-params="{ with_branch: 1 }"
    :columns="columns"
    :fields="fields"
    :filters="[branchField]"
    :to-form="toForm"
    dialog-width="38rem"
    @saved="refreshLookups"
    @deleted="refreshLookups"
  />
</template>
