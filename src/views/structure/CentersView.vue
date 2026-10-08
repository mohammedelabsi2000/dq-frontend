<script setup lang="ts">
import { onMounted } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import { GENDERS } from '@/utils/options'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
onMounted(() => lookups.ensure('branches', 'regions', 'mosques'))

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم المركز' },
  { field: 'gender', header: 'الجنس', type: 'tag' },
  { field: 'mosque.name', header: 'المسجد' },
  { field: 'region.name', header: 'المنطقة' },
  { field: 'region.branch.name', header: 'الفرع' },
  { field: 'notes', header: 'ملاحظات' },
]

const branchField: FieldDef = {
  name: 'branch_id',
  label: 'الفرع',
  type: 'select',
  options: () => lookups.lists.branches,
  resets: ['region_id', 'mosque_id'],
}
const regionField: FieldDef = {
  name: 'region_id',
  label: 'المنطقة',
  type: 'select',
  options: (model) => lookups.regionsOf(model.branch_id),
  resets: ['mosque_id'],
}

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم المركز', required: true },
  { name: 'gender', label: 'الجنس', type: 'select', options: GENDERS, optionLabel: 'label', optionValue: 'value', required: true },
  branchField,
  { ...regionField, required: true },
  {
    name: 'mosque_id',
    label: 'المسجد',
    type: 'select',
    options: (model) => (model.region_id ? lookups.mosquesOf(model.region_id) : []),
    span: 2,
    help: 'اختياري — اختر المنطقة أولاً',
  },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const toForm = (row: Row) => ({
  name: row.name,
  gender: row.gender,
  branch_id: row.region?.branch?.id ?? null,
  region_id: row.region?.id ?? null,
  mosque_id: row.mosque?.id ?? null,
  notes: row.notes,
})

const toPayload = ({ branch_id: _branch, ...payload }: Row) => payload
const refreshLookups = () => lookups.refresh('centers')
</script>

<template>
  <CrudPage
    title="المراكز"
    icon="pi pi-warehouse"
    entity="مركز"
    endpoint="centers"
    permission="centers"
    :base-params="{ with_relations: 1 }"
    :columns="columns"
    :fields="fields"
    :filters="[branchField, regionField]"
    :to-form="toForm"
    :to-payload="toPayload"
    @saved="refreshLookups"
    @deleted="refreshLookups"
  />
</template>
