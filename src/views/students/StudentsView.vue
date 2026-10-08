<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { api } from '@/api/http'
import AppField from '@/components/AppField.vue'
import CrudPage from '@/components/CrudPage.vue'
import IdentityLookup from '@/components/IdentityLookup.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import { useAuthStore } from '@/stores/auth'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { ageFrom } from '@/utils/format'
import { GENDERS, MEMORIZATION_DIRECTIONS } from '@/utils/options'
import { omitEmpty, without } from '@/utils/payload'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const auth = useAuthStore()
const lookups = useLookupsStore()
const notify = useNotify()
const router = useRouter()

const withTrashed = ref(false)

onMounted(() => {
  void lookups.ensure('branches', 'regions', 'mosques', 'surahs')
  void lookups.ensureConstants('marital_status', 'money_status', 'prefix_name', 'guardian_type')
})

const JUZ_OPTIONS = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `الجزء ${i + 1}` }))

const columns: ColumnDef[] = [
  { field: 'full_name', header: 'الاسم' },
  { field: 'identity', header: 'رقم الهوية' },
  { field: 'gender', header: 'الجنس', type: 'tag' },
  { field: 'age', header: 'العمر', value: (row) => ageFrom(row.dob) },
  { field: 'mosque', header: 'المسجد', value: (row) => row.mosque?.name },
  { field: 'halaqa', header: 'الحلقة الحالية', value: (row) => row.current_halaqa?.name },
  { field: 'phone', header: 'الجوال' },
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
const genderField: FieldDef = {
  name: 'gender',
  label: 'الجنس',
  type: 'select',
  options: GENDERS,
  optionLabel: 'label',
  optionValue: 'value',
}

const filters: FieldDef[] = [
  { ...branchField, resets: ['region_id'] },
  { ...regionField, resets: [] },
  genderField,
  { name: 'age_min', label: 'العمر من', type: 'number', min: 0 },
]

const constant = (name: string, label: string, type: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  name,
  label,
  type: 'select',
  options: () => lookups.constantsOf(type),
  ...extra,
})

const fields: FieldDef[] = [
  { name: 'identity', label: 'رقم الهوية', placeholder: '9 أرقام' },
  constant('prefix_name_id', 'اللقب', 'prefix_name'),
  { ...genderField, required: true },
  { name: 'fName', label: 'الاسم الأول', required: true },
  { name: 'sName', label: 'اسم الأب' },
  { name: 'thName', label: 'اسم الجد' },
  { name: 'family', label: 'العائلة', required: true },
  { name: 'dob', label: 'تاريخ الميلاد', type: 'date' },
  constant('marital_status_id', 'الحالة الاجتماعية', 'marital_status'),
  branchField,
  regionField,
  {
    name: 'mosque_id',
    label: 'المسجد',
    type: 'select',
    options: (model) => (model.region_id ? lookups.mosquesOf(model.region_id) : []),
    required: true,
    help: 'اختر المنطقة أولاً',
  },
  { name: 'location', label: 'العنوان' },
  { name: 'phone', label: 'الجوال' },
  { name: 'whatsapp', label: 'واتساب' },
  { name: 'guardian_id', label: 'هوية ولي الأمر', required: true, placeholder: '9 أرقام' },
  constant('guardian_type_id', 'صلة القرابة', 'guardian_type', { required: true }),
  constant('money_status_id', 'الحالة المادية', 'money_status'),
  { name: 'memorized_juz', label: 'الأجزاء المختبَرة', type: 'multiselect', options: JUZ_OPTIONS },
  { name: 'completed_juz', label: 'الأجزاء المسرودة المكتملة', type: 'multiselect', options: JUZ_OPTIONS },
  {
    name: 'memorization_direction',
    label: 'اتجاه الحفظ',
    type: 'select',
    options: MEMORIZATION_DIRECTIONS,
    optionLabel: 'label',
    optionValue: 'value',
  },
  { name: 'surah_id', label: 'آخر سورة محفوظة', type: 'select', options: () => lookups.lists.surahs, optionLabel: 'name_ar' },
  { name: 'end_aya', label: 'حتى الآية', type: 'number', min: 1, visible: (model) => !!model.surah_id },
]

