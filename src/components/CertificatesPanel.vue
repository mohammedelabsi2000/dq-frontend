<script setup lang="ts">
import { computed } from 'vue'
import CrudPage from './CrudPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useCertificateSchema } from '@/views/certificates/certificateSchema'
import type { Row } from '@/types/schema'

/** شهادات شخص محدد: GET certificates/{person_type}/{person_id} */
const props = defineProps<{
  personType: 'student' | 'user'
  personId: number | string
}>()

const auth = useAuthStore()
const { fields, columns, toForm, toPayload, fileUrl } = useCertificateSchema()

const canEdit = computed(() => auth.can(`${props.personType}s.certificates.update`))
const payload = (model: Row) => toPayload(model, { type: props.personType, id: props.personId })
</script>

<template>
  <CrudPage
    embedded
    title="الشهادات"
    entity="شهادة"
    endpoint="certificates"
    :list-endpoint="`certificates/${personType}/${personId}`"
    order-by=""
    :searchable="false"
    multipart
    :columns="columns"
    :fields="fields"
    :to-form="toForm"
    :to-payload="payload"
    :allow-create="canEdit"
    :allow-edit="canEdit"
    :allow-delete="canEdit"
  >
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
