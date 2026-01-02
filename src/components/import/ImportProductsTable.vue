<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { RouterLink } from 'vue-router'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import MarginDialog from './MarginDialog.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { ProductToImport } from '@/types'
import type { InvoiceInfo, EmailInfo } from '@/composables/useImportExecution'

interface Props {
  products: ProductToImport[]
  invoiceInfo?: InvoiceInfo
  emailInfo?: EmailInfo
  hasMorePages?: boolean
  loadingMore?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:products': [products: ProductToImport[]]
  loadMore: []
}>()

// Local state for margin dialog
const showMarginDialog = defineModel<boolean>('showMarginDialog', { default: false })
const customMargin = defineModel<number>('customMargin', { default: 2 })

// State for code validation
const existingCodesInDb = ref<Set<string>>(new Set())

// Computed
const selectedProducts = computed(() =>
  props.products.filter((p) => p.selected)
)

const selectedNewProducts = computed(() =>
  props.products.filter((p) => p.selected && !p.exists)
)

const selectedExistingProducts = computed(() =>
  props.products.filter((p) => p.selected && p.exists)
)

const selectedCount = computed(() => selectedProducts.value.length)

const allSelected = computed(() =>
  props.products.every((p) => p.selected)
)

const canProceed = computed(() => {
  if (selectedCount.value === 0) return false
  // Only NEW products need retail price, existing products just add stock
  return selectedNewProducts.value.every((p) => p.priceRetail && p.priceRetail > 0)
})

// Actions
function applyMargin(multiplier: number) {
  const updated = props.products.map((p) => {
    if (p.selected) {
      const price = Math.round(p.costPrice * multiplier * 100) / 100
      return { ...p, priceRetail: price, priceWholesale: price }
    }
    return p
  })
  emit('update:products', updated)
}

function handleCustomMargin(multiplier: number) {
  applyMargin(multiplier)
  showMarginDialog.value = false
}

function toggleSelectAll(checked: boolean) {
  const updated = props.products.map((p) => ({
    ...p,
    selected: checked,
  }))
  emit('update:products', updated)
}

function updateProduct(index: number, field: keyof ProductToImport, value: unknown) {
  const updated = props.products.map((p, i) =>
    i === index ? { ...p, [field]: value } as ProductToImport : p
  )
  emit('update:products', updated)
}

function rowClass(data: ProductToImport): string {
  return data.exists ? 'row-existing' : ''
}

// Code validation functions
function getDuplicateCodesInBatch(): Set<string> {
  const codes = props.products.map((p) => p.code)
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const code of codes) {
    if (code && seen.has(code)) {
      duplicates.add(code)
    }
    if (code) seen.add(code)
  }
  return duplicates
}

function getCodeError(code: string): string | null {
  if (!code) return null
  // Existing codes are OK now - they just add stock
  // Only show error for duplicates within the current batch
  const duplicates = getDuplicateCodesInBatch()
  if (duplicates.has(code)) return labels.import.codeDuplicateInBatch
  return null
}

function getCodeStatus(code: string): { label: string; severity: 'success' | 'warn' | 'danger' | 'info' } {
  if (!code) return { label: labels.import.statusNew, severity: 'success' }
  if (existingCodesInDb.value.has(code)) return { label: labels.import.statusAddStock, severity: 'info' }
  const duplicates = getDuplicateCodesInBatch()
  if (duplicates.has(code)) return { label: labels.import.statusDuplicate, severity: 'danger' }
  return { label: labels.import.statusNew, severity: 'success' }
}

// Debounced API call to check codes
const checkCodesDebounced = useDebounceFn(async () => {
  const codes = props.products.map((p) => p.code).filter(Boolean)
  if (codes.length === 0) return

  try {
    const { existing } = await api.products.checkCodes(codes)
    existingCodesInDb.value = new Set(existing)

    // Update exists property on products - existing products stay selected for stock addition
    const updated = props.products.map((p) => {
      const productExists = existing.includes(p.code)
      return {
        ...p,
        exists: productExists,
        // Keep selected=true for existing products (they add stock)
        selected: productExists ? true : p.selected,
      }
    })
    emit('update:products', updated)
  } catch (err) {
    console.error('Error checking codes:', err)
  }
}, 500)

