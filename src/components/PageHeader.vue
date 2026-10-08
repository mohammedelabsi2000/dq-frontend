<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  icon?: string
  /** مسار العودة (يُظهر زر رجوع) */
  back?: string
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div class="flex items-center gap-3 min-w-0">
      <RouterLink
        v-if="back"
        :to="back"
        class="w-9 h-9 grid place-items-center rounded-lg border border-surface-200 bg-white text-surface-600 hover:bg-surface-100"
        aria-label="رجوع"
      >
        <i class="pi pi-arrow-right" />
      </RouterLink>
      <div v-else-if="icon" class="w-10 h-10 grid place-items-center rounded-xl bg-primary-50 text-primary-600">
        <i :class="icon" class="text-lg" />
      </div>
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-surface-900 truncate">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-surface-500 truncate">{{ subtitle }}</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>
