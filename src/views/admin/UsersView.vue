<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import { api } from '@/api/http'
import CertificatesPanel from '@/components/CertificatesPanel.vue'
import CrudPage from '@/components/CrudPage.vue'
import IdentityLookup from '@/components/IdentityLookup.vue'
import UserRolesDialog from './UserRolesDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { GENDERS } from '@/utils/options'
import { omitEmpty, without } from '@/utils/payload'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const auth = useAuthStore()
const lookups = useLookupsStore()
const notify = useNotify()
const crud = ref<InstanceType<typeof CrudPage> | null>(null)

onMounted(() => {
  void lookups.ensure('branches', 'regions', 'mosques')
  void lookups.ensureConstants('marital_status', 'prefix_name')
})

const columns: ColumnDef[] = [
  { field: 'full_name', header: 'الاسم' },
  { field: 'identity', header: 'رقم الهوية' },
  { field: 'email', header: 'البريد الإلكتروني' },
  { field: 'phone', header: 'الجوال' },
  { field: 'roles', header: 'الأدوار' },
  { field: 'scopes', header: 'النطاق', value: (row) => (row.user_scopes ?? []).map((s: Row) => s.name).join('، ') },
  { field: 'is_active', header: 'الحالة' },
]

const fields: FieldDef[] = [
  { name: 'identity', label: 'رقم الهوية', required: true, placeholder: '9 أرقام — يُستخدم لتسجيل الدخول' },
  { name: 'email', label: 'البريد الإلكتروني', required: true },
  {
    name: 'password',
    label: 'كلمة المرور',
    type: 'password',
    required: true,
    help: 'عند التعديل: اتركها فارغة للإبقاء على كلمة المرور الحالية',
  },
  { name: 'fName', label: 'الاسم الأول' },
  { name: 'sName', label: 'اسم الأب' },
  { name: 'thName', label: 'اسم الجد' },
  { name: 'family', label: 'العائلة' },
  { name: 'dob', label: 'تاريخ الميلاد', type: 'date', required: true },
  { name: 'gender', label: 'الجنس', type: 'select', options: GENDERS, optionLabel: 'label', optionValue: 'value' },
  { name: 'prefix_name_id', label: 'اللقب', type: 'select', options: () => lookups.constantsOf('prefix_name') },
  { name: 'marital_status_id', label: 'الحالة الاجتماعية', type: 'select', options: () => lookups.constantsOf('marital_status') },
  { name: 'numChildren', label: 'عدد الأبناء', type: 'number', min: 0 },
  { name: 'branch_id', label: 'الفرع', type: 'select', options: () => lookups.lists.branches, resets: ['region_id', 'mosque_id'] },
  { name: 'region_id', label: 'المنطقة', type: 'select', options: (m) => lookups.regionsOf(m.branch_id), resets: ['mosque_id'] },
  { name: 'mosque_id', label: 'المسجد', type: 'select', options: (m) => (m.region_id ? lookups.mosquesOf(m.region_id) : []) },
  { name: 'phone', label: 'الجوال' },
  { name: 'whatsapp', label: 'واتساب' },
  { name: 'location', label: 'العنوان' },
  { name: 'jobname', label: 'الوظيفة' },
  { name: 'job_place', label: 'مكان العمل' },
  { name: 'job_salary', label: 'الراتب', type: 'number', min: 0, decimals: 2 },
]

const toForm = (row: Row): Row => ({
  identity: row.identity,
  email: row.email,
  password: null,
  fName: row.fName,
  sName: row.sName,
  thName: row.thName,
  family: row.family,
  dob: row.dob,
  gender: row.gender,
  prefix_name_id: row.prefix_name?.id ?? null,
  marital_status_id: row.marital_status?.id ?? null,
  numChildren: row.numChildren,
  branch_id: row.mosque?.region?.branch?.id ?? null,
  region_id: row.mosque?.region?.id ?? null,
  mosque_id: row.mosque?.id ?? null,
  phone: row.phone,
  whatsapp: row.whatsapp,
  location: row.location,
  jobname: row.jobname,
  job_place: row.job_place,
  job_salary: row.job_salary === null || row.job_salary === undefined ? null : Number(row.job_salary),
})

