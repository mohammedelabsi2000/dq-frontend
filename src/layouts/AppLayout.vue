<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { NAV } from '@/nav'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const mobileOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

const groups = computed(() =>
  NAV.map((group) => ({ ...group, items: group.items.filter((item) => auth.can(item.permission)) })).filter(
    (group) => group.items.length,
  ),
)

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}

const userMenu = ref<InstanceType<typeof Menu> | null>(null)
const userMenuItems = [
  { label: 'الملف الشخصي', icon: 'pi pi-user', command: () => router.push('/profile') },
  { separator: true },
  {
    label: 'تسجيل الخروج',
    icon: 'pi pi-sign-out',
    command: async () => {
      await auth.logout()
      await router.push('/login')
    },
  },
]

const initials = computed(() => (auth.user?.full_name ?? '؟').trim().charAt(0))
</script>

<template>
  <div class="min-h-screen bg-surface-50">
    <!-- خلفية معتمة عند فتح القائمة في الجوال -->
    <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="mobileOpen = false" />

    <aside
      class="fixed inset-y-0 start-0 z-40 w-64 bg-white border-e border-surface-200 flex flex-col transition-transform duration-200 lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : 'max-lg:translate-x-full'"
    >
      <div class="h-16 flex items-center gap-3 px-5 border-b border-surface-200 shrink-0">
        <div class="w-9 h-9 grid place-items-center rounded-xl bg-primary-600 text-white">
          <i class="pi pi-book" />
        </div>
        <div class="leading-tight">
          <div class="font-bold text-surface-900">نظام التحفيظ</div>
          <div class="text-xs text-surface-500">دار القرآن الكريم</div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div v-for="(group, index) in groups" :key="index">
          <div v-if="group.label" class="px-3 mb-1.5 text-xs font-semibold text-surface-400">{{ group.label }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="
              isActive(item.to)
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
            "
          >
            <i :class="item.icon" class="text-base w-5 text-center" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>
    </aside>

    <div class="lg:ps-64 flex flex-col min-h-screen">
      <header
        class="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-surface-200 flex items-center justify-between gap-3 px-4 lg:px-6"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Button
            class="lg:hidden"
            icon="pi pi-bars"
            severity="secondary"
            text
            aria-label="القائمة"
            @click="mobileOpen = !mobileOpen"
          />
          <span class="font-semibold text-surface-700 truncate">{{ route.meta.title }}</span>
        </div>

        <button
          type="button"
          class="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-100"
          aria-haspopup="true"
          @click="userMenu?.toggle($event)"
        >
          <div class="text-end leading-tight hidden sm:block">
            <div class="text-sm font-semibold text-surface-900">{{ auth.user?.full_name }}</div>
            <div class="text-xs text-surface-500">{{ auth.roles.join('، ') || 'مستخدم' }}</div>
          </div>
          <div class="w-9 h-9 grid place-items-center rounded-full bg-primary-100 text-primary-700 font-bold">
            {{ initials }}
          </div>
        </button>
        <Menu ref="userMenu" :model="userMenuItems" popup />
      </header>

      <main class="flex-1 p-4 lg:p-6">
        <RouterView :key="route.path" />
      </main>
    </div>
  </div>
</template>
