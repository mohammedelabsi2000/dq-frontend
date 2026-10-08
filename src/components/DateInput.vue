<script setup lang="ts">
import { computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import { parseDate, toDateString } from '@/utils/format'

/** منتقي تاريخ يتعامل مع النص 'YYYY-MM-DD' الذي يتوقعه الباك اند */
const model = defineModel<string | null>()

defineProps<{
  invalid?: boolean
  placeholder?: string
  maxToday?: boolean
  disabled?: boolean
}>()

const dateValue = computed<Date | null>({
  get: () => parseDate(model.value),
  set: (value) => {
    model.value = toDateString(value)
  },
})

const now = new Date()
</script>

<template>
  <DatePicker
    v-model="dateValue"
    date-format="yy-mm-dd"
    show-icon
    show-button-bar
    fluid
    :invalid="invalid"
    :disabled="disabled"
    :max-date="maxToday ? now : undefined"
    :placeholder="placeholder ?? 'سنة-شهر-يوم'"
  />
</template>
