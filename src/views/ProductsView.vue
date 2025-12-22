<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { Product, Supplier, Category } from '@/types'

const router = useRouter()
const toast = useToast()

const products = ref<Product[]>([])
const suppliers = ref<Supplier[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)

const filters = ref({
  global: { value: '', matchMode: 'contains' },
})

const statusFilter = ref<boolean | null>(null)
const supplierFilter = ref<string | null>(null)
const categoryFilter = ref<string | null>(null)

const statusOptions = [
  { label: labels.products.allStatus, value: null },
  { label: labels.products.active, value: true },
  { label: labels.products.inactive, value: false },
]

const supplierOptions = computed(() => [
  { label: labels.products.allSuppliers, value: null },
  ...suppliers.value.map((s) => ({ label: s.name, value: s.id })),
])

const categoryOptions = computed(() => [
  { name: labels.products.allCategories, id: null },
  ...[...categories.value].sort((a, b) => a.order - b.order),
])

async function loadData() {
  loading.value = true
  try {
    const [productsData, suppliersData, categoriesData] = await Promise.all([
      api.products.list({
        active: statusFilter.value ?? undefined,
        supplierId: supplierFilter.value ?? undefined,
        categoryId: categoryFilter.value ?? undefined,
      }),
      api.suppliers.list(),
      api.categories.list(),
    ])
    products.value = productsData
    suppliers.value = suppliersData
    categories.value = categoriesData
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

async function applyFilters() {
  loading.value = true
  try {
    products.value = await api.products.list({
      active: statusFilter.value ?? undefined,
      supplierId: supplierFilter.value ?? undefined,
      categoryId: categoryFilter.value ?? undefined,
    })
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

function goToNew() {
  router.push('/products/new')
}

function goToEdit(id: string) {
  router.push(`/products/${id}/edit`)
}

async function deactivateProduct(product: Product) {
  try {
    await api.products.update(product.id, { isActive: false })
    product.isActive = false
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.deactivatedSuccess,
      life: 3000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function getSupplierName(product: Product): string {
  return product.supplier?.name || labels.products.noSupplier
}

function getCategoryName(product: Product): string {
  return product.category?.name || '-'
}

onMounted(loadData)
</script>

<template>
  <div class="products-view">
    <div class="view-header">
      <div class="filters">
        <IconField class="search-box">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="filters.global.value"
            :placeholder="labels.actions.search"
          />
        </IconField>
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.products.allStatus"
          class="filter-select"
          @change="applyFilters"
        />
        <Select
          v-model="supplierFilter"
          :options="supplierOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.products.allSuppliers"
          class="filter-select"
          @change="applyFilters"
        />
        <Select
          v-model="categoryFilter"
          :options="categoryOptions"
          optionLabel="name"
          optionValue="id"
          :placeholder="labels.products.allCategories"
          class="filter-select"
          @change="applyFilters"
        />
      </div>
      <Button
        :label="labels.products.newProduct"
        icon="pi pi-plus"
        @click="goToNew"
      />
    </div>

    <Card class="table-card">
      <template #content>
        <DataTable
          v-model:filters="filters"
          :value="products"
          :loading="loading"
          :globalFilterFields="['code', 'name']"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 25, 50]"
          stripedRows
          rowHover
          scrollable
          class="products-table table-responsive"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.products.noProducts }}
            </div>
          </template>

          <Column header="" style="width: 60px">
            <template #body="{ data }">
              <ImageThumbnail :src="data.imageUrl" :size="40" :preview-size="200" />
            </template>
          </Column>

          <Column field="code" :header="labels.fields.code" sortable style="width: 200px" />

          <Column field="name" :header="labels.fields.name" sortable style="max-width: 150px" />

          <Column field="priceRetail" :header="labels.fields.priceRetail" sortable style="width: 120px">
            <template #body="{ data }">
              {{ formatPrice(data.priceRetail) }}
            </template>
          </Column>

          <Column field="supplier" :header="labels.fields.supplier">
            <template #body="{ data }">
              {{ getSupplierName(data) }}
            </template>
          </Column>

          <Column field="category" :header="labels.fields.category">
            <template #body="{ data }">
              {{ getCategoryName(data) }}
            </template>
          </Column>

          <Column field="isActive" :header="labels.fields.status" style="width: 90px">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? labels.products.active : labels.products.inactive"
                :severity="data.isActive ? 'success' : 'danger'"
              />
            </template>
          </Column>

          <Column :header="labels.fields.actions" style="width: 120px">
            <template #body="{ data }">
              <div class="actions">
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  v-tooltip.top="labels.actions.edit"
                  @click="goToEdit(data.id)"
                />
                <Button
                  v-if="data.isActive"
                  icon="pi pi-times"
                  text
                  rounded
                  severity="danger"
                  v-tooltip.top="labels.actions.delete"
                  @click="deactivateProduct(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.products-view {
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

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-box :deep(input) {
  width: 100%;
}

.filter-select {
  min-width: 180px;
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

.products-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8fafc;
  font-weight: 600;
  color: var(--color-text);
  padding: 1rem 1.25rem;
  border-bottom: 2px solid var(--color-border);
}

.products-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.875rem 1.25rem;
}

.products-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f1f5f9 !important;
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  gap: var(--spacing-xs);
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    flex-direction: column;
  }

  .search-box {
    max-width: none;
  }

  .filter-select {
    min-width: auto;
  }
}
</style>
