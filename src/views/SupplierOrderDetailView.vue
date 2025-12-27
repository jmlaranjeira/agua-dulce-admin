<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { SupplierOrder } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isMobile } = useBreakpoints()

const orderId = computed(() => route.params.id as string)
const order = ref<SupplierOrder | null>(null)
const loading = ref(true)

async function loadOrder() {
  loading.value = true
  try {
    order.value = await api.supplierOrders.get(orderId.value)
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
    router.push('/supplier-orders')
  } finally {
    loading.value = false
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

function goBack() {
  router.push('/supplier-orders')
}

async function downloadPdf() {
  if (!order.value?.id) return
  try {
    const { url } = await api.import.getPdfUrl(order.value.id)
    window.open(url, '_blank')
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo obtener el PDF',
      life: 3000,
    })
  }
}

onMounted(loadOrder)
</script>

<template>
  <div class="supplier-order-detail-view" v-if="order">
    <!-- Header -->
    <Card class="header-card">
      <template #content>
        <div class="order-header">
          <div class="header-left">
            <Button icon="pi pi-arrow-left" text rounded @click="goBack" class="back-button" />
            <div class="order-info">
              <h2 class="invoice-number">Factura #{{ order.invoiceNumber }}</h2>
              <span class="order-meta">
                {{ order.supplier.name }} - {{ formatDate(order.invoiceDate) }}
              </span>
            </div>
          </div>
          <div class="header-right">
            <!-- Desktop: icon button -->
            <Button
              v-if="order.pdfUrl && !isMobile"
              icon="pi pi-file-pdf"
              severity="danger"
              outlined
              v-tooltip.bottom="labels.supplierOrders.downloadPdf"
              @click="downloadPdf"
            />
            <!-- Mobile: full-width labeled button -->
            <Button
              v-if="order.pdfUrl && isMobile"
              icon="pi pi-file-pdf"
              label="Descargar PDF"
              severity="danger"
              outlined
              class="w-full"
              @click="downloadPdf"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Invoice Data -->
    <Card>
      <template #title>
        Datos de la factura
      </template>
      <template #content>
        <div class="invoice-info">
          <div class="info-grid">
            <span class="info-label">{{ labels.fields.supplier }}:</span>
            <span class="info-value">{{ order.supplier.name }}</span>

            <span class="info-label">{{ labels.supplierOrders.subtotalProducts }}:</span>
            <span class="info-value">{{ formatCurrency(order.totalAmount, order.currency) }}</span>

            <template v-if="order.shippingCost > 0">
              <span class="info-label">{{ labels.supplierOrders.shipping }}:</span>
              <span class="info-value">{{ formatCurrency(order.shippingCost, order.currency) }}</span>
            </template>

            <span class="info-label">{{ labels.supplierOrders.grandTotal }}:</span>
            <span class="info-value total">{{ formatCurrency(order.totalAmount + order.shippingCost, order.currency) }}</span>
          </div>
        </div>
      </template>
    </Card>

    <!-- Order Items -->
    <Card>
      <template #title>
        {{ labels.supplierOrders.orderItems }} ({{ order.items?.length || 0 }})
      </template>
      <template #content>
        <!-- Desktop: Table -->
        <DataTable v-if="!isMobile" :value="order.items" class="items-table">
          <Column header="" style="width: 70px">
            <template #body="{ data }">
              <ImageThumbnail :src="data.product.imageUrl" :size="50" :preview-size="180" />
            </template>
          </Column>

          <Column header="Producto">
            <template #body="{ data }">
              <div class="product-cell">
                <span class="item-name">{{ data.product.name }}</span>
                <span class="item-code">{{ data.product.code }}</span>
              </div>
            </template>
          </Column>

          <Column :header="labels.fields.quantity" style="width: 100px">
            <template #body="{ data }">
              {{ data.quantity }}
            </template>
          </Column>

          <Column :header="labels.fields.unitCost" style="width: 120px" class="hidden-tablet">
            <template #body="{ data }">
              {{ formatCurrency(data.unitCost, order!.currency) }}
            </template>
          </Column>

          <Column :header="labels.fields.totalCost" style="width: 120px">
            <template #body="{ data }">
              {{ formatCurrency(data.totalCost, order!.currency) }}
            </template>
          </Column>
        </DataTable>

        <!-- Mobile: Cards -->
        <div v-else class="mobile-items-list">
          <div
            v-for="item in order.items"
            :key="item.id"
            class="mobile-item-card"
          >
            <ImageThumbnail :src="item.product.imageUrl" :size="60" :preview-size="180" />
            <div class="mobile-item-info">
              <div class="mobile-item-name">{{ item.product.name }}</div>
              <div class="mobile-item-details">
                {{ item.quantity }} × {{ formatCurrency(item.unitCost, order!.currency) }}
              </div>
            </div>
            <div class="mobile-item-total">
              {{ formatCurrency(item.totalCost, order!.currency) }}
            </div>
          </div>
        </div>

        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">{{ labels.supplierOrders.subtotalProducts }}:</span>
            <span class="total-value">{{ formatCurrency(order.totalAmount, order.currency) }}</span>
          </div>
          <div v-if="order.shippingCost > 0" class="total-row">
            <span class="total-label">{{ labels.supplierOrders.shipping }}:</span>
            <span class="total-value">{{ formatCurrency(order.shippingCost, order.currency) }}</span>
          </div>
          <div class="total-row grand-total">
            <span class="total-label">{{ labels.supplierOrders.grandTotal }}:</span>
            <span class="total-value">{{ formatCurrency(order.totalAmount + order.shippingCost, order.currency) }}</span>
          </div>
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
  </div>

  <div v-else-if="loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
  </div>
