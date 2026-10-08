<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { api } from '@/api/http'
import AppField from '@/components/AppField.vue'
import CrudPage from '@/components/CrudPage.vue'
import DateInput from '@/components/DateInput.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { today } from '@/utils/format'
import { ACHIEVEMENT_STATUSES, ACHIEVEMENT_TYPES, EVALUATION_GRADES, severityOf } from '@/utils/options'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

/**
 * الإنجاز اليومي. يُستخدم كصفحة مستقلة أو مضمّناً في ملف الطالب (studentId + embedded).
 * نقطة بداية الإنجاز يحددها الخادم من تقدّم الطالب؛ المستخدم يُدخل نقطة النهاية فقط.
 */
const props = defineProps<{
  studentId?: number
  student?: Row | null
  embedded?: boolean
}>()

const auth = useAuthStore()
const notify = useNotify()
const crud = ref<InstanceType<typeof CrudPage> | null>(null)

const rangeText = (row: Row) =>
  `${row.from_surah?.name_ar ?? ''} (${row.from_ayah ?? ''}) ← ${row.to_surah?.name_ar ?? ''} (${row.to_ayah ?? ''})`

const columns = computed<ColumnDef[]>(() => [
  { field: 'date', header: 'التاريخ', type: 'date' },
  ...(props.studentId ? [] : [{ field: 'student_name', header: 'الطالب', value: (row: Row) => row.student?.full_name }]),
  { field: 'subject', header: 'المساق', value: (row) => row.subject?.title },
  { field: 'range', header: 'النطاق', value: rangeText },
  { field: 'ayahs_count', header: 'الآيات' },
  { field: 'pages_count', header: 'الصفحات' },
  { field: 'achievement_type_label', header: 'النوع', type: 'tag' },
  { field: 'evaluation_grade_label', header: 'التقييم', type: 'tag', severity: (row) => severityOf(row.evaluation_grade) },
  { field: 'achievement_status_label', header: 'الحالة', type: 'tag', severity: (row) => severityOf(row.achievement_status) },
  { field: 'mistakes_count', header: 'الأخطاء' },
  { field: 'teacher', header: 'المحفّظ', value: (row) => row.teacher?.full_name },
])

const filters: FieldDef[] = [
  // الخادم يطبّق فلتر التاريخ فقط عند تحديد الطرفين معاً
  { name: 'from_date', label: 'من تاريخ', type: 'date' },
  { name: 'to_date', label: 'إلى تاريخ', type: 'date' },
  { name: 'achievement_type', label: 'النوع', type: 'select', options: ACHIEVEMENT_TYPES, optionLabel: 'label', optionValue: 'value' },
  { name: 'achievement_status', label: 'الحالة', type: 'select', options: ACHIEVEMENT_STATUSES, optionLabel: 'label', optionValue: 'value' },
]

const baseParams = computed(() => (props.studentId ? { student_id: props.studentId } : {}))

// ── نافذة تسجيل/تعديل إنجاز ───────────────────────────────────────────
const { saving, errors, submit, clearErrors } = useSubmit()
const dialog = ref(false)
const editing = ref<Row | null>(null)
const model = ref<Row>({})
const selectedStudent = ref<Row | null>(null)
const subjects = ref<Row[]>([])
const subjectsLoading = ref(false)
const subjectsMessage = ref('')

const subject = computed(() => subjects.value.find((s) => s.student_subject_id === model.value.student_subject_id) ?? null)
const surahOptions = computed<Row[]>(() => subject.value?.available_surahs ?? [])
const targetSurah = computed(() => surahOptions.value.find((s) => s.id === model.value.to_surah) ?? null)
const ayahHint = computed(() =>
  (targetSurah.value?.ranges ?? []).map((r: Row) => `${r.from_ayah} - ${r.to_ayah}`).join('، '),
)

async function loadSubjects() {
  subjects.value = []
  subjectsMessage.value = ''
  if (!model.value.student_id) return
  subjectsLoading.value = true
  try {
    const res = await api.get<Row[]>(`daily-memorization/students/${model.value.student_id}/available-subjects`, {
      achievement_type: model.value.achievement_type,
      except_id: editing.value?.id,
    })
    subjects.value = Array.isArray(res.data) ? res.data : []
    if (!subjects.value.length) subjectsMessage.value = res.message || 'لا توجد مساقات متاحة لهذا الطالب'
  } catch (err) {
    notify.error(err)
  } finally {
    subjectsLoading.value = false
  }
}

