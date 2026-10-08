<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import { api, toApiError } from '@/api/http'
import AppField from '@/components/AppField.vue'
import CrudPage from '@/components/CrudPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { APPROVAL_STATUSES, APPROVAL_TYPES, labelOf, severityOf } from '@/utils/options'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

const auth = useAuthStore()
const notify = useNotify()
const crud = ref<InstanceType<typeof CrudPage> | null>(null)
const selection = ref<Row[]>([])

const columns: ColumnDef[] = [
  { field: 'type', header: 'النوع', type: 'tag', value: (row) => labelOf(APPROVAL_TYPES, row.type), severity: () => 'info' },
  { field: 'subject', header: 'العنصر', value: (row) => row.approvable?.full_name },
  { field: 'identity', header: 'رقم الهوية', value: (row) => row.approvable?.identity },
  { field: 'requester', header: 'مقدّم الطلب', value: (row) => row.created_by?.full_name },
  { field: 'status_label', header: 'الحالة', type: 'tag', severity: (row) => severityOf(row.status) },
  { field: 'requested_at', header: 'تاريخ الطلب' },
  { field: 'decided_at', header: 'تاريخ القرار' },
  { field: 'rejection_reason', header: 'سبب الرفض' },
]

const filters: FieldDef[] = [
  { name: 'type', label: 'النوع', type: 'select', options: APPROVAL_TYPES, optionLabel: 'label', optionValue: 'value' },
  { name: 'status', label: 'الحالة', type: 'select', options: APPROVAL_STATUSES, optionLabel: 'label', optionValue: 'value' },
  { name: 'from_date', label: 'من تاريخ', type: 'date' },
  { name: 'to_date', label: 'إلى تاريخ', type: 'date' },
]

const isPending = (row: Row) => row.status === 'pending'
const canApprove = (row: Row) => isPending(row) && auth.can(`${row.type}s.approve`)
const canReject = (row: Row) => isPending(row) && auth.can(`${row.type}s.reject`)
const canResubmit = (row: Row) =>
  row.status === 'rejected' && row.created_by?.id === auth.user?.id && auth.can('approvals.resubmit')

const pendingSelection = computed(() => selection.value.filter(isPending))

async function run(action: () => Promise<{ message: string }>) {
  try {
    notify.success((await action()).message)
  } catch (err) {
    notify.error(err)
  }
  selection.value = []
  await crud.value?.reload()
}

function approve(row: Row) {
  notify.confirmAction({
    message: `اعتماد "${row.approvable?.full_name ?? 'هذا الطلب'}"؟`,
    header: 'تأكيد الاعتماد',
    acceptLabel: 'اعتماد',
    danger: false,
    accept: () => run(() => api.post(`approvals/${row.id}/approve`)),
  })
}

function resubmit(row: Row) {
  notify.confirmAction({
    message: 'إعادة إرسال الطلب للاعتماد؟',
    acceptLabel: 'إعادة إرسال',
    danger: false,
    accept: () => run(() => api.post(`approvals/${row.id}/resubmit`)),
  })
}

/** الإجراءات الجماعية قد تنجح جزئياً؛ نعرض عدد الناجح والفاشل وأول سبب فشل */
async function bulk(url: string, body: Row) {
  try {
    const res = await api.post<Row>(url, body)
    const failed: Row[] = res.data?.failed ?? []
    notify.success(res.message)
    if (failed.length) notify.warn(`فشل ${failed.length} طلب: ${failed[0].message}`)
  } catch (err) {
    const apiError = toApiError(err)
    const failed: Row[] = (apiError.errors as Row)?.failed ?? []
    notify.error(failed.length ? new Error(`${apiError.message} — ${failed[0].message}`) : apiError)
  }
  selection.value = []
  await crud.value?.reload()
}

function bulkApprove() {
  const ids = pendingSelection.value.map((row) => row.id)
  notify.confirmAction({
    message: `اعتماد ${ids.length} طلب محدد؟`,
    header: 'اعتماد جماعي',
    acceptLabel: 'اعتماد الكل',
    danger: false,
    accept: () => bulk('approvals/bulk-approve', { ids }),
  })
}

// ── الرفض (فردي أو جماعي) يتطلب سبباً ────────────────────────────────
const rejectDialog = ref(false)
const rejectTargets = ref<Row[]>([])
const rejectReason = ref('')
const rejectError = ref('')
const rejecting = ref(false)

function openReject(targets: Row[]) {
  rejectTargets.value = targets
  rejectReason.value = ''
  rejectError.value = ''
  rejectDialog.value = true
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    rejectError.value = 'سبب الرفض مطلوب.'
    return
  }
  rejecting.value = true
  const reason = rejectReason.value.trim()
  if (rejectTargets.value.length === 1) {
    await run(() => api.post(`approvals/${rejectTargets.value[0].id}/reject`, { rejection_reason: reason }))
  } else {
    await bulk('approvals/bulk-reject', { ids: rejectTargets.value.map((r) => r.id), rejection_reason: reason })
  }
  rejecting.value = false
  rejectDialog.value = false
}
</script>

<template>
  <div>
    <CrudPage
      ref="crud"
      v-model:selection="selection"
      title="طلبات الاعتماد"
      subtitle="اعتماد أو رفض المستخدمين والحلقات والطلاب الجدد"
      icon="pi pi-check-square"
      endpoint="approvals"
      order-by=""
      server-paging
      selectable
      :searchable="false"
      :allow-delete="false"
      :columns="columns"
      :filters="filters"
    >
      <template #toolbar>
        <template v-if="pendingSelection.length">
          <Button :label="`اعتماد المحدد (${pendingSelection.length})`" icon="pi pi-check" severity="success" @click="bulkApprove" />
          <Button
            :label="`رفض المحدد (${pendingSelection.length})`"
            icon="pi pi-times"
            severity="danger"
            outlined
            @click="openReject(pendingSelection)"
          />
        </template>
      </template>

      <template #actions="{ row }">
        <Button v-if="canApprove(row)" v-tooltip.top="'اعتماد'" icon="pi pi-check" severity="success" text rounded aria-label="اعتماد" @click="approve(row)" />
        <Button v-if="canReject(row)" v-tooltip.top="'رفض'" icon="pi pi-times" severity="danger" text rounded aria-label="رفض" @click="openReject([row])" />
        <Button v-if="canResubmit(row)" v-tooltip.top="'إعادة إرسال'" icon="pi pi-replay" severity="secondary" text rounded aria-label="إعادة إرسال" @click="resubmit(row)" />
      </template>
    </CrudPage>

    <Dialog
      v-model:visible="rejectDialog"
      modal
      :header="rejectTargets.length > 1 ? `رفض ${rejectTargets.length} طلبات` : 'رفض الطلب'"
      :style="{ width: '32rem' }"
      :breakpoints="{ '640px': '96vw' }"
    >
      <form class="flex flex-col gap-4 pt-1" @submit.prevent="confirmReject">
        <AppField label="سبب الرفض" required :error="rejectError">
          <Textarea v-model="rejectReason" rows="3" auto-resize fluid maxlength="500" :invalid="!!rejectError" autofocus />
        </AppField>
        <div class="flex justify-end gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="rejectDialog = false" />
          <Button type="submit" label="رفض" icon="pi pi-times" severity="danger" :loading="rejecting" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
