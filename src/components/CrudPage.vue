<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'
import { api } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { dash, formatDate, getPath } from '@/utils/format'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'
import PageHeader from './PageHeader.vue'
import SchemaForm from './SchemaForm.vue'

/**
 * صفحة CRUD عامة تُبنى من تعريف الأعمدة والحقول:
 * جدول + بحث + فلاتر + نافذة إضافة/تعديل + حذف، وفق نمط ردود الباك اند (data/total/skip/limit).
 */
const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    icon?: string
    back?: string
    /** اسم العنصر المفرد لعناوين النوافذ، مثل "فرع" */
    entity?: string
    endpoint: string
    /** مسار مختلف لجلب القائمة إن لم يكن نفس مسار الحفظ */
    listEndpoint?: string
    /** فلترة محلية للصفوف بعد الجلب */
    rowFilter?: (row: Row) => boolean
    /** بادئة الصلاحيات، مثل branches => branches.create/update/delete */
    permission?: string
    columns: ColumnDef[]
    fields?: FieldDef[]
    filters?: FieldDef[]
    /** ترقيم من الخادم (skip/limit) بدل تحميل كل الصفوف */
    serverPaging?: boolean
    searchable?: boolean
    searchPlaceholder?: string
    baseParams?: Row
    orderBy?: 'asc' | 'desc' | ''
    toForm?: (row: Row) => Row
    toPayload?: (model: Row, isEdit: boolean) => Row
    multipart?: boolean
    allowCreate?: boolean
    allowEdit?: boolean
    allowDelete?: boolean
    /** إظهار زر الاستعادة للصفوف المحذوفة (deleted_at) */
    restorable?: boolean
    dialogWidth?: string
    formColumns?: 1 | 2 | 3
    /** بدون ترويسة الصفحة (للاستخدام داخل التبويبات) */
    embedded?: boolean
    selectable?: boolean
  }>(),
  {
    entity: 'عنصر',
    fields: () => [],
    filters: () => [],
    searchable: true,
    orderBy: 'desc',
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    dialogWidth: '44rem',
    formColumns: 2,
  },
)

const emit = defineEmits<{
  saved: [data: any, isEdit: boolean]
  deleted: [row: Row]
  loaded: [rows: Row[]]
}>()

const selection = defineModel<Row[]>('selection', { default: () => [] })

const auth = useAuthStore()
const notify = useNotify()
const { saving, errors, submit, clearErrors } = useSubmit()

const rows = ref<Row[]>([])
const total = ref(0)
const loading = ref(false)
const first = ref(0)
const perPage = ref(15)
const search = ref('')
const filterModel = reactive<Row>({})

const can = (action: string) => !props.permission || auth.can(`${props.permission}.${action}`)
const canCreate = computed(() => props.allowCreate && props.fields.length > 0 && can('create'))
const canEdit = computed(() => props.allowEdit && props.fields.length > 0 && can('update'))
const canDelete = computed(() => props.allowDelete && can('delete'))
const canRestore = computed(() => props.restorable && can('restore'))

async function load() {
  loading.value = true
  try {
    const params: Row = { ...props.baseParams, ...filterModel, search: search.value, order_by: props.orderBy }
    if (props.serverPaging) {
      params.skip = first.value
      params.limit = perPage.value
    } else {
      params.limit = '*'
    }
    const res = await api.get<Row[]>(props.listEndpoint ?? props.endpoint, params)
    rows.value = Array.isArray(res.data) ? res.data : []
    total.value = props.serverPaging ? Number(res.total ?? rows.value.length) : rows.value.length
    emit('loaded', rows.value)
  } catch (err) {
    rows.value = []
    total.value = 0
    notify.error(err)
  } finally {
    loading.value = false
  }
}

function reload(resetPage = false) {
  if (resetPage) first.value = 0
  return load()
}

function onPage(event: DataTablePageEvent) {
  first.value = event.first
  perPage.value = event.rows
  if (props.serverPaging) void load()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => reload(true), 400)
})
watch(filterModel, () => reload(true))
// مقارنة نصية حتى لا يُعاد التحميل عند كل إعادة رسم للأب بكائن baseParams جديد بنفس القيم
watch(
  () => (props.listEndpoint ?? props.endpoint) + JSON.stringify(props.baseParams ?? {}),
  () => reload(true),
)

