<script setup lang="ts">
defineProps<{
  label?: string
  error?: string
  required?: boolean
  help?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-surface-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <slot />
    <small v-if="help && !error" class="text-surface-500">{{ help }}</small>
    <small v-if="error" class="field-error">{{ error }}</small>
  </div>
</template>
