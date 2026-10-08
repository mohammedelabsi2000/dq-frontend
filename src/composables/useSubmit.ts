import { ref } from 'vue'
import { toApiError, type ApiResponse } from '@/api/http'
import { useNotify } from './useNotify'

/**
 * يغلّف طلبات الحفظ: حالة التحميل، أخطاء التحقق (422) لكل حقل، وإشعار النتيجة.
 * مفاتيح الأخطاء تبقى كما يرسلها الباك اند (مثل tracks.0.weight).
 */
export function useSubmit() {
  const notify = useNotify()
  const saving = ref(false)
  const errors = ref<Record<string, string>>({})

  function clearErrors() {
    errors.value = {}
  }

  async function submit<T>(
    action: () => Promise<ApiResponse<T>>,
    options: { silent?: boolean } = {},
  ): Promise<ApiResponse<T> | null> {
    saving.value = true
    errors.value = {}
    try {
      const res = await action()
      if (!options.silent) notify.success(res.message)
      return res
    } catch (err) {
      const apiError = toApiError(err)
      const flat: Record<string, string> = {}
      for (const [field, messages] of Object.entries(apiError.errors ?? {})) {
        flat[field] = Array.isArray(messages) ? String(messages[0]) : String(messages)
      }
      errors.value = flat
      notify.error(apiError)
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, errors, submit, clearErrors }
}
