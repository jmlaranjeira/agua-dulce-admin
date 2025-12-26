<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { StockMovement, Product, StockMovementType } from '@/types'

const toast = useToast()

const movements = ref<StockMovement[]>([])
const products = ref<Product[]>([])
const loading = ref(true)

const productFilter = ref<string | null>(null)
const typeFilter = ref<StockMovementType | null>(null)

const typeOptions = computed(() => [
  { label: labels.stock.allTypes, value: null },
  { label: labels.stock.PURCHASE, value: 'PURCHASE' },
  { label: labels.stock.SALE, value: 'SALE' },
  { label: labels.stock.ADJUSTMENT, value: 'ADJUSTMENT' },
  { label: labels.stock.RETURN, value: 'RETURN' },
])

const productOptions = computed(() => [
  { label: labels.stock.allProducts, value: null },
  ...products.value.map((p) => ({ label: `${p.code} - ${p.name}`, value: p.id })),
])

const filteredMovements = computed(() => {
  let result = movements.value

  if (typeFilter.value) {
    result = result.filter((m) => m.type === typeFilter.value)
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

async function loadProducts() {
  products.value = await api.products.list()
}

async function loadMovements() {
  loading.value = true
  try {
    if (productFilter.value) {
      movements.value = await api.stock.getMovementsByProduct(productFilter.value)
    } else {
      movements.value = await api.stock.getMovements(500)
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function getTypeSeverity(type: StockMovementType): 'success' | 'info' | 'warn' | 'danger' {
  const severities: Record<StockMovementType, 'success' | 'info' | 'warn' | 'danger'> = {
    PURCHASE: 'success',
    SALE: 'info',
    ADJUSTMENT: 'warn',
    RETURN: 'danger',
  }
  return severities[type]
}

function getTypeLabel(type: StockMovementType): string {
  return labels.stock[type as keyof typeof labels.stock] as string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function onProductFilterChange() {
  loadMovements()
}

onMounted(async () => {
  await loadProducts()
  await loadMovements()
})
</script>

<template>
  <div class="stock-movements-view">
    <div class="view-header">
      <div class="filters">
        <Select
          v-model="productFilter"
          :options="productOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.stock.allProducts"
          filter
          class="filter-select"
          @change="onProductFilterChange"
        />
        <Select
          v-model="typeFilter"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.stock.allTypes"
          class="filter-select"
        />
      </div>
    </div>

    <Card class="table-card">
      <template #content>
        <DataTable
          :value="filteredMovements"
          :loading="loading"
          paginator
          :rows="25"
          :rowsPerPageOptions="[25, 50, 100]"
          stripedRows
          rowHover
          scrollable
          class="movements-table"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.stock.noMovements }}
            </div>
          </template>

          <Column :header="labels.fields.date" style="width: 180px">
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>

          <Column header="Producto" style="min-width: 180px">
            <template #body="{ data }">
              <div class="product-cell">
                <span class="product-code">{{ data.product?.code || '-' }}</span>
                <span class="product-name">{{ data.product?.name || '' }}</span>
              </div>
            </template>
          </Column>

          <Column header="Tipo" style="width: 120px">
            <template #body="{ data }">
              <Tag :value="getTypeLabel(data.type)" :severity="getTypeSeverity(data.type)" />
            </template>
          </Column>

          <Column :header="labels.fields.quantity" style="width: 100px">
            <template #body="{ data }">
              <span :class="{ 'text-positive': data.quantity > 0, 'text-negative': data.quantity < 0 }">
                {{ data.quantity > 0 ? '+' : '' }}{{ data.quantity }}
              </span>
            </template>
          </Column>

          <Column :header="labels.fields.reference">
            <template #body="{ data }">
              {{ data.reference || '-' }}
            </template>
          </Column>

          <Column :header="labels.fields.notes">
            <template #body="{ data }">
              {{ data.notes || '-' }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.stock-movements-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 200px;
}

.table-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
}

.table-card :deep(.p-card-body) {
  padding: 0;
}

.table-card :deep(.p-card-content) {
  padding: 0;
}

.movements-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8fafc;
  font-weight: 600;
  color: var(--color-text);
  padding: 1rem 1.25rem;
  border-bottom: 2px solid var(--color-border);
}

.movements-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.875rem 1.25rem;
}

.movements-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f1f5f9 !important;
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.product-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-code {
  font-weight: 600;
  color: var(--p-primary-color);
}

.product-name {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.text-positive {
  color: #16a34a;
  font-weight: 600;
}

.text-negative {
  color: #dc2626;
  font-weight: 600;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
  }

  .filter-select {
    min-width: auto;
  }
}
</style>
