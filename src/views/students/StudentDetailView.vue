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
import { api } from '@/api/http'
import CertificatesPanel from '@/components/CertificatesPanel.vue'
import ImagesPanel from '@/components/ImagesPanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import DailyAchievementsView from '@/views/achievements/DailyAchievementsView.vue'
import StudentPlansPanel from './StudentPlansPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { ageFrom, dash, formatDate } from '@/utils/format'
import type { Row } from '@/types/schema'

const props = defineProps<{ id: string }>()

const auth = useAuthStore()
const notify = useNotify()

const student = ref<Row | null>(null)
const loading = ref(true)
const studentId = computed(() => Number(props.id))

onMounted(async () => {
  try {
    student.value = (await api.get<Row>(`students/${props.id}`)).data
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
})

const info = computed(() => {
  const s = student.value
  if (!s) return []
  const age = ageFrom(s.dob)
  return [
    { label: 'رقم الهوية', value: s.identity },
    { label: 'الجنس', value: s.gender },
    { label: 'تاريخ الميلاد', value: s.dob ? `${s.dob}${age !== null ? ` (${age} سنة)` : ''}` : null },
    { label: 'الحالة الاجتماعية', value: s.marital_status?.name },
    { label: 'الحالة المادية', value: s.money_status?.name },
    { label: 'المسجد', value: s.mosque?.name },
    { label: 'المنطقة', value: s.mosque?.region?.name },
    { label: 'الفرع', value: s.mosque?.region?.branch?.name },
    { label: 'العنوان', value: s.location },
    { label: 'الجوال', value: s.phone },
    { label: 'واتساب', value: s.whatsapp },
    { label: 'ولي الأمر', value: s.guardian?.full_name },
    { label: 'صلة القرابة', value: s.guardian_relation?.name },
    { label: 'الأجزاء المختبَرة', value: s.memorized_juz },
    { label: 'آخر محفوظ', value: s.last_surah_label ? `${s.last_surah_label} — آية ${s.end_aya ?? ''}` : null },
    { label: 'اتجاه الحفظ', value: s.memorization_direction_label },
  ]
})

const loadImages = async () => (await api.get<Row[]>(`students/${props.id}/images`)).data ?? []
</script>

<template>
  <div>
    <PageHeader
      :title="student?.full_name_with_prefix ?? student?.full_name ?? 'ملف الطالب'"
      :subtitle="student?.current_halaqa ? `الحلقة الحالية: ${student.current_halaqa.name}` : undefined"
      back="/students"
    >
      <Tag v-if="student?.approval?.status" :value="student.approval.status" severity="info" />
      <Tag v-if="student?.deleted_at" value="محذوف" severity="danger" />
    </PageHeader>

    <div v-if="loading" class="text-center py-16 text-surface-500"><i class="pi pi-spin pi-spinner text-3xl" /></div>

    <Tabs v-else-if="student" value="info" lazy>
      <TabList>
        <Tab value="info"><i class="pi pi-id-card me-2" />البيانات</Tab>
        <Tab value="plans"><i class="pi pi-sitemap me-2" />الخطط والمساقات</Tab>
        <Tab v-if="auth.can('daily_achievements.show')" value="achievements"><i class="pi pi-book me-2" />الإنجاز اليومي</Tab>
        <Tab v-if="auth.can('students.certificates.show')" value="certificates"><i class="pi pi-verified me-2" />الشهادات</Tab>
        <Tab value="files"><i class="pi pi-paperclip me-2" />المرفقات</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="info">
          <dl class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5 mb-8">
            <div v-for="item in info" :key="item.label">
              <dt class="text-xs text-surface-500 mb-1">{{ item.label }}</dt>
              <dd class="font-medium text-surface-900 break-words">{{ dash(item.value) }}</dd>
            </div>
          </dl>

          <h3 class="font-semibold text-surface-800 mb-3">سجل الحلقات</h3>
          <DataTable :value="student.halaqas ?? []" striped-rows size="small" data-key="id">
            <template #empty><div class="text-center py-6 text-surface-500">الطالب غير مسجل في أي حلقة</div></template>
            <Column header="الحلقة">
              <template #body="{ data }">
                <RouterLink :to="`/halaqas/${data.id}`" class="text-primary-700 font-semibold hover:underline">{{ data.name }}</RouterLink>
              </template>
            </Column>
            <Column header="من تاريخ">
              <template #body="{ data }">{{ formatDate(data.from_date) }}</template>
            </Column>
            <Column header="إلى تاريخ">
              <template #body="{ data }">{{ data.to_date ? formatDate(data.to_date) : 'مستمر' }}</template>
            </Column>
            <Column header="حالة التسجيل">
              <template #body="{ data }">{{ dash(data.enrollment_status) }}</template>
            </Column>
          </DataTable>
        </TabPanel>

        <TabPanel value="plans">
          <StudentPlansPanel :student-id="studentId" />
        </TabPanel>

        <TabPanel v-if="auth.can('daily_achievements.show')" value="achievements">
          <DailyAchievementsView :student-id="studentId" :student="student" embedded />
        </TabPanel>

        <TabPanel v-if="auth.can('students.certificates.show')" value="certificates">
          <CertificatesPanel person-type="student" :person-id="studentId" />
        </TabPanel>

        <TabPanel value="files">
          <ImagesPanel imageable-type="student" :imageable-id="studentId" :load="loadImages" :can-edit="auth.can('students.update')" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
