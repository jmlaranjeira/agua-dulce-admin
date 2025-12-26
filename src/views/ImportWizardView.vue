<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Steps from 'primevue/steps'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog from 'primevue/dialog'
import FileUpload from 'primevue/fileupload'
import Message from 'primevue/message'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type {
  ImportSource,
  ImportProductPreview,
  ProductToImport,
  Supplier,
  Category,
  InvoicePreviewItem,
} from '@/types'

const router = useRouter()
const toast = useToast()

// Wizard state
const currentStep = ref(0)
const loading = ref(false)
const importing = ref(false)

// Reference data
const sources = ref<ImportSource[]>([])
const suppliers = ref<Supplier[]>([])
const categories = ref<Category[]>([])

// Step 1: Source selection
const selectedSource = ref<ImportSource | null>(null)

// Step 2: Search
const searchQuery = ref('')
const selectedType = ref<string | null>(null)
const selectedSupplier = ref<string | null>(null)
const selectedCategory = ref<string | null>(null)

// Pagination
const PAGE_SIZE = 50
const currentPage = ref(1)
const hasMorePages = ref(false)
const loadingMore = ref(false)

// Step 3: Products
const products = ref<ProductToImport[]>([])

// Custom margin dialog
const showMarginDialog = ref(false)
const customMargin = ref(2)

// Invoice parsing state
const parsingInvoice = ref(false)
const invoiceInfo = ref<{
  number: string | null
  date: string | null
  exists: boolean
  existingId: string | null
}>({ number: null, date: null, exists: false, existingId: null })

// Steps configuration
const stepItems = computed(() => [
  { label: labels.import.stepSource },
  { label: labels.import.stepSearch },
  { label: labels.import.stepConfigure },
  { label: labels.import.stepConfirm },
])

// Product type options for dropdown
const productTypeOptions = computed(() => {
  if (!selectedSource.value) return []
  return selectedSource.value.productTypes.map((type) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type,
  }))
})

// Supplier options for dropdown
const supplierOptions = computed(() =>
  suppliers.value.map((s) => ({
    label: s.name,
    value: s.id,
  }))
)

// Category options for dropdown
const categoryOptions = computed(() =>
  categories.value.map((c) => ({
    label: c.name,
    value: c.id,
  }))
)

// Selected products (excluding already existing)
const selectedProducts = computed(() =>
  products.value.filter((p) => p.selected && !p.exists)
)

// Count of selected products
const selectedCount = computed(() => selectedProducts.value.length)

// Check if source is invoice
const isInvoiceSource = computed(() => selectedSource.value?.id === 'rainbow-invoice')

// Validation for step progression
const canProceedStep1 = computed(() => !!selectedSource.value)
const canProceedStep2 = computed(() => {
  // Invoice source doesn't need validation in step 2
  if (isInvoiceSource.value) return true
  return searchQuery.value.trim().length > 0 || !!selectedType.value
})
const canProceedStep3 = computed(() => {
  if (selectedCount.value === 0) return false
  return selectedProducts.value.every((p) => p.priceRetail && p.priceRetail > 0)
})

// Summary data for step 4
const productsToImportCount = computed(() => selectedCount.value)
const productsSkippedCount = computed(
  () => products.value.filter((p) => p.exists).length
)
const totalCost = computed(() =>
  selectedProducts.value.reduce((sum, p) => sum + p.costPrice, 0)
)
const totalRetail = computed(() =>
  selectedProducts.value.reduce((sum, p) => sum + (p.priceRetail || 0), 0)
)
const totalStock = computed(() =>
  selectedProducts.value.reduce((sum, p) => sum + (p.stockQty || 0), 0)
)

// Get supplier and category names for summary
const selectedSupplierName = computed(() => {
  if (!selectedSupplier.value) return '-'
  const supplier = suppliers.value.find((s) => s.id === selectedSupplier.value)
  return supplier?.name || '-'
})

