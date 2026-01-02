<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Steps from 'primevue/steps'
import Button from 'primevue/button'

// Components
import ImportSourceSelector from '@/components/import/ImportSourceSelector.vue'
import ImportSearchForm from '@/components/import/ImportSearchForm.vue'
import ImportFileUploader from '@/components/import/ImportFileUploader.vue'
import ImportProductsTable from '@/components/import/ImportProductsTable.vue'
import ImportSummary from '@/components/import/ImportSummary.vue'

// Composables
import { useImportWizard } from '@/composables/useImportWizard'
import { useImportSources } from '@/composables/useImportSources'
import { useProductSelection } from '@/composables/useProductSelection'
import { useImportExecution, type InvoiceInfo, type EmailInfo, type ExcelInfo } from '@/composables/useImportExecution'

// Utils
import { mapSearchResultToProduct } from '@/utils/importMappers'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { ProductToImport } from '@/types'

const toast = useToast()

// Composables
const {
  currentStep,
  selectedSource,
  selectedSupplier,
  selectedCategory,
  isInvoiceSource,
  isEmailSource,
  isExcelSource,
  isMayoristaPlataSource,
  isFileSource,
  nextStep,
  previousStep,
} = useImportWizard()

const {
  loading,
  sources,
  suppliers,
  supplierOptions,
  categoryOptions,
  getCategoryName,
  getSupplierName,
  getSupplierPrefix,
} = useImportSources()

// Products state
const products = ref<ProductToImport[]>([])
const hasMorePages = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const PAGE_SIZE = 50

// File-related state
const invoicePdfFile = ref<File | null>(null)
const excelFile = ref<File | null>(null)
const invoiceInfo = ref<InvoiceInfo>({
  number: null,
  date: null,
  exists: false,
  existingId: null,
  subtotal: 0,
  shippingCost: 0,
})
const emailInfo = ref<EmailInfo>({
  orderNumber: null,
  orderDate: null,
  orderExists: false,
  existingOrderId: null,
  subtotal: 0,
  shippingCost: 0,
  chargeFee: 0,
  total: 0,
})
const excelInfo = ref<ExcelInfo>({
  shippingCost: 0,
  totalAmount: 0,
})

// Product selection
const { selectedProducts, skippedCount, canProceed } = useProductSelection(products)

// Import execution
const { importing, executeImport } = useImportExecution()

// Steps configuration
const stepItems = computed(() => [
  { label: labels.import.stepSource },
  { label: labels.import.stepSearch },
  { label: labels.import.stepConfigure },
  { label: labels.import.stepConfirm },
])

// Validation for step progression
const canProceedStep1 = computed(() => !!selectedSource.value)

// File source type for uploader
const fileSourceType = computed(() => {
  if (isInvoiceSource.value) return 'invoice'
  if (isEmailSource.value) return 'email'
  if (isExcelSource.value) return 'excel'
  if (isMayoristaPlataSource.value) return 'mayorista-plata'
  return 'invoice'
})

