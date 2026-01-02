<script setup lang="ts">
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { labels } from '@/locales/es'

const visible = defineModel<boolean>('visible', { required: true })
const margin = defineModel<number>('margin', { required: true })

const emit = defineEmits<{
  apply: [multiplier: number]
}>()

function handleApply() {
  emit('apply', margin.value)
  visible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="labels.import.customMargin"
    modal
    class="margin-dialog"
  >
    <div class="margin-form">
      <label>Multiplicador:</label>
      <InputNumber
        v-model="margin"
        :min="1"
        :max="10"
        :minFractionDigits="1"
        :maxFractionDigits="2"
        showButtons
        suffix="x"
      />
    </div>
    <template #footer>
      <Button
        :label="labels.actions.cancel"
        severity="secondary"
        outlined
        @click="visible = false"
      />
      <Button :label="labels.import.applyMargin" @click="handleApply" />
    </template>
  </Dialog>
</template>

<style scoped>
.margin-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 250px;
}

.margin-form label {
  font-weight: 500;
}
</style>
