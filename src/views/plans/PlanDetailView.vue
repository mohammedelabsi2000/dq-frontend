<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { api } from '@/api/http'
import PageHeader from '@/components/PageHeader.vue'
import SchemaForm from '@/components/SchemaForm.vue'
import PlanStudentsPanel from './PlanStudentsPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { MEMORIZATION_DIRECTIONS, PERIOD_UNITS, labelOf } from '@/utils/options'
import type { FieldDef, Row } from '@/types/schema'

const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const lookups = useLookupsStore()
const notify = useNotify()

const plan = ref<Row | null>(null)
const loading = ref(true)

const levels = computed<Row[]>(() => [...(plan.value?.levels ?? [])].sort((a, b) => a.order - b.order))

async function load() {
  loading.value = true
  try {
    plan.value = (await api.get<Row>(`plan/plans/${props.id}`)).data
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
  void lookups.ensure('tracks', 'subjects')
})

// ── المستويات ─────────────────────────────────────────────────────────
const levelForm = useSubmit()
const levelDialog = ref(false)
const editingLevel = ref<Row | null>(null)
const levelModel = ref<Row>({})

const levelFields: FieldDef[] = [
  { name: 'name', label: 'اسم المستوى', required: true },
  { name: 'order', label: 'الترتيب', type: 'number', required: true, min: 1 },
  { name: 'period', label: 'المدة', type: 'number', required: true, min: 1 },
  { name: 'period_unit', label: 'وحدة المدة', type: 'select', options: PERIOD_UNITS, optionLabel: 'label', optionValue: 'value', required: true },
  { name: 'min_period', label: 'أقل مدة', type: 'number', min: 1 },
  { name: 'max_period', label: 'أقصى مدة', type: 'number', min: 1 },
  { name: 'weight', label: 'وزن المستوى', type: 'number', required: true, min: 1 },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

function openLevel(level: Row | null) {
  editingLevel.value = level
  levelModel.value = level
    ? {
        name: level.name,
        order: level.order,
        period: level.period,
        period_unit: level.period_unit,
        min_period: level.min_period,
        max_period: level.max_period,
        weight: level.weight,
        notes: level.notes,
        tracks: (level.tracks ?? []).map((t: Row) => ({ track_id: t.track_id, weight: t.weight, order: t.order })),
      }
    : {
        name: null,
        order: levels.value.length + 1,
        period: 1,
        period_unit: 'month',
        min_period: null,
        max_period: null,
        weight: 1,
        notes: null,
        tracks: [],
      }
  levelForm.clearErrors()
  levelDialog.value = true
}

function addTrackRow() {
  levelModel.value.tracks.push({ track_id: null, weight: 0, order: levelModel.value.tracks.length + 1 })
}

const tracksWeight = computed(() =>
  (levelModel.value.tracks ?? []).reduce((sum: number, t: Row) => sum + Number(t.weight ?? 0), 0),
)

async function saveLevel() {
  const payload = { ...levelModel.value, plan_id: Number(props.id) }
  const res = await levelForm.submit(() =>
    editingLevel.value ? api.put(`plan/levels/${editingLevel.value.id}`, payload) : api.post('plan/levels', payload),
  )
  if (res) {
    levelDialog.value = false
    await load()
  }
}

function removeLevel(level: Row) {
  notify.confirmAction({
    message: `حذف المستوى "${level.name}"؟`,
    header: 'تأكيد الحذف',
    acceptLabel: 'حذف',
    accept: async () => {
      try {
        notify.success((await api.delete(`plan/levels/${level.id}`)).message)
        await load()
      } catch (err) {
        notify.error(err)
      }
    },
  })
}

async function moveLevel(index: number, direction: -1 | 1) {
  const ordered = [...levels.value]
  const target = index + direction
  if (target < 0 || target >= ordered.length) return
  ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
  try {
    const res = await api.post('plan/levels/reorder', {
      items: ordered.map((level, i) => ({ id: level.id, order: i + 1 })),
    })
    notify.success(res.message)
    await load()
  } catch (err) {
    notify.error(err)
  }
}

// ── مساقات المسار داخل المستوى ────────────────────────────────────────
const subjectForm = useSubmit()
const subjectDialog = ref(false)
const subjectTrack = ref<Row | null>(null)
const editingSubject = ref<Row | null>(null)
const subjectModel = ref<Row>({})

const subjectFields: FieldDef[] = [
  {
    name: 'subject_id',
    label: 'المساق',
    type: 'select',
    options: () => lookups.lists.subjects,
    optionLabel: 'title',
    required: true,
    span: 2,
    // أجزاء المساق تتغير بتغيّره، فتُصفَّر الاتجاهات المخصصة
    onChange: (model) => {
      model.juz_directions = {}
    },
  },
  { name: 'order', label: 'الترتيب', type: 'number', min: 0 },
  { name: 'weight', label: 'الوزن %', type: 'number', min: 0, max: 100, decimals: 2 },
  {
    name: 'memorization_direction',
    label: 'اتجاه الحفظ العام في الخطة',
    type: 'select',
    options: MEMORIZATION_DIRECTIONS,
    optionLabel: 'label',
    optionValue: 'value',
  },
  { name: 'is_required', label: 'مساق إجباري', type: 'switch' },
]

function openSubject(track: Row, item: Row | null) {
  subjectTrack.value = track
  editingSubject.value = item
  subjectModel.value = item
    ? {
        subject_id: item.subject_id,
        order: item.order,
        weight: item.weight,
        memorization_direction: item.memorization_direction,
        is_required: !!item.is_required,
        juz_directions: { ...(item.juz_directions ?? {}) },
      }
    : {
        subject_id: null,
        order: (track.level_track_subjects?.length ?? 0) + 1,
        weight: null,
        memorization_direction: null,
        is_required: true,
        juz_directions: {},
      }
  subjectForm.clearErrors()
  subjectDialog.value = true
}

/** أجزاء المساق المختار؛ لكل جزء يمكن تخصيص اتجاه حفظ مختلف عن الاتجاه العام */
const subjectJuzs = computed<Row[]>(
  () => lookups.lists.subjects.find((subject) => subject.id === subjectModel.value.subject_id)?.custom_juzs ?? [],
)

const JUZ_DIRECTION_OPTIONS = [
  { value: 'ascending', label: 'تصاعدي' },
  { value: 'descending', label: 'تنازلي' },
]

const customJuzCount = (item: Row) => Object.keys(item.juz_directions ?? {}).length

async function saveSubject() {
  // تُرسل فقط الأجزاء التي خُصص لها اتجاه وتنتمي للمساق الحالي؛ بدون تخصيص تُرسل null
  const allowed = new Set(subjectJuzs.value.map((juz) => String(juz.id)))
  const directions = Object.fromEntries(
    Object.entries(subjectModel.value.juz_directions ?? {}).filter(([id, direction]) => direction && allowed.has(id)),
  )
  const payload = {
    ...subjectModel.value,
    juz_directions: Object.keys(directions).length ? directions : null,
    level_track_id: subjectTrack.value!.id,
  }
  const res = await subjectForm.submit(() =>
    editingSubject.value
      ? api.put(`plan/level-track-subjects/${editingSubject.value.id}`, payload)
      : api.post('plan/level-track-subjects', payload),
  )
  if (res) {
    subjectDialog.value = false
    await load()
  }
}

function removeSubject(item: Row) {
  notify.confirmAction({
    message: `إزالة المساق "${item.subject?.title ?? ''}" من المسار؟`,
    header: 'تأكيد الحذف',
    acceptLabel: 'إزالة',
    accept: async () => {
      try {
        notify.success((await api.delete(`plan/level-track-subjects/${item.id}`)).message)
        await load()
      } catch (err) {
        notify.error(err)
      }
    },
  })
}

const sortedSubjects = (track: Row): Row[] =>
  [...(track.level_track_subjects ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
</script>

<template>
  <div>
    <PageHeader :title="plan?.name ?? 'تفاصيل الخطة'" :subtitle="plan?.description" back="/plans">
      <Tag v-if="plan" :value="plan.type_label" :severity="plan.type === 'main' ? 'info' : 'secondary'" />
      <Tag v-if="plan" :value="plan.is_active ? 'فعّالة' : 'معطّلة'" :severity="plan.is_active ? 'success' : 'danger'" />
    </PageHeader>

    <div v-if="loading && !plan" class="text-center py-16 text-surface-500">
      <i class="pi pi-spin pi-spinner text-3xl" />
    </div>

    <template v-else-if="plan">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-500 mb-1">المدة</div>
          <div class="font-semibold">{{ plan.period }} {{ plan.period_unit_label }}</div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-500 mb-1">أقل / أقصى مدة</div>
          <div class="font-semibold">{{ plan.min_period ?? '—' }} / {{ plan.max_period ?? '—' }}</div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-500 mb-1">الفئة العمرية</div>
          <div class="font-semibold">{{ plan.age_from ?? '—' }} - {{ plan.age_to ?? '—' }}</div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-500 mb-1">عدد المستويات</div>
          <div class="font-semibold">{{ levels.length }}</div>
        </div>
      </div>

      <Tabs value="levels" lazy>
        <TabList>
          <Tab value="levels"><i class="pi pi-list me-2" />المستويات والمسارات</Tab>
          <Tab v-if="auth.can('plans.show_plan_students')" value="students"><i class="pi pi-users me-2" />طلاب الخطة</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="levels">
            <div class="flex justify-end mb-4">
              <Button v-if="auth.can('levels.create')" label="إضافة مستوى" icon="pi pi-plus" @click="openLevel(null)" />
            </div>

            <div v-if="!levels.length" class="text-center py-10 text-surface-500">
              <i class="pi pi-inbox text-3xl mb-2 block" />
              لا توجد مستويات في هذه الخطة بعد
            </div>

            <div v-for="(level, index) in levels" :key="level.id" class="border border-surface-200 rounded-xl mb-4 overflow-hidden">
              <div class="flex flex-wrap items-center justify-between gap-3 bg-surface-50 px-4 py-3 border-b border-surface-200">
                <div class="flex items-center gap-3">
                  <span class="w-8 h-8 grid place-items-center rounded-full bg-primary-600 text-white text-sm font-bold">
                    {{ level.order }}
                  </span>
                  <div>
                    <div class="font-semibold text-surface-900">{{ level.name }}</div>
                    <div class="text-xs text-surface-500">
                      المدة: {{ level.period }} {{ level.period_unit_label ?? labelOf(PERIOD_UNITS, level.period_unit) }}
                      · الوزن: {{ level.weight }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <template v-if="auth.can('levels.reorder')">
                    <Button v-tooltip.top="'تقديم'" icon="pi pi-arrow-up" severity="secondary" text rounded :disabled="index === 0" aria-label="تقديم" @click="moveLevel(index, -1)" />
                    <Button v-tooltip.top="'تأخير'" icon="pi pi-arrow-down" severity="secondary" text rounded :disabled="index === levels.length - 1" aria-label="تأخير" @click="moveLevel(index, 1)" />
                  </template>
                  <Button v-if="auth.can('levels.update')" v-tooltip.top="'تعديل المستوى ومساراته'" icon="pi pi-pencil" severity="secondary" text rounded aria-label="تعديل" @click="openLevel(level)" />
                  <Button v-if="auth.can('levels.delete')" v-tooltip.top="'حذف'" icon="pi pi-trash" severity="danger" text rounded aria-label="حذف" @click="removeLevel(level)" />
                </div>
              </div>

              <div class="p-4 bg-white">
                <p v-if="!level.tracks?.length" class="text-sm text-surface-500">
                  لا توجد مسارات — عدّل المستوى لإضافة مسارات.
                </p>
                <div v-for="track in level.tracks" :key="track.id" class="mb-4 last:mb-0">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-directions text-primary-600" />
                      <span class="font-semibold text-surface-800">{{ track.track_name }}</span>
                      <Tag :value="`الوزن ${track.weight}%`" severity="secondary" />
                    </div>
                    <Button
                      v-if="auth.can('level_track_subjects.create')"
                      label="إضافة مساق"
                      icon="pi pi-plus"
                      size="small"
                      severity="secondary"
                      outlined
                      @click="openSubject(track, null)"
                    />
                  </div>
                  <div v-if="!track.level_track_subjects?.length" class="text-sm text-surface-400 ps-6">لا توجد مساقات</div>
                  <ul v-else class="divide-y divide-surface-100 border border-surface-100 rounded-lg">
                    <li v-for="item in sortedSubjects(track)" :key="item.id" class="flex items-center justify-between gap-3 px-3 py-2">
                      <div class="flex flex-wrap items-center gap-2 min-w-0">
                        <span class="text-xs text-surface-400 w-5">{{ item.order }}</span>
                        <span class="truncate">{{ item.subject?.title ?? `مساق #${item.subject_id}` }}</span>
                        <Tag v-if="item.is_required" value="إجباري" severity="warn" />
                        <Tag v-if="item.weight" :value="`${item.weight}%`" severity="secondary" />
                        <Tag
                          v-if="item.memorization_direction"
                          :value="item.memorization_direction === 'descending' ? 'تنازلي' : 'تصاعدي'"
                          severity="info"
                        />
                        <Tag
                          v-if="customJuzCount(item)"
                          v-tooltip.top="'أجزاء لها اتجاه حفظ مخصص'"
                          :value="`${customJuzCount(item)} جزء باتجاه مخصص`"
                          severity="contrast"
                        />
                      </div>
                      <div class="flex shrink-0">
                        <Button v-if="auth.can('level_track_subjects.update')" icon="pi pi-pencil" severity="secondary" text rounded size="small" aria-label="تعديل" @click="openSubject(track, item)" />
                        <Button v-if="auth.can('level_track_subjects.delete')" icon="pi pi-times" severity="danger" text rounded size="small" aria-label="إزالة" @click="removeSubject(item)" />
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel v-if="auth.can('plans.show_plan_students')" value="students">
            <PlanStudentsPanel :plan-id="Number(id)" :levels="levels" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>

    <Dialog
      v-model:visible="levelDialog"
      modal
      :header="editingLevel ? 'تعديل مستوى' : 'إضافة مستوى'"
      :style="{ width: '48rem' }"
      :breakpoints="{ '768px': '96vw' }"
    >
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveLevel">
        <SchemaForm v-model="levelModel" :fields="levelFields" :errors="levelForm.errors.value" :is-edit="!!editingLevel" />

        <div class="border border-surface-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="font-semibold text-surface-800">مسارات المستوى</h3>
              <p class="text-xs" :class="tracksWeight > 100 ? 'text-red-500' : 'text-surface-500'">
                مجموع الأوزان: {{ tracksWeight }}%
              </p>
            </div>
            <Button type="button" label="إضافة مسار" icon="pi pi-plus" size="small" severity="secondary" outlined @click="addTrackRow" />
          </div>
          <p v-if="!levelModel.tracks?.length" class="text-sm text-surface-500">لم تُضف مسارات بعد.</p>
          <div
            v-for="(track, index) in levelModel.tracks"
            :key="index"
            class="grid grid-cols-1 md:grid-cols-[1fr_8rem_8rem_auto] gap-3 items-start mb-3"
          >
            <div>
              <Select
                v-model="track.track_id"
                :options="lookups.lists.tracks"
                option-label="name"
                option-value="id"
                placeholder="المسار"
                fluid
                :invalid="!!levelForm.errors.value[`tracks.${index}.track_id`]"
              />
              <small class="field-error">{{ levelForm.errors.value[`tracks.${index}.track_id`] }}</small>
            </div>
            <InputNumber v-model="track.weight" placeholder="الوزن %" :min="0" :max="100" :max-fraction-digits="2" fluid />
            <InputNumber v-model="track.order" placeholder="الترتيب" :min="1" fluid />
            <Button type="button" icon="pi pi-times" severity="danger" text rounded aria-label="حذف المسار" @click="levelModel.tracks.splice(index, 1)" />
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="levelDialog = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="levelForm.saving.value" />
        </div>
      </form>
    </Dialog>

    <Dialog
      v-model:visible="subjectDialog"
      modal
      :header="`${editingSubject ? 'تعديل' : 'إضافة'} مساق — ${subjectTrack?.track_name ?? ''}`"
      :style="{ width: '38rem' }"
      :breakpoints="{ '768px': '96vw' }"
    >
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveSubject">
        <SchemaForm v-model="subjectModel" :fields="subjectFields" :errors="subjectForm.errors.value" :is-edit="!!editingSubject" />

        <div v-if="subjectJuzs.length" class="border border-surface-200 rounded-lg p-4">
          <h3 class="font-semibold text-surface-800">اتجاه الحفظ لكل جزء</h3>
          <p class="text-xs text-surface-500 mb-3">اختياري — الجزء الذي لا يُخصَّص له اتجاه يتبع الاتجاه العام.</p>
          <div v-for="juz in subjectJuzs" :key="juz.id" class="grid grid-cols-[1fr_12rem] gap-3 items-center mb-2 last:mb-0">
            <span class="text-sm text-surface-700 truncate">{{ juz.name ?? `جزء #${juz.id}` }}</span>
            <Select
              v-model="subjectModel.juz_directions[juz.id]"
              :options="JUZ_DIRECTION_OPTIONS"
              option-label="label"
              option-value="value"
              show-clear
              fluid
              placeholder="حسب الاتجاه العام"
            />
          </div>
          <small v-if="subjectForm.errors.value.juz_directions" class="field-error">
            {{ subjectForm.errors.value.juz_directions }}
          </small>
        </div>
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="subjectDialog = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="subjectForm.saving.value" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
