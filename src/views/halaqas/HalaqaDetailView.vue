<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { api } from '@/api/http'
import AppField from '@/components/AppField.vue'
import CrudPage from '@/components/CrudPage.vue'
import PageHeader from '@/components/PageHeader.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import SchemaForm from '@/components/SchemaForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { dash, formatDate, today } from '@/utils/format'
import { omitEmpty } from '@/utils/payload'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const lookups = useLookupsStore()
const notify = useNotify()

const halaqa = ref<Row | null>(null)
const loading = ref(true)
const canManage = computed(() => auth.can('halaqas.update'))

async function loadHalaqa() {
  loading.value = true
  try {
    halaqa.value = (await api.get<Row>(`halaqas/${props.id}`)).data
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadHalaqa()
  void lookups.ensureConstants('enrollment_status')
  if (canManage.value) void loadSponsorships()
  void loadStatuses()
})

const info = computed(() => {
  const h = halaqa.value
  if (!h) return []
  const region = h.center?.region ?? h.region
  return [
    { label: 'النوع', value: h.type?.name },
    { label: 'الجنس', value: h.gender },
    { label: 'المركز', value: h.center?.name },
    { label: 'المنطقة', value: region?.name },
    { label: 'الفرع', value: region?.branch?.name },
    { label: 'المحفّظ', value: h.supervisors?.full_name },
    { label: 'الموقع', value: h.location },
    { label: 'الوصف', value: h.description },
  ]
})

// ── طلاب الحلقة ───────────────────────────────────────────────────────
const studentsTable = ref<InstanceType<typeof CrudPage> | null>(null)
const activeOnly = ref(true)

const studentColumns: ColumnDef[] = [
  { field: 'student_name', header: 'الطالب', value: (row) => row.student?.full_name },
  { field: 'identity', header: 'رقم الهوية', value: (row) => row.student?.identity },
  { field: 'status', header: 'حالة التسجيل', type: 'tag', value: (row) => row.enrollment_status?.name, severity: () => 'info' },
  { field: 'from_date', header: 'من تاريخ', type: 'date' },
  { field: 'to_date', header: 'إلى تاريخ', type: 'date' },
]

const statusField: FieldDef = {
  name: 'enrollment_status_id',
  label: 'حالة التسجيل',
  type: 'select',
  options: () => lookups.constantsOf('enrollment_status'),
  required: true,
}

const addForm = useSubmit()
const addDialog = ref(false)
const addModel = ref<Row>({})
const addFields: FieldDef[] = [{ name: 'from_date', label: 'تاريخ الالتحاق', type: 'date', required: true }, statusField]

function openAdd() {
  addModel.value = {
    students: [],
    from_date: today(),
    enrollment_status_id: lookups.constantsOf('enrollment_status')[0]?.id ?? null,
  }
  addForm.clearErrors()
  addDialog.value = true
}

async function saveAdd() {
  const res = await addForm.submit(() => api.post('halaqa-students', { ...addModel.value, halaqa_id: Number(props.id) }))
  if (!res) return
  const created = Array.isArray(res.data) ? res.data.length : 0
  const skipped = addModel.value.students.length - created
  if (skipped > 0) notify.warn(`${skipped} من الطلاب لم يُسجَّلوا لأنهم ملتحقون بحلقة فعّالة أخرى`)
  addDialog.value = false
  await Promise.all([studentsTable.value?.reload(), loadHalaqa()])
}

// تعديل التسجيل / نقل الطالب (PUT halaqa-students يعمل على التسجيل الحالي للطالب)
const editForm = useSubmit()
const editDialog = ref(false)
const editingEnrollment = ref<Row | null>(null)
const editModel = ref<Row>({})
const editFields: FieldDef[] = [
  statusField,
  { name: 'from_date', label: 'من تاريخ', type: 'date' },
  { name: 'to_date', label: 'إلى تاريخ', type: 'date', help: 'تحديده ينهي التحاق الطالب بالحلقة' },
]

