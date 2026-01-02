<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import ImportTotals from './ImportTotals.vue'
import { formatCurrency } from '@/utils/importMappers'
import { labels } from '@/locales/es'
import type { ProductToImport } from '@/types'
import type { InvoiceInfo, EmailInfo, ExcelInfo } from '@/composables/useImportExecution'

interface Props {
  products: ProductToImport[]
  skippedCount: number
  supplierName: string
  categoryName: string
  invoiceInfo?: InvoiceInfo
  emailInfo?: EmailInfo
  excelInfo?: ExcelInfo
  isFileSource?: boolean
  importing?: boolean
}

const props = defineProps<Props>()

// Computed summaries
const totalCost = computed(() =>
  props.products.reduce((sum, p) => sum + p.costPrice, 0)
)

const totalRetail = computed(() =>
  props.products.reduce((sum, p) => sum + (p.priceRetail || 0), 0)
)

const totalStock = computed(() =>
  props.products.reduce((sum, p) => sum + (p.stockQty || 0), 0)
)

// Determine which totals to show
const showInvoiceTotals = computed(() => props.invoiceInfo && props.invoiceInfo.subtotal > 0)
const showEmailTotals = computed(() => props.emailInfo && props.emailInfo.subtotal > 0)
const showExcelTotals = computed(() => props.excelInfo && props.excelInfo.totalAmount > 0)
</script>

<template>
  <div class="step-panel">
    <div v-if="importing" class="loading-container">
      <ProgressSpinner />
      <p>{{ labels.messages.loading }}</p>
    </div>

    <template v-else>
      <!-- Invoice exists warning -->
      <Message v-if="invoiceInfo?.exists" severity="warn" :closable="false" class="invoice-warning">
        <div class="warning-content">
          <strong>{{ labels.import.invoiceExists }}:</strong> {{ invoiceInfo.number }}
          <RouterLink :to="`/supplier-orders/${invoiceInfo.existingId}`" class="view-link">
            {{ labels.import.viewExistingInvoice }}
          </RouterLink>
        </div>
      </Message>

      <!-- Order exists warning (for email) -->
      <Message v-if="emailInfo?.orderExists" severity="warn" :closable="false" class="invoice-warning">
        <div class="warning-content">
          <strong>{{ labels.import.orderExists }}:</strong> {{ emailInfo.orderNumber }}
          <RouterLink :to="`/supplier-orders/${emailInfo.existingOrderId}`" class="view-link">
            {{ labels.import.viewExistingOrder }}
          </RouterLink>
        </div>
      </Message>

      <Card class="summary-card">
        <template #content>
          <h3>{{ labels.import.summary }}</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">{{ labels.import.productsToImport }}</span>
              <span class="summary-value">{{ products.length }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{{ labels.import.productsSkipped }}</span>
              <span class="summary-value">{{ skippedCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{{ labels.import.targetSupplierLabel }}</span>
              <span class="summary-value">{{ supplierName }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{{ labels.import.categoryLabel }}</span>
              <span class="summary-value">{{ categoryName }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{{ labels.import.cost }} total</span>
              <span class="summary-value">{{ formatCurrency(totalCost) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{{ labels.import.retail }} total</span>
              <span class="summary-value highlight">{{ formatCurrency(totalRetail) }}</span>
            </div>
            <div v-if="isFileSource" class="summary-item">
              <span class="summary-label">{{ labels.import.totalStockToAdd }}</span>
              <span class="summary-value">{{ totalStock }} uds.</span>
            </div>
          </div>

          <!-- Invoice totals -->
          <ImportTotals
            v-if="showInvoiceTotals"
            :subtotal="invoiceInfo!.subtotal"
            :shippingCost="invoiceInfo!.shippingCost"
          />

          <!-- Email totals -->
          <ImportTotals
            v-if="showEmailTotals"
            :subtotal="emailInfo!.subtotal"
            :shippingCost="emailInfo!.shippingCost"
            :chargeFee="emailInfo!.chargeFee"
            :total="emailInfo!.total"
            :trackingNumber="emailInfo!.trackingNumber"
            :carrier="emailInfo!.carrier"
          />

          <!-- Excel totals -->
          <ImportTotals
            v-if="showExcelTotals"
            :subtotal="excelInfo!.totalAmount - (excelInfo!.shippingCost || 0)"
            :shippingCost="excelInfo!.shippingCost"
          />
        </template>
      </Card>

      <DataTable :value="products" class="preview-table">
        <Column :header="labels.import.image" style="width: 60px">
          <template #body="{ data }">
            <ImageThumbnail :src="data.imageUrl" :size="36" />
          </template>
        </Column>
        <Column field="code" :header="labels.fields.code" style="width: 200px" />
        <Column field="name" :header="labels.fields.name" style="max-width: 150px" />
        <Column v-if="isFileSource" :header="labels.fields.stock" style="width: 80px">
          <template #body="{ data }">
            <Tag :value="data.stockQty" severity="info" />
          </template>
        </Column>
        <Column :header="labels.import.cost" style="width: 100px">
          <template #body="{ data }">{{ formatCurrency(data.costPrice) }}</template>
        </Column>
        <Column :header="labels.import.retail">
          <template #body="{ data }">{{ formatCurrency(data.priceRetail || 0) }}</template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<style scoped>
.step-panel {
  padding: var(--spacing-md) 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-md);
}

.invoice-warning {
  margin-bottom: var(--spacing-lg);
}

.warning-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.view-link {
  color: var(--p-primary-color);
  text-decoration: underline;
  font-weight: 500;
}

.summary-card {
  margin-bottom: var(--spacing-lg);
}

.summary-card h3 {
  margin: 0 0 var(--spacing-lg);
  color: var(--color-text);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.summary-label {
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.summary-value {
  font-weight: 600;
  font-size: 1.1em;
}

.summary-value.highlight {
  color: var(--color-primary);
}

.preview-table {
  margin-top: var(--spacing-lg);
}
</style>
