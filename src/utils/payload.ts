import type { Row } from '@/types/schema'

/**
 * يحذف المفاتيح الفارغة المحددة من الحمولة.
 * قواعد Laravel غير المعلّمة بـ nullable ترفض القيمة null، لذا يجب عدم إرسال المفتاح أصلاً.
 */
export function omitEmpty(payload: Row, keys: string[]): Row {
  const out = { ...payload }
  for (const key of keys) {
    const value = out[key]
    if (value === null || value === undefined || value === '') delete out[key]
  }
  return out
}

/** يحذف مفاتيح مساعدة لا يعرفها الخادم (مثل branch_id المستخدم للقوائم المتتابعة) */
export function without(payload: Row, keys: string[]): Row {
  const out = { ...payload }
  keys.forEach((key) => delete out[key])
  return out
}
