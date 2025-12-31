<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Menu from 'primevue/menu'
import Dialog from 'primevue/dialog'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { Product, Supplier, Category, CategoryColor } from '@/types'
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '@/types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { isMobile } = useBreakpoints()

const products = ref<Product[]>([])
const selectedProducts = ref<Product[]>([])
const suppliers = ref<Supplier[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const searchQuery = ref('')
const mobileMenu = ref()
const selectedProduct = ref<Product | null>(null)
const bulkActionsMenu = ref()
const showCategoryDialog = ref(false)
const showSupplierDialog = ref(false)
const selectedCategoryId = ref<string | null>(null)
const selectedSupplierId = ref<string | null>(null)

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

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  const query = searchQuery.value.toLowerCase()
  return products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query)
  )
})

const mobileMenuItems = computed(() => [
  {
    label: labels.actions.edit,
    icon: 'pi pi-pencil',
    command: () => selectedProduct.value && goToEdit(selectedProduct.value.id),
  },
  {
    label: labels.actions.deactivate,
    icon: 'pi pi-times',
    visible: selectedProduct.value?.isActive,
    command: () => selectedProduct.value && deactivateProduct(selectedProduct.value),
  },
  {
    label: labels.actions.delete,
    icon: 'pi pi-trash',
    class: 'text-red-500',
    command: () => selectedProduct.value && confirmDeleteProduct(selectedProduct.value),
  },
])

