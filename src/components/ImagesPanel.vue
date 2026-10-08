<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import { api } from '@/api/http'
import SchemaForm from './SchemaForm.vue'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { IMAGE_TYPES } from '@/utils/options'
import type { FieldDef, Row } from '@/types/schema'

/** مرفقات وصور عنصر (طالب/مستخدم/كفيل) عبر مسار images العام */
const props = defineProps<{
  /** اسم النوع في الـ morph map: student | user | sponsor */
  imageableType: string
  imageableId: number | string
  /** يُرجع العناصر بصيغة { id, file_name, url, is_main, image_type } */
  load: () => Promise<Row[]>
  canEdit?: boolean
}>()

const notify = useNotify()
const { saving, errors, submit } = useSubmit()

const items = ref<Row[]>([])
const loading = ref(true)
const dialog = ref(false)
const form = ref<Row>({})

const fields: FieldDef[] = [
  {
    name: 'image',
    label: 'الملف',
    type: 'file',
    required: true,
    span: 2,
    accept: '.jpeg,.jpg,.png,.gif,.pdf,.doc,.docx',
    help: 'صورة أو PDF أو Word — بحد أقصى 10 ميجابايت',
  },
  { name: 'image_type', label: 'النوع', type: 'select', options: IMAGE_TYPES, optionLabel: 'label', optionValue: 'value' },
  { name: 'is_main', label: 'ملف رئيسي', type: 'switch' },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
]

async function refresh() {
  loading.value = true
  try {
    items.value = await props.load()
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
}

function openUpload() {
  form.value = { image: null, image_type: null, is_main: false, notes: null }
  dialog.value = true
}

async function upload() {
  const res = await submit(() =>
    api.upload('images', {
      ...form.value,
      imageable_id: props.imageableId,
      imageable_type: props.imageableType,
    }),
  )
  if (res) {
    dialog.value = false
    await refresh()
  }
}

function remove(item: Row) {
  notify.confirmAction({
    message: `حذف الملف "${item.file_name}"؟`,
    header: 'تأكيد الحذف',
    acceptLabel: 'حذف',
    accept: async () => {
      try {
        const res = await api.delete(`images/${item.id}`)
        notify.success(res.message)
        await refresh()
      } catch (err) {
        notify.error(err)
      }
    },
  })
}

const isImage = (item: Row) => /\.(jpe?g|png|gif|webp)$/i.test(item.file_name ?? item.url ?? '')

onMounted(refresh)
</script>

<template>
  <div>
    <div class="flex justify-end mb-4">
      <Button v-if="canEdit" label="رفع ملف" icon="pi pi-upload" @click="openUpload" />
    </div>

    <div v-if="loading" class="text-center py-10 text-surface-500"><i class="pi pi-spin pi-spinner text-2xl" /></div>

    <div v-else-if="!items.length" class="text-center py-10 text-surface-500">
      <i class="pi pi-images text-3xl mb-2 block" />
      لا توجد مرفقات
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
      <div v-for="item in items" :key="item.id" class="border border-surface-200 rounded-xl overflow-hidden bg-white">
        <a :href="item.url" target="_blank" rel="noopener" class="block aspect-square bg-surface-100">
          <img v-if="isImage(item)" :src="item.url" :alt="item.file_name" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full grid place-items-center text-surface-400">
            <i class="pi pi-file text-4xl" />
          </div>
        </a>
        <div class="p-2.5">
          <div class="text-xs text-surface-700 truncate" :title="item.file_name">{{ item.file_name }}</div>
          <div class="flex items-center justify-between mt-2 gap-1">
            <div class="flex gap-1 flex-wrap">
              <Tag v-if="item.is_main" value="رئيسي" severity="success" />
              <Tag v-if="item.image_type" :value="item.image_type" severity="secondary" />
            </div>
            <Button
              v-if="canEdit"
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              aria-label="حذف"
              @click="remove(item)"
            />
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="dialog" modal header="رفع ملف" :style="{ width: '34rem' }" :breakpoints="{ '640px': '96vw' }">
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="upload">
        <SchemaForm v-model="form" :fields="fields" :errors="errors" />
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="dialog = false" />
          <Button type="submit" label="رفع" icon="pi pi-upload" :loading="saving" :disabled="!form.image" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