const toPayload = (model: Row, isEdit: boolean): Row => {
  const payload = without(model, ['branch_id', 'region_id'])
  return isEdit ? omitEmpty(payload, ['password', 'email']) : payload
}

function fillFromRegistry(model: Row, person: Row) {
  model.fName = person.fName ?? model.fName
  model.sName = person.sName ?? model.sName
  model.thName = person.thName ?? model.thName
  model.family = person.family ?? model.family
  model.dob = person.dob ?? model.dob
  if (GENDERS.some((g) => g.value === person.gender)) model.gender = person.gender
}

function toggleActive(row: Row) {
  notify.confirmAction({
    message: row.is_active ? `إيقاف حساب "${row.full_name}"؟` : `تفعيل حساب "${row.full_name}"؟`,
    acceptLabel: row.is_active ? 'إيقاف' : 'تفعيل',
    danger: !!row.is_active,
    accept: async () => {
      try {
        notify.success((await api.put(`users/${row.id}/toggle-active`)).message)
        await crud.value?.reload()
      } catch (err) {
        notify.error(err)
      }
    },
  })
}

const rolesDialog = ref(false)
const certificatesDialog = ref(false)
const activeUser = ref<Row | null>(null)

function openRoles(row: Row) {
  activeUser.value = row
  rolesDialog.value = true
}

function openCertificates(row: Row) {
  activeUser.value = row
  certificatesDialog.value = true
}
</script>

<template>
  <div>
    <CrudPage
      ref="crud"
      title="المستخدمون"
      subtitle="المستخدمون المعتمدون وأدوارهم"
      icon="pi pi-user"
      entity="مستخدم"
      endpoint="users"
      permission="users"
      server-paging
      search-placeholder="بحث بالاسم أو رقم الهوية..."
      :columns="columns"
      :fields="fields"
      :to-form="toForm"
      :to-payload="toPayload"
      :form-columns="3"
      dialog-width="64rem"
    >
      <template #cell-roles="{ row }">
        <div class="flex flex-wrap gap-1">
          <Tag v-for="role in row.roles ?? []" :key="role.id" :value="role.name" severity="secondary" />
          <span v-if="!row.roles?.length" class="text-surface-400">—</span>
        </div>
      </template>

      <template #cell-is_active="{ row }">
        <Tag :value="row.is_active ? 'فعّال' : 'موقوف'" :severity="row.is_active ? 'success' : 'danger'" />
      </template>

      <template #actions="{ row }">
        <Button
          v-if="auth.can('users.roles.update') && row.id !== auth.user?.id"
          v-tooltip.top="'الأدوار والنطاقات'"
          icon="pi pi-shield"
          severity="secondary"
          text
          rounded
          aria-label="الأدوار والنطاقات"
          @click="openRoles(row)"
        />
        <Button
          v-if="auth.can('users.certificates.show')"
          v-tooltip.top="'الشهادات'"
          icon="pi pi-verified"
          severity="secondary"
          text
          rounded
          aria-label="الشهادات"
          @click="openCertificates(row)"
        />
        <Button
          v-if="auth.can('users.toggle_active') && row.id !== auth.user?.id"
          v-tooltip.top="row.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'"
          :icon="row.is_active ? 'pi pi-ban' : 'pi pi-check-circle'"
          :severity="row.is_active ? 'warn' : 'success'"
          text
          rounded
          :aria-label="row.is_active ? 'إيقاف' : 'تفعيل'"
          @click="toggleActive(row)"
        />
      </template>

      <template #form-top="{ model }">
        <IdentityLookup :identity="model.identity" @found="fillFromRegistry(model, $event)" />
      </template>
    </CrudPage>

    <UserRolesDialog v-model:visible="rolesDialog" :user="activeUser" @saved="crud?.reload()" />

    <Dialog
      v-model:visible="certificatesDialog"
      modal
      :header="`شهادات: ${activeUser?.full_name ?? ''}`"
      :style="{ width: '64rem' }"
      :breakpoints="{ '1024px': '96vw' }"
    >
      <CertificatesPanel v-if="activeUser && certificatesDialog" person-type="user" :person-id="activeUser.id" />
    </Dialog>
  </div>
</template>
