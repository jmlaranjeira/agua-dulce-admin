<script setup lang="ts">
import { computed } from 'vue'
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

// Computed
const selectedProducts = computed(() =>
  props.products.filter((p) => p.selected && !p.exists)
)

const selectedCount = computed(() => selectedProducts.value.length)

const allSelected = computed(() =>
  props.products.filter((p) => !p.exists).every((p) => p.selected)
)

const canProceed = computed(() => {
  if (selectedCount.value === 0) return false
  return selectedProducts.value.every((p) => p.priceRetail && p.priceRetail > 0)
})

// Actions
function applyMargin(multiplier: number) {
  const updated = props.products.map((p) => {
    if (p.selected && !p.exists) {
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
    selected: p.exists ? p.selected : checked,
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
  return data.exists ? 'row-disabled' : ''
}
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
      <span class="selected-info">
        {{ selectedCount }} {{ labels.import.selected }}
      </span>
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
            :disabled="data.exists"
            @update:modelValue="(val) => updateProduct(index, 'selected', val ?? false)"
          />
        </template>
      </Column>

      <Column :header="labels.import.image" style="width: 60px">
        <template #body="{ data }">
          <ImageThumbnail :src="data.imageUrl" :size="40" :preview-size="200" />
        </template>
      </Column>

      <Column field="code" :header="labels.fields.code" style="width: 200px" />

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
            :disabled="data.exists"
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
            :disabled="data.exists"
            :class="{ 'p-invalid': data.selected && !data.priceRetail }"
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
            :disabled="data.exists"
            class="price-input"
            @update:modelValue="(val) => updateProduct(index, 'priceWholesale', val)"
          />
        </template>
      </Column>

      <Column :header="labels.fields.status" style="width: 110px">
        <template #body="{ data }">
          <Tag
            :value="data.exists ? labels.import.statusExists : labels.import.statusNew"
            :severity="data.exists ? 'warn' : 'success'"
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
  font-weight: 600;
  color: var(--color-primary);
}

.margin-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.products-table :deep(.row-disabled) {
  opacity: 0.5;
}

.products-table :deep(.row-disabled) td {
  pointer-events: none;
}

.products-table :deep(.row-disabled) td:first-child {
  pointer-events: auto;
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
