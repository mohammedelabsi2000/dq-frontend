<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import { api } from '@/api/http'
import AppField from '@/components/AppField.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import SchemaForm from '@/components/SchemaForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { formatDate, today } from '@/utils/format'
import { STUDENT_PLAN_STATUSES, labelOf, severityOf } from '@/utils/options'
import type { FieldDef, Row } from '@/types/schema'

/** طلاب خطة: GET/POST/PUT/DELETE plan/{plan}/students */
const props = defineProps<{ planId: number; levels: Row[] }>()

const auth = useAuthStore()
const notify = useNotify()

const students = ref<Row[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await api.get<Row>(`plan/${props.planId}/students`)
    students.value = res.data?.students ?? []
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const levelName = (id?: number | null) => props.levels.find((l) => l.id === id)?.name ?? '—'
const levelOptions = () => props.levels

// ── تسجيل طلاب ───────────────────────────────────────────────────────
const enroll = useSubmit()
const enrollDialog = ref(false)
const enrollModel = ref<Row>({})

const enrollFields: FieldDef[] = [
  { name: 'starting_level_id', label: 'مستوى البداية', type: 'select', options: levelOptions, help: 'افتراضياً أول مستوى في الخطة' },
  { name: 'from_date', label: 'تاريخ الالتحاق', type: 'date', required: true },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

function openEnroll() {
  enrollModel.value = { student_ids: [], starting_level_id: null, from_date: today(), notes: null }
  enroll.clearErrors()
  enrollDialog.value = true
}

async function saveEnroll() {
  const res = await enroll.submit(() =>
    api.post(`plan/${props.planId}/students`, { ...enrollModel.value, plan_id: props.planId }),
  )
  if (res) {
    enrollDialog.value = false
    await load()
  }
}

// ── تعديل التحاق طالب ────────────────────────────────────────────────
const edit = useSubmit()
const editDialog = ref(false)
const editing = ref<Row | null>(null)
const editModel = ref<Row>({})

const editFields: FieldDef[] = [
  { name: 'starting_level_id', label: 'مستوى البداية', type: 'select', options: levelOptions },
  { name: 'current_level_id', label: 'المستوى الحالي', type: 'select', options: levelOptions },
  { name: 'from_date', label: 'تاريخ الالتحاق', type: 'date' },
  { name: 'to_date', label: 'تاريخ الانتهاء', type: 'date', help: 'تحديده ينهي الخطة لهذا الطالب' },
  { name: 'status', label: 'الحالة', type: 'select', options: STUDENT_PLAN_STATUSES, optionLabel: 'label', optionValue: 'value' },
  { name: 'is_main', label: 'خطة رئيسية للطالب', type: 'switch' },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const dateOnly = (value?: string | null) => (value ? String(value).slice(0, 10) : null)

function openEdit(student: Row) {
  const pivot = student.plan_pivots ?? {}
  editing.value = student
  editModel.value = {
    starting_level_id: pivot.starting_level_id ?? null,
    current_level_id: pivot.current_level_id ?? null,
    from_date: dateOnly(pivot.from_date),
    to_date: dateOnly(pivot.to_date),
    status: pivot.status ?? 'active',
    is_main: !!pivot.is_main,
    notes: pivot.notes ?? null,
  }
  edit.clearErrors()
  editDialog.value = true
}

async function saveEdit() {
  // الخادم يقرأ كل المفاتيح مباشرة، لذا تُرسل جميعها حتى لو كانت null
  const res = await edit.submit(() => api.put(`plan/${props.planId}/students/${editing.value!.id}`, editModel.value))
  if (res) {
    editDialog.value = false
    await load()
  }
}

function remove(student: Row) {
  notify.confirmAction({
    message: `حذف الطالب "${student.full_name}" من هذه الخطة؟`,
    header: 'تأكيد الحذف',
    acceptLabel: 'حذف',
    accept: async () => {
      try {
        notify.success((await api.delete(`plan/${props.planId}/students/${student.id}`)).message)
        await load()
      } catch (err) {
        notify.error(err)
      }
    },
  })
}
</script>

<template>
  <div>
    <div class="flex justify-end gap-2 mb-4">
      <Button icon="pi pi-refresh" severity="secondary" outlined aria-label="تحديث" :loading="loading" @click="load" />
      <Button v-if="auth.can('plans.enroll_student')" label="تسجيل طلاب" icon="pi pi-user-plus" @click="openEnroll" />
    </div>

    <DataTable :value="students" :loading="loading" paginator :rows="15" striped-rows size="small" data-key="id">
      <template #empty><div class="text-center py-8 text-surface-500">لا يوجد طلاب مسجلون في هذه الخطة</div></template>
      <Column header="الطالب">
        <template #body="{ data }">
          <RouterLink :to="`/students/${data.id}`" class="text-primary-700 font-semibold hover:underline">
            {{ data.full_name }}
          </RouterLink>
        </template>
      </Column>
      <Column field="identity" header="رقم الهوية" />
      <Column header="المستوى الحالي">
        <template #body="{ data }">{{ levelName(data.plan_pivots?.current_level_id) }}</template>
      </Column>
      <Column header="من تاريخ">
        <template #body="{ data }">{{ formatDate(data.plan_pivots?.from_date) }}</template>
      </Column>
      <Column header="إلى تاريخ">
        <template #body="{ data }">{{ formatDate(data.plan_pivots?.to_date) }}</template>
      </Column>
      <Column header="الحالة">
        <template #body="{ data }">
          <Tag
            :value="labelOf(STUDENT_PLAN_STATUSES, data.plan_pivots?.status)"
            :severity="severityOf(data.plan_pivots?.status)"
          />
          <Tag v-if="data.plan_pivots?.is_main" value="رئيسية" severity="info" class="ms-1" />
        </template>
      </Column>
      <Column header="إجراءات" header-style="width: 1%" body-class="whitespace-nowrap">
        <template #body="{ data }">
          <Button v-if="auth.can('plans.update_student')" v-tooltip.top="'تعديل'" icon="pi pi-pencil" severity="secondary" text rounded aria-label="تعديل" @click="openEdit(data)" />
          <Button v-if="auth.can('plans.delete_student')" v-tooltip.top="'حذف من الخطة'" icon="pi pi-trash" severity="danger" text rounded aria-label="حذف" @click="remove(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="enrollDialog" modal header="تسجيل طلاب في الخطة" :style="{ width: '40rem' }" :breakpoints="{ '768px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveEnroll">
        <AppField label="الطلاب" required :error="enroll.errors.value.student_ids">
          <RemoteSelect
            v-model="enrollModel.student_ids"
            endpoint="students"
            option-label="full_name"
            option-hint="identity"
            multiple
            :invalid="!!enroll.errors.value.student_ids"
            placeholder="ابحث بالاسم أو رقم الهوية"
          />
        </AppField>
        <SchemaForm v-model="enrollModel" :fields="enrollFields" :errors="enroll.errors.value" />
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="enrollDialog = false" />
          <Button type="submit" label="تسجيل" icon="pi pi-check" :loading="enroll.saving.value" :disabled="!enrollModel.student_ids?.length" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="editDialog" modal :header="`تعديل التحاق: ${editing?.full_name ?? ''}`" :style="{ width: '40rem' }" :breakpoints="{ '768px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveEdit">
        <SchemaForm v-model="editModel" :fields="editFields" :errors="edit.errors.value" is-edit />
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="editDialog = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="edit.saving.value" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