const selectedCategoryName = computed(() => {
  if (!selectedCategory.value) return '-'
  const category = categories.value.find((c) => c.id === selectedCategory.value)
  return category?.name || '-'
})

// Navigation
function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Source selection
function selectSource(source: ImportSource) {
  if (source.id === 'csv') return // Disabled for now
  selectedSource.value = source
}

// Transform API response to ProductToImport
function mapToProductToImport(p: ImportProductPreview): ProductToImport {
  return {
    ...p,
    selected: !p.exists, // Productos existentes no se seleccionan por defecto
    costPrice: p.costPriceRaw,
    priceRetail: null,
    priceWholesale: null,
  }
}

// Search products
async function searchProducts() {
  if (!selectedSource.value) return
  if (!searchQuery.value.trim() && !selectedType.value) return

  loading.value = true
  currentPage.value = 1

  try {
    const results = await api.import.search({
      source: selectedSource.value.id,
      search: searchQuery.value.trim() || undefined,
      category: selectedType.value || undefined,
      page: 1,
      pageSize: PAGE_SIZE,
    })

    products.value = results.map(mapToProductToImport)
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
      search: searchQuery.value.trim() || undefined,
      category: selectedType.value || undefined,
      page: currentPage.value,
      pageSize: PAGE_SIZE,
    })

    products.value.push(...results.map(mapToProductToImport))
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

// Transform invoice preview item to ProductToImport
function mapInvoiceItemToProduct(item: InvoicePreviewItem): ProductToImport {
  return {
    externalId: item.code,
    code: item.code,
    name: item.name,
    productType: item.productType,
    costPriceRaw: item.costPrice,
    costPrice: item.costPrice,
    weightGrams: item.parsedData.weight,
    metalType: 'Silver',
    size: '',
    stockQty: item.parsedData.quantity,
    tags: [],
    notes: item.foundInApi ? '' : 'Importado desde PDF',
    imageUrl: item.imageUrl || '',
    suggestedCategoryId: item.suggestedCategoryId,
    exists: item.exists,
    selected: !item.exists,
    priceRetail: item.suggestedRetailPrice,
    priceWholesale: item.suggestedWholesalePrice,
  }
}

// Handle invoice file upload
async function onInvoiceSelect(event: { files: File[] }) {
  const file = event.files[0]
  if (!file) return

  parsingInvoice.value = true
  try {
    const response = await api.import.parseInvoice(file)

    // Store invoice info
    invoiceInfo.value = {
      number: response.invoiceNumber,
      date: response.invoiceDate,
      exists: response.invoiceExists,
      existingId: response.existingInvoiceId,
    }

    // Transform to ProductToImport format
    products.value = response.items.map(mapInvoiceItemToProduct)
    hasMorePages.value = false

    // Set suggested supplier if not already selected
    if (!selectedSupplier.value && response.suggestedSupplierId) {
      selectedSupplier.value = response.suggestedSupplierId
    }

    // Show warning if invoice exists
    if (response.invoiceExists) {
      toast.add({
        severity: 'warn',
        summary: labels.import.invoiceExists,
        detail: labels.import.invoiceExistsDetail.replace('{number}', response.invoiceNumber || ''),
        life: 8000,
      })
    }

    // Show summary
    const summary = labels.import.invoiceSummary
      .replace('{total}', String(response.summary.total))
      .replace('{found}', String(response.summary.found))
      .replace('{existing}', String(response.summary.existing))

    toast.add({
      severity: 'info',
      summary: 'Factura procesada',
      detail: summary,
      life: 5000,
    })

    nextStep()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 5000,
    })
  } finally {
    parsingInvoice.value = false
  }
}

// Apply margin to selected products
function applyMargin(multiplier: number) {
  products.value
    .filter((p) => p.selected && !p.exists)
    .forEach((p) => {
      const price = Math.round(p.costPrice * multiplier * 100) / 100
      p.priceRetail = price
      p.priceWholesale = price
    })
}

