<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import type { ColumnDef, FieldDef } from '@/types/schema'

const lookups = useLookupsStore()

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم الفرع' },
  { field: 'regions_count', header: 'عدد المناطق' },
  { field: 'notes', header: 'ملاحظات' },
  { field: 'created_at', header: 'تاريخ الإنشاء', type: 'date' },
]

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم الفرع', required: true, span: 2 },
  {
    name: 'standard_branch_id',
    label: 'رقم الفرع في النظام المعياري',
    type: 'number',
    span: 2,
    help: 'اختياري — للربط مع النظام الخارجي',
  },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const refreshLookups = () => lookups.refresh('branches')
</script>

<template>
  <CrudPage
    title="الفروع"
    subtitle="المستوى الأعلى في الهيكل الإداري"
    icon="pi pi-building"
    entity="فرع"
    endpoint="branches"
    permission="branches"
    :columns="columns"
    :fields="fields"
    dialog-width="34rem"
    @saved="refreshLookups"
    @deleted="refreshLookups"
  />
</template>
