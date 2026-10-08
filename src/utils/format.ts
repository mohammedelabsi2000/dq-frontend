/** Date -> 'YYYY-MM-DD' بالتوقيت المحلي (بدون إزاحة UTC) */
export function toDateString(date: Date | null | undefined): string | null {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** يقبل 'YYYY-MM-DD' أو 'DD-MM-YYYY' أو تاريخاً كاملاً */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const dmy = /^(\d{2})-(\d{2})-(\d{4})/.exec(value)
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? toDateString(date)! : '—'
}

export function today(): string {
  return toDateString(new Date())!
}

export function ageFrom(dob: string | null | undefined): number | null {
  const date = parseDate(dob)
  if (!date) return null
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const beforeBirthday =
    now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  if (beforeBirthday) age--
  return age
}

export function dash(value: unknown): string {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

/** قراءة قيمة متداخلة: get(row, 'region.branch.name') */
export function getPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}