// Apply custom margin from dialog
function applyCustomMargin() {
  applyMargin(customMargin.value)
  showMarginDialog.value = false
}

// Toggle select all
function toggleSelectAll(checked: boolean) {
  products.value.forEach((p) => {
    if (!p.exists) {
      p.selected = checked
    }
  })
}

// Check if all non-existing products are selected
const allSelected = computed(() =>
  products.value.filter((p) => !p.exists).every((p) => p.selected)
)

// Row class for disabled rows
function rowClass(data: ProductToImport) {
  return data.exists ? 'row-disabled' : ''
}

// Execute import
async function executeImport() {
  if (!canProceedStep3.value) {
    toast.add({
      severity: 'warn',
      summary: 'Atención',
      detail: labels.import.noProductsSelected,
      life: 3000,
    })
    return
  }

  importing.value = true
  try {
    const result = await api.import.execute({
      source: selectedSource.value!.id,
      products: selectedProducts.value.map((p) => ({
        externalId: p.externalId,
        code: p.code,
        name: p.name,
        priceRetail: p.priceRetail!,
        priceWholesale: p.priceWholesale ?? undefined,
        costPrice: p.costPrice,
        imageUrl: p.imageUrl,
        notes: p.notes,
        supplierId: selectedSupplier.value ?? undefined,
        categoryId: selectedCategory.value ?? p.suggestedCategoryId ?? undefined,
      })),
    })

    const message = labels.import.importedCount
      .replace('{imported}', String(result.imported))
      .replace('{skipped}', String(result.skipped))

    toast.add({
      severity: 'success',
      summary: labels.import.importSuccess,
      detail: message,
      life: 5000,
    })

    if (result.errors && result.errors.length > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Errores',
        detail: `${result.errors.length} productos con errores`,
        life: 5000,
      })
    }

    router.push('/products')
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  } finally {
    importing.value = false
  }
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