function resetFilters() {
  search.value = ''
  Object.keys(filterModel).forEach((key) => delete filterModel[key])
}

const hasActiveFilters = computed(
  () => !!search.value || Object.values(filterModel).some((v) => v !== null && v !== undefined && v !== ''),
)

// ── نافذة الإضافة/التعديل ─────────────────────────────────────────────
const dialogVisible = ref(false)
const editing = ref<Row | null>(null)
const model = ref<Row>({})
const isEdit = computed(() => editing.value !== null)

function emptyModel(): Row {
  const out: Row = {}
  for (const field of props.fields) {
    if (field.default !== undefined) out[field.name] = field.default
    else if (field.type === 'switch') out[field.name] = false
    else if (field.type === 'multiselect') out[field.name] = []
    else out[field.name] = null
  }
  return out
}

function openCreate(preset: Row = {}) {
  editing.value = null
  model.value = { ...emptyModel(), ...preset }
  clearErrors()
  dialogVisible.value = true
}

function openEdit(row: Row) {
  editing.value = row
  if (props.toForm) {
    model.value = { ...emptyModel(), ...props.toForm(row) }
  } else {
    const picked = emptyModel()
    for (const field of props.fields) {
      if (row[field.name] !== undefined) picked[field.name] = row[field.name]
    }
    model.value = picked
  }
  // الخادم يعيد القيم المنطقية أحياناً 0/1 والمفتاح يتوقع true/false
  for (const field of props.fields) {
    if (field.type === 'switch') model.value[field.name] = !!model.value[field.name]
  }
  clearErrors()
  dialogVisible.value = true
}

async function save() {
  const payload = props.toPayload ? props.toPayload(model.value, isEdit.value) : { ...model.value }
  const url = isEdit.value ? `${props.endpoint}/${editing.value!.id}` : props.endpoint
  const res = await submit(() => {
    if (props.multipart) return api.upload(url, payload, isEdit.value ? 'put' : 'post')
    return isEdit.value ? api.put(url, payload) : api.post(url, payload)
  })
  if (!res) return
  dialogVisible.value = false
  emit('saved', res.data, isEdit.value)
  await load()
}

function remove(row: Row) {
  notify.confirmAction({
    message: `هل أنت متأكد من حذف هذا ${props.entity}؟`,
    header: 'تأكيد الحذف',
    acceptLabel: 'حذف',
    accept: async () => {
      try {
        const res = await api.delete(`${props.endpoint}/${row.id}`)
        notify.success(res.message)
        emit('deleted', row)
        await load()
      } catch (err) {
        notify.error(err)
      }
    },
  })
}

async function restore(row: Row) {
  try {
    const res = await api.post(`${props.endpoint}/${row.id}/restore`)
    notify.success(res.message)
    await load()
  } catch (err) {
    notify.error(err)
  }
}

function cellValue(column: ColumnDef, row: Row) {
  return column.value ? column.value(row) : getPath(row, column.field)
}

/** أعمدة النصوص الحرة الطويلة تُقصّ بدل أن تمدّ الجدول */
const LONG_TEXT_FIELDS = ['notes', 'description', 'rejection_reason', 'stop_reason']
const isLongText = (column: ColumnDef) => LONG_TEXT_FIELDS.includes(column.field)

const visibleRows = computed(() => (props.rowFilter ? rows.value.filter(props.rowFilter) : rows.value))

const hasActions = computed(() => canEdit.value || canDelete.value || canRestore.value)

onMounted(load)

