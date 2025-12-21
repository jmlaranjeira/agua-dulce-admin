<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Chart from 'primevue/chart'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { DashboardStats } from '@/types'

const router = useRouter()
const toast = useToast()

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)

const chartData = computed(() => {
  if (!stats.value) return null
  return {
    labels: [labels.status.PENDING, labels.status.PAID, labels.status.SHIPPED],
    datasets: [
      {
        data: [
          stats.value.pendingOrders,
          stats.value.paidOrders,
          stats.value.shippedOrders,
        ],
        backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6'],
      },
    ],
  }
})

const chartOptions = {
  plugins: {
    legend: { position: 'bottom' as const },
  },
  cutout: '60%',
}

async function loadStats() {
  loading.value = true
  try {
    stats.value = await api.dashboard.stats()
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

function goToOrder(id: string) {
  router.push(`/orders/${id}`)
}

function goToOrders() {
  router.push('/orders')
}

function goToNewOrder() {
  router.push('/orders/new')
}

function goToNewProduct() {
  router.push('/products/new')
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

onMounted(loadStats)
</script>

<template>
  <div class="dashboard-view" v-if="stats">
    <!-- Header con acciones rápidas -->
    <div class="dashboard-header">
      <h1>{{ labels.pages.dashboard }}</h1>
      <div class="quick-actions">
        <Button
          :label="labels.orders.newOrder"
          icon="pi pi-plus"
          @click="goToNewOrder"
        />
        <Button
          :label="labels.products.newProduct"
          icon="pi pi-plus"
          severity="secondary"
          outlined
          @click="goToNewProduct"
        />
      </div>
    </div>

    <!-- Métricas principales -->
    <div class="metrics-grid">
      <Card class="metric-card metric-blue">
        <template #content>
          <div class="metric-content">
            <i class="pi pi-shopping-cart metric-icon"></i>
            <div class="metric-data">
              <span class="metric-value">{{ stats.ordersToday }}</span>
              <span class="metric-label">Pedidos hoy</span>
            </div>
          </div>
        </template>
      </Card>

      <Card class="metric-card metric-green">
        <template #content>
          <div class="metric-content">
            <i class="pi pi-euro metric-icon"></i>
            <div class="metric-data">
              <span class="metric-value">{{ formatCurrency(stats.totalToday) }}</span>
              <span class="metric-label">Facturado hoy</span>
            </div>
          </div>
        </template>
      </Card>

      <Card class="metric-card metric-orange">
        <template #content>
          <div class="metric-content">
            <i class="pi pi-clock metric-icon"></i>
            <div class="metric-data">
              <span class="metric-value">{{ stats.pendingOrders }}</span>
              <span class="metric-label">Pendiente pago</span>
            </div>
          </div>
        </template>
      </Card>

      <Card class="metric-card metric-purple">
        <template #content>
          <div class="metric-content">
            <i class="pi pi-send metric-icon"></i>
            <div class="metric-data">
              <span class="metric-value">{{ stats.paidOrders }}</span>
              <span class="metric-label">Pendiente envío</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Fila intermedia -->
    <div class="middle-row">
      <Card class="chart-card">
        <template #title>Estado de pedidos</template>
        <template #content>
          <div class="chart-container" v-if="chartData && (stats.pendingOrders + stats.paidOrders + stats.shippedOrders) > 0">
            <Chart type="doughnut" :data="chartData" :options="chartOptions" />
          </div>
          <div class="empty-chart" v-else>
            <i class="pi pi-chart-pie"></i>
            <span>Sin pedidos activos</span>
          </div>
        </template>
      </Card>

      <Card class="summary-card">
        <template #title>Resumen</template>
        <template #content>
          <div class="summary-items">
            <div class="summary-item">
              <i class="pi pi-users summary-icon"></i>
              <div class="summary-data">
                <span class="summary-value">{{ stats.customersCount }}</span>
                <span class="summary-label">clientes</span>
              </div>
            </div>

            <div class="summary-item">
              <i class="pi pi-box summary-icon"></i>
              <div class="summary-data">
                <span class="summary-value">{{ stats.productsCount }}</span>
                <span class="summary-label">productos activos</span>
              </div>
            </div>

            <div class="summary-item margin-item" v-if="stats.marginToday !== null">
              <i class="pi pi-chart-line summary-icon"></i>
              <div class="summary-data">
                <span class="summary-value">{{ formatCurrency(stats.marginToday) }}</span>
                <span class="summary-label">margen del día</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Últimos pedidos -->
    <Card class="orders-card">
      <template #title>
        <div class="orders-header">
          <span>Últimos pedidos</span>
          <Button
            label="Ver todos"
            icon="pi pi-arrow-right"
            iconPos="right"
            text
            @click="goToOrders"
          />
        </div>
      </template>
      <template #content>
        <DataTable
          :value="stats.recentOrders"
          :loading="loading"
          class="recent-orders-table"
          @row-click="(e) => goToOrder(e.data.id)"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.orders.noOrders }}
            </div>
          </template>

          <Column field="number" :header="labels.orders.orderNumber">
            <template #body="{ data }">
              <span class="order-number">{{ data.number }}</span>
            </template>
          </Column>

          <Column field="customerName" :header="labels.fields.customer" />

          <Column field="total" :header="labels.fields.total">
            <template #body="{ data }">
              {{ formatCurrency(data.total) }}
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

          <Column field="createdAt" :header="labels.fields.date">
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>

  <div v-else-if="loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.quick-actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* Métricas */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}

.metric-card {
  border-radius: 12px;
  overflow: hidden;
}

.metric-card :deep(.p-card-body) {
  padding: var(--spacing-lg);
}

.metric-card :deep(.p-card-content) {
  padding: 0;
}

.metric-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.metric-icon {
  font-size: 2rem;
  padding: var(--spacing-md);
  border-radius: 12px;
}

.metric-data {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.metric-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.metric-blue .metric-icon {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.metric-green .metric-icon {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.metric-orange .metric-icon {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.metric-purple .metric-icon {
  background-color: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

/* Fila intermedia */
.middle-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.chart-card,
.summary-card {
  border-radius: 12px;
}

.chart-container {
  max-width: 280px;
  margin: 0 auto;
}

.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
  gap: var(--spacing-sm);
}

.empty-chart i {
  font-size: 3rem;
  opacity: 0.3;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.summary-icon {
  font-size: 1.5rem;
  color: var(--color-primary);
  width: 40px;
}

.summary-data {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.summary-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.margin-item {
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

/* Últimos pedidos */
.orders-card {
  border-radius: 12px;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.recent-orders-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

.recent-orders-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f1f5f9 !important;
}

.order-number {
  font-weight: 600;
  color: var(--color-primary);
}

.empty-message {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-muted);
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

/* Responsive */
@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .middle-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .quick-actions {
    width: 100%;
  }

  .quick-actions button {
    flex: 1;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