const bulkActionsMenuItems = computed(() => [
  {
    label: labels.actions.activate,
    icon: 'pi pi-check',
    command: confirmBulkActivate,
  },
  {
    label: labels.actions.deactivate,
    icon: 'pi pi-times',
    command: confirmBulkDeactivate,
  },
  { separator: true },
  {
    label: labels.actions.changeCategory,
    icon: 'pi pi-tag',
    command: () => (showCategoryDialog.value = true),
  },
  {
    label: labels.actions.changeSupplier,
    icon: 'pi pi-truck',
    command: () => (showSupplierDialog.value = true),
  },
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

function confirmDeleteProduct(product: Product) {
  confirm.require({
    message: labels.products.confirmDelete,
    header: labels.actions.delete,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: labels.actions.delete,
    rejectLabel: labels.actions.cancel,
    acceptClass: 'p-button-danger',
    accept: () => deleteProduct(product),
  })
}

async function deleteProduct(product: Product) {
  try {
    await api.products.delete(product.id)
    products.value = products.value.filter((p) => p.id !== product.id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.deletedSuccess,
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

function confirmBulkDelete() {
  confirm.require({
    message: `¿Eliminar ${selectedProducts.value.length} productos?`,
    header: labels.actions.delete,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: labels.actions.delete,
    rejectLabel: labels.actions.cancel,
    acceptClass: 'p-button-danger',
    accept: () => bulkDelete(),
  })
}

async function bulkDelete() {
  try {
    await Promise.all(selectedProducts.value.map((p) => api.products.delete(p.id)))
    const deletedIds = new Set(selectedProducts.value.map((p) => p.id))
    products.value = products.value.filter((p) => !deletedIds.has(p.id))
    selectedProducts.value = []
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.deletedSuccess,
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

function confirmBulkActivate() {
  confirm.require({
    message: `¿Activar ${selectedProducts.value.length} productos?`,
    header: labels.actions.activate,
    icon: 'pi pi-check',
    acceptLabel: labels.actions.activate,
    rejectLabel: labels.actions.cancel,
    accept: bulkActivate,
  })
}

async function bulkActivate() {
  try {
    await Promise.all(
      selectedProducts.value.map((p) => api.products.update(p.id, { isActive: true }))
    )
    selectedProducts.value.forEach((p) => (p.isActive = true))
    selectedProducts.value = []
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.activatedSuccess,
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

function confirmBulkDeactivate() {
  confirm.require({
    message: `¿Desactivar ${selectedProducts.value.length} productos?`,
    header: labels.actions.deactivate,
    icon: 'pi pi-times',
    acceptLabel: labels.actions.deactivate,
    rejectLabel: labels.actions.cancel,
    accept: bulkDeactivate,
  })
}

async function bulkDeactivate() {
  try {
    await Promise.all(
      selectedProducts.value.map((p) => api.products.update(p.id, { isActive: false }))
    )
    selectedProducts.value.forEach((p) => (p.isActive = false))
    selectedProducts.value = []
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.bulkDeactivatedSuccess,
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

async function bulkChangeCategory() {
  if (!selectedCategoryId.value) return
  try {
    await Promise.all(
      selectedProducts.value.map((p) =>
        api.products.update(p.id, { categoryId: selectedCategoryId.value! })
      )
    )
    const newCategory = categories.value.find((c) => c.id === selectedCategoryId.value)
    selectedProducts.value.forEach((p) => (p.category = newCategory))
    selectedProducts.value = []
    showCategoryDialog.value = false
    selectedCategoryId.value = null
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.categoryChangedSuccess,
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

async function bulkChangeSupplier() {
  if (!selectedSupplierId.value) return
  try {
    await Promise.all(
      selectedProducts.value.map((p) =>
        api.products.update(p.id, { supplierId: selectedSupplierId.value! })
      )
    )
    const newSupplier = suppliers.value.find((s) => s.id === selectedSupplierId.value)
    selectedProducts.value.forEach((p) => (p.supplier = newSupplier))
    selectedProducts.value = []
    showSupplierDialog.value = false
    selectedSupplierId.value = null
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.supplierChangedSuccess,
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

function toggleMobileMenu(event: Event, product: Product) {
  selectedProduct.value = product
  mobileMenu.value.toggle(event)
}

function getStockSeverity(stock: number): 'danger' | 'warn' | 'success' {
  if (stock < 5) return 'danger'
  if (stock < 10) return 'warn'
  return 'success'
}

function calculateMargin(product: Product): number | null {
  if (!product.costPrice || !product.priceRetail) return null
  const cost = Number(product.costPrice)
  const retail = Number(product.priceRetail)
  if (retail === 0) return null
  return ((retail - cost) / retail) * 100
}

function getMarginSeverity(margin: number): 'danger' | 'warn' | 'success' {
  if (margin < 20) return 'danger'
  if (margin < 30) return 'warn'
  return 'success'
}

function getCategoryColor(categoryId: string): CategoryColor {
  const category = categories.value.find((c) => c.id === categoryId)
  if (!category) return DEFAULT_CATEGORY_COLOR
  return CATEGORY_COLORS[category.slug] ?? DEFAULT_CATEGORY_COLOR
}

function truncateText(text: string, maxLength: number = 22): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
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
            v-model="searchQuery"
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
          v-if="!isMobile"
          v-model="supplierFilter"
          :options="supplierOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.products.allSuppliers"
          class="filter-select"
          @change="applyFilters"
        />
        <Select
          v-if="!isMobile"
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
        :label="isMobile ? undefined : labels.products.newProduct"
        icon="pi pi-plus"
        @click="goToNew"
      />
    </div>

    <div v-if="selectedProducts.length > 0" class="bulk-actions">
      <span class="bulk-count">
        <i class="pi pi-check-square"></i>
        {{ selectedProducts.length }} seleccionados
      </span>
      <div class="bulk-buttons">
        <Button
          :label="labels.actions.actions"
          icon="pi pi-chevron-down"
          iconPos="right"
          outlined
          size="small"
          @click="(e) => bulkActionsMenu.toggle(e)"
        />
        <Menu ref="bulkActionsMenu" :model="bulkActionsMenuItems" popup />
        <Button
          :label="labels.actions.delete"
          icon="pi pi-trash"
          severity="danger"
          size="small"
          @click="confirmBulkDelete"
        />
      </div>
    </div>

    <!-- Desktop: Tabla -->
    <Card v-if="!isMobile" class="table-card">
      <template #content>
        <DataTable
          v-model:selection="selectedProducts"
          :value="filteredProducts"
          :loading="loading"
          dataKey="id"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 25, 50]"
          stripedRows
          rowHover
          scrollable
          class="products-table"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.products.noProducts }}
            </div>
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem" />

          <Column header="" style="width: 60px">
            <template #body="{ data }">
              <ImageThumbnail :src="data.imageUrl" :size="40" :preview-size="200" />
            </template>
          </Column>

          <Column field="code" :header="labels.fields.code" sortable style="width: 140px">
            <template #body="{ data }">
              <span class="product-code">{{ data.code }}</span>
            </template>
          </Column>

          <Column field="name" :header="labels.fields.name" sortable style="width: 190px">
            <template #body="{ data }">
              <span class="product-name">{{ data.name }}</span>
            </template>
          </Column>

          <Column field="category" :header="labels.fields.category" style="width: 130px" class="hidden-tablet">
            <template #body="{ data }">
              <Tag
                v-if="data.category"
                :value="data.category.name"
                :style="{
                  backgroundColor: getCategoryColor(data.category.id).bg,
                  color: getCategoryColor(data.category.id).text,
                }"
              />
              <span v-else class="text-muted">-</span>
            </template>
          </Column>

          <Column field="supplier" :header="labels.fields.supplier" style="width: 140px" class="hidden-tablet">
            <template #body="{ data }">
              <span class="supplier-name">{{ getSupplierName(data) }}</span>
            </template>
          </Column>

          <Column field="priceRetail" header="Precio" sortable style="width: 95px" class="text-right">
            <template #body="{ data }">
              <span class="product-price">{{ formatPrice(data.priceRetail) }}</span>
            </template>
          </Column>

          <Column header="Margen" sortable style="width: 85px" class="text-center hidden-tablet">
            <template #body="{ data }">
              <Tag
                v-if="calculateMargin(data) !== null"
                :value="calculateMargin(data)!.toFixed(0) + '%'"
                :severity="getMarginSeverity(calculateMargin(data)!)"
              />
              <span v-else class="text-muted">-</span>
            </template>
          </Column>

          <Column field="stock" :header="labels.fields.stock" sortable style="width: 75px" class="text-center">
            <template #body="{ data }">
              <Tag :value="data.stock" :severity="getStockSeverity(data.stock)" />
            </template>
          </Column>

          <Column field="isActive" header="Estado" style="width: 90px" class="text-center">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? labels.products.active : labels.products.inactive"
                :severity="data.isActive ? 'success' : 'danger'"
              />
            </template>
          </Column>

          <Column :header="labels.fields.actions" style="width: 110px">
            <template #body="{ data }">
              <div class="actions">
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  size="small"
                  v-tooltip.top="labels.actions.edit"
                  @click="goToEdit(data.id)"
                />
                <Button
                  v-if="data.isActive"
                  icon="pi pi-times"
                  text
                  rounded
                  size="small"
                  severity="warn"
                  v-tooltip.top="labels.actions.deactivate"
                  @click="deactivateProduct(data)"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  v-tooltip.top="labels.actions.delete"
                  @click="confirmDeleteProduct(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Mobile: Tarjetas -->
    <div v-else class="mobile-list">
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
      </div>
      <template v-else>
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="mobile-card"
          @click="goToEdit(product.id)"
        >
          <div class="mobile-card-main">
            <ImageThumbnail :src="product.imageUrl" :size="60" :preview-size="200" />
            <div class="mobile-card-info">
              <div class="mobile-card-title" :title="product.name">{{ truncateText(product.name) }}</div>
              <div class="mobile-card-code">{{ product.code }}</div>
              <div class="mobile-card-price">{{ formatPrice(product.priceRetail) }}</div>
            </div>
            <div class="mobile-card-right">
              <Tag
                :value="product.stock"
                :severity="getStockSeverity(product.stock)"
                class="mb-2"
              />
              <Button
                icon="pi pi-ellipsis-v"
                text
                rounded
                size="small"
                @click.stop="toggleMobileMenu($event, product)"
              />
            </div>
          </div>
          <div v-if="!product.isActive" class="mobile-card-inactive">
            <Tag :value="labels.products.inactive" severity="danger" />
          </div>
        </div>

        <div v-if="filteredProducts.length === 0" class="empty-message">
          {{ labels.products.noProducts }}
        </div>
      </template>
    </div>

    <!-- Menú contextual móvil -->
    <Menu ref="mobileMenu" :model="mobileMenuItems" popup />

    <!-- Dialog Cambiar Categoría -->
    <Dialog
      v-model:visible="showCategoryDialog"
      modal
      :header="labels.actions.changeCategory"
      :style="{ width: '400px' }"
    >
      <div class="dialog-field">
        <label>{{ labels.products.selectCategory }}</label>
        <Select
          v-model="selectedCategoryId"
          :options="categories"
          optionLabel="name"
          optionValue="id"
          :placeholder="labels.products.selectCategory"
          class="w-full"
        />
      </div>
      <template #footer>
        <Button :label="labels.actions.cancel" text @click="showCategoryDialog = false" />
        <Button
          :label="labels.actions.save"
          :disabled="!selectedCategoryId"
          @click="bulkChangeCategory"
        />
      </template>
    </Dialog>

    <!-- Dialog Cambiar Proveedor -->
    <Dialog
      v-model:visible="showSupplierDialog"
      modal
      :header="labels.actions.changeSupplier"
      :style="{ width: '400px' }"
    >
      <div class="dialog-field">
        <label>{{ labels.products.selectSupplier }}</label>
        <Select
          v-model="selectedSupplierId"
          :options="suppliers"
          optionLabel="name"
          optionValue="id"
          :placeholder="labels.products.selectSupplier"
          class="w-full"
        />
      </div>
      <template #footer>
        <Button :label="labels.actions.cancel" text @click="showSupplierDialog = false" />
        <Button
          :label="labels.actions.save"
          :disabled="!selectedSupplierId"
          @click="bulkChangeSupplier"
        />
      </template>
    </Dialog>
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
  align-items: flex-start;
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
  min-width: 160px;
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

.product-code {
  font-family: monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
}

.product-name {
  font-weight: 500;
  color: var(--color-text);
}

.supplier-name {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.product-price {
  font-weight: 600;
}

.text-muted {
  color: var(--color-text-muted);
}

.text-right :deep(th),
.text-right :deep(td) {
  text-align: right !important;
}

.text-center :deep(th),
.text-center :deep(td) {
  text-align: center !important;
}

.actions {
  display: flex;
  gap: 2px;
}

.bulk-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--p-primary-50);
  border-radius: var(--border-radius);
  border: 1px solid var(--p-primary-200);
}

.bulk-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 500;
  color: var(--p-primary-700);
}

.bulk-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.dialog-field label {
  font-weight: 500;
  color: var(--color-text);
}

/* Hide columns on tablet */
@media (max-width: 1024px) {
  .hidden-tablet :deep(th),
  .hidden-tablet :deep(td) {
    display: none;
  }
}

/* Mobile styles */
.mobile-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.mobile-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.mobile-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mobile-card-main {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-start;
}

.mobile-card-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.mobile-card-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.mobile-card-code {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.125rem;
}

.mobile-card-price {
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 0.25rem;
}

.mobile-card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.mobile-card-inactive {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.loading-state i {
  font-size: 1.5rem;
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

  .view-header > button {
    align-self: flex-end;
  }
}
</style>
