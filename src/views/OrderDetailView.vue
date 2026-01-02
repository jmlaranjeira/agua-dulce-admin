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
import { generateOrderPdf } from '@/services/pdfGenerator'
import { labels } from '@/locales/es'
import { useOrderMargin } from '@/composables/useOrderMargin'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { Order, OrderStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { isMobile } = useBreakpoints()

const orderId = computed(() => route.params.id as string)
const order = ref<Order | null>(null)
const loading = ref(true)
const updating = ref(false)

// Extract items for the composable
const orderItems = computed(() => order.value?.items ?? [])

// Order calculations from composable
const {
  total,
  totalMargin,
  totalMarginAmount,
  calculateMargin: calculateItemMargin,
  getMarginClass,
  getTotalMarginClass,
} = useOrderMargin(orderItems)

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

function buildPaymentInfo(useEmoji = true): string {
  const bizumPhone = import.meta.env.VITE_BIZUM_PHONE || ''
  const revolutTag = import.meta.env.VITE_REVOLUT_TAG || ''
  const ibanAccount = import.meta.env.VITE_IBAN_ACCOUNT || ''

  const methods: string[] = []
  if (bizumPhone) methods.push(labels.whatsapp.bizum.replace('{phone}', bizumPhone))
  if (revolutTag) methods.push(labels.whatsapp.revolut.replace('{tag}', revolutTag))
  if (ibanAccount) methods.push(labels.whatsapp.iban.replace('{iban}', ibanAccount))

  if (methods.length === 0) return ''

  const icon = useEmoji ? '💳 ' : ''
  return `${icon}*${labels.whatsapp.paymentMethods}*\n${methods.join('\n')}`
}

function generateWhatsAppMessage(): string {
  if (!order.value) return ''

  let msg = `🛒 *Pedido ${order.value.number}*\n\n`
  msg += `${labels.whatsapp.greeting}\n\n`

  for (const item of order.value.items) {
    const subtotal = item.quantity * item.unitPrice
    msg += `• ${item.product.name} x${item.quantity} — ${formatCurrency(subtotal)}\n`
  }

  msg += `\n*${labels.fields.total}: ${formatCurrency(total.value)}*\n\n`

  if (order.value.shippingAddress) {
    msg += `📍 *Envio a:*\n`
    msg += `${order.value.shippingAddress.street}\n`
    msg += `${order.value.shippingAddress.postalCode} ${order.value.shippingAddress.city}\n`
    if (order.value.shippingAddress.notes) {
      msg += `(${order.value.shippingAddress.notes})\n`
    }
    msg += `\n`
  }

  const paymentInfo = buildPaymentInfo(true)
  if (paymentInfo) msg += `${paymentInfo}\n\n`

  msg += labels.whatsapp.thanks

  return msg
}

function copyToClipboard() {
  navigator.clipboard.writeText(generateWhatsAppMessage())
  toast.add({ severity: 'success', summary: labels.orders.copyMessage, detail: labels.orders.messageCopied, life: 2000 })
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
              <div class="title-row">
                <h2 class="order-number">Pedido #{{ order.number }}</h2>
                <Tag
                  :value="labels.status[order.status as keyof typeof labels.status]"
                  :severity="getStatusSeverity(order.status)"
                  class="status-tag"
                />
              </div>
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>
          <div class="header-right">
            <!-- Desktop: action buttons inline -->
            <div v-if="!isMobile" class="action-buttons" v-show="canMarkPaid || canMarkShipped || canMarkDelivered || canCancel">
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
                icon="pi pi-times"
                severity="danger"
                outlined
                :loading="updating"
                v-tooltip.bottom="labels.orders.cancelOrder"
                @click="confirmCancel"
              />
            </div>
            <!-- Desktop: utility icon buttons -->
            <div v-if="!isMobile" class="utility-buttons">
              <Button
                icon="pi pi-file-pdf"
                severity="danger"
                outlined
                v-tooltip.bottom="labels.orders.downloadPdf"
                @click="generateOrderPdf(order!)"
              />
              <Button
                icon="pi pi-whatsapp"
                severity="success"
                v-tooltip.bottom="labels.orders.copyMessage"
                @click="copyToClipboard"
              />
            </div>

            <!-- Mobile: Full-width labeled buttons -->
            <div v-else class="mobile-actions">
              <Button
                v-if="canMarkPaid"
                :label="labels.orders.markAsPaid"
                icon="pi pi-dollar"
                severity="info"
                :loading="updating"
                class="w-full"
                @click="updateStatus('PAID')"
              />
              <Button
                v-if="canMarkShipped"
                :label="labels.orders.markAsShipped"
                icon="pi pi-send"
                severity="secondary"
                :loading="updating"
                class="w-full"
                @click="updateStatus('SHIPPED')"
              />
              <Button
                v-if="canMarkDelivered"
                :label="labels.orders.markAsDelivered"
                icon="pi pi-check-circle"
                severity="success"
                :loading="updating"
                class="w-full"
                @click="updateStatus('DELIVERED')"
              />
              <Button
                icon="pi pi-whatsapp"
                :label="labels.orders.copyMessage"
                severity="success"
                class="w-full"
                @click="copyToClipboard"
              />
              <Button
                icon="pi pi-file-pdf"
                label="Descargar PDF"
                severity="danger"
                outlined
                class="w-full"
                @click="generateOrderPdf(order!)"
              />
              <Button
                v-if="canCancel"
                icon="pi pi-times"
                :label="labels.orders.cancelOrder"
                severity="danger"
                outlined
                :loading="updating"
                class="w-full"
                @click="confirmCancel"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Customer & Shipping Row -->
    <div class="customer-shipping-row">
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

      <!-- Shipping Address -->
      <Card v-if="order.shippingAddress">
        <template #title>
          {{ labels.address.shippingAddress }}
        </template>
        <template #content>
          <div class="shipping-address">
            <p class="address-label-text"><strong>{{ order.shippingAddress.label }}</strong></p>
            <p>{{ order.shippingAddress.street }}</p>
            <p>{{ order.shippingAddress.postalCode }} {{ order.shippingAddress.city }}</p>
            <p>{{ order.shippingAddress.province }}<span v-if="order.shippingAddress.country">, {{ order.shippingAddress.country }}</span></p>
            <p v-if="order.shippingAddress.notes" class="address-notes">
              {{ order.shippingAddress.notes }}
            </p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Shipping Info (from store orders) -->
    <Card v-if="order.shippingZone || order.shippingPrice > 0" class="shipping-info-card">
      <template #title>
        {{ labels.shipping.shippingInfo }}
      </template>
      <template #content>
        <div class="shipping-info-content">
          <div class="info-row">
            <span class="info-label">{{ labels.shipping.zone }}:</span>
            <span class="info-value">{{ order.shippingZone?.name || labels.shipping.noZone }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ labels.shipping.shippingCost }}:</span>
            <span class="info-value" :class="{ 'text-green': order.shippingWasFree }">
              {{ order.shippingWasFree ? labels.shipping.free : formatCurrency(order.shippingPrice) }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ labels.shipping.estimatedTime }}:</span>
            <span v-if="order.estimatedDaysMin" class="info-value">
              {{ order.estimatedDaysMin }}-{{ order.estimatedDaysMax }} {{ labels.shipping.days }}
            </span>
            <span v-else class="info-value text-amber">{{ labels.shipping.consult }}</span>
          </div>
          <Tag v-if="order.hasCustomsRisk" severity="warn" class="customs-tag">
            {{ labels.shipping.customsWarning }}
          </Tag>
          <Tag v-if="order.needsSupplierOrder" severity="info" class="supplier-order-tag">
            <i class="pi pi-box" style="margin-right: 0.25rem"></i>
            {{ labels.shipping.needsSupplierOrder }}
          </Tag>
        </div>
      </template>
    </Card>

    <!-- Order Items -->
    <Card>
      <template #title>
        {{ labels.orders.orderItems }} ({{ order.items.length }})
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
              <div>
                <span class="item-name">{{ data.product.name }}</span>
                <span class="item-code">{{ data.product.code }}</span>
              </div>
            </template>
          </Column>

          <Column :header="labels.fields.price" style="width: 100px">
            <template #body="{ data }">
              {{ formatCurrency(data.unitPrice) }}
            </template>
          </Column>

          <Column header="Margen" style="width: 80px" class="hidden-tablet">
            <template #body="{ data }">
              <span v-if="data.product.costPrice" class="margin-badge" :class="getMarginClass(data)">
                {{ calculateItemMargin(data) }}%
              </span>
              <span v-else class="text-muted">-</span>
            </template>
          </Column>

          <Column :header="labels.fields.quantity" style="width: 80px">
            <template #body="{ data }">
              {{ data.quantity }}
            </template>
          </Column>

          <Column :header="labels.orders.subtotal" style="width: 100px">
            <template #body="{ data }">
              {{ formatCurrency(data.unitPrice * data.quantity) }}
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
                {{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}
              </div>
            </div>
            <div class="mobile-item-subtotal">
              {{ formatCurrency(item.unitPrice * item.quantity) }}
            </div>
          </div>
        </div>

        <div class="total-row">
          <div class="total-margin" v-if="totalMargin !== null && !isMobile">
            <span class="margin-label">Margen:</span>
            <span class="margin-badge" :class="getTotalMarginClass()">
              {{ formatCurrency(totalMarginAmount!) }} ({{ totalMargin.toFixed(0) }}%)
            </span>
          </div>
          <div class="total-breakdown" v-if="order.shippingPrice > 0">
            <div class="subtotal-line">
              <span>{{ labels.orders.subtotal }}:</span>
              <span>{{ formatCurrency(total) }}</span>
            </div>
            <div class="shipping-line">
              <span>{{ labels.shipping.shippingCost }}:</span>
              <span :class="{ 'text-green': order.shippingWasFree }">
                {{ order.shippingWasFree ? labels.shipping.free : formatCurrency(order.shippingPrice) }}
              </span>
            </div>
          </div>
          <div class="total-amount">
            <span class="total-label">{{ labels.fields.total }}:</span>
            <span class="total-value">{{ formatCurrency(total + (order.shippingPrice || 0)) }}</span>
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
  gap: var(--spacing-xs);
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.order-number {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.status-tag {
  font-size: 0.85rem;
}

.order-date {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.utility-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.customer-shipping-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.customer-shipping-row > :deep(.p-card) {
  margin: 0;
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

.shipping-address p {
  margin: 0.25rem 0;
  color: var(--color-text);
}

.shipping-address .address-label-text {
  margin-bottom: 0.5rem;
}

.shipping-address .address-notes {
  font-style: italic;
  color: var(--color-text-muted);
  margin-top: 0.5rem;
}

/* Shipping info card */
.shipping-info-card {
  margin-top: var(--spacing-lg);
}

.shipping-info-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.text-green {
  color: #16a34a;
  font-weight: 600;
}

.text-amber {
  color: #d97706;
}

.customs-tag,
.supplier-order-tag {
  margin-top: var(--spacing-sm);
  align-self: flex-start;
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

.margin-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.margin-high {
  background-color: #dcfce7;
  color: #166534;
}

.margin-medium {
  background-color: #fef9c3;
  color: #854d0e;
}

.margin-low {
  background-color: #fee2e2;
  color: #991b1b;
}

.text-muted {
  color: var(--color-text-muted);
}

.total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-md);
  background-color: #f8fafc;
  border-radius: var(--border-radius);
}

.total-margin {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.margin-label {
  font-weight: 500;
  color: var(--color-text-muted);
}

.total-amount {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
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

.total-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding-right: var(--spacing-lg);
  border-right: 1px solid var(--color-border);
}

.subtotal-line,
.shipping-line {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-lg);
  font-size: 0.9em;
  color: var(--color-text-muted);
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

/* Mobile actions */
.mobile-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  width: 100%;
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

.mobile-item-subtotal {
  font-weight: 600;
  white-space: nowrap;
}

/* Hide margin column on tablet */
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
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .customer-shipping-row {
    grid-template-columns: 1fr;
  }

  .total-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }

  .total-amount {
    justify-content: space-between;
  }
}
</style>
