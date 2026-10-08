/** قيم الـ Enums في الباك اند مع تسمياتها العربية */
export interface Option<T = string> {
  value: T
  label: string
}

export const GENDERS: Option[] = [
  { value: 'ذكر', label: 'ذكر' },
  { value: 'أنثى', label: 'أنثى' },
]

/** المساقات تستخدم male/female بدل القيم العربية */
export const SUBJECT_GENDERS: Option[] = [
  { value: 'male', label: 'ذكور' },
  { value: 'female', label: 'إناث' },
]

export const PERIOD_UNITS: Option[] = [
  { value: 'day', label: 'يوم' },
  { value: 'week', label: 'أسبوع' },
  { value: 'month', label: 'شهر' },
  { value: 'year', label: 'سنة' },
]

export const PLAN_TYPES: Option[] = [
  { value: 'main', label: 'رئيسية' },
  { value: 'sub', label: 'فرعية' },
]

export const MEMORIZATION_DIRECTIONS: Option[] = [
  { value: 'ascending', label: 'تصاعدي (من البداية للنهاية)' },
  { value: 'descending', label: 'تنازلي (من النهاية للبداية)' },
]

export const ACHIEVEMENT_TYPES: Option[] = [
  { value: 'new_memorization', label: 'حفظ جديد' },
  { value: 'revision', label: 'مراجعة' },
  { value: 'exam', label: 'اختبار' },
]

export const EVALUATION_GRADES: Option[] = [
  { value: 'excellent', label: 'ممتاز' },
  { value: 'very_good', label: 'جيد جداً' },
  { value: 'good', label: 'جيد' },
  { value: 'acceptable', label: 'مقبول' },
  { value: 'weak', label: 'ضعيف' },
]

export const ACHIEVEMENT_STATUSES: Option[] = [
  { value: 'completed', label: 'مكتمل' },
  { value: 'retry', label: 'معاد' },
]

export const STUDENT_PLAN_STATUSES: Option[] = [
  { value: 'active', label: 'نشط' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'transferred', label: 'منتقل' },
  { value: 'dropped', label: 'منقطع' },
]

export const APPROVAL_STATUSES: Option[] = [
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'approved', label: 'معتمد' },
  { value: 'rejected', label: 'مرفوض' },
]

export const APPROVAL_TYPES: Option[] = [
  { value: 'user', label: 'مستخدم' },
  { value: 'halaqa', label: 'حلقة' },
  { value: 'student', label: 'طالب' },
]

export const RESULT_STATUSES: Option[] = [
  { value: 'passed', label: 'ناجح' },
  { value: 'failed', label: 'راسب' },
  { value: 'withdraw', label: 'منسحب' },
  { value: 'in_progress', label: 'قيد الدراسة' },
  { value: 'frozen', label: 'مؤجل' },
]

export const SPONSORSHIP_TYPES: Option[] = [
  { value: 'دائمة', label: 'دائمة' },
  { value: 'مؤقتة', label: 'مؤقتة' },
]

export const CERTIFICATE_TYPES: Option[] = [
  { value: 'academy', label: 'مؤهل أكاديمي' },
  { value: 'course', label: 'دورة' },
]

export const SCOPE_TYPES: Option[] = [
  { value: 'branch', label: 'فرع' },
  { value: 'region', label: 'منطقة' },
  { value: 'center', label: 'مركز' },
  { value: 'halaqa', label: 'حلقة' },
]

export const IMAGE_TYPES: Option[] = [
  { value: 'profile', label: 'صورة شخصية' },
  { value: 'cover', label: 'غلاف' },
  { value: 'gallery', label: 'معرض' },
  { value: 'document', label: 'مستند' },
]

export function labelOf(options: Option[], value: unknown): string {
  return options.find((o) => o.value === value)?.label ?? (value == null ? '' : String(value))
}

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'

const SEVERITIES: Record<string, Severity> = {
  active: 'success',
  completed: 'success',
  approved: 'success',
  passed: 'success',
  excellent: 'success',
  very_good: 'success',
  good: 'info',
  pending: 'warn',
  in_progress: 'info',
  transferred: 'info',
  acceptable: 'warn',
  retry: 'warn',
  frozen: 'secondary',
  withdraw: 'secondary',
  dropped: 'danger',
  rejected: 'danger',
  failed: 'danger',
  weak: 'danger',
}

export function severityOf(value: unknown): Severity {
  return SEVERITIES[String(value)] ?? 'secondary'
}