</template>

<style scoped>
.supplier-order-detail-view {
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
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.back-button {
  flex-shrink: 0;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invoice-number {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.order-meta {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.invoice-info {
  display: flex;
  flex-direction: column;
}

.info-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--spacing-sm) var(--spacing-lg);
  align-items: baseline;
}

.info-label {
  font-weight: 500;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.info-value {
  color: var(--color-text);
}

.info-value.total {
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--p-primary-color);
}

.items-table {
  margin-bottom: var(--spacing-md);
}

.items-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8fafc;
  font-weight: 600;
  padding: 0.75rem 1rem;
}

.items-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.75rem 1rem;
}

.product-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-weight: 500;
}

.item-code {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.totals-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background-color: #f8fafc;
  border-radius: var(--border-radius);
  margin-top: var(--spacing-md);
}

.total-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-xl);
  min-width: 250px;
}

.total-label {
  font-weight: 500;
  color: var(--color-text-muted);
}

.total-value {
  font-weight: 500;
}

.total-row.grand-total {
  padding-top: var(--spacing-sm);
  margin-top: var(--spacing-xs);
  border-top: 1px solid var(--color-border);
}

.total-row.grand-total .total-label,
.total-row.grand-total .total-value {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--p-primary-color);
}

.notes-text {
  margin: 0;
  color: var(--color-text);
  white-space: pre-wrap;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--color-text-muted);
}

.w-full {
  width: 100%;
}

/* Mobile item cards */
.mobile-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.mobile-item-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  background-color: #f8fafc;
  border-radius: var(--border-radius);
}

.mobile-item-info {
  flex: 1;
  min-width: 0;
}

.mobile-item-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-item-details {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.mobile-item-total {
  font-weight: 600;
  white-space: nowrap;
}

/* Hide column on tablet */
@media (max-width: 1024px) {
  .hidden-tablet :deep(th),
  .hidden-tablet :deep(td) {
    display: none;
  }
}

@media (max-width: 768px) {
  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .header-right {
    width: 100%;
  }

  .totals-section {
    align-items: stretch;
  }

  .total-row {
    min-width: auto;
  }
}
</style>
