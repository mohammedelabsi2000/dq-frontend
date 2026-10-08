import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { api } from '@/api/http'

type Row = Record<string, any>

/**
 * قوائم مرجعية تُحمَّل مرة واحدة وتُعاد استخدامها في النماذج والفلاتر.
 * الهيكل الإداري يُحمّل كاملاً ثم يُفلتر محلياً لتبسيط القوائم المتتابعة.
 */
const LIST_ENDPOINTS = {
  branches: ['branches', { limit: '*' }],
  regions: ['regions', { limit: '*', with_branch: 1 }],
  mosques: ['mosques', { limit: '*' }],
  centers: ['centers', { limit: '*', with_relations: 1 }],
  surahs: ['surah', { limit: '*', order_by: 'asc' }],
  juz: ['juz', { limit: '*', order_by: 'asc' }],
  customJuz: ['custom-juz', { limit: '*', order_by: 'asc' }],
  tracks: ['plan/tracks', { limit: '*' }],
  subjects: ['plan/subjects', { limit: '*' }],
  plans: ['plan/plans', { limit: '*' }],
  roles: ['roles', { limit: '*' }],
  abilities: ['abilities', {}],
  constantTypes: ['constant_types', {}],
} as const

export type LookupKey = keyof typeof LIST_ENDPOINTS

export const useLookupsStore = defineStore('lookups', () => {
  const lists = reactive<Record<LookupKey, Row[]>>({
    branches: [],
    regions: [],
    mosques: [],
    centers: [],
    surahs: [],
    juz: [],
    customJuz: [],
    tracks: [],
    subjects: [],
    plans: [],
    roles: [],
    abilities: [],
    constantTypes: [],
  })
  const constants = reactive<Record<string, Row[]>>({})
  const pending = new Map<string, Promise<void>>()

  function once(key: string, loader: () => Promise<void>): Promise<void> {
    if (!pending.has(key)) {
      // عند الفشل (مثلاً لا صلاحية) نسمح بإعادة المحاولة لاحقاً ونترك القائمة فارغة
      pending.set(
        key,
        loader().catch(() => {
          pending.delete(key)
        }),
      )
    }
    return pending.get(key)!
  }

  function ensure(...keys: LookupKey[]): Promise<void[]> {
    return Promise.all(
      keys.map((key) =>
        once(key, async () => {
          const [url, params] = LIST_ENDPOINTS[key]
          const res = await api.get<Row[]>(url, params)
          lists[key] = res.data ?? []
        }),
      ),
    )
  }

  /** يعيد تحميل قائمة بعد تعديل بياناتها */
  function refresh(...keys: LookupKey[]): Promise<void[]> {
    keys.forEach((key) => pending.delete(key))
    return ensure(...keys)
  }

  /** تحميل ثوابت أنواع محددة: GET constants?with_type_name=a,b */
  function ensureConstants(...types: string[]): Promise<void> {
    const missing = types.filter((type) => !pending.has(`const:${type}`))
    if (!missing.length) {
      return Promise.all(types.map((type) => pending.get(`const:${type}`))).then(() => undefined)
    }
    const load = (async () => {
      const res = await api.get<Record<string, Row[]>>('constants', { with_type_name: missing.join(',') })
      for (const type of missing) {
        constants[type] = res.data?.[type] ?? []
      }
    })().catch(() => {
      missing.forEach((type) => pending.delete(`const:${type}`))
    })
    missing.forEach((type) => pending.set(`const:${type}`, load))
    return Promise.all(types.map((type) => pending.get(`const:${type}`))).then(() => undefined)
  }

  function refreshConstants() {
    for (const key of [...pending.keys()]) {
      if (key.startsWith('const:')) pending.delete(key)
    }
    return ensureConstants(...Object.keys(constants))
  }

  const constantsOf = (type: string): Row[] => constants[type] ?? []
  const regionsOf = (branchId?: number | null) =>
    branchId ? lists.regions.filter((r) => r.branch?.id === branchId) : lists.regions
  const mosquesOf = (regionId?: number | null) =>
    regionId ? lists.mosques.filter((m) => m.region?.id === regionId) : lists.mosques
  const centersOf = (regionId?: number | null) =>
    regionId ? lists.centers.filter((c) => c.region?.id === regionId) : lists.centers
  const surahName = (id?: number | null) => lists.surahs.find((s) => s.id === id)?.name_ar ?? ''
  const versesCount = (id?: number | null): number | undefined => lists.surahs.find((s) => s.id === id)?.verses_count

  return {
    lists,
    constants,
    ensure,
    refresh,
    ensureConstants,
    refreshConstants,
    constantsOf,
    regionsOf,
    mosquesOf,
    centersOf,
    surahName,
    versesCount,
  }
})