function openCreate() {
  editing.value = null
  selectedStudent.value = props.student ?? null
  model.value = {
    student_id: props.studentId ?? null,
    student_subject_id: null,
    achievement_type: 'new_memorization',
    date: today(),
    to_surah: null,
    to_ayah: null,
    evaluation_grade: null,
    achievement_status: 'completed',
    mistakes_count: 0,
    notes: null,
  }
  clearErrors()
  dialog.value = true
  void loadSubjects()
}

function openEdit(row: Row) {
  editing.value = row
  selectedStudent.value = row.student ?? props.student ?? null
  model.value = {
    student_id: row.student_id,
    student_subject_id: row.student_subject_id,
    achievement_type: row.achievement_type ?? 'new_memorization',
    date: row.date,
    to_surah: row.to_surah?.id ?? null,
    to_ayah: row.to_ayah,
    evaluation_grade: row.evaluation_grade,
    achievement_status: row.achievement_status,
    mistakes_count: row.mistakes_count ?? 0,
    notes: row.notes,
  }
  clearErrors()
  dialog.value = true
  void loadSubjects()
}

function onStudentChange() {
  model.value.student_subject_id = null
  model.value.to_surah = null
  model.value.to_ayah = null
  void loadSubjects()
}

function onTypeChange() {
  if (!editing.value) {
    model.value.student_subject_id = null
    model.value.to_surah = null
    model.value.to_ayah = null
  }
  void loadSubjects()
}

async function save() {
  const m = model.value
  let res
  if (editing.value) {
    const original = editing.value
    const payload: Row = {
      evaluation_grade: m.evaluation_grade,
      mistakes_count: m.mistakes_count,
      notes: m.notes,
    }
    // حقول التقدّم لا تُرسل إلا عند تغييرها: الخادم يمنع تعديلها إن وُجدت إنجازات لاحقة
    if (m.date !== original.date) payload.date = m.date
    if (m.to_surah !== (original.to_surah?.id ?? null)) payload.to_surah = m.to_surah
    if (m.to_ayah !== original.to_ayah) payload.to_ayah = m.to_ayah
    if (m.achievement_type !== original.achievement_type) payload.achievement_type = m.achievement_type
    if (m.achievement_status !== original.achievement_status) payload.achievement_status = m.achievement_status
    res = await submit(() => api.put(`daily-memorization/${original.id}`, payload))
  } else {
    res = await submit(() =>
      api.post('daily-memorization', { ...m, subject_id: subject.value?.id ?? null }),
    )
  }
  if (res) {
    dialog.value = false
    await crud.value?.reload()
  }
}

onMounted(() => {
  selectedStudent.value = props.student ?? null
})
</script>