defineExpose({ reload, openCreate, openEdit, rows })
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" :title="title" :subtitle="subtitle" :icon="icon" :back="back">
      <slot name="toolbar" :reload="reload" :rows="rows" />
      <Button v-if="canCreate" :label="`إضافة ${entity}`" icon="pi pi-plus" @click="openCreate()" />
    </PageHeader>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="flex flex-wrap items-end gap-3 p-4 border-b border-surface-200">
        <IconField v-if="searchable" class="w-full sm:w-72">
          <InputIcon class="pi pi-search" />
          <InputText v-model="search" :placeholder="searchPlaceholder ?? 'بحث...'" fluid />
        </IconField>

        <div v-if="filters.length" class="flex-1 min-w-[16rem]">
          <SchemaForm v-model="filterModel" :fields="filters" :columns="4" />
        </div>
        <slot name="filters" :filters="filterModel" />

        <div class="flex items-center gap-2 ms-auto">
          <Button
            v-if="hasActiveFilters"
            label="مسح"
            icon="pi pi-filter-slash"
            severity="secondary"
            text
            @click="resetFilters"
          />
          <Button icon="pi pi-refresh" severity="secondary" outlined aria-label="تحديث" :loading="loading" @click="reload()" />
          <template v-if="embedded">
            <slot name="toolbar" :reload="reload" :rows="rows" />
            <Button v-if="canCreate" :label="`إضافة ${entity}`" icon="pi pi-plus" @click="openCreate()" />
          </template>
        </div>
      </div>

      <DataTable
        v-model:selection="selection"
        :value="visibleRows"
        :loading="loading"
        :lazy="serverPaging"
        paginator
        :first="first"
        :rows="perPage"
        :total-records="serverPaging ? total : visibleRows.length"
        :rows-per-page-options="[10, 15, 30, 50]"
        data-key="id"
        striped-rows
        scrollable
        size="small"
        :row-class="(row: Row) => (row.deleted_at ? 'opacity-60' : '')"
        paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        current-page-report-template="{first} - {last} من {totalRecords}"
        @page="onPage"
      >
        <template #empty>
          <div class="text-center py-10 text-surface-500">
            <i class="pi pi-inbox text-3xl mb-2 block" />
            لا توجد بيانات
          </div>
        </template>

        <Column v-if="selectable" selection-mode="multiple" header-style="width: 3rem" />

        <Column
          v-for="column in columns"
          :key="column.field"
          :field="column.field"
          :header="column.header"
          :style="column.width ? { width: column.width } : undefined"
          body-class="whitespace-nowrap"
        >
          <template #body="{ data }">
            <slot :name="`cell-${column.field}`" :row="data" :value="cellValue(column, data)">
              <template v-if="column.type === 'bool'">
                <Tag
                  :value="cellValue(column, data) ? 'نعم' : 'لا'"
                  :severity="cellValue(column, data) ? 'success' : 'secondary'"
                />
              </template>
              <template v-else-if="column.type === 'tag'">
                <Tag
                  v-if="cellValue(column, data) !== null && cellValue(column, data) !== undefined && cellValue(column, data) !== ''"
                  :value="String(cellValue(column, data))"
                  :severity="column.severity?.(data) ?? 'secondary'"
                />
                <span v-else>—</span>
              </template>
              <template v-else-if="column.type === 'date'">{{ formatDate(cellValue(column, data)) }}</template>
              <span
                v-else-if="isLongText(column)"
                class="block max-w-64 truncate"
                :title="cellValue(column, data) ?? undefined"
              >
                {{ dash(cellValue(column, data)) }}
              </span>
              <template v-else>{{ dash(cellValue(column, data)) }}</template>
            </slot>
          </template>
        </Column>

        <Column v-if="hasActions || $slots.actions" header="إجراءات" header-style="width: 1%" body-class="whitespace-nowrap">
          <template #body="{ data }">
            <div class="flex items-center gap-1 justify-end">
              <template v-if="data.deleted_at">
                <Tag value="محذوف" severity="danger" />
                <Button
                  v-if="canRestore"
                  v-tooltip.top="'استعادة'"
                  icon="pi pi-undo"
                  severity="success"
                  text
                  rounded
                  aria-label="استعادة"
                  @click="restore(data)"
                />
              </template>
              <template v-else>
                <slot name="actions" :row="data" :reload="reload" />
                <Button
                  v-if="canEdit"
                  v-tooltip.top="'تعديل'"
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  aria-label="تعديل"
                  @click="openEdit(data)"
                />
                <Button
                  v-if="canDelete"
                  v-tooltip.top="'حذف'"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  aria-label="حذف"
                  @click="remove(data)"
                />
              </template>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="`${isEdit ? 'تعديل' : 'إضافة'} ${entity}`"
      :style="{ width: dialogWidth }"
      :breakpoints="{ '768px': '96vw' }"
    >
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="save">
        <slot name="form-top" :model="model" :is-edit="isEdit" :errors="errors" />
        <SchemaForm v-model="model" :fields="fields" :errors="errors" :is-edit="isEdit" :columns="formColumns" />
        <slot name="form-bottom" :model="model" :is-edit="isEdit" :errors="errors" />
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="dialogVisible = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
