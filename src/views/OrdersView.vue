<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'
import { api } from '@/services/api'
import { exportOrdersToCsv } from '@/services/csvExporter'
import { labels } from '@/locales/es'
import type { Order, Customer, OrderStatus } from '@/types'

const router = useRouter()
const toast = useToast()

const orders = ref<Order[]>([])
const customers = ref<Customer[]>([])
const loading = ref(true)

const statusFilter = ref<OrderStatus | null>(null)
const customerFilter = ref<string | null>(null)
const dateRange = ref<Date[] | null>(null)

const statusOptions = [
  { label: labels.orders.allStatus, value: null },
  { label: labels.status.PENDING, value: 'PENDING' },
  { label: labels.status.PAID, value: 'PAID' },
  { label: labels.status.SHIPPED, value: 'SHIPPED' },
  { label: labels.status.DELIVERED, value: 'DELIVERED' },
  { label: labels.status.CANCELLED, value: 'CANCELLED' },
]

const customerOptions = computed(() => [
  { label: labels.orders.allCustomers, value: null },
  ...customers.value.map((c) => ({ label: `${c.name} (${c.phone})`, value: c.id })),
])

const sortedOrders = computed(() => {
  return [...orders.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

async function loadOrders() {
  loading.value = true
  try {
    const filters: { status?: OrderStatus; customerId?: string; from?: Date; to?: Date } = {}
    if (statusFilter.value) filters.status = statusFilter.value
    if (customerFilter.value) filters.customerId = customerFilter.value
    if (dateRange.value && dateRange.value.length === 2) {
      const [start, end] = dateRange.value
      if (start && end) {
        const fromDate = new Date(start)
        fromDate.setHours(0, 0, 0, 0)
        const toDate = new Date(end)
        toDate.setHours(23, 59, 59, 999)
        filters.from = fromDate
        filters.to = toDate
      }
    }
    orders.value = await api.orders.list(filters)
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

async function loadCustomers() {
  try {
    customers.value = await api.customers.list()
  } catch (err) {
    console.error('Error loading customers:', err)
  }
}

function goToNew() {
  router.push('/orders/new')
}

function goToDetail(id: string) {
  router.push(`/orders/${id}`)
}

function calculateTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getStatusSeverity(status: string): 'secondary' | 'info' | 'success' | 'warn' | 'danger' {
  const severities: Record<string, 'secondary' | 'info' | 'success' | 'warn' | 'danger'> = {
    PENDING: 'warn',
    PAID: 'info',
    SHIPPED: 'secondary',
    DELIVERED: 'success',
    CANCELLED: 'danger',
  }
  return severities[status] || 'secondary'
}

function clearFilters() {
  statusFilter.value = null
  customerFilter.value = null
  dateRange.value = null
  loadOrders()
}

function onFilterChange() {
  loadOrders()
}

onMounted(() => {
  loadOrders()
  loadCustomers()
})
</script>

<template>
  <div class="orders-view">
    <div class="view-header">
      <div class="filters">
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.orders.allStatus"
          class="filter-select"
          @change="onFilterChange"
        />
        <Select
          v-model="customerFilter"
          :options="customerOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="labels.orders.allCustomers"
          filter
          class="filter-select"
          @change="onFilterChange"
        />
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          :placeholder="labels.fields.date"
          dateFormat="dd/mm/yy"
          showIcon
          class="filter-date"
          @hide="onFilterChange"
        />
        <Button
          icon="pi pi-times"
          text
          rounded
          v-tooltip.top="labels.actions.clear"
          @click="clearFilters"
        />
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-download"
          label="Exportar"
          severity="secondary"
          outlined
          @click="exportOrdersToCsv(orders)"
        />
        <Button
          :label="labels.orders.newOrder"
          icon="pi pi-plus"
          @click="goToNew"
        />
      </div>
    </div>

    <Card class="table-card">
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
          class="orders-table table-responsive"
          @row-click="(e) => goToDetail(e.data.id)"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.orders.noOrders }}
            </div>
          </template>

          <Column field="number" :header="labels.orders.orderNumber" sortable>
            <template #body="{ data }">
              <span class="order-number">{{ data.number }}</span>
            </template>
          </Column>

          <Column field="customer.name" :header="labels.fields.customer">
            <template #body="{ data }">
              {{ data.customer.name }}
            </template>
          </Column>

          <Column field="createdAt" :header="labels.fields.date" sortable>
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>

          <Column field="total" :header="labels.fields.total">
            <template #body="{ data }">
              {{ formatCurrency(calculateTotal(data)) }}
            </template>
          </Column>

          <Column field="status" :header="labels.fields.status">
            <template #body="{ data }">
              <Tag
                :value="labels.status[data.status as keyof typeof labels.status]"
                :severity="getStatusSeverity(data.status)"
              />
            </template>
          </Column>

          <Column :header="labels.fields.actions" style="width: 80px">
            <template #body="{ data }">
              <div class="actions">
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  v-tooltip.top="labels.actions.edit"
                  @click.stop="goToDetail(data.id)"
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
.orders-view {
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
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  min-width: 180px;
}

.filter-date {
  min-width: 220px;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
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

.order-number {
  font-weight: 600;
  color: var(--color-primary);
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

  .filter-select,
  .filter-date {
    width: 100%;
  }

  .header-actions {
    flex-direction: column;
  }
}
</style>
