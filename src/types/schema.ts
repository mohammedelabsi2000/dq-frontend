export type Row = Record<string, any>

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'switch'
  | 'password'
  | 'file'

/** تعريف حقل في نموذج أو فلتر يُرسم عبر SchemaForm */
export interface FieldDef {
  name: string
  label: string
  type?: FieldType
  /** مصفوفة ثابتة أو دالة تعتمد على قيم النموذج (للقوائم المتتابعة) */
  options?: Row[] | ((model: Row) => Row[])
  optionLabel?: string
  optionValue?: string
  required?: boolean
  /** عرض الحقل: 1 = نصف السطر، 2 = سطر كامل */
  span?: 1 | 2
  visible?: (model: Row, isEdit: boolean) => boolean
  disabled?: (model: Row, isEdit: boolean) => boolean
  placeholder?: string
  help?: string
  min?: number
  max?: number
  /** حقول تُصفَّر عند تغيّر هذا الحقل */
  resets?: string[]
  onChange?: (model: Row) => void
  default?: any
  accept?: string
  /** السماح بكسور في الحقول الرقمية */
  decimals?: number
}

export interface ColumnDef {
  field: string
  header: string
  /** قيمة مخصصة للعرض بدل قراءة المسار مباشرة */
  value?: (row: Row) => any
  type?: 'text' | 'tag' | 'bool' | 'date'
  severity?: (row: Row) => string
  width?: string
}
