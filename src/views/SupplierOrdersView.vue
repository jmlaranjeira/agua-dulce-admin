<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Menu from 'primevue/menu'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { SupplierOrder, Supplier } from '@/types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { isMobile } = useBreakpoints()

const mobileMenu = ref()
const selectedOrder = ref<SupplierOrder | null>(null)

const orders = ref<SupplierOrder[]>([])
const suppliers = ref<Supplier[]>([])
const loading = ref(true)

const supplierFilter = ref<string | null>(null)

const supplierOptions = computed(() => [
  { label: labels.supplierOrders.allSuppliers, value: null },
  ...suppliers.value.map((s) => ({ label: s.name, value: s.id })),
])

const sortedOrders = computed(() => {
  return [...orders.value].sort(
    (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  )
})

const mobileMenuItems = computed(() => {
  const items = []
  if (selectedOrder.value?.pdfUrl) {
    items.push({
      label: labels.supplierOrders.viewPdf,
      icon: 'pi pi-file-pdf',
      command: () => selectedOrder.value && openPdf(selectedOrder.value.pdfUrl!),
    })
  }
  items.push(
    {
      label: labels.actions.edit,
      icon: 'pi pi-eye',
      command: () => selectedOrder.value && goToDetail(selectedOrder.value.id),
    },
    {
      label: labels.actions.delete,
      icon: 'pi pi-trash',
      class: 'text-red-500',
      command: () => selectedOrder.value && confirmDelete(selectedOrder.value),
    }
  )
  return items
})

async function loadData() {
  loading.value = true
  try {
    const [ordersData, suppliersData] = await Promise.all([
      api.supplierOrders.list(supplierFilter.value ? { supplierId: supplierFilter.value } : undefined),
      api.suppliers.list(),
    ])
    orders.value = ordersData
    suppliers.value = suppliersData
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

function goToDetail(id: string) {
  router.push(`/supplier-orders/${id}`)
}

function confirmDelete(order: SupplierOrder) {
  confirm.require({
    message: labels.supplierOrders.confirmDelete,
    header: labels.actions.delete,
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: labels.actions.delete,
    rejectLabel: labels.actions.cancel,
    accept: () => deleteOrder(order.id),
  })
}

async function deleteOrder(id: string) {
  try {
    await api.supplierOrders.delete(id)
    orders.value = orders.value.filter((o) => o.id !== id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.supplierOrders.deletedSuccess,
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(value)
}

function openPdf(url: string) {
  window.open(url, '_blank')
}

function onFilterChange() {
  loadData()
}

function toggleMobileMenu(event: Event, order: SupplierOrder) {
  selectedOrder.value = order
  mobileMenu.value.toggle(event)
}

onMounted(loadData)
</script>

<template>
  <div class="supplier-orders-view">
    <div class="view-header">
      <div class="filters">
        <Select
          v-model="supplierFilter"
          :options="supplierOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.supplierOrders.allSuppliers"
          filter
          class="filter-select"
          @change="onFilterChange"
        />
      </div>
    </div>

    <!-- Desktop: Tabla -->
    <Card v-if="!isMobile" class="table-card">
      <template #content>
        <DataTable
          :value="sortedOrders"
          :loading="loading"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 25, 50]"
          stripedRows
          rowHover
          scrollable
          class="orders-table"
          @row-click="(e) => goToDetail(e.data.id)"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.supplierOrders.noOrders }}
            </div>
          </template>

          <Column :header="labels.supplierOrders.invoiceNumber" sortable>
            <template #body="{ data }">
              <span class="invoice-number">{{ data.invoiceNumber }}</span>
            </template>
          </Column>

          <Column :header="labels.fields.supplier">
            <template #body="{ data }">
              {{ data.supplier.name }}
            </template>
          </Column>

          <Column :header="labels.supplierOrders.invoiceDate" sortable>
            <template #body="{ data }">
              {{ formatDate(data.invoiceDate) }}
            </template>
          </Column>

          <Column :header="labels.supplierOrders.itemCount" style="width: 100px" class="hidden-tablet">
            <template #body="{ data }">
              {{ data.itemCount }}
            </template>
          </Column>

          <Column :header="labels.supplierOrders.totalAmount" style="width: 130px">
            <template #body="{ data }">
              {{ formatCurrency(data.totalAmount, data.currency) }}
            </template>
          </Column>

          <Column :header="labels.fields.actions" style="width: 140px">
            <template #body="{ data }">
              <div class="actions">
                <Button
                  v-if="data.pdfUrl"
                  icon="pi pi-file-pdf"
                  text
                  rounded
                  severity="danger"
                  v-tooltip.top="labels.supplierOrders.viewPdf"
                  @click.stop="openPdf(data.pdfUrl)"
                />
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  v-tooltip.top="labels.actions.edit"
                  @click.stop="goToDetail(data.id)"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  severity="danger"
                  v-tooltip.top="labels.actions.delete"
                  @click.stop="confirmDelete(data)"
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
          v-for="order in sortedOrders"
          :key="order.id"
          class="mobile-card"
          @click="goToDetail(order.id)"
        >
          <div class="mobile-card-header">
            <div>
              <div class="mobile-card-invoice">#{{ order.invoiceNumber }}</div>
              <div class="mobile-card-supplier">{{ order.supplier.name }}</div>
            </div>
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              size="small"
              @click.stop="toggleMobileMenu($event, order)"
            />
          </div>
          <div class="mobile-card-footer">
            <span class="mobile-card-date">{{ formatDate(order.invoiceDate) }}</span>
            <span class="mobile-card-total">{{ formatCurrency(order.totalAmount, order.currency) }}</span>
          </div>
        </div>

        <div v-if="sortedOrders.length === 0" class="empty-message">
          {{ labels.supplierOrders.noOrders }}
        </div>
      </template>
    </div>

    <!-- Menú contextual móvil -->
    <Menu ref="mobileMenu" :model="mobileMenuItems" popup />
  </div>
</template>

<style scoped>
.supplier-orders-view {
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

.orders-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8fafc;
  font-weight: 600;
  color: var(--color-text);
  padding: 1rem 1.25rem;
  border-bottom: 2px solid var(--color-border);
}

.orders-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.875rem 1.25rem;
}

.orders-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

.orders-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f1f5f9 !important;
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.invoice-number {
  font-weight: 600;
  color: var(--p-primary-color);
}

.actions {
  display: flex;
  gap: var(--spacing-xs);
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

.mobile-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.mobile-card-invoice {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--p-primary-color);
}

.mobile-card-supplier {
  font-weight: 500;
  color: var(--color-text);
  margin-top: 2px;
}

.mobile-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.mobile-card-date {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.mobile-card-total {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--color-text);
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
  .filter-select {
    min-width: auto;
    flex: 1;
  }
}
</style>
