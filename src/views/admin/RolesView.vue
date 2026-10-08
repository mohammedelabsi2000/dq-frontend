<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Checkbox from 'primevue/checkbox'
import ToggleSwitch from 'primevue/toggleswitch'
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
onMounted(() => lookups.ensure('abilities'))

/** أسماء مجموعات الصلاحيات حسب بادئة اسم الصلاحية (branches.show => branches) */
const GROUP_LABELS: Record<string, string> = {
  branches: 'الفروع',
  regions: 'المناطق',
  centers: 'المراكز',
  mosques: 'المساجد',
  sponsors: 'الكفلاء',
  halaqas: 'الحلقات',
  halaqa_students: 'طلاب الحلقات',
  students: 'الطلاب',
  users: 'المستخدمون',
  roles: 'الأدوار',
  approvals: 'طلبات الاعتماد',
  settings: 'الإعدادات',
  constants: 'الثوابت',
  custom_juzs: 'الأجزاء المخصصة',
  plans: 'الخطط',
  tracks: 'المسارات',
  subjects: 'المساقات',
  levels: 'المستويات',
  level_track_subjects: 'مساقات المسارات',
  daily_achievements: 'الإنجاز اليومي',
  gender_visibility: 'عام',
}

const groups = computed(() => {
  const map = new Map<string, Row[]>()
  for (const ability of lookups.lists.abilities) {
    const key = String(ability.ability).split('.')[0]
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ability)
  }
  return [...map.entries()].map(([key, items]) => ({ key, label: GROUP_LABELS[key] ?? key, items }))
})

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم الدور' },
  { field: 'permissions_count', header: 'عدد الصلاحيات', value: (row) => row.permissions?.length ?? 0 },
]

const fields: FieldDef[] = [{ name: 'name', label: 'اسم الدور', required: true, span: 2 }]

const toForm = (row: Row): Row => ({
  name: row.name,
  give_all: false,
  abilities: (row.permissions ?? []).map((permission: Row) => permission.id),
})

const toPayload = (model: Row): Row => ({
  name: model.name,
  give_all: !!model.give_all,
  abilities: model.abilities ?? [],
})

function groupState(model: Row, items: Row[]) {
  const selected = new Set<number>(model.abilities ?? [])
  const count = items.filter((item) => selected.has(item.id)).length
  return { all: count === items.length, some: count > 0 && count < items.length }
}

function toggleGroup(model: Row, items: Row[], checked: boolean) {
  const ids = items.map((item) => item.id)
  const rest = (model.abilities ?? []).filter((id: number) => !ids.includes(id))
  model.abilities = checked ? [...rest, ...ids] : rest
}
</script>

<template>
  <CrudPage
    title="الأدوار والصلاحيات"
    subtitle="تعريف الأدوار وما تسمح به من صلاحيات"
    icon="pi pi-shield"
    entity="دور"
    endpoint="roles"
    permission="roles"
    :columns="columns"
    :fields="fields"
    :to-form="toForm"
    :to-payload="toPayload"
    dialog-width="60rem"
    @saved="lookups.refresh('roles')"
    @deleted="lookups.refresh('roles')"
  >
    <template #form-bottom="{ model, errors }">
      <label class="flex items-center gap-3 cursor-pointer">
        <ToggleSwitch v-model="model.give_all" />
        <span class="text-sm font-medium text-surface-700">منح جميع الصلاحيات</span>
      </label>
      <small v-if="errors.abilities" class="field-error">{{ errors.abilities }}</small>

      <div v-if="!model.give_all" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pe-1">
        <div v-for="group in groups" :key="group.key" class="border border-surface-200 rounded-lg p-3">
          <label class="flex items-center gap-2 font-semibold text-surface-800 mb-2 cursor-pointer">
            <Checkbox
              binary
              :model-value="groupState(model, group.items).all"
              :indeterminate="groupState(model, group.items).some"
              @update:model-value="toggleGroup(model, group.items, $event)"
            />
            {{ group.label }}
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ps-1">
            <label v-for="ability in group.items" :key="ability.id" class="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
              <Checkbox v-model="model.abilities" :value="ability.id" />
              {{ ability.title ?? ability.ability }}
            </label>
          </div>
        </div>
      </div>
    </template>
  </CrudPage>
</template>
