import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { toApiError } from '@/api/http'

export function useNotify() {
  const toast = useToast()
  const confirm = useConfirm()

  function success(message: string) {
    toast.add({ severity: 'success', summary: 'تم', detail: message || 'تمت العملية بنجاح', life: 3500 })
  }

  function warn(message: string) {
    toast.add({ severity: 'warn', summary: 'تنبيه', detail: message, life: 5000 })
  }

  function error(err: unknown) {
    const apiError = toApiError(err)
    // أول رسالة تحقق أوضح للمستخدم من الرسالة العامة
    const firstFieldError = Object.values(apiError.errors ?? {}).flat()[0]
    toast.add({
      severity: 'error',
      summary: 'خطأ',
      detail: typeof firstFieldError === 'string' ? firstFieldError : apiError.message,
      life: 6000,
    })
  }

  function confirmAction(options: {
    message: string
    header?: string
    acceptLabel?: string
    danger?: boolean
    accept: () => void | Promise<void>
  }) {
    confirm.require({
      message: options.message,
      header: options.header ?? 'تأكيد',
      icon: options.danger === false ? 'pi pi-question-circle' : 'pi pi-exclamation-triangle',
      rejectProps: { label: 'إلغاء', severity: 'secondary', outlined: true },
      acceptProps: { label: options.acceptLabel ?? 'تأكيد', severity: options.danger === false ? 'primary' : 'danger' },
      accept: () => {
        void options.accept()
      },
    })
  }

  return { success, warn, error, confirmAction }
}