function handleCodeChange(index: number, newCode: string) {
  updateProduct(index, 'code', newCode)
  checkCodesDebounced()
}

// Check codes when products change (initial load)
watch(
  () => props.products.length,
  () => {
    if (props.products.length > 0) {
      checkCodesDebounced()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="step-panel">
    <!-- Invoice exists warning -->
    <Message v-if="invoiceInfo?.exists" severity="warn" :closable="false" class="invoice-warning">
      <div class="warning-content">
        <strong>{{ labels.import.invoiceExists }}:</strong> {{ invoiceInfo.number }}
        <RouterLink :to="`/supplier-orders/${invoiceInfo.existingId}`" class="view-link">
          {{ labels.import.viewExistingInvoice }}
        </RouterLink>
      </div>
    </Message>

    <!-- Order exists warning (for email) -->
    <Message v-if="emailInfo?.orderExists" severity="warn" :closable="false" class="invoice-warning">
      <div class="warning-content">
        <strong>{{ labels.import.orderExists }}:</strong> {{ emailInfo.orderNumber }}
        <RouterLink :to="`/supplier-orders/${emailInfo.existingOrderId}`" class="view-link">
          {{ labels.import.viewExistingOrder }}
        </RouterLink>
      </div>
    </Message>

    <div class="configure-header">
      <div class="selected-info">
        <span>{{ selectedCount }} {{ labels.import.selected }}</span>
        <span v-if="selectedNewProducts.length > 0" class="selection-detail new">
          {{ selectedNewProducts.length }} {{ labels.import.newProducts }}
        </span>
        <span v-if="selectedExistingProducts.length > 0" class="selection-detail existing">
          {{ selectedExistingProducts.length }} {{ labels.import.stockAddition }}
        </span>
      </div>
      <div class="margin-actions">
        <span>{{ labels.import.applyMargin }}:</span>
        <Button label="x2" size="small" severity="secondary" outlined @click="applyMargin(2)" />
        <Button label="x2.5" size="small" severity="secondary" outlined @click="applyMargin(2.5)" />
        <Button
          :label="labels.import.customMargin"
          size="small"
          severity="secondary"
          outlined
          @click="showMarginDialog = true"
        />
      </div>
    </div>

    <DataTable
      :value="products"
      :rowClass="rowClass"
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      class="products-table"
    >
      <Column header="" style="width: 50px">
        <template #header>
          <Checkbox
            :modelValue="allSelected"
            :binary="true"
            @update:modelValue="toggleSelectAll"
          />
        </template>
        <template #body="{ data, index }">
          <Checkbox
            :modelValue="data.selected"
            :binary="true"
            @update:modelValue="(val) => updateProduct(index, 'selected', val ?? false)"
          />
        </template>
      </Column>

      <Column :header="labels.import.image" style="width: 60px">
        <template #body="{ data }">
          <ImageThumbnail :src="data.imageUrl" :size="40" :preview-size="200" />
        </template>
      </Column>

      <Column :header="labels.fields.code" style="width: 200px">
        <template #body="{ data, index }">
          <div class="code-cell">
            <InputText
              :modelValue="data.code"
              :class="{ 'p-invalid': getCodeError(data.code) }"
              class="code-input"
              @update:modelValue="(val) => handleCodeChange(index, val ?? '')"
            />
            <small v-if="getCodeError(data.code)" class="p-error code-error">
              {{ getCodeError(data.code) }}
            </small>
          </div>
        </template>
      </Column>

      <Column :header="labels.fields.name" style="min-width: 200px">
        <template #body="{ data, index }">
          <InputText
            :modelValue="data.name"
            :disabled="data.exists"
            class="name-input"
            @update:modelValue="(val) => updateProduct(index, 'name', val ?? '')"
          />
        </template>
      </Column>

      <Column :header="labels.import.cost" style="width: 120px">
        <template #body="{ data, index }">
          <InputNumber
            :modelValue="data.costPrice"
            mode="currency"
            currency="EUR"
            locale="es-ES"
            class="price-input"
            @update:modelValue="(val) => updateProduct(index, 'costPrice', val ?? 0)"
          />
        </template>
      </Column>

      <Column :header="labels.import.retail" style="width: 120px">
        <template #body="{ data, index }">
          <InputNumber
            :modelValue="data.priceRetail"
            mode="currency"
            currency="EUR"
            locale="es-ES"
            :class="{ 'p-invalid': data.selected && !data.exists && !data.priceRetail }"
            class="price-input"
            @update:modelValue="(val) => updateProduct(index, 'priceRetail', val)"
          />
        </template>
      </Column>

      <Column :header="labels.import.b2b" style="width: 120px">
        <template #body="{ data, index }">
          <InputNumber
            :modelValue="data.priceWholesale"
            mode="currency"
            currency="EUR"
            locale="es-ES"
            class="price-input"
            @update:modelValue="(val) => updateProduct(index, 'priceWholesale', val)"
          />
        </template>
      </Column>

      <Column :header="labels.fields.quantity" style="width: 80px">
        <template #body="{ data }">
          <span class="qty-display">{{ data.stockQty || 1 }}</span>
        </template>
      </Column>

      <Column :header="labels.fields.status" style="width: 110px">
        <template #body="{ data }">
          <Tag
            :value="getCodeStatus(data.code).label"
            :severity="getCodeStatus(data.code).severity"
          />
        </template>
      </Column>
    </DataTable>

    <div v-if="hasMorePages" class="load-more-container">
      <Button
        :label="labels.import.loadMore"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        :loading="loadingMore"
        @click="emit('loadMore')"
      />
    </div>

    <!-- Validation message -->
    <Message v-if="selectedCount === 0" severity="warn" :closable="false" class="validation-message">
      Selecciona al menos un producto para continuar
    </Message>
    <Message v-else-if="!canProceed" severity="info" :closable="false" class="validation-message">
      Aplica un margen de precio a los productos seleccionados (todos deben tener precio de venta)
    </Message>

    <!-- Margin Dialog -->
    <MarginDialog
      v-model:visible="showMarginDialog"
      v-model:margin="customMargin"
      @apply="handleCustomMargin"
    />
  </div>
</template>

<style scoped>
.step-panel {
  padding: var(--spacing-md) 0;
}

.invoice-warning {
  margin-bottom: var(--spacing-lg);
}

.warning-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.view-link {
  color: var(--p-primary-color);
  text-decoration: underline;
  font-weight: 500;
}

.configure-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.selected-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-weight: 600;
  color: var(--color-primary);
}

.selection-detail {
  font-size: 0.85em;
  padding: 0.2em 0.6em;
  border-radius: 4px;
}

.selection-detail.new {
  background-color: var(--p-green-100, #dcfce7);
  color: var(--p-green-700, #15803d);
}

.selection-detail.existing {
  background-color: var(--p-blue-100, #dbeafe);
  color: var(--p-blue-700, #1d4ed8);
}

.margin-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.products-table :deep(.row-existing) {
  background-color: var(--p-blue-50, #eff6ff);
}

.products-table :deep(.row-existing:hover) {
  background-color: var(--p-blue-100, #dbeafe) !important;
}

.code-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.code-input {
  width: 100%;
}

.code-error {
  font-size: 0.75rem;
}

.name-input {
  width: 100%;
}

.price-input {
  width: 100%;
}

.price-input :deep(.p-inputnumber-input) {
  width: 100%;
  max-width: 100px;
}

.qty-display {
  font-weight: 600;
  color: var(--color-text);
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-lg);
}

.validation-message {
  margin-top: var(--spacing-lg);
}

@media (max-width: 768px) {
  .configure-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .margin-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
