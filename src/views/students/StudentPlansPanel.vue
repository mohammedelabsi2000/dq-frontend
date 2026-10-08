<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { api, toApiError } from '@/api/http'
import SchemaForm from '@/components/SchemaForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { formatDate, today } from '@/utils/format'
import { RESULT_STATUSES, STUDENT_PLAN_STATUSES, labelOf, severityOf } from '@/utils/options'
import type { FieldDef, Row } from '@/types/schema'

/** خطط الطالب ومستوياته ومساقاته (مسارات student/{id}/plans و student-subject) */
const props = defineProps<{ studentId: number }>()

const auth = useAuthStore()
const notify = useNotify()

const studentPlans = ref<Row[]>([])
const loading = ref(true)

const selectedPlan = ref<Row | null>(null)
const planLevels = ref<Row[]>([])
const currentLevelId = ref<number | null>(null)
const selectedLevelId = ref<number | null>(null)
const levelDetail = ref<Row | null>(null)
const detailLoading = ref(false)

async function loadPlans() {
  loading.value = true
  try {
    const res = await api.get<Row>(`student/${props.studentId}/plans`)
    studentPlans.value = res.data?.student_plans ?? []
    if (!selectedPlan.value && studentPlans.value.length) {
      await selectPlan(studentPlans.value.find((p) => !p.to_date) ?? studentPlans.value[0])
    }
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}

async function selectPlan(studentPlan: Row) {
  selectedPlan.value = studentPlan
  levelDetail.value = null
  selectedLevelId.value = null
  planLevels.value = []
  try {
    const res = await api.get<Row>(`student/${props.studentId}/plans/${studentPlan.plan.id}`)
    planLevels.value = res.data?.levels ?? []
    currentLevelId.value = res.data?.current_level?.id ?? studentPlan.current_level_id ?? null
    if (currentLevelId.value) await selectLevel(currentLevelId.value)
  } catch (err) {
    notify.error(err)
  }
}

async function selectLevel(levelId: number) {
  selectedLevelId.value = levelId
  levelDetail.value = null
  if (!selectedPlan.value || selectedPlan.value.to_date) return
  detailLoading.value = true
  try {
    const res = await api.get<Row>(
      `student/${props.studentId}/plans/${selectedPlan.value.plan.id}/level/${levelId}`,
    )
    levelDetail.value = res.data
  } catch (err) {
    notify.error(err)
  } finally {
    detailLoading.value = false
  }
}

const refreshLevel = () => (selectedLevelId.value ? selectLevel(selectedLevelId.value) : Promise.resolve())

const isEnrolled = (entry: Row) => !!entry.student_level?.from_date

async function enrollLevel(levelId: number) {
  try {
    const res = await api.post(`student/${props.studentId}/enrollLevel`, { level_id: levelId })
    notify.success(res.message)
    if (selectedPlan.value) await selectPlan(selectedPlan.value)
    await selectLevel(levelId)
  } catch (err) {
    notify.error(err)
  }
}

// ── الالتحاق بخطة جديدة ───────────────────────────────────────────────
const enroll = useSubmit()
const enrollDialog = ref(false)
const enrollModel = ref<Row>({})
const availablePlans = ref<Row[]>([])
const startLevels = ref<Row[]>([])

const enrollFields = computed<FieldDef[]>(() => [
  {
    name: 'plan_id',
    label: 'الخطة',
    type: 'select',
    options: availablePlans.value,
    required: true,
    span: 2,
    onChange: (model) => {
      model.starting_level_id = null
      void loadStartLevels(model.plan_id)
    },
  },
  { name: 'starting_level_id', label: 'مستوى البداية', type: 'select', options: startLevels.value, help: 'افتراضياً أول مستوى' },
  { name: 'from_date', label: 'تاريخ الالتحاق', type: 'date', required: true },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
])

async function loadStartLevels(planId?: number | null) {
  startLevels.value = []
  if (!planId) return
  try {
    const res = await api.get<Row[]>('plan/levels', { plan_id: planId, limit: '*' })
    startLevels.value = [...(res.data ?? [])].sort((a, b) => a.order - b.order)
  } catch {
    startLevels.value = []
  }
}

async function openEnroll() {
  enrollModel.value = { plan_id: null, starting_level_id: null, from_date: today(), notes: null }
  startLevels.value = []
  enroll.clearErrors()
  enrollDialog.value = true
  try {
    availablePlans.value = (await api.get<Row[]>(`student/${props.studentId}/unrelatedPlans`)).data ?? []
  } catch (err) {
    notify.error(err)
  }
}

async function saveEnroll() {
  const { plan_id } = enrollModel.value
  const res = await enroll.submit(() =>
    api.post(`plan/${plan_id}/students`, { ...enrollModel.value, student_ids: [props.studentId] }),
  )
  if (res) {
    enrollDialog.value = false
    selectedPlan.value = null
    await loadPlans()
  }
}

// ── مساقات الطالب ─────────────────────────────────────────────────────
const registering = ref<number | null>(null)
const decisionDialog = ref(false)
const decisionContext = ref<{ subject: Row; previous: Row | null; plan: Row | null } | null>(null)
const decision = ref<'retake' | 'exempt'>('exempt')

async function registerSubject(subject: Row, onPreviousPass?: 'retake' | 'exempt') {
  registering.value = subject.id
  try {
    const res = await api.post('student-subject', {
      student_id: props.studentId,
      subject_id: subject.id,
      level_id: selectedLevelId.value,
      from_date: today(),
      result_status_key: 'in_progress',
      on_previous_pass: onPreviousPass,
    })
    notify.success(res.message)
    decisionDialog.value = false
    await refreshLevel()
  } catch (err) {
    const apiError = toApiError(err)
    // 409: الطالب أنجز المساق سابقاً ويجب اختيار إعادة أو إعفاء
    if (apiError.status === 409 && apiError.data?.requires_decision) {
      decisionContext.value = {
        subject,
        previous: apiError.data.previous_student_subject ?? null,
        plan: apiError.data.previous_plan ?? null,
      }
      decision.value = 'exempt'
      decisionDialog.value = true
    } else {
      notify.error(apiError)
    }
  } finally {
    registering.value = null
  }
}

const result = useSubmit()
const resultDialog = ref(false)
const resultSubject = ref<Row | null>(null)
const resultModel = ref<Row>({})
const resultFields: FieldDef[] = [
  { name: 'result_status_key', label: 'النتيجة', type: 'select', options: RESULT_STATUSES, optionLabel: 'label', optionValue: 'value' },
  { name: 'grade', label: 'العلامة', type: 'number', min: 0, max: 100, decimals: 2 },
  { name: 'grade_date', label: 'تاريخ رصد العلامة', type: 'date' },
  { name: 'from_date', label: 'تاريخ البدء', type: 'date' },
  { name: 'to_date', label: 'تاريخ الانتهاء', type: 'date' },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

function openResult(subject: Row) {
  const record = subject.student_subject
  resultSubject.value = subject
  resultModel.value = {
    result_status_key: record.result_status?.const_key ?? null,
    grade: record.grade === null || record.grade === undefined ? null : Number(record.grade),
    grade_date: record.grade_date,
    from_date: record.from_date,
    to_date: record.to_date,
    notes: record.notes,
  }
  result.clearErrors()
  resultDialog.value = true
}

async function saveResult() {
  const res = await result.submit(() =>
    api.put(`student-subject/${resultSubject.value!.student_subject.id}`, resultModel.value),
  )
  if (res) {
    resultDialog.value = false
    await refreshLevel()
  }
}

function removeSubject(subject: Row) {
  notify.confirmAction({
    message: `إلغاء تسجيل الطالب في مساق "${subject.title}"؟`,
    header: 'تأكيد',
    acceptLabel: 'إلغاء التسجيل',
    accept: async () => {
      try {
        notify.success((await api.delete(`student-subject/${subject.student_subject.id}`)).message)
        await refreshLevel()
      } catch (err) {
        notify.error(err)
      }
    },
  })
}

onMounted(loadPlans)
</script>

<template>
  <div>
    <div class="flex justify-end mb-4">
      <Button v-if="auth.can('plans.enroll_student')" label="التحاق بخطة" icon="pi pi-plus" @click="openEnroll" />
    </div>

    <div v-if="loading" class="text-center py-10 text-surface-500"><i class="pi pi-spin pi-spinner text-2xl" /></div>

    <div v-else-if="!studentPlans.length" class="text-center py-10 text-surface-500">
      <i class="pi pi-sitemap text-3xl mb-2 block" />
      الطالب غير ملتحق بأي خطة
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-5">
      <!-- قائمة خطط الطالب -->
      <div class="flex flex-col gap-3">
        <button
          v-for="studentPlan in studentPlans"
          :key="studentPlan.id"
          type="button"
          class="text-start rounded-xl border p-4 transition"
          :class="
            selectedPlan?.id === studentPlan.id
              ? 'border-primary-400 bg-primary-50'
              : 'border-surface-200 bg-white hover:border-primary-200'
          "
          @click="selectPlan(studentPlan)"
        >
          <div class="font-semibold text-surface-900 mb-2">{{ studentPlan.plan?.name }}</div>
          <div class="flex flex-wrap gap-1 mb-2">
            <Tag :value="labelOf(STUDENT_PLAN_STATUSES, studentPlan.status)" :severity="severityOf(studentPlan.status)" />
            <Tag v-if="studentPlan.is_main" value="رئيسية" severity="info" />
          </div>
          <div class="text-xs text-surface-500">
            {{ formatDate(studentPlan.from_date) }} ← {{ studentPlan.to_date ? formatDate(studentPlan.to_date) : 'مستمرة' }}
          </div>
          <div v-if="studentPlan.current_level" class="text-xs text-surface-600 mt-1">
            المستوى الحالي: {{ studentPlan.current_level.name }}
          </div>
        </button>
      </div>

      <!-- مستويات الخطة المحددة -->
      <div v-if="selectedPlan" class="min-w-0">
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="entry in planLevels"
            :key="entry.level.id"
            type="button"
            class="rounded-lg border px-3 py-2 text-sm transition"
            :class="
              selectedLevelId === entry.level.id
                ? 'border-primary-500 bg-primary-600 text-white'
                : 'border-surface-200 bg-white text-surface-700 hover:border-primary-300'
            "
            @click="selectLevel(entry.level.id)"
          >
            {{ entry.level.order }}. {{ entry.level.name }}
            <i v-if="entry.level.id === currentLevelId" class="pi pi-star-fill text-xs ms-1" title="المستوى الحالي" />
            <i v-else-if="isEnrolled(entry)" class="pi pi-check text-xs ms-1" title="مسجل" />
          </button>
        </div>

        <div v-if="selectedPlan.to_date" class="text-sm text-surface-500 bg-surface-50 rounded-lg p-4">
          هذه الخطة منتهية للطالب؛ تفاصيل المساقات متاحة للخطط النشطة فقط.
        </div>

        <template v-else-if="selectedLevelId">
          <div
            v-for="entry in planLevels.filter((e) => e.level.id === selectedLevelId)"
            :key="entry.level.id"
            class="flex flex-wrap items-center justify-between gap-2 mb-4 text-sm"
          >
            <span v-if="isEnrolled(entry)" class="text-surface-600">
              مسجل في المستوى منذ {{ formatDate(entry.student_level.from_date) }}
              <template v-if="entry.student_level.to_date"> حتى {{ formatDate(entry.student_level.to_date) }}</template>
            </span>
            <template v-else>
              <span class="text-surface-500">الطالب غير مسجل في هذا المستوى.</span>
              <Button label="تسجيل في المستوى" icon="pi pi-sign-in" size="small" @click="enrollLevel(entry.level.id)" />
            </template>
          </div>

          <div v-if="detailLoading" class="text-center py-8 text-surface-500"><i class="pi pi-spin pi-spinner text-2xl" /></div>

          <div v-for="track in levelDetail?.tracks ?? []" :key="track.id" class="border border-surface-200 rounded-xl mb-4 overflow-hidden">
            <div class="flex items-center gap-2 bg-surface-50 px-4 py-2.5 border-b border-surface-200">
              <i class="pi pi-directions text-primary-600" />
              <span class="font-semibold">{{ track.track_name }}</span>
              <Tag :value="`الوزن ${track.weight}%`" severity="secondary" />
            </div>
            <p v-if="!track.subjects?.length" class="p-4 text-sm text-surface-500">لا توجد مساقات في هذا المسار</p>
            <ul v-else class="divide-y divide-surface-100 bg-white">
              <li v-for="subject in track.subjects" :key="subject.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div class="min-w-0">
                  <div class="font-medium text-surface-900">{{ subject.title }}</div>
                  <div v-if="subject.student_subject" class="flex flex-wrap items-center gap-2 mt-1 text-xs text-surface-500">
                    <Tag
                      :value="subject.student_subject.result_status?.name ?? 'بدون نتيجة'"
                      :severity="severityOf(subject.student_subject.result_status?.const_key)"
                    />
                    <span v-if="subject.student_subject.grade !== null">العلامة: {{ subject.student_subject.grade }}</span>
                    <span v-if="subject.student_subject.from_date">منذ {{ subject.student_subject.from_date }}</span>
                  </div>
                  <div v-else class="text-xs text-surface-400 mt-1">غير مسجل</div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <template v-if="subject.student_subject">
                    <Button label="رصد النتيجة" icon="pi pi-pencil" size="small" severity="secondary" outlined @click="openResult(subject)" />
                    <Button v-tooltip.top="'إلغاء التسجيل'" icon="pi pi-times" size="small" severity="danger" text rounded aria-label="إلغاء التسجيل" @click="removeSubject(subject)" />
                  </template>
                  <Button
                    v-else
                    label="تسجيل المساق"
                    icon="pi pi-plus"
                    size="small"
                    :loading="registering === subject.id"
                    @click="registerSubject(subject)"
                  />
                </div>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </div>

    <Dialog v-model:visible="enrollDialog" modal header="التحاق الطالب بخطة" :style="{ width: '38rem' }" :breakpoints="{ '768px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveEnroll">
        <SchemaForm v-model="enrollModel" :fields="enrollFields" :errors="enroll.errors.value" />
        <small v-if="enroll.errors.value.student_ids" class="field-error">{{ enroll.errors.value.student_ids }}</small>
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="enrollDialog = false" />
          <Button type="submit" label="تسجيل" icon="pi pi-check" :loading="enroll.saving.value" :disabled="!enrollModel.plan_id" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="resultDialog" modal :header="`نتيجة مساق: ${resultSubject?.title ?? ''}`" :style="{ width: '38rem' }" :breakpoints="{ '768px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveResult">
        <SchemaForm v-model="resultModel" :fields="resultFields" :errors="result.errors.value" is-edit />
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="resultDialog = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="result.saving.value" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="decisionDialog" modal header="المساق مُنجز سابقاً" :style="{ width: '32rem' }" :breakpoints="{ '768px': '96vw' }">
      <div v-if="decisionContext" class="flex flex-col gap-4">
        <p class="text-surface-700 leading-relaxed">
          الطالب أنجز مساق <strong>{{ decisionContext.subject.title }}</strong> سابقاً
          <template v-if="decisionContext.plan"> ضمن خطة "{{ decisionContext.plan.name }}"</template>
          <template v-if="decisionContext.previous?.grade != null"> بعلامة {{ decisionContext.previous.grade }}</template>.
          اختر الإجراء:
        </p>
        <Select
          v-model="decision"
          :options="[
            { value: 'exempt', label: 'إعفاء — معادلة النتيجة السابقة' },
            { value: 'retake', label: 'إعادة — دراسة المساق من جديد' },
          ]"
          option-label="label"
          option-value="value"
          fluid
        />
        <div class="flex justify-end gap-2">
          <Button label="إلغاء" severity="secondary" outlined @click="decisionDialog = false" />
          <Button
            label="متابعة"
            icon="pi pi-check"
            :loading="registering !== null"
            @click="registerSubject(decisionContext.subject, decision)"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
