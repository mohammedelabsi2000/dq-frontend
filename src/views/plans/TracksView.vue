<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import type { ColumnDef, FieldDef } from '@/types/schema'

const lookups = useLookupsStore()

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم المسار' },
  { field: 'notes', header: 'ملاحظات' },
]

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم المسار', required: true, span: 2 },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const refreshLookups = () => lookups.refresh('tracks')
</script>

<template>
  <CrudPage
    title="المسارات"
    subtitle="مسارات المستويات مثل: حفظ وتثبيت، معرفي، قيمي"
    icon="pi pi-directions"
    entity="مسار"
    endpoint="plan/tracks"
    permission="tracks"
    :columns="columns"
    :fields="fields"
    dialog-width="32rem"
    @saved="refreshLookups"
    @deleted="refreshLookups"
  />
</template>
