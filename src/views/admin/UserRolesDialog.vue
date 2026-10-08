<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import { api } from '@/api/http'
import AppField from '@/components/AppField.vue'
import RemoteSelect from '@/components/RemoteSelect.vue'
import { useLookupsStore } from '@/stores/lookups'
import { useNotify } from '@/composables/useNotify'
import { useSubmit } from '@/composables/useSubmit'
import { SCOPE_TYPES } from '@/utils/options'
import type { Row } from '@/types/schema'

/** أدوار المستخدم ونطاقات صلاحيته (فرع/منطقة/مركز/حلقة) */
const visible = defineModel<boolean>('visible', { default: false })
const props = defineProps<{ user: Row | null }>()
const emit = defineEmits<{ saved: [] }>()

const lookups = useLookupsStore()
const notify = useNotify()
const { saving, errors, submit, clearErrors } = useSubmit()

const loading = ref(false)
const roleIds = ref<number[]>([])
const scopes = ref<{ type: string | null; id: number | null }[]>([])

watch(visible, async (open) => {
  if (!open || !props.user) return
  clearErrors()
  loading.value = true
  roleIds.value = []
  scopes.value = []
  try {
    await lookups.ensure('roles', 'branches', 'regions', 'centers')
    const res = await api.get<Row>(`users/${props.user.id}/roles`)
    const names: string[] = res.data?.roles ?? []
    roleIds.value = lookups.lists.roles.filter((role) => names.includes(role.name)).map((role) => role.id)
    const seen = new Set<string>()
    for (const scope of res.data?.scopes ?? []) {
      const key = `${scope.scope_type}:${scope.scope_id}`
      if (seen.has(key)) continue
      seen.add(key)
      scopes.value.push({ type: scope.scope_type, id: scope.scope_id })
    }
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
})

function scopeOptions(type: string | null): Row[] {
  if (type === 'branch') return lookups.lists.branches
  if (type === 'region') return lookups.lists.regions
  if (type === 'center') return lookups.lists.centers
  return []
}

/** اسم الحلقة المنسّبة مسبقاً يأتي من user_scopes في بيانات المستخدم */
function knownHalaqa(id: number | null): Row | null {
  const match = (props.user?.user_scopes ?? []).find((s: Row) => s.type === 'halaqa' && s.id === id)
  return match ? { id: match.id, name: match.name } : null
}

async function save() {
  const res = await submit(() =>
    api.post(`users/${props.user!.id}/roles`, {
      role_ids: roleIds.value,
      scopes: scopes.value.filter((scope) => scope.type && scope.id),
    }),
  )
  if (res) {
    visible.value = false
    emit('saved')
  }
}

function clearAll(kind: 'roles' | 'scopes') {
  notify.confirmAction({
    message: kind === 'roles' ? 'حذف جميع أدوار هذا المستخدم؟' : 'حذف جميع نطاقات هذا المستخدم؟',
    header: 'تأكيد الحذف',
    acceptLabel: 'حذف',
    accept: async () => {
      try {
        notify.success((await api.delete(`users/${props.user!.id}/${kind}`)).message)
        visible.value = false
        emit('saved')
      } catch (err) {
        notify.error(err)
      }
    },
  })
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="`أدوار ونطاقات: ${user?.full_name ?? ''}`"
    :style="{ width: '46rem' }"
    :breakpoints="{ '768px': '96vw' }"
  >
    <div v-if="loading" class="text-center py-10 text-surface-500"><i class="pi pi-spin pi-spinner text-2xl" /></div>

    <form v-else class="flex flex-col gap-5 pt-1" @submit.prevent="save">
      <AppField label="الأدوار" required :error="errors.role_ids">
        <MultiSelect
          v-model="roleIds"
          :options="lookups.lists.roles"
          option-label="name"
          option-value="id"
          display="chip"
          filter
          fluid
          placeholder="اختر دوراً أو أكثر"
          :invalid="!!errors.role_ids"
        />
      </AppField>

      <div class="border border-surface-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-semibold text-surface-800">نطاقات الصلاحية</h3>
          <Button type="button" label="إضافة نطاق" icon="pi pi-plus" size="small" severity="secondary" outlined @click="scopes.push({ type: null, id: null })" />
        </div>
        <p class="text-xs text-surface-500 mb-3">
          النطاق يحدد البيانات التي يراها المستخدم. بدون أي نطاق يُعتبر المستخدم مديراً عاماً يرى كل شيء.
        </p>
        <div v-for="(scope, index) in scopes" :key="index" class="grid grid-cols-1 md:grid-cols-[10rem_1fr_auto] gap-3 items-start mb-3">
          <Select
            v-model="scope.type"
            :options="SCOPE_TYPES"
            option-label="label"
            option-value="value"
            placeholder="النوع"
            fluid
            @change="scope.id = null"
          />
          <div>
            <RemoteSelect
              v-if="scope.type === 'halaqa'"
              v-model="scope.id"
              endpoint="halaqas"
              option-label="name"
              :selected="knownHalaqa(scope.id)"
              :invalid="!!errors[`scopes.${index}.id`]"
            />
            <Select
              v-else
              v-model="scope.id"
              :options="scopeOptions(scope.type)"
              option-label="name"
              option-value="id"
              filter
              fluid
              :disabled="!scope.type"
              placeholder="اختر"
              :invalid="!!errors[`scopes.${index}.id`]"
            />
            <small class="field-error">{{ errors[`scopes.${index}.id`] }}</small>
          </div>
          <Button type="button" icon="pi pi-times" severity="danger" text rounded aria-label="حذف النطاق" @click="scopes.splice(index, 1)" />
        </div>
        <p v-if="!scopes.length" class="text-sm text-surface-500">لا توجد نطاقات.</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex gap-2">
          <Button type="button" label="حذف كل الأدوار" severity="danger" text size="small" @click="clearAll('roles')" />
          <Button type="button" label="حذف كل النطاقات" severity="danger" text size="small" @click="clearAll('scopes')" />
        </div>
        <div class="flex gap-2">
          <Button type="button" label="إلغاء" severity="secondary" outlined @click="visible = false" />
          <Button type="submit" label="حفظ" icon="pi pi-check" :loading="saving" :disabled="!roleIds.length" />
        </div>
      </div>
    </form>
  </Dialog>
</template>
