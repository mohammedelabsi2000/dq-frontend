<script setup lang="ts">
import { computed } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import ToggleSwitch from 'primevue/toggleswitch'
import Password from 'primevue/password'
import AppField from './AppField.vue'
import DateInput from './DateInput.vue'
import type { FieldDef, Row } from '@/types/schema'

const model = defineModel<Row>({ required: true })

const props = withDefaults(
  defineProps<{
    fields: FieldDef[]
    errors?: Record<string, string>
    isEdit?: boolean
    /** عدد الأعمدة على الشاشات المتوسطة فأكبر */
    columns?: 1 | 2 | 3 | 4
  }>(),
  { errors: () => ({}), isEdit: false, columns: 2 },
)

const visibleFields = computed(() => props.fields.filter((f) => !f.visible || f.visible(model.value, props.isEdit)))

const gridClass = computed(
  () =>
    ({
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    })[props.columns],
)

function optionsOf(field: FieldDef): Row[] {
  return typeof field.options === 'function' ? field.options(model.value) : (field.options ?? [])
}

function changed(field: FieldDef) {
  field.resets?.forEach((name) => {
    model.value[name] = null
  })
  field.onChange?.(model.value)
}

function onFile(field: FieldDef, event: Event) {
  const input = event.target as HTMLInputElement
  model.value[field.name] = input.files?.[0] ?? null
}
</script>

<template>
  <div class="grid gap-4" :class="gridClass">
    <AppField
      v-for="field in visibleFields"
      :key="field.name"
      :label="field.type === 'switch' ? undefined : field.label"
      :required="field.required"
      :error="errors[field.name]"
      :help="field.help"
      :class="field.span === 2 && columns > 1 ? 'md:col-span-2' : ''"
    >
      <Textarea
        v-if="field.type === 'textarea'"
        v-model="model[field.name]"
        rows="3"
        auto-resize
        fluid
        :invalid="!!errors[field.name]"
        :placeholder="field.placeholder"
      />

      <InputNumber
        v-else-if="field.type === 'number'"
        v-model="model[field.name]"
        fluid
        :use-grouping="false"
        :min="field.min"
        :max="field.max"
        :max-fraction-digits="field.decimals ?? 0"
        :invalid="!!errors[field.name]"
        :placeholder="field.placeholder"
        :disabled="field.disabled?.(model, isEdit)"
        @update:model-value="changed(field)"
      />

      <Select
        v-else-if="field.type === 'select'"
        v-model="model[field.name]"
        :options="optionsOf(field)"
        :option-label="field.optionLabel ?? 'name'"
        :option-value="field.optionValue ?? 'id'"
        :filter="optionsOf(field).length > 8"
        :show-clear="!field.required"
        fluid
        :invalid="!!errors[field.name]"
        :placeholder="field.placeholder ?? 'اختر'"
        :disabled="field.disabled?.(model, isEdit)"
        empty-message="لا توجد خيارات"
        empty-filter-message="لا توجد نتائج"
        @change="changed(field)"
      />

      <MultiSelect
        v-else-if="field.type === 'multiselect'"
        v-model="model[field.name]"
        :options="optionsOf(field)"
        :option-label="field.optionLabel ?? 'name'"
        :option-value="field.optionValue ?? 'id'"
        filter
        display="chip"
        fluid
        :max-selected-labels="6"
        :invalid="!!errors[field.name]"
        :placeholder="field.placeholder ?? 'اختر'"
        empty-message="لا توجد خيارات"
        empty-filter-message="لا توجد نتائج"
        @change="changed(field)"
      />

      <DateInput
        v-else-if="field.type === 'date'"
        v-model="model[field.name]"
        :invalid="!!errors[field.name]"
        :placeholder="field.placeholder"
      />

      <label v-else-if="field.type === 'switch'" class="flex items-center gap-3 h-full pt-6 cursor-pointer">
        <ToggleSwitch v-model="model[field.name]" @change="changed(field)" />
        <span class="text-sm font-medium text-surface-700">{{ field.label }}</span>
      </label>

      <Password
        v-else-if="field.type === 'password'"
        v-model="model[field.name]"
        :feedback="false"
        toggle-mask
        fluid
        :invalid="!!errors[field.name]"
        :placeholder="field.placeholder"
        :input-props="{ autocomplete: 'new-password' }"
      />

      <input
        v-else-if="field.type === 'file'"
        type="file"
        :accept="field.accept"
        class="block w-full text-sm border border-surface-300 rounded-md p-2 file:me-3 file:rounded file:border-0 file:bg-primary-50 file:text-primary-700 file:px-3 file:py-1"
        @change="onFile(field, $event)"
      />

      <InputText
        v-else
        v-model="model[field.name]"
        fluid
        :invalid="!!errors[field.name]"
        :placeholder="field.placeholder"
        :disabled="field.disabled?.(model, isEdit)"
      />
    </AppField>
  </div>
</template>
