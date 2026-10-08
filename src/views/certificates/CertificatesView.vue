<script setup lang="ts">
import { computed } from 'vue'
import Select from 'primevue/select'
import AppField from '@/components/AppField.vue'
import CrudPage from '@/components/CrudPage.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import { useAuthStore } from '@/stores/auth'
import { useCertificateSchema } from './certificateSchema'
import type { ColumnDef, Row } from '@/types/schema'

const auth = useAuthStore()
const { fields, columns, toForm, toPayload, fileUrl } = useCertificateSchema()

const PERSON_TYPES = [
  { value: 'student', label: 'طالب', permission: 'students.certificates.update' },
  { value: 'user', label: 'مستخدم', permission: 'users.certificates.update' },
]
const editableTypes = computed(() => PERSON_TYPES.filter((type) => auth.can(type.permission)))
const canEdit = computed(() => editableTypes.value.length > 0)

const allColumns: ColumnDef[] = [
  { field: 'person_full_name', header: 'صاحب الشهادة' },
  { field: 'person_type', header: 'الصفة', value: (row) => (row.person_type === 'student' ? 'طالب' : 'مستخدم') },
  ...columns,
]

const payload = (model: Row) => toPayload(model)
</script>

<template>
  <CrudPage
    title="الشهادات"
    subtitle="شهادات ومؤهلات الطلاب والمستخدمين"
    icon="pi pi-verified"
    entity="شهادة"
    endpoint="certificates"
    server-paging
    order-by=""
    :searchable="false"
    multipart
    :columns="allColumns"
    :fields="fields"
    :to-form="toForm"
    :to-payload="payload"
    :allow-create="canEdit"
    :allow-edit="canEdit"
    :allow-delete="canEdit"
  >
    <template #form-top="{ model, isEdit, errors }">
      <div v-if="!isEdit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppField label="صاحب الشهادة" required :error="errors.person_type">
          <Select
            v-model="model.person_type"
            :options="editableTypes"
            option-label="label"
            option-value="value"
            placeholder="طالب أم مستخدم؟"
            fluid
            @change="model.person_id = null"
          />
        </AppField>
        <AppField label="الاسم" required :error="errors.person_id">
          <RemoteSelect
            v-model="model.person_id"
            :endpoint="model.person_type === 'user' ? 'users' : 'students'"
            option-label="full_name"
            option-hint="identity"
            :disabled="!model.person_type"
            :invalid="!!errors.person_id"
          />
        </AppField>
      </div>
    </template>

    <template #cell-file="{ row }">
      <a v-if="fileUrl(row)" :href="fileUrl(row)!" target="_blank" rel="noopener" class="text-primary-600 hover:underline">
        <i class="pi pi-file-pdf" /> عرض
      </a>
      <a
        v-else-if="row.certificate_link"
        :href="row.certificate_link"
        target="_blank"
        rel="noopener"
        class="text-primary-600 hover:underline"
      >
        <i class="pi pi-external-link" /> رابط
      </a>
      <span v-else>—</span>
    </template>
  </CrudPage>
</template>
