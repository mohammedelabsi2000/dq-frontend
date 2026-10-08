<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import { api } from '@/api/http'
import CrudPage from '@/components/CrudPage.vue'
import ImagesPanel from '@/components/ImagesPanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { dash } from '@/utils/format'
import { GENDERS } from '@/utils/options'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const lookups = useLookupsStore()
const notify = useNotify()

const sponsor = ref<Row | null>(null)
const loading = ref(true)
const canManage = computed(() => auth.can('sponsors.update'))

async function loadSponsor() {
  try {
    sponsor.value = (await api.get<Row>(`sponsors/${props.id}`)).data
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}

const stats = computed(() => {
  const s = sponsor.value
  if (!s) return []
  return [
    { label: 'حلقات الذكور المطلوبة', value: s.required_halaqat_male },
    { label: 'المتبقي (ذكور)', value: s.remaining_capacity_male },
    { label: 'غير موزّع على الأفرع (ذكور)', value: s.unallocated_quota_male },
    { label: 'حلقات الإناث المطلوبة', value: s.required_halaqat_female },
    { label: 'المتبقي (إناث)', value: s.remaining_capacity_female },
    { label: 'غير موزّع على الأفرع (إناث)', value: s.unallocated_quota_female },
  ]
})

const info = computed(() => {
  const s = sponsor.value
  if (!s) return []
  return [
    { label: 'رقم المشروع', value: s.project_number },
    { label: 'جهة المتابعة', value: s.follow_up_entity },
    { label: 'نوع الكفالة', value: s.sponsorship_type },
    { label: 'الفترة', value: `${s.start_date ?? '—'} ← ${s.end_date ?? 'مفتوحة'}` },
    { label: 'نوع الطلاب', value: s.student_type_other_note || s.student_type?.name },
    { label: 'ملاحظات', value: s.notes },
  ]
})

// ── حصص الأفرع ────────────────────────────────────────────────────────
const quotaColumns: ColumnDef[] = [
  { field: 'branch', header: 'الفرع', value: (row) => row.branch?.name },
  { field: 'gender', header: 'الجنس', type: 'tag' },
  { field: 'quota', header: 'الحصة (حلقات)' },
  { field: 'remaining', header: 'المتبقي' },
  { field: 'notes', header: 'ملاحظات' },
]

const quotaFields: FieldDef[] = [
  { name: 'branch_id', label: 'الفرع', type: 'select', options: () => lookups.lists.branches, required: true, disabled: (_m, isEdit) => isEdit },
  { name: 'gender', label: 'الجنس', type: 'select', options: GENDERS, optionLabel: 'label', optionValue: 'value', required: true, disabled: (_m, isEdit) => isEdit },
  { name: 'quota', label: 'عدد الحلقات', type: 'number', required: true, min: 1 },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

const quotaToForm = (row: Row) => ({ branch_id: row.branch_id, gender: row.gender, quota: row.quota, notes: row.notes })
// التعديل يقبل الحصة والملاحظات فقط
const quotaToPayload = (model: Row, isEdit: boolean) => (isEdit ? { quota: model.quota, notes: model.notes } : model)

// ── الحلقات المكفولة ──────────────────────────────────────────────────
const halaqas = ref<Row[]>([])
const withHistory = ref(false)
const halaqasLoading = ref(false)

async function loadHalaqas() {
  halaqasLoading.value = true
  try {
    halaqas.value = (await api.get<Row[]>(`sponsors/${props.id}/halaqas`, { with_history: withHistory.value })).data ?? []
  } catch (err) {
    notify.error(err)
  } finally {
    halaqasLoading.value = false
  }
}

const loadAttachments = async () => {
  const data = (await api.get<Row>(`sponsors/${props.id}`)).data
  return (data?.attachments ?? []).map((file: Row) => ({ ...file, url: file.file_url }))
}

onMounted(() => {
  void loadSponsor()
  void loadHalaqas()
  void lookups.ensure('branches')
})
</script>

<template>
  <div>
    <PageHeader :title="sponsor?.name ?? 'تفاصيل الكفيل'" back="/sponsors">
      <Tag v-if="sponsor" :value="sponsor.is_active ? 'فعّال' : 'غير فعّال'" :severity="sponsor.is_active ? 'success' : 'danger'" />
    </PageHeader>

    <div v-if="loading" class="text-center py-16 text-surface-500"><i class="pi pi-spin pi-spinner text-3xl" /></div>

    <template v-else-if="sponsor">
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        <div v-for="item in stats" :key="item.label" class="bg-white rounded-xl border border-surface-200 p-4">
          <div class="text-xs text-surface-500 mb-1">{{ item.label }}</div>
          <div class="text-xl font-bold text-surface-900">{{ dash(item.value) }}</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-surface-200 p-5 mb-5">
        <dl class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="item in info" :key="item.label">
            <dt class="text-xs text-surface-500 mb-1">{{ item.label }}</dt>
            <dd class="font-medium text-surface-900">{{ dash(item.value) }}</dd>
          </div>
        </dl>
      </div>

      <Tabs value="quotas" lazy>
        <TabList>
          <Tab value="quotas"><i class="pi pi-chart-pie me-2" />حصص الأفرع</Tab>
          <Tab value="halaqas"><i class="pi pi-users me-2" />الحلقات المكفولة</Tab>
          <Tab value="files"><i class="pi pi-paperclip me-2" />المرفقات</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="quotas">
            <CrudPage
              embedded
              title="حصص الأفرع"
              entity="حصة"
              :endpoint="`sponsors/${id}/branch-quotas`"
              order-by=""
              :searchable="false"
              :columns="quotaColumns"
              :fields="quotaFields"
              :to-form="quotaToForm"
              :to-payload="quotaToPayload"
              :allow-create="canManage"
              :allow-edit="canManage"
              :allow-delete="canManage"
              dialog-width="36rem"
              @saved="loadSponsor"
              @deleted="loadSponsor"
            />
          </TabPanel>

          <TabPanel value="halaqas">
            <label class="flex items-center gap-2 text-sm text-surface-600 mb-4 cursor-pointer">
              <ToggleSwitch v-model="withHistory" @change="loadHalaqas" />
              إظهار الكفالات المتوقفة
            </label>
            <DataTable :value="halaqas" :loading="halaqasLoading" striped-rows size="small" data-key="id">
              <template #empty><div class="text-center py-8 text-surface-500">لا توجد حلقات مكفولة</div></template>
              <Column header="الحلقة">
                <template #body="{ data }">
                  <RouterLink :to="`/halaqas/${data.halaqa_id}`" class="text-primary-700 font-semibold hover:underline">
                    {{ data.halaqa ?? `#${data.halaqa_id}` }}
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
            </DataTable>
          </TabPanel>

          <TabPanel value="files">
            <ImagesPanel imageable-type="sponsor" :imageable-id="Number(id)" :load="loadAttachments" :can-edit="canManage" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</template>