function openEditEnrollment(row: Row) {
  editingEnrollment.value = row
  editModel.value = {
    enrollment_status_id: row.enrollment_status?.id ?? null,
    from_date: row.from_date,
    to_date: row.to_date,
    halaqa_id: null,
  }
  editForm.clearErrors()
  editDialog.value = true
}

async function saveEditEnrollment() {
  const payload = omitEmpty({ ...editModel.value, students: [editingEnrollment.value!.student.id] }, ['halaqa_id', 'from_date'])
  const res = await editForm.submit(() => api.put('halaqa-students', payload))
  if (res) {
    editDialog.value = false
    await Promise.all([studentsTable.value?.reload(), loadHalaqa()])
  }
}

// ── الكفالات ──────────────────────────────────────────────────────────
const sponsorships = ref<Row[]>([])
const eligibleSponsors = ref<Row[]>([])
const sponsorshipsLoading = ref(false)

async function loadSponsorships() {
  sponsorshipsLoading.value = true
  try {
    sponsorships.value = (await api.get<Row[]>(`halaqas/${props.id}/sponsorships`)).data ?? []
  } catch (err) {
    notify.error(err)
  } finally {
    sponsorshipsLoading.value = false
  }
}

const sponsorForm = useSubmit()
const sponsorDialog = ref(false)
const sponsorModel = ref<Row>({})
const sponsorFields: FieldDef[] = [
  {
    name: 'sponsor_id',
    label: 'الكفيل',
    type: 'select',
    options: () => eligibleSponsors.value,
    required: true,
    span: 2,
    help: 'يظهر فقط الكفلاء الفعّالون الذين لديهم سعة متبقية في فرع الحلقة',
  },
  { name: 'from_date', label: 'تاريخ بدء الكفالة', type: 'date' },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

async function openSponsor() {
  sponsorModel.value = { sponsor_id: null, from_date: today(), notes: null }
  sponsorForm.clearErrors()
  sponsorDialog.value = true
  try {
    eligibleSponsors.value = (await api.get<Row[]>(`halaqas/${props.id}/sponsorships/eligible-sponsors`)).data ?? []
  } catch (err) {
    notify.error(err)
  }
}

async function saveSponsor() {
  const res = await sponsorForm.submit(() => api.post(`halaqas/${props.id}/sponsorships`, sponsorModel.value))
  if (res) {
    sponsorDialog.value = false
    await Promise.all([loadSponsorships(), loadStatuses()])
  }
}

const stopForm = useSubmit()
const stopDialog = ref(false)
const stopping = ref<Row | null>(null)
const stopModel = ref<Row>({})
const stopFields: FieldDef[] = [
  { name: 'to_date', label: 'تاريخ الإيقاف', type: 'date' },
  { name: 'stop_reason', label: 'سبب الإيقاف', span: 2 },
]

function openStop(row: Row) {
  stopping.value = row
  stopModel.value = { to_date: today(), stop_reason: null }
  stopForm.clearErrors()
  stopDialog.value = true
}

async function saveStop() {
  const res = await stopForm.submit(() =>
    api.post(`halaqas/${props.id}/sponsorships/${stopping.value!.id}/stop`, stopModel.value),
  )
  if (res) {
    stopDialog.value = false
    await Promise.all([loadSponsorships(), loadStatuses()])
  }
}

// ── سجل حالات الحلقة ──────────────────────────────────────────────────
const statuses = ref<Row[]>([])
async function loadStatuses() {
  try {
    statuses.value = (await api.get<Row[]>('halaqa-statuses', { halaqa_id: props.id, limit: '*' })).data ?? []
  } catch {
    statuses.value = []
  }
}
</script>

<template>
  <div>
    <PageHeader :title="halaqa?.name ?? 'تفاصيل الحلقة'" back="/halaqas">
      <Tag v-if="halaqa" :value="halaqa.is_active ? 'فعّالة' : 'غير فعّالة'" :severity="halaqa.is_active ? 'success' : 'danger'" />
      <Tag v-if="halaqa?.approval?.status" :value="halaqa.approval.status" severity="info" />
    </PageHeader>

    <div v-if="loading && !halaqa" class="text-center py-16 text-surface-500"><i class="pi pi-spin pi-spinner text-3xl" /></div>

    <template v-else-if="halaqa">
      <div class="bg-white rounded-xl border border-surface-200 p-5 mb-5">
        <dl class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="item in info" :key="item.label">
            <dt class="text-xs text-surface-500 mb-1">{{ item.label }}</dt>
            <dd class="font-medium text-surface-900">{{ dash(item.value) }}</dd>
          </div>
        </dl>
      </div>

      <Tabs value="students">
        <TabList>
          <Tab value="students"><i class="pi pi-users me-2" />الطلاب</Tab>
          <Tab v-if="canManage" value="sponsorships"><i class="pi pi-heart me-2" />الكفالات</Tab>
          <Tab value="statuses"><i class="pi pi-history me-2" />سجل الحالة</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="students">
            <CrudPage
              ref="studentsTable"
              embedded
              title="طلاب الحلقة"
              entity="تسجيل"
              endpoint="halaqa-students"
              permission="halaqa_students"
              order-by=""
              server-paging
              :searchable="false"
              :base-params="{ halaqa_id: id, active_only: activeOnly }"
              :columns="studentColumns"
            >
              <template #toolbar>
                <Button
                  :label="activeOnly ? 'عرض السجل الكامل' : 'الحاليون فقط'"
                  :icon="activeOnly ? 'pi pi-history' : 'pi pi-filter'"
                  severity="secondary"
                  text
                  @click="activeOnly = !activeOnly"
                />
                <Button v-if="auth.can('halaqa_students.create')" label="إضافة طلاب" icon="pi pi-user-plus" @click="openAdd" />
              </template>
              <template #cell-student_name="{ row }">
                <RouterLink :to="`/students/${row.student?.id}`" class="font-semibold text-primary-700 hover:underline">
                  {{ row.student?.full_name }}
                </RouterLink>
              </template>
              <template #actions="{ row }">
                <Button
                  v-if="auth.can('halaqa_students.update') && !row.to_date"
                  v-tooltip.top="'تعديل التسجيل / نقل'"
                  icon="pi pi-arrow-right-arrow-left"
                  severity="secondary"
                  text
                  rounded
                  aria-label="تعديل التسجيل"
                  @click="openEditEnrollment(row)"
                />
              </template>
            </CrudPage>
          </TabPanel>

          <TabPanel v-if="canManage" value="sponsorships">
            <div class="flex justify-end mb-4">
              <Button label="إضافة كفالة" icon="pi pi-plus" @click="openSponsor" />
            </div>
            <DataTable :value="sponsorships" :loading="sponsorshipsLoading" striped-rows size="small" data-key="id">
              <template #empty><div class="text-center py-8 text-surface-500">لا توجد كفالات لهذه الحلقة</div></template>
              <Column header="الكفيل">
                <template #body="{ data }">
                  <RouterLink :to="`/sponsors/${data.sponsor_id}`" class="text-primary-700 font-semibold hover:underline">
                    {{ data.sponsor?.name ?? `#${data.sponsor_id}` }}
                  </RouterLink>
                </template>
              </Column>
              <Column field="from_date" header="من تاريخ" />
              <Column header="إلى تاريخ">
                <template #body="{ data }">{{ dash(data.to_date) }}</template>
              </Column>
              <Column header="الحالة">
                <template #body="{ data }">
                  <Tag :value="data.is_active ? 'فعّالة' : 'متوقفة'" :severity="data.is_active ? 'success' : 'secondary'" />
                </template>
              </Column>
              <Column header="سبب الإيقاف">
                <template #body="{ data }">{{ dash(data.stop_reason) }}</template>
              </Column>
              <Column header="ملاحظات">
                <template #body="{ data }">{{ dash(data.notes) }}</template>
              </Column>
              <Column header-style="width: 1%">
                <template #body="{ data }">
                  <Button v-if="data.is_active" label="إيقاف" icon="pi pi-stop-circle" severity="danger" text size="small" @click="openStop(data)" />
                </template>
              </Column>
            </DataTable>
          </TabPanel>

          <TabPanel value="statuses">
            <DataTable :value="statuses" striped-rows size="small" data-key="id">
              <template #empty><div class="text-center py-8 text-surface-500">لا يوجد سجل حالات</div></template>
              <Column header="حالة الكفالة">
                <template #body="{ data }">{{ dash(data.sponsorship_type?.name) }}</template>
              </Column>
              <Column header="من تاريخ">
                <template #body="{ data }">{{ formatDate(data.from_date) }}</template>
              </Column>
              <Column header="إلى تاريخ">
                <template #body="{ data }">{{ formatDate(data.to_date) }}</template>
              </Column>
              <Column header="ملاحظات">
                <template #body="{ data }">{{ dash(data.notes) }}</template>
              </Column>
            </DataTable>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>

    <Dialog v-model:visible="addDialog" modal header="إضافة طلاب للحلقة" :style="{ width: '40rem' }" :breakpoints="{ '768px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveAdd">
        <AppField label="الطلاب" required :error="addForm.errors.value.students" help="تظهر فقط الطلاب غير المسجلين في هذه الحلقة">
          <RemoteSelect
            v-model="addModel.students"
            endpoint="students"
            :params="{ exclude_halaqa_students: id }"
            option-label="full_name"
            option-hint="identity"
            multiple
            :invalid="!!addForm.errors.value.students"
            placeholder="ابحث بالاسم أو رقم الهوية"
          />
        </AppField>
        <SchemaForm v-model="addModel" :fields="addFields" :errors="addForm.errors.value" />
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="addDialog = false" />
          <Button type="submit" label="إضافة" icon="pi pi-check" :loading="addForm.saving.value" :disabled="!addModel.students?.length" />
        </div>
      </form>
    </Dialog>

    <Dialog
      v-model:visible="editDialog"
      modal
      :header="`تعديل تسجيل: ${editingEnrollment?.student?.full_name ?? ''}`"
      :style="{ width: '40rem' }"
      :breakpoints="{ '768px': '96vw' }"
    >
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveEditEnrollment">
        <SchemaForm v-model="editModel" :fields="editFields" :errors="editForm.errors.value" is-edit />
        <AppField label="نقل إلى حلقة أخرى" :error="editForm.errors.value.halaqa_id" help="اختياري — اتركه فارغاً للإبقاء على الحلقة الحالية">
          <RemoteSelect v-model="editModel.halaqa_id" endpoint="halaqas" option-label="name" :invalid="!!editForm.errors.value.halaqa_id" />
        </AppField>
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="editDialog = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="editForm.saving.value" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="sponsorDialog" modal header="إضافة كفالة للحلقة" :style="{ width: '36rem' }" :breakpoints="{ '768px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveSponsor">
        <SchemaForm v-model="sponsorModel" :fields="sponsorFields" :errors="sponsorForm.errors.value" />
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="sponsorDialog = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="sponsorForm.saving.value" :disabled="!sponsorModel.sponsor_id" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="stopDialog" modal :header="`إيقاف كفالة: ${stopping?.sponsor?.name ?? ''}`" :style="{ width: '32rem' }" :breakpoints="{ '768px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="saveStop">
        <SchemaForm v-model="stopModel" :fields="stopFields" :errors="stopForm.errors.value" />
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="stopDialog = false" />
          <Button type="submit" label="إيقاف الكفالة" icon="pi pi-stop-circle" severity="danger" :loading="stopForm.saving.value" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