<template>
  <div>
    <CrudPage
      ref="crud"
      title="الإنجاز اليومي"
      subtitle="تسجيل ومتابعة حفظ ومراجعة الطلاب"
      icon="pi pi-book"
      entity="إنجاز"
      endpoint="daily-memorization"
      permission="daily_achievements"
      server-paging
      :embedded="embedded"
      :searchable="false"
      :base-params="baseParams"
      :columns="columns"
      :filters="filters"
    >
      <template #filters="{ filters: f }">
        <div v-if="!studentId" class="w-full sm:w-72">
          <AppField label="الطالب">
            <RemoteSelect v-model="f.student_id" endpoint="students" option-label="full_name" option-hint="identity" />
          </AppField>
        </div>
      </template>

      <template #toolbar>
        <Button v-if="auth.can('daily_achievements.create')" label="تسجيل إنجاز" icon="pi pi-plus" @click="openCreate" />
      </template>

      <template #cell-student_name="{ row }">
        <RouterLink :to="`/students/${row.student_id}`" class="font-semibold text-primary-700 hover:underline">
          {{ row.student?.full_name }}
        </RouterLink>
      </template>

      <template #actions="{ row }">
        <Button
          v-if="auth.can('daily_achievements.update')"
          v-tooltip.top="'تعديل'"
          icon="pi pi-pencil"
          severity="secondary"
          text
          rounded
          aria-label="تعديل"
          @click="openEdit(row)"
        />
      </template>
    </CrudPage>

    <Dialog
      v-model:visible="dialog"
      modal
      :header="editing ? 'تعديل إنجاز' : 'تسجيل إنجاز يومي'"
      :style="{ width: '46rem' }"
      :breakpoints="{ '768px': '96vw' }"
    >
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="save">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppField label="الطالب" required :error="errors.student_id">
            <RemoteSelect
              v-model="model.student_id"
              endpoint="students"
              option-label="full_name"
              option-hint="identity"
              :selected="selectedStudent"
              :disabled="!!studentId || !!editing"
              :invalid="!!errors.student_id"
              @select="onStudentChange"
            />
          </AppField>

          <AppField label="نوع الإنجاز" :error="errors.achievement_type">
            <Select
              v-model="model.achievement_type"
              :options="ACHIEVEMENT_TYPES"
              option-label="label"
              option-value="value"
              fluid
              @change="onTypeChange"
            />
          </AppField>

          <AppField label="المساق" required :error="errors.subject_id ?? errors.student_subject_id" class="md:col-span-2">
            <Select
              v-model="model.student_subject_id"
              :options="subjects"
              option-label="title"
              option-value="student_subject_id"
              :loading="subjectsLoading"
              :disabled="!model.student_id || !!editing"
              placeholder="اختر المساق"
              empty-message="لا توجد مساقات متاحة"
              fluid
              @change="((model.to_surah = null), (model.to_ayah = null))"
            >
              <template #option="{ option }">
                <div class="flex flex-col">
                  <span>{{ option.title }}</span>
                  <small class="text-surface-500">{{ option.plan?.name }} — {{ option.level?.name }}</small>
                </div>
              </template>
            </Select>
          </AppField>
        </div>

        <Message v-if="subjectsMessage && model.student_id && !subjectsLoading" severity="warn" :closable="false">
          {{ subjectsMessage }}
        </Message>

        <div v-if="subject" class="rounded-lg bg-primary-50 border border-primary-100 p-3 text-sm text-surface-700">
          <div class="flex flex-wrap items-center gap-2">
            <Tag v-if="subject.is_completed" value="المساق مكتمل" severity="success" />
            <template v-else-if="subject.next_start">
              <span>نقطة البداية:</span>
              <strong>{{ subject.next_start.surah_name }} — آية {{ subject.next_start.ayah }}</strong>
              <span v-if="subject.next_start.page" class="text-surface-500">(صفحة {{ subject.next_start.page }})</span>
            </template>
          </div>
          <div v-if="subject.available_ranges" class="mt-1 text-surface-600">
            أقصى نطاق متاح: حتى {{ subject.available_ranges.to_surah_name }} — آية {{ subject.available_ranges.to_ayah }}
            ({{ subject.available_ranges.ayahs_count }} آية)
          </div>
          <div v-if="subject.has_range" class="mt-1 text-surface-500">
            المتبقي {{ subject.available_ayahs_count }} من {{ subject.total_ayahs_count }} آية
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AppField label="التاريخ" required :error="errors.date">
            <DateInput v-model="model.date" max-today :invalid="!!errors.date" />
          </AppField>
          <AppField label="إلى سورة" required :error="errors.to_surah">
            <Select
              v-model="model.to_surah"
              :options="surahOptions"
              option-label="name_ar"
              option-value="id"
              filter
              fluid
              :disabled="!subject"
              :invalid="!!errors.to_surah"
              placeholder="السورة"
              empty-message="اختر المساق أولاً"
            />
          </AppField>
          <AppField label="إلى آية" required :error="errors.to_ayah" :help="ayahHint ? `المتاح: ${ayahHint}` : undefined">
            <InputNumber v-model="model.to_ayah" :min="1" :use-grouping="false" fluid :invalid="!!errors.to_ayah" />
          </AppField>

          <AppField label="التقييم" :error="errors.evaluation_grade">
            <Select v-model="model.evaluation_grade" :options="EVALUATION_GRADES" option-label="label" option-value="value" show-clear fluid placeholder="اختر" />
          </AppField>
          <AppField label="الحالة" :error="errors.achievement_status">
            <Select v-model="model.achievement_status" :options="ACHIEVEMENT_STATUSES" option-label="label" option-value="value" fluid />
          </AppField>
          <AppField label="عدد الأخطاء" :error="errors.mistakes_count">
            <InputNumber v-model="model.mistakes_count" :min="0" :use-grouping="false" fluid />
          </AppField>
        </div>

        <AppField label="ملاحظات" :error="errors.notes">
          <Textarea v-model="model.notes" rows="2" auto-resize fluid />
        </AppField>

        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="dialog = false" />
          <Button
            type="submit"
            :label="editing ? 'حفظ' : 'تسجيل'"
            icon="pi pi-check"
            :loading="saving"
            :disabled="!model.student_id || !model.student_subject_id || !model.to_surah || !model.to_ayah"
          />
        </div>
      </form>
    </Dialog>
  </div>
</template>
