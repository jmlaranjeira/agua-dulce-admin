<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { api } from '@/services/api'
import { labels } from '@/locales/es'

const props = defineProps<{
  modelValue: boolean
  productId: string
  productName: string
  currentStock: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  adjusted: []
}>()

const toast = useToast()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const form = ref({
  quantity: null as number | null,
  notes: '',
})

const errors = ref<Record<string, string>>({})
const saving = ref(false)

const newStock = computed(() => {
  if (form.value.quantity === null) return props.currentStock
  return props.currentStock + form.value.quantity
})

const newStockSeverity = computed(() => {
  if (newStock.value < 0) return 'danger'
  if (newStock.value < 5) return 'warn'
  return 'success'
})

watch(
  () => props.modelValue,
  (isVisible) => {
    if (isVisible) {
      form.value = {
        quantity: null,
        notes: '',
      }
      errors.value = {}
    }
  }
)

function validate(): boolean {
  errors.value = {}

  if (form.value.quantity === null || form.value.quantity === 0) {
    errors.value.quantity = labels.messages.required
  } else if (newStock.value < 0) {
    errors.value.quantity = labels.stock.insufficientStock
  }

  return Object.keys(errors.value).length === 0
}

async function save() {
  if (!validate()) return

  saving.value = true
  try {
    await api.stock.adjust(
      props.productId,
      form.value.quantity!,
      form.value.notes?.trim() || undefined
    )

    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.stock.adjustSuccess,
      life: 3000,
    })
    emit('adjusted')
    visible.value = false
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="labels.stock.adjustStock"
    modal
    :style="{ width: '400px' }"
    class="stock-adjustment-dialog"
  >
    <div class="adjustment-form">
      <div class="product-name">{{ productName }}</div>

      <div class="stock-info">
        <div class="stock-row">
          <span class="stock-label">{{ labels.stock.currentStock }}:</span>
          <Tag
            :value="currentStock"
            :severity="currentStock < 5 ? 'danger' : currentStock < 10 ? 'warn' : 'success'"
          />
        </div>
        <div v-if="form.quantity !== null" class="stock-row">
          <span class="stock-label">{{ labels.stock.newStock }}:</span>
          <Tag :value="newStock" :severity="newStockSeverity" />
        </div>
      </div>

      <div class="field">
        <label for="quantity">{{ labels.stock.adjustmentQuantity }} *</label>
        <InputNumber
          id="quantity"
          v-model="form.quantity"
          :class="{ 'p-invalid': errors.quantity }"
          showButtons
          :min="-9999"
          :max="9999"
          class="w-full"
        />
        <small class="field-hint">{{ labels.stock.positiveInfo }}</small>
        <small v-if="errors.quantity" class="p-error">{{ errors.quantity }}</small>
      </div>

      <div class="field">
        <label for="notes">{{ labels.stock.adjustmentNotes }}</label>
        <Textarea
          id="notes"
          v-model="form.notes"
          rows="3"
          class="w-full"
        />
      </div>
    </div>

    <template #footer>
      <Button
        :label="labels.actions.cancel"
        severity="secondary"
        text
        @click="visible = false"
        :disabled="saving"
      />
      <Button :label="labels.stock.adjustStock" :loading="saving" @click="save" />
    </template>
  </Dialog>
</template>

<style scoped>
.adjustment-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.product-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--color-text);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
}

.stock-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stock-label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.field label {
  font-weight: 500;
  color: var(--color-text);
}

.field-hint {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.w-full {
  width: 100%;
}

.p-error {
  color: var(--p-red-500, #ef4444);
}
</style>