// Load initial data
async function loadData() {
  loading.value = true
  try {
    const [sourcesData, suppliersData, categoriesData] = await Promise.all([
      api.import.getSources(),
      api.suppliers.list(),
      api.categories.list(),
    ])
    sources.value = sourcesData
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

onMounted(loadData)
</script>

<template>
  <div class="import-wizard-view">
    <Card>
      <template #content>
        <!-- Steps indicator -->
        <Steps :model="stepItems" :activeStep="currentStep" :readonly="true" class="wizard-steps" />

        <div class="step-content">
          <!-- Step 1: Select Source -->
          <div v-if="currentStep === 0" class="step-panel">
            <p class="step-description">{{ labels.import.selectSource }}</p>

            <div v-if="loading" class="loading-container">
              <ProgressSpinner />
            </div>

            <div v-else class="sources-grid">
              <div
                v-for="source in sources"
                :key="source.id"
                class="source-card"
                :class="{
                  selected: selectedSource?.id === source.id,
                  disabled: source.id === 'csv',
                }"
                @click="selectSource(source)"
              >
                <div class="source-icon">
                  <i
                    :class="
                      source.id === 'rainbow-silver'
                        ? 'pi pi-globe'
                        : source.id === 'rainbow-invoice'
                          ? 'pi pi-file-pdf'
                          : 'pi pi-file'
                    "
                  />
                </div>
                <h3 class="source-name">{{ source.name }}</h3>
                <div v-if="source.productTypes?.length" class="source-types">
                  <Tag
                    v-for="type in source.productTypes.slice(0, 4)"
                    :key="type"
                    :value="type"
                    severity="secondary"
                  />
                  <Tag
                    v-if="source.productTypes.length > 4"
                    :value="`+${source.productTypes.length - 4}`"
                    severity="secondary"
                  />
                </div>
                <span v-if="source.id === 'csv'" class="coming-soon">
                  {{ labels.import.comingSoon }}
                </span>
              </div>
            </div>
          </div>

          <!-- Step 2: Search Products or Upload Invoice -->
          <div v-else-if="currentStep === 1" class="step-panel">
            <!-- Invoice upload (when source is rainbow-invoice) -->
            <div v-if="isInvoiceSource" class="invoice-upload-section">
              <!-- Supplier selection first -->
              <div class="form-field">
                <label>{{ labels.import.targetSupplier }}</label>
                <Select
                  v-model="selectedSupplier"
                  :options="supplierOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="labels.products.noSupplier"
                  showClear
                  class="w-full"
                />
              </div>

              <!-- Invoice file upload -->
              <div v-if="parsingInvoice" class="loading-container">
                <ProgressSpinner />
                <p>{{ labels.import.parsingInvoice }}</p>
              </div>

              <div v-else class="invoice-upload">
                <FileUpload
                  mode="basic"
                  accept=".pdf"
                  :maxFileSize="5000000"
                  :auto="true"
                  :chooseLabel="labels.import.uploadInvoice"
                  @select="onInvoiceSelect"
                />
                <p class="upload-hint">{{ labels.import.invoiceEurOnly }}</p>
              </div>
            </div>

            <!-- Search form (for other sources) -->
            <div v-else class="search-form">
              <div class="form-field">
                <label>{{ labels.import.searchText }}</label>
                <InputText
                  v-model="searchQuery"
                  :placeholder="labels.import.searchPlaceholder"
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label>{{ labels.import.filterByCategory }}</label>
                <Select
                  v-model="selectedType"
                  :options="productTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="labels.import.allCategories"
                  showClear
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label>{{ labels.import.targetSupplier }}</label>
                <Select
                  v-model="selectedSupplier"
                  :options="supplierOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="labels.products.noSupplier"
                  showClear
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label>{{ labels.import.defaultCategory }}</label>
                <Select
                  v-model="selectedCategory"
                  :options="categoryOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="labels.products.noCategory"
                  showClear
                  class="w-full"
                />
              </div>

              <div class="search-action">
                <Button
                  :label="labels.import.searchProducts"
                  icon="pi pi-search"
                  :loading="loading"
                  :disabled="!canProceedStep2"
                  @click="searchProducts"
                />
              </div>
            </div>
          </div>

          <!-- Step 3: Configure Products -->
          <div v-else-if="currentStep === 2" class="step-panel">
            <!-- Invoice exists warning -->
            <Message v-if="invoiceInfo.exists" severity="warn" :closable="false" class="invoice-warning">
              <div class="warning-content">
                <strong>{{ labels.import.invoiceExists }}:</strong> {{ invoiceInfo.number }}
                <RouterLink :to="`/supplier-orders/${invoiceInfo.existingId}`" class="view-link">
                  {{ labels.import.viewExistingInvoice }}
                </RouterLink>
              </div>
            </Message>

            <div class="configure-header">
              <span class="selected-info">
                {{ selectedCount }} {{ labels.import.selected }}
              </span>
              <div class="margin-actions">
                <span>{{ labels.import.applyMargin }}:</span>
                <Button label="x2" size="small" severity="secondary" outlined @click="applyMargin(2)" />
                <Button label="x2.5" size="small" severity="secondary" outlined @click="applyMargin(2.5)" />
                <Button
                  :label="labels.import.customMargin"
                  size="small"
                  severity="secondary"
                  outlined
                  @click="showMarginDialog = true"
                />
              </div>
            </div>

            <DataTable
              :value="products"
              :rowClass="rowClass"
              paginator
              :rows="10"
              :rowsPerPageOptions="[10, 25, 50]"
              class="products-table"
            >
              <Column header="" style="width: 50px">
                <template #header>
                  <Checkbox
                    :modelValue="allSelected"
                    :binary="true"
                    @update:modelValue="toggleSelectAll"
                  />
                </template>
                <template #body="{ data }">
                  <Checkbox
                    v-model="data.selected"
                    :binary="true"
                    :disabled="data.exists"
                  />
                </template>
              </Column>

              <Column :header="labels.import.image" style="width: 60px">
                <template #body="{ data }">
                  <ImageThumbnail :src="data.imageUrl" :size="40" :preview-size="200" />
                </template>
              </Column>

              <Column field="code" :header="labels.fields.code" style="width: 200px" />

              <Column :header="labels.fields.name" style="min-width: 200px">
                <template #body="{ data }">
                  <InputText
                    v-model="data.name"
                    :disabled="data.exists"
                    class="name-input"
                  />
                </template>
              </Column>

              <Column :header="labels.import.cost" style="width: 120px">
                <template #body="{ data }">
                  <InputNumber
                    v-model="data.costPrice"
                    mode="currency"
                    currency="EUR"
                    locale="es-ES"
                    :disabled="data.exists"
                    class="price-input"
                  />
                </template>
              </Column>

              <Column :header="labels.import.retail" style="width: 120px">
                <template #body="{ data }">
                  <InputNumber
                    v-model="data.priceRetail"
                    mode="currency"
                    currency="EUR"
                    locale="es-ES"
                    :disabled="data.exists"
                    :class="{ 'p-invalid': data.selected && !data.priceRetail }"
                    class="price-input"
                  />
                </template>
              </Column>

              <Column :header="labels.import.b2b" style="width: 120px">
                <template #body="{ data }">
                  <InputNumber
                    v-model="data.priceWholesale"
                    mode="currency"
                    currency="EUR"
                    locale="es-ES"
                    :disabled="data.exists"
                    class="price-input"
                  />
                </template>
              </Column>

              <Column :header="labels.fields.status" style="width: 110px">
                <template #body="{ data }">
                  <Tag
                    :value="data.exists ? labels.import.statusExists : labels.import.statusNew"
                    :severity="data.exists ? 'warn' : 'success'"
                  />
                </template>
              </Column>
            </DataTable>

            <div v-if="hasMorePages" class="load-more-container">
              <Button
                :label="labels.import.loadMore"
                icon="pi pi-plus"
                severity="secondary"
                outlined
                :loading="loadingMore"
                @click="loadMoreProducts"
              />
            </div>
          </div>

          <!-- Step 4: Confirm -->
          <div v-else-if="currentStep === 3" class="step-panel">
            <div v-if="importing" class="loading-container">
              <ProgressSpinner />
              <p>{{ labels.messages.loading }}</p>
            </div>

            <template v-else>
              <!-- Invoice exists warning -->
              <Message v-if="invoiceInfo.exists" severity="warn" :closable="false" class="invoice-warning">
                <div class="warning-content">
                  <strong>{{ labels.import.invoiceExists }}:</strong> {{ invoiceInfo.number }}
                  <RouterLink :to="`/supplier-orders/${invoiceInfo.existingId}`" class="view-link">
                    {{ labels.import.viewExistingInvoice }}
                  </RouterLink>
                </div>
              </Message>

              <Card class="summary-card">
                <template #content>
                  <h3>{{ labels.import.summary }}</h3>
                  <div class="summary-grid">
                    <div class="summary-item">
                      <span class="summary-label">{{ labels.import.productsToImport }}</span>
                      <span class="summary-value">{{ productsToImportCount }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">{{ labels.import.productsSkipped }}</span>
                      <span class="summary-value">{{ productsSkippedCount }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">{{ labels.import.targetSupplierLabel }}</span>
                      <span class="summary-value">{{ selectedSupplierName }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">{{ labels.import.categoryLabel }}</span>
                      <span class="summary-value">{{ selectedCategoryName }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">{{ labels.import.cost }} total</span>
                      <span class="summary-value">{{ formatCurrency(totalCost) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">{{ labels.import.retail }} total</span>
                      <span class="summary-value highlight">{{ formatCurrency(totalRetail) }}</span>
                    </div>
                    <div v-if="isInvoiceSource" class="summary-item">
                      <span class="summary-label">{{ labels.import.totalStockToAdd }}</span>
                      <span class="summary-value">{{ totalStock }} uds.</span>
                    </div>
                  </div>
                </template>
              </Card>

              <DataTable :value="selectedProducts" class="preview-table">
                <Column :header="labels.import.image" style="width: 60px">
                  <template #body="{ data }">
                    <ImageThumbnail :src="data.imageUrl" :size="36" />
                  </template>
                </Column>
                <Column field="code" :header="labels.fields.code" style="width: 200px" />
                <Column field="name" :header="labels.fields.name" style="max-width: 150px" />
                <Column v-if="isInvoiceSource" :header="labels.fields.stock" style="width: 80px">
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
            :disabled="!canProceedStep3"
            @click="nextStep"
          />
          <Button
            v-else-if="currentStep === 3"
            :label="labels.import.importProducts"
            icon="pi pi-check"
            :loading="importing"
            :disabled="!canProceedStep3"
            @click="executeImport"
          />
        </div>
      </template>
    </Card>

    <!-- Custom margin dialog -->
    <Dialog
      v-model:visible="showMarginDialog"
      :header="labels.import.customMargin"
      modal
      class="margin-dialog"
    >
      <div class="margin-form">
        <label>Multiplicador:</label>
        <InputNumber
          v-model="customMargin"
          :min="1"
          :max="10"
          :minFractionDigits="1"
          :maxFractionDigits="2"
          showButtons
          suffix="x"
        />
      </div>
      <template #footer>
        <Button
          :label="labels.actions.cancel"
          severity="secondary"
          outlined
          @click="showMarginDialog = false"
        />
        <Button :label="labels.import.applyMargin" @click="applyCustomMargin" />
      </template>
    </Dialog>
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

.step-panel {
  padding: var(--spacing-md) 0;
}

.step-description {
  text-align: center;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xl);
  font-size: 1.1em;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-md);
}

/* Step 1: Sources */
.sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  max-width: 600px;
  margin: 0 auto;
}

.source-card {
  border: 2px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-background);
}

.source-card:hover:not(.disabled) {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.source-card.selected {
  border-color: var(--color-primary);
  background: var(--p-primary-50, #eff6ff);
}

.source-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.source-icon {
  font-size: 2.5rem;
  color: var(--color-primary);
  margin-bottom: var(--spacing-md);
}

.source-name {
  margin: 0 0 var(--spacing-sm);
  font-size: 1.25rem;
}

.source-types {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  justify-content: center;
}

.coming-soon {
  display: block;
  margin-top: var(--spacing-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

/* Step 2: Search */
.search-form {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* Invoice upload */
.invoice-upload-section {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.invoice-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  border: 2px dashed var(--color-border);
  border-radius: var(--border-radius);
  background: var(--p-surface-50, #fafafa);
}

.upload-hint {
  color: var(--color-text-muted);
  font-size: 0.9em;
  margin: 0;
}

.invoice-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-field label {
  font-weight: 500;
  color: var(--color-text);
}

.search-action {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-md);
}

/* Step 3: Configure */
.configure-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.selected-info {
  font-weight: 600;
  color: var(--color-primary);
}

.margin-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.products-table :deep(.row-disabled) {
  opacity: 0.5;
}

.products-table :deep(.row-disabled) td {
  pointer-events: none;
}

.products-table :deep(.row-disabled) td:first-child {
  pointer-events: auto;
}

.name-input {
  width: 100%;
}

.price-input {
  width: 100%;
}

.price-input :deep(.p-inputnumber-input) {
  width: 100%;
  max-width: 100px;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-lg);
}

/* Step 4: Confirm */
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

/* Invoice warning */
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

/* Navigation */
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

/* Dialog */
.margin-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 250px;
}

.margin-form label {
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .sources-grid {
    grid-template-columns: 1fr;
  }

  .configure-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .margin-actions {
    width: 100%;
    justify-content: flex-start;
  }

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
