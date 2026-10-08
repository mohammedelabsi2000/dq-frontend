import { useLookupsStore } from '@/stores/lookups'
import { CERTIFICATE_TYPES } from '@/utils/options'
import { omitEmpty } from '@/utils/payload'
import type { ColumnDef, FieldDef, Row } from '@/types/schema'

/** تعريف مشترك لحقول وأعمدة الشهادات (صفحة الشهادات العامة وتبويب الشهادات في ملف الشخص) */
export function useCertificateSchema() {
  const lookups = useLookupsStore()
  void lookups.ensureConstants('academic_degree', 'major', 'course_type')

  const isAcademy = (model: Row) => model.certificate_type === 'academy'
  const isCourse = (model: Row) => model.certificate_type === 'course'

  const fields: FieldDef[] = [
    {
      name: 'certificate_type',
      label: 'نوع الشهادة',
      type: 'select',
      options: CERTIFICATE_TYPES,
      optionLabel: 'label',
      optionValue: 'value',
      required: true,
      default: 'academy',
    },
    { name: 'provider', label: 'الجهة المانحة' },
    {
      name: 'academic_qualification_id',
      label: 'المؤهل العلمي',
      type: 'select',
      options: () => lookups.constantsOf('academic_degree'),
      visible: isAcademy,
    },
    { name: 'major_id', label: 'التخصص', type: 'select', options: () => lookups.constantsOf('major'), visible: isAcademy },
    { name: 'course_name', label: 'اسم الدورة', visible: isCourse },
    {
      name: 'course_type_id',
      label: 'نوع الدورة',
      type: 'select',
      options: () => lookups.constantsOf('course_type'),
      visible: isCourse,
    },
    { name: 'date_graduate', label: 'تاريخ التخرج / الإنجاز', type: 'date' },
    { name: 'certificate_link', label: 'رابط الشهادة', placeholder: 'https://' },
    { name: 'certificate_file', label: 'ملف الشهادة (PDF)', type: 'file', accept: '.pdf', span: 2, help: 'بحد أقصى 5 ميجابايت' },
    { name: 'notes', label: 'ملاحظات', type: 'textarea', span: 2 },
  ]

  const columns: ColumnDef[] = [
    { field: 'certificate_type_label', header: 'النوع', type: 'tag', value: (row) => row.certificate_type_label ?? row.certificate_type },
    {
      field: 'title',
      header: 'المؤهل / الدورة',
      value: (row) => (row.certificate_type === 'course' ? row.course_name : row.academic_qualification?.name),
    },
    { field: 'major', header: 'التخصص', value: (row) => row.major?.name },
    { field: 'provider', header: 'الجهة المانحة' },
    { field: 'date_graduate', header: 'التاريخ', type: 'date' },
    { field: 'file', header: 'الملف' },
  ]

  const toForm = (row: Row): Row => ({
    certificate_type: row.certificate_type,
    provider: row.provider,
    academic_qualification_id: row.academic_qualification_id,
    major_id: row.major_id,
    course_name: row.course_name,
    course_type_id: row.course_type_id,
    date_graduate: row.date_graduate ? String(row.date_graduate).slice(0, 10) : null,
    certificate_link: row.certificate_link,
    certificate_file: null,
    notes: row.notes,
    person_type: row.person_type,
    person_id: row.person_id,
  })

  /** الحمولة تُرسل multipart، والحقول غير المناسبة لنوع الشهادة تُحذف */
  const toPayload = (model: Row, person?: { type: string; id: number | string }): Row => {
    const payload: Row = { ...model }
    if (person) {
      payload.person_type = person.type
      payload.person_id = person.id
    }
    if (payload.certificate_type === 'academy') {
      delete payload.course_name
      delete payload.course_type_id
    } else {
      delete payload.academic_qualification_id
      delete payload.major_id
    }
    return omitEmpty(payload, Object.keys(payload))
  }

  const fileUrl = (row: Row): string | null => row.images?.[0]?.file_url ?? null

  return { fields, columns, toForm, toPayload, fileUrl }
}
