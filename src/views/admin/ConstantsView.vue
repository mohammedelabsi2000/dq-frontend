<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useLookupsStore } from '@/stores/lookups'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
const crud = ref<InstanceType<typeof CrudPage> | null>(null)
const selectedTypeId = ref<number | null>(null)

onMounted(async () => {
  await lookups.ensure('constantTypes')
  selectedTypeId.value = lookups.lists.constantTypes[0]?.id ?? null
})

const selectedType = computed(() => lookups.lists.constantTypes.find((type) => type.id === selectedTypeId.value) ?? null)
const typeLabel = (type: Row) => type.description || type.name

const columns: ColumnDef[] = [
  { field: 'name', header: 'الاسم' },
  { field: 'const_key', header: 'المفتاح' },
  { field: 'parent', header: 'الأب', value: (row) => row.parent?.name },
  { field: 'is_active', header: 'فعّال', type: 'bool' },
  { field: 'notes', header: 'ملاحظات' },
]

// الأب يُختار من ثوابت نفس النوع
const siblings = () => (crud.value?.rows ?? []).filter((row: Row) => row.constant_type_id === selectedTypeId.value)

const fields: FieldDef[] = [
  { name: 'name', label: 'الاسم', required: true },
  { name: 'parent_id', label: 'الثابت الأب', type: 'select', options: siblings, help: 'اختياري — للثوابت الهرمية' },
  { name: 'is_active', label: 'فعّال', type: 'switch', default: true },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const toForm = (row: Row): Row => ({
  name: row.name,
  parent_id: row.parent?.id ?? null,
  is_active: !!row.is_active,
  notes: row.notes,
})

const toPayload = (model: Row): Row => ({ ...model, constant_type_id: selectedTypeId.value })
const rowFilter = (row: Row) => row.constant_type_id === selectedTypeId.value
</script>

<template>
  <div>
    <PageHeader title="الثوابت" subtitle="القوائم المرجعية المستخدمة في النماذج" icon="pi pi-list" />

    <div class="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-5">
      <aside class="bg-white rounded-xl border border-surface-200 p-2 h-fit max-h-[75vh] overflow-y-auto">
        <button
          v-for="type in lookups.lists.constantTypes"
          :key="type.id"
          type="button"
          class="w-full text-start px-3 py-2 rounded-lg text-sm transition"
          :class="
            type.id === selectedTypeId ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-surface-700 hover:bg-surface-100'
          "
          @click="selectedTypeId = type.id"
        >
          {{ typeLabel(type) }}
          <span class="block text-xs text-surface-400 font-normal" dir="ltr">{{ type.name }}</span>
        </button>
        <p v-if="!lookups.lists.constantTypes.length" class="p-3 text-sm text-surface-500">لا توجد أنواع ثوابت</p>
      </aside>

      <CrudPage
        v-if="selectedType"
        ref="crud"
        embedded
        :title="typeLabel(selectedType)"
        entity="ثابت"
        endpoint="constants"
        permission="constants"
        :base-params="{ with_inactive: 1 }"
        :row-filter="rowFilter"
        :columns="columns"
        :fields="fields"
        :to-form="toForm"
        :to-payload="toPayload"
        dialog-width="36rem"
        @saved="lookups.refreshConstants()"
        @deleted="lookups.refreshConstants()"
      />
    </div>
  </div>
</template>
