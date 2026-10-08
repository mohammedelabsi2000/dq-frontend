<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { api } from '@/api/http'
import AppField from '@/components/AppField.vue'
import CrudPage from '@/components/CrudPage.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { GENDERS } from '@/utils/options'
import { omitEmpty, without } from '@/utils/payload'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
const notify = useNotify()
const router = useRouter()

onMounted(() => {
  void lookups.ensure('branches', 'regions', 'centers')
  void lookups.ensureConstants('halaqa_types', 'sponsorship_type')
})

const placeOf = (row: Row) => row.center?.name ?? row.region?.name
const branchOf = (row: Row) => row.center?.region?.branch?.name ?? row.region?.branch?.name

const columns: ColumnDef[] = [
  { field: 'name', header: 'اسم الحلقة' },
  { field: 'type', header: 'النوع', value: (row) => row.type?.name },
  { field: 'gender', header: 'الجنس', type: 'tag' },
  { field: 'place', header: 'المركز / المنطقة', value: placeOf },
  { field: 'branch', header: 'الفرع', value: branchOf },
  { field: 'teacher', header: 'المحفّظ', value: (row) => row.supervisors?.full_name },
  { field: 'students_count', header: 'الطلاب' },
  { field: 'sponsorship', header: 'الكفالة', type: 'tag', value: (row) => row.sponsorship_type?.name },
  { field: 'is_active', header: 'فعّالة', type: 'bool' },
]

const branchField: FieldDef = {
  name: 'branch_id',
  label: 'الفرع',
  type: 'select',
  options: () => lookups.lists.branches,
  resets: ['region_id', 'center_id'],
}
const regionField: FieldDef = {
  name: 'region_id',
  label: 'المنطقة',
  type: 'select',
  options: (model) => lookups.regionsOf(model.branch_id),
  resets: ['center_id'],
}
const centerField: FieldDef = {
  name: 'center_id',
  label: 'المركز',
  type: 'select',
  options: (model) => (model.region_id ? lookups.centersOf(model.region_id) : []),
}
const typeField: FieldDef = {
  name: 'type_id',
  label: 'نوع الحلقة',
  type: 'select',
  options: () => lookups.constantsOf('halaqa_types'),
}

const fields: FieldDef[] = [
  { name: 'name', label: 'اسم الحلقة', required: true },
  { ...typeField, required: true },
  { name: 'gender', label: 'الجنس', type: 'select', options: GENDERS, optionLabel: 'label', optionValue: 'value', required: true },
  { name: 'is_active', label: 'الحلقة فعّالة', type: 'switch', default: true },
  branchField,
  { ...regionField, required: true },
  { ...centerField, help: 'اختياري — إن تُرك فارغاً تتبع الحلقة المنطقة مباشرة' },
  { name: 'location', label: 'الموقع / العنوان' },
  { name: 'description', label: 'الوصف', type: 'textarea', span: 2 },
  { name: 'sponsorship_type_id', label: 'حالة الكفالة', type: 'select', options: () => lookups.constantsOf('sponsorship_type') },
  { name: 'sponsor_entity', label: 'الجهة الكافلة' },
  { name: 'from_date', label: 'من تاريخ', type: 'date' },
  { name: 'to_date', label: 'إلى تاريخ', type: 'date' },
  { name: 'notes', label: 'ملاحظات الحالة', type: 'textarea', span: 2 },
]

const currentTeacher = ref<Row | null>(null)

const toForm = (row: Row): Row => {
  currentTeacher.value = row.supervisors ?? null
  const region = row.center?.region ?? row.region
  return {
    name: row.name,
    type_id: row.type?.id ?? null,
    gender: row.gender,
    is_active: !!row.is_active,
    branch_id: region?.branch?.id ?? null,
    region_id: region?.id ?? null,
    center_id: row.center?.id ?? null,
    location: row.location,
    description: row.description,
    sponsorship_type_id: row.sponsorship_type?.id ?? null,
    sponsor_entity: row.sponsor_entity ?? null,
    from_date: row.from_date ?? null,
    to_date: row.to_date ?? null,
    notes: row.status_notes ?? null,
    teacher_id: row.supervisors?.id ?? null,
  }
}

const toPayload = (model: Row, isEdit: boolean): Row => {
  let payload = without(model, ['branch_id'])
  // الحلقة تتبع المركز إن حُدد وإلا المنطقة
  if (payload.center_id) delete payload.region_id
  // إعادة إرسال نفس المحفّظ عند التعديل تُغلق تنسيبه الحالي في الخادم، فلا يُرسل إلا عند تغييره
  if (isEdit && payload.teacher_id === (currentTeacher.value?.id ?? null)) delete payload.teacher_id
  payload = omitEmpty(payload, ['teacher_id', 'type_id', 'center_id', 'region_id'])
  return payload
}

async function exportExcel() {
  try {
    await api.download('export/halaqas', 'halaqas.xlsx')
  } catch (err) {
    notify.error(err)
  }
}
</script>

<template>
  <CrudPage
    title="الحلقات"
    subtitle="حلقات التحفيظ المعتمدة"
    icon="pi pi-users"
    entity="حلقة"
    endpoint="halaqas"
    permission="halaqas"
    server-paging
    search-placeholder="بحث باسم الحلقة..."
    :columns="columns"
    :fields="fields"
    :filters="[branchField, regionField, centerField, typeField]"
    :to-form="toForm"
    :to-payload="toPayload"
    dialog-width="52rem"
  >
    <template #toolbar>
      <Button label="تصدير Excel" icon="pi pi-file-excel" severity="secondary" outlined @click="exportExcel" />
    </template>

    <template #cell-name="{ row }">
      <RouterLink :to="`/halaqas/${row.id}`" class="font-semibold text-primary-700 hover:underline">{{ row.name }}</RouterLink>
    </template>

    <template #actions="{ row }">
      <Button
        v-tooltip.top="'الطلاب والكفالات'"
        icon="pi pi-eye"
        severity="secondary"
        text
        rounded
        aria-label="عرض"
        @click="router.push(`/halaqas/${row.id}`)"
      />
    </template>

    <template #form-bottom="{ model, isEdit, errors }">
      <AppField label="المحفّظ" :error="errors.teacher_id" help="المستخدمون المرشحون للتنسيب كمعلمين">
        <RemoteSelect
          v-model="model.teacher_id"
          endpoint="users/candidate-teachers"
          option-label="full_name"
          option-hint="identity"
          :selected="isEdit ? currentTeacher : null"
          :invalid="!!errors.teacher_id"
          placeholder="ابحث عن المحفّظ بالاسم أو رقم الهوية"
        />
      </AppField>
    </template>
  </CrudPage>
</template>