const toForm = (row: Row): Row => ({
  identity: row.identity,
  prefix_name_id: row.prefix_name?.id ?? null,
  gender: row.gender,
  fName: row.fName,
  sName: row.sName,
  thName: row.thName,
  family: row.family,
  dob: row.dob,
  marital_status_id: row.marital_status?.id ?? null,
  branch_id: row.mosque?.region?.branch?.id ?? null,
  region_id: row.mosque?.region?.id ?? null,
  mosque_id: row.mosque?.id ?? null,
  location: row.location,
  phone: row.phone,
  whatsapp: row.whatsapp,
  guardian_id: row.guardian?.identity ?? null,
  guardian_type_id: row.guardian_relation?.id ?? null,
  money_status_id: row.money_status?.id ?? null,
  memorized_juz: row.memorized_juz_array ?? [],
  completed_juz: row.completed_juz_array ?? [],
  memorization_direction: row.memorization_direction,
  surah_id: row.surah_id,
  end_aya: row.end_aya,
})

const joinJuz = (value: number[] | null) => (value?.length ? [...value].sort((a, b) => a - b).join(',') : null)

const toPayload = (model: Row, isEdit: boolean): Row => {
  const payload = without(model, ['branch_id', 'region_id'])
  payload.memorized_juz = joinJuz(model.memorized_juz)
  payload.completed_juz = joinJuz(model.completed_juz)
  if (!payload.surah_id) payload.end_aya = null
  // حقول بلا nullable في قواعد التحقق: لا تُرسل وهي فارغة
  const strict = ['end_aya', 'halaqa_id']
  if (isEdit) strict.push('identity', 'guardian_id', 'guardian_type_id', 'mosque_id', 'gender', 'fName', 'family')
  return omitEmpty(payload, strict)
}

function fillFromRegistry(model: Row, person: Row) {
  model.fName = person.fName ?? model.fName
  model.sName = person.sName ?? model.sName
  model.thName = person.thName ?? model.thName
  model.family = person.family ?? model.family
  model.dob = person.dob ?? model.dob
  if (GENDERS.some((g) => g.value === person.gender)) model.gender = person.gender
}

async function exportExcel() {
  try {
    await api.download('export/students', 'students.xlsx')
  } catch (err) {
    notify.error(err)
  }
}
</script>

<template>
  <CrudPage
    title="الطلاب"
    subtitle="الطلاب المعتمدون"
    icon="pi pi-graduation-cap"
    entity="طالب"
    endpoint="students"
    permission="students"
    server-paging
    restorable
    search-placeholder="بحث بالاسم أو رقم الهوية..."
    :base-params="{ with_trashed: withTrashed }"
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :to-form="toForm"
    :to-payload="toPayload"
    :form-columns="3"
    dialog-width="64rem"
  >
    <template #toolbar>
      <label v-if="auth.can('students.restore')" class="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
        <ToggleSwitch v-model="withTrashed" />
        إظهار المحذوفين
      </label>
      <Button label="تصدير Excel" icon="pi pi-file-excel" severity="secondary" outlined @click="exportExcel" />
      <Button
        v-if="auth.can('students.create')"
        label="استيراد"
        icon="pi pi-file-import"
        severity="secondary"
        outlined
        @click="router.push('/students-import')"
      />
    </template>

    <template #cell-full_name="{ row }">
      <RouterLink :to="`/students/${row.id}`" class="font-semibold text-primary-700 hover:underline">
        {{ row.full_name }}
      </RouterLink>
    </template>

    <template #actions="{ row }">
      <Button
        v-tooltip.top="'ملف الطالب'"
        icon="pi pi-eye"
        severity="secondary"
        text
        rounded
        aria-label="ملف الطالب"
        @click="router.push(`/students/${row.id}`)"
      />
    </template>

    <template #form-top="{ model }">
      <IdentityLookup :identity="model.identity" @found="fillFromRegistry(model, $event)" />
    </template>

    <template #form-bottom="{ model, isEdit, errors }">
      <AppField
        v-if="!isEdit"
        label="تسجيل في حلقة"
        :error="errors.halaqa_id"
        help="اختياري — يمكن إضافة الطالب لحلقة لاحقاً من صفحة الحلقة"
      >
        <RemoteSelect v-model="model.halaqa_id" endpoint="halaqas" option-label="name" :invalid="!!errors.halaqa_id" />
      </AppField>
    </template>
  </CrudPage>
</template>
