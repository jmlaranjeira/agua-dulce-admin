<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { Order, OrderStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const orderId = computed(() => route.params.id as string)
const order = ref<Order | null>(null)
const loading = ref(true)
const updating = ref(false)

const total = computed(() => {
  if (!order.value) return 0
  return order.value.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
})

const canMarkPaid = computed(() => order.value?.status === 'PENDING')
const canMarkShipped = computed(() => order.value?.status === 'PAID')
const canMarkDelivered = computed(() => order.value?.status === 'SHIPPED')
const canCancel = computed(() =>
  order.value?.status === 'PENDING' || order.value?.status === 'PAID'
)

async function loadOrder() {
  loading.value = true
  try {
    order.value = await api.orders.get(orderId.value)
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
    router.push('/orders')
  } finally {
    loading.value = false
  }
}

async function updateStatus(status: OrderStatus) {
  updating.value = true
  try {
    order.value = await api.orders.updateStatus(orderId.value, status)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.orders.statusUpdated,
      life: 3000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  } finally {
    updating.value = false
  }
}

function confirmCancel() {
  confirm.require({
    message: labels.orders.confirmCancel,
    header: labels.orders.cancelOrder,
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => updateStatus('CANCELLED'),
  })
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

function goBack() {
  router.push('/orders')
}

onMounted(loadOrder)
</script>

<template>
  <div class="order-detail-view" v-if="order">
    <!-- Header -->
    <Card class="header-card">
      <template #content>
        <div class="order-header">
          <div class="header-left">
            <Button
              icon="pi pi-arrow-left"
              text
              rounded
              @click="goBack"
              class="back-button"
            />
            <div class="order-info">
              <h2 class="order-number">Pedido #{{ order.number }}</h2>
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>
          <Tag
            :value="labels.status[order.status as keyof typeof labels.status]"
            :severity="getStatusSeverity(order.status)"
            class="status-tag"
          />
        </div>
      </template>
    </Card>

    <!-- Customer Info -->
    <Card>
      <template #title>
        {{ labels.orders.customerInfo }}
      </template>
      <template #content>
        <div class="customer-info">
          <div class="info-row">
            <span class="info-label">{{ labels.fields.name }}:</span>
            <span class="info-value">{{ order.customer.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ labels.fields.phone }}:</span>
            <a :href="`tel:${order.customer.phone}`" class="phone-link">
              {{ order.customer.phone }}
            </a>
          </div>
        </div>
      </template>
    </Card>

    <!-- Order Items -->
    <Card>
      <template #title>
        {{ labels.orders.orderItems }}
      </template>
      <template #content>
        <DataTable :value="order.items" class="items-table">
          <Column header="" style="width: 50px">
            <template #body="{ data }">
              <ImageThumbnail :src="data.product.imageUrl" :size="36" :preview-size="180" />
            </template>
          </Column>

          <Column header="Producto">
            <template #body="{ data }">
              <div>
                <span class="item-name">{{ data.product.name }}</span>
                <span class="item-code">{{ data.product.code }}</span>
              </div>
            </template>
          </Column>

          <Column :header="labels.fields.price" style="width: 120px">
            <template #body="{ data }">
              {{ formatCurrency(data.unitPrice) }}
            </template>
          </Column>

          <Column :header="labels.fields.quantity" style="width: 100px">
            <template #body="{ data }">
              {{ data.quantity }}
            </template>
          </Column>

          <Column :header="labels.orders.subtotal" style="width: 120px">
            <template #body="{ data }">
              {{ formatCurrency(data.unitPrice * data.quantity) }}
            </template>
          </Column>
        </DataTable>

        <div class="total-row">
          <span class="total-label">{{ labels.fields.total }}:</span>
          <span class="total-value">{{ formatCurrency(total) }}</span>
        </div>
      </template>
    </Card>

    <!-- Notes -->
    <Card v-if="order.notes">
      <template #title>
        {{ labels.fields.notes }}
      </template>
      <template #content>
        <p class="notes-text">{{ order.notes }}</p>
      </template>
    </Card>

    <!-- Actions -->
    <Card v-if="canMarkPaid || canMarkShipped || canMarkDelivered || canCancel" class="actions-card">
      <template #title>
        {{ labels.fields.actions }}
      </template>
      <template #content>
        <div class="action-buttons">
          <Button
            v-if="canMarkPaid"
            :label="labels.orders.markAsPaid"
            icon="pi pi-dollar"
            severity="info"
            :loading="updating"
            @click="updateStatus('PAID')"
          />
          <Button
            v-if="canMarkShipped"
            :label="labels.orders.markAsShipped"
            icon="pi pi-send"
            severity="secondary"
            :loading="updating"
            @click="updateStatus('SHIPPED')"
          />
          <Button
            v-if="canMarkDelivered"
            :label="labels.orders.markAsDelivered"
            icon="pi pi-check-circle"
            severity="success"
            :loading="updating"
            @click="updateStatus('DELIVERED')"
          />
          <Button
            v-if="canCancel"
            :label="labels.orders.cancelOrder"
            icon="pi pi-times"
            severity="danger"
            outlined
            :loading="updating"
            @click="confirmCancel"
          />
        </div>
      </template>
    </Card>
  </div>

  <div v-else-if="loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
  </div>
</template>

<style scoped>
.order-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.header-card :deep(.p-card-body) {
  padding: var(--spacing-md);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.back-button {
  margin-right: var(--spacing-xs);
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-number {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.order-date {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.status-tag {
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.info-row {
  display: flex;
  gap: var(--spacing-md);
}

.info-label {
  font-weight: 500;
  color: var(--color-text-muted);
  min-width: 80px;
}

.info-value {
  color: var(--color-text);
}

.phone-link {
  color: var(--color-primary);
  text-decoration: none;
}

.phone-link:hover {
  text-decoration: underline;
}

.items-table {
  margin-bottom: var(--spacing-md);
}

.item-name {
  display: block;
  font-weight: 500;
}

.item-code {
  font-size: 0.85em;
  color: var(--color-text-muted);
}

.total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: #f8fafc;
  border-radius: var(--border-radius);
}

.total-label {
  font-weight: 600;
  font-size: 1.1em;
}

.total-value {
  font-weight: 700;
  font-size: 1.5em;
  color: var(--color-primary);
}

.notes-text {
  margin: 0;
  white-space: pre-wrap;
  color: var(--color-text);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons button {
    width: 100%;
  }
}
</style>