// Search products (for API sources)
async function handleSearch(params: { query: string; type: string | null }) {
  if (!selectedSource.value) return

  loading.value = true
  currentPage.value = 1

  try {
    const results = await api.import.search({
      source: selectedSource.value.id,
      search: params.query || undefined,
      category: params.type || undefined,
      page: 1,
      pageSize: PAGE_SIZE,
    })

    products.value = results.map(mapSearchResultToProduct)
    hasMorePages.value = results.length === PAGE_SIZE

    nextStep()
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

// Load more products (pagination)
async function loadMoreProducts() {
  if (!selectedSource.value || loadingMore.value) return

  loadingMore.value = true
  currentPage.value++

  try {
    const results = await api.import.search({
      source: selectedSource.value.id,
      page: currentPage.value,
      pageSize: PAGE_SIZE,
    })

    products.value.push(...results.map(mapSearchResultToProduct))
    hasMorePages.value = results.length === PAGE_SIZE
  } catch (err) {
    currentPage.value--
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  } finally {
    loadingMore.value = false
  }
}

// Handle file parsed
function handleFileParsed(data: {
  products: ProductToImport[]
  invoiceInfo?: InvoiceInfo
  emailInfo?: EmailInfo
  excelInfo?: ExcelInfo
  file: File
  suggestedSupplierId?: string
}) {
  products.value = data.products
  hasMorePages.value = false

  if (data.invoiceInfo) {
    invoiceInfo.value = data.invoiceInfo
    invoicePdfFile.value = data.file
  }

  if (data.emailInfo) {
    emailInfo.value = data.emailInfo
  }

  if (data.excelInfo) {
    excelInfo.value = data.excelInfo
    excelFile.value = data.file
  }

  // Set suggested supplier if not already selected
  if (!selectedSupplier.value && data.suggestedSupplierId) {
    selectedSupplier.value = data.suggestedSupplierId
  }

  nextStep()
}

// Execute import
async function handleExecuteImport() {
  await executeImport({
    sourceId: selectedSource.value!.id,
    selectedProducts: selectedProducts.value,
    selectedSupplier: selectedSupplier.value,
    selectedCategory: selectedCategory.value,
    invoiceInfo: invoiceInfo.value,
    emailInfo: emailInfo.value,
    excelInfo: excelInfo.value,
    invoicePdfFile: invoicePdfFile.value,
    excelFile: excelFile.value,
    suppliers: suppliers.value,
  })
}
</script>

<template>
  <div class="import-wizard-view">
    <Card>
      <template #content>
        <!-- Steps indicator -->
        <Steps :model="stepItems" :activeStep="currentStep" :readonly="true" class="wizard-steps" />

        <div class="step-content">
          <!-- Step 1: Select Source -->
          <ImportSourceSelector
            v-if="currentStep === 0"
            v-model="selectedSource"
            :sources="sources"
            :loading="loading"
          />

          <!-- Step 2: Search or Upload -->
          <template v-else-if="currentStep === 1">
            <!-- File upload for invoice/email/excel -->
            <ImportFileUploader
              v-if="isFileSource"
              v-model:selectedSupplier="selectedSupplier"
              v-model:selectedCategory="selectedCategory"
              :sourceType="fileSourceType"
              :supplierOptions="supplierOptions()"
              :categoryOptions="categoryOptions()"
              :getSupplierPrefix="getSupplierPrefix"
              @parsed="handleFileParsed"
            />

            <!-- Search form for API sources -->
            <ImportSearchForm
              v-else
              v-model:selectedSupplier="selectedSupplier"
              v-model:selectedCategory="selectedCategory"
              :source="selectedSource!"
              :supplierOptions="supplierOptions()"
              :categoryOptions="categoryOptions()"
              :loading="loading"
              @search="handleSearch"
            />
          </template>

          <!-- Step 3: Configure Products -->
          <ImportProductsTable
            v-else-if="currentStep === 2"
            :products="products"
            :invoiceInfo="invoiceInfo"
            :emailInfo="emailInfo"
            :hasMorePages="hasMorePages"
            :loadingMore="loadingMore"
            @update:products="products = $event"
            @loadMore="loadMoreProducts"
          />

          <!-- Step 4: Confirm -->
          <ImportSummary
            v-else-if="currentStep === 3"
            :products="selectedProducts"
            :skippedCount="skippedCount"
            :supplierName="getSupplierName(selectedSupplier)"
            :categoryName="getCategoryName(selectedCategory)"
            :invoiceInfo="invoiceInfo"
            :emailInfo="emailInfo"
            :excelInfo="excelInfo"
            :isFileSource="isFileSource"
            :importing="importing"
          />
        </div>

        <!-- Navigation buttons -->
        <div class="wizard-actions">
          <Button
            v-if="currentStep > 0"
            :label="labels.import.previous"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            :disabled="loading || importing"
            @click="previousStep"
          />
          <div class="spacer" />
          <Button
            v-if="currentStep === 0"
            :label="labels.import.next"
            icon="pi pi-arrow-right"
            iconPos="right"
            :disabled="!canProceedStep1 || loading"
            @click="nextStep"
          />
          <Button
            v-else-if="currentStep === 2"
            :label="labels.import.next"
            icon="pi pi-arrow-right"
            iconPos="right"
            :disabled="!canProceed"
            @click="nextStep"
          />
          <Button
            v-else-if="currentStep === 3"
            :label="labels.import.importProducts"
            icon="pi pi-check"
            :loading="importing"
            :disabled="!canProceed"
            @click="handleExecuteImport"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.import-wizard-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.wizard-steps {
  margin-bottom: var(--spacing-xl);
}

.step-content {
  min-height: 400px;
}

.wizard-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border);
  margin-top: var(--spacing-xl);
}

.spacer {
  flex: 1;
}

@media (max-width: 768px) {
  .wizard-actions {
    flex-direction: column;
  }

  .spacer {
    display: none;
  }

  .wizard-actions button {
    width: 100%;
  }
}
</style>
