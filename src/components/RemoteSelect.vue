<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import { api } from '@/api/http'
import type { Row } from '@/types/schema'

/**
 * قائمة اختيار تبحث في الخادم (search + limit) للجداول الكبيرة
 * مثل الطلاب والحلقات والمستخدمين.
 */
const model = defineModel<any>()

const props = withDefaults(
  defineProps<{
    endpoint: string
    params?: Row
    optionLabel?: string
    /** نص ثانوي يظهر تحت الاسم، مثل رقم الهوية */
    optionHint?: string
    multiple?: boolean
    placeholder?: string
    invalid?: boolean
    disabled?: boolean
    /** العنصر/العناصر المختارة مسبقاً لعرض اسمها قبل أي بحث */
    selected?: Row | Row[] | null
    limit?: number
  }>(),
  { optionLabel: 'name', limit: 25 },
)

const emit = defineEmits<{ select: [option: Row | Row[] | null] }>()

const results = ref<Row[]>([])
const loading = ref(false)
const loaded = ref(false)
/** نحتفظ بالعناصر المختارة حتى لا تختفي تسميتها عند تغيّر نتائج البحث */
const known = ref(new Map<number, Row>())

function remember(items: Row | Row[] | null | undefined) {
  const list = Array.isArray(items) ? items : items ? [items] : []
  list.forEach((item) => item?.id != null && known.value.set(item.id, item))
}

watch(() => props.selected, remember, { immediate: true, deep: true })

const options = computed<Row[]>(() => {
  const ids = new Set(results.value.map((r) => r.id))
  const selectedIds: number[] = Array.isArray(model.value) ? model.value : model.value != null ? [model.value] : []
  const extra = selectedIds.filter((id) => !ids.has(id) && known.value.has(id)).map((id) => known.value.get(id)!)
  return [...extra, ...results.value]
})

let requestId = 0
async function fetchOptions(search = '') {
  const current = ++requestId
  loading.value = true
  try {
    const res = await api.get<Row[]>(props.endpoint, { ...props.params, search, limit: props.limit })
    if (current === requestId) {
      results.value = Array.isArray(res.data) ? res.data : []
      loaded.value = true
    }
  } catch {
    if (current === requestId) results.value = []
  } finally {
    if (current === requestId) loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
function onFilter(event: { value: string }) {
  clearTimeout(timer)
  timer = setTimeout(() => fetchOptions(event.value), 350)
}

function onShow() {
  if (!loaded.value) void fetchOptions()
}

watch(
  () => props.endpoint + JSON.stringify(props.params ?? {}),
  () => {
    loaded.value = false
    results.value = []
  },
)

function onChange() {
  const ids: number[] = Array.isArray(model.value) ? model.value : model.value != null ? [model.value] : []
  const picked = options.value.filter((o) => ids.includes(o.id))
  remember(picked)
  emit('select', props.multiple ? picked : (picked[0] ?? null))
}

const filterFields = computed(() => [props.optionLabel, ...(props.optionHint ? [props.optionHint] : [])])
</script>

<template>
  <component
    :is="multiple ? MultiSelect : Select"
    v-model="model"
    :options="options"
    :option-label="optionLabel"
    option-value="id"
    filter
    :filter-fields="filterFields"
    :loading="loading"
    :show-clear="!multiple"
    :display="multiple ? 'chip' : undefined"
    fluid
    :invalid="invalid"
    :disabled="disabled"
    :placeholder="placeholder ?? 'ابحث واختر'"
    empty-message="اكتب للبحث"
    empty-filter-message="لا توجد نتائج"
    @filter="onFilter"
    @before-show="onShow"
    @change="onChange"
  >
    <template #option="{ option }">
      <div class="flex flex-col">
        <span>{{ option[optionLabel] }}</span>
        <small v-if="optionHint && option[optionHint]" class="text-surface-500">{{ option[optionHint] }}</small>
      </div>
    </template>
  </component>
</template>
