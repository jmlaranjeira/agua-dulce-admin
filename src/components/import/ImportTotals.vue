<script setup lang="ts">
import { formatCurrency } from '@/utils/importMappers'
import { labels } from '@/locales/es'

interface Props {
  subtotal: number
  shippingCost?: number
  chargeFee?: number
  total?: number
  trackingNumber?: string
  carrier?: string
}

const props = defineProps<Props>()

const grandTotal = computed(() => {
  if (props.total !== undefined) return props.total
  return props.subtotal + (props.shippingCost || 0) + (props.chargeFee || 0)
})
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <div class="invoice-totals">
    <div class="totals-row">
      <span class="totals-label">{{ labels.supplierOrders.subtotalProducts }}</span>
      <span class="totals-value">{{ formatCurrency(subtotal) }}</span>
    </div>
    <div v-if="shippingCost && shippingCost > 0" class="totals-row">
      <span class="totals-label">{{ labels.supplierOrders.shipping }}</span>
      <span class="totals-value">{{ formatCurrency(shippingCost) }}</span>
    </div>
    <div v-if="chargeFee && chargeFee > 0" class="totals-row">
      <span class="totals-label">Charge Fee</span>
      <span class="totals-value">{{ formatCurrency(chargeFee) }}</span>
    </div>
    <div class="totals-row grand-total">
      <span class="totals-label">{{ labels.supplierOrders.grandTotal }}</span>
      <span class="totals-value">{{ formatCurrency(grandTotal) }}</span>
    </div>
    <div v-if="trackingNumber" class="totals-row">
      <span class="totals-label">Tracking</span>
      <span class="totals-value">{{ trackingNumber }} <span v-if="carrier">({{ carrier }})</span></span>
    </div>
  </div>
</template>

<style scoped>
.invoice-totals {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.totals-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-xl);
  min-width: 250px;
}

.totals-label {
  color: var(--color-text-muted);
}

.totals-value {
  font-weight: 500;
}

.totals-row.grand-total {
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.totals-row.grand-total .totals-label,
.totals-row.grand-total .totals-value {
  font-weight: 700;
  font-size: 1.1em;
  color: var(--p-primary-color);
}
</style>
