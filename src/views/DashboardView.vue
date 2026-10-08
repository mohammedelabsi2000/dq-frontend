<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Skeleton from 'primevue/skeleton'
import { api } from '@/api/http'
import { NAV } from '@/nav'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'

const auth = useAuthStore()
const notify = useNotify()

const stats = ref<Record<string, number> | null>(null)
const loading = ref(true)

const CARDS = [
  { key: 'students_count', label: 'الطلاب', icon: 'pi pi-graduation-cap', to: '/students', color: 'bg-emerald-50 text-emerald-600' },
  { key: 'halaqat_count', label: 'الحلقات', icon: 'pi pi-users', to: '/halaqas', color: 'bg-sky-50 text-sky-600' },
  { key: 'centers_count', label: 'المراكز', icon: 'pi pi-warehouse', to: '/centers', color: 'bg-amber-50 text-amber-600' },
  { key: 'mosques_count', label: 'المساجد', icon: 'pi pi-map-marker', to: '/mosques', color: 'bg-violet-50 text-violet-600' },
  { key: 'regions_count', label: 'المناطق', icon: 'pi pi-map', to: '/regions', color: 'bg-rose-50 text-rose-600' },
  { key: 'branches_count', label: 'الفروع', icon: 'pi pi-building', to: '/branches', color: 'bg-teal-50 text-teal-600' },
]

const shortcuts = computed(() =>
  NAV.flatMap((group) => group.items).filter((item) => item.to !== '/' && auth.can(item.permission)),
)

onMounted(async () => {
  try {
    const res = await api.get<Record<string, number>>('statistics')
    stats.value = res.data
  } catch (err) {
    notify.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-surface-900">مرحباً، {{ auth.user?.full_name }}</h1>
      <p class="text-surface-500 mt-1">نظرة عامة على النظام</p>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      <RouterLink
        v-for="card in CARDS"
        :key="card.key"
        :to="card.to"
        class="bg-white rounded-xl border border-surface-200 p-4 hover:shadow-md hover:border-primary-200 transition"
      >
        <div class="w-10 h-10 grid place-items-center rounded-lg mb-3" :class="card.color">
          <i :class="card.icon" class="text-lg" />
        </div>
        <Skeleton v-if="loading" width="4rem" height="1.75rem" />
        <div v-else class="text-2xl font-bold text-surface-900">
          {{ stats?.[card.key]?.toLocaleString('en') ?? '—' }}
        </div>
        <div class="text-sm text-surface-500 mt-1">{{ card.label }}</div>
      </RouterLink>
    </div>

    <h2 class="text-base font-semibold text-surface-800 mb-3">وصول سريع</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <RouterLink
        v-for="item in shortcuts"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 bg-white rounded-xl border border-surface-200 px-4 py-3 text-sm text-surface-700 hover:border-primary-300 hover:text-primary-700 transition"
      >
        <i :class="item.icon" class="text-primary-600" />
        <span class="truncate">{{ item.label }}</span>
      </RouterLink>
    </div>
  </div>
</template>
