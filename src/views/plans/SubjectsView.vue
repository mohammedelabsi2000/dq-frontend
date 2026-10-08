<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { api } from '@/api/http'
import CrudPage from '@/components/CrudPage.vue'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { MEMORIZATION_DIRECTIONS, SUBJECT_GENDERS, labelOf } from '@/utils/options'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const lookups = useLookupsStore()
const notify = useNotify()

const requirementTypes = ref<{ label: string; value: string }[]>([])

onMounted(async () => {
  void lookups.ensure('customJuz', 'surahs')
  void lookups.ensureConstants('subject_type')
  try {
    requirementTypes.value = (await api.get('plan/subject-requirement-types')).data ?? []
  } catch {
    requirementTypes.value = []
  }
})

const columns: ColumnDef[] = [
  { field: 'title', header: 'عنوان المساق' },
  { field: 'subject_type', header: 'النوع', type: 'tag', value: (row) => row.subject_type?.name },
  { field: 'custom_juzs', header: 'الأجزاء', value: (row) => (row.custom_juzs ?? []).map((j: Row) => j.name).join('، ') },
  { field: 'gender', header: 'الفئة', value: (row) => (row.gender ? labelOf(SUBJECT_GENDERS, row.gender) : 'الجميع') },
  { field: 'success_mark', header: 'علامة النجاح' },
]

const fields: FieldDef[] = [
  { name: 'title', label: 'عنوان المساق', required: true },
  { name: 'subject_type_id', label: 'نوع المساق', type: 'select', options: () => lookups.constantsOf('subject_type'), required: true },
  {
    name: 'custom_juz_id',
    label: 'الأجزاء المخصصة',
    type: 'multiselect',
    options: () => lookups.lists.customJuz,
    span: 2,
    help: 'مطلوبة لمساقات الحفظ والتفسير والمعاني',
  },
  { name: 'surahs', label: 'السور', type: 'multiselect', options: () => lookups.lists.surahs, optionLabel: 'name_ar', span: 2 },
  { name: 'memorization_direction', label: 'اتجاه الحفظ', type: 'select', options: MEMORIZATION_DIRECTIONS, optionLabel: 'label', optionValue: 'value' },
  { name: 'gender', label: 'الفئة', type: 'select', options: SUBJECT_GENDERS, optionLabel: 'label', optionValue: 'value', placeholder: 'الجميع' },
  { name: 'success_mark', label: 'علامة النجاح', type: 'number', min: 0, max: 100, decimals: 2 },
  { name: 'standard_pass_mark', label: 'علامة النجاح المعيارية', type: 'number', min: 0, max: 100, decimals: 2 },
  { name: 'alerts_count', label: 'عدد التنبيهات المسموح', type: 'number', min: 0 },
  { name: 'errors_count', label: 'عدد الأخطاء المسموح', type: 'number', min: 0 },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const num = (value: unknown) => (value === null || value === undefined || value === '' ? null : Number(value))

const toForm = (row: Row): Row => ({
  title: row.title,
  subject_type_id: row.subject_type_id,
  custom_juz_id: row.custom_juz_id ?? [],
  surahs: row.surahs ?? [],
  // تُعاد كما هي لأن التحديث في الخادم يصفّرها إن لم تُرسل
  verses: row.verses ?? [],
  memorization_direction: row.memorization_direction,
  gender: row.gender,
  success_mark: num(row.success_mark),
  standard_pass_mark: num(row.standard_pass_mark),
  alerts_count: row.alerts_count,
  errors_count: row.errors_count,
  notes: row.notes,
  standard_department_id: row.standard_department_id,
  standard_department_name: row.standard_department_name,
  standard_subject_id: row.standard_subject_id,
  subject_requirements: (row.subject_requirements ?? []).map((req: Row) => ({
    success_value_type: req.success_value_type,
    success_value: num(req.success_value),
    weight: num(req.weight),
  })),
})

let lastPayload: Row = {}
const toPayload = (model: Row): Row => {
  lastPayload = { ...model, subject_requirements: model.subject_requirements ?? [] }
  return lastPayload
}

// الإنشاء في الخادم لا يحفظ شروط النجاح (التحديث فقط يحفظها)، فنُتبع الإنشاء بتحديث
async function onSaved(data: Row, isEdit: boolean) {
  void lookups.refresh('subjects')
  if (isEdit || !lastPayload.subject_requirements?.length || !data?.id) return
  try {
    await api.put(`plan/subjects/${data.id}`, lastPayload)
  } catch (err) {
    notify.error(err)
  }
}

function addRequirement(model: Row) {
  model.subject_requirements = [...(model.subject_requirements ?? []), { success_value_type: null, success_value: null, weight: null }]
}
</script>

<template>
  <CrudPage
    title="المساقات"
    subtitle="المواد التي تُربط بمسارات المستويات"
    icon="pi pi-bookmark"
    entity="مساق"
    endpoint="plan/subjects"
    permission="subjects"
    :columns="columns"
    :fields="fields"
    :to-form="toForm"
    :to-payload="toPayload"
    dialog-width="52rem"
    @saved="onSaved"
    @deleted="lookups.refresh('subjects')"
  >
    <template #form-bottom="{ model, errors }">
      <div class="border border-surface-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-surface-800">شروط النجاح</h3>
          <Button type="button" label="إضافة شرط" icon="pi pi-plus" size="small" severity="secondary" outlined @click="addRequirement(model)" />
        </div>
        <p v-if="!model.subject_requirements?.length" class="text-sm text-surface-500">لا توجد شروط نجاح مضافة.</p>
        <div
          v-for="(req, index) in model.subject_requirements"
          :key="index"
          class="grid grid-cols-1 md:grid-cols-[1fr_8rem_8rem_auto] gap-3 items-start mb-3"
        >
          <div>
            <Select
              v-model="req.success_value_type"
              :options="requirementTypes"
              option-label="label"
              option-value="value"
              placeholder="نوع الشرط"
              fluid
              :invalid="!!errors[`subject_requirements.${index}.success_value_type`]"
            />
            <small class="field-error">{{ errors[`subject_requirements.${index}.success_value_type`] }}</small>
          </div>
          <div>
            <InputNumber
              v-model="req.success_value"
              placeholder="القيمة"
              :min="0"
              :max="100"
              :max-fraction-digits="2"
              fluid
              :invalid="!!errors[`subject_requirements.${index}.success_value`]"
            />
            <small class="field-error">{{ errors[`subject_requirements.${index}.success_value`] }}</small>
          </div>
          <InputNumber v-model="req.weight" placeholder="الوزن" :min="0" :max="100" :max-fraction-digits="2" fluid />
          <Button
            type="button"
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            aria-label="حذف الشرط"
            @click="model.subject_requirements.splice(index, 1)"
          />
        </div>
      </div>
    </template>
  </CrudPage>
</template>
