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
  PanbubuPreviewItem,
  ExcelPreviewItem,
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
  subtotal: number
  shippingCost: number
}>({ number: null, date: null, exists: false, existingId: null, subtotal: 0, shippingCost: 0 })
const invoicePdfFile = ref<File | null>(null)

// Email parsing state (for panbubu-email)
const parsingEmail = ref(false)
const emailInfo = ref<{
  orderNumber: string | null
  orderDate: string | null
  orderExists: boolean
  existingOrderId: string | null
  trackingNumber?: string
  carrier?: string
  subtotal: number
  shippingCost: number
  chargeFee: number
  total: number
}>({
  orderNumber: null,
  orderDate: null,
  orderExists: false,
  existingOrderId: null,
  subtotal: 0,
  shippingCost: 0,
  chargeFee: 0,
  total: 0,
})

// Excel parsing state (for excel-supplier)
const parsingExcel = ref(false)
const excelFile = ref<File | null>(null)
const excelInfo = ref<{
  shippingCost: number
  totalAmount: number
}>({
  shippingCost: 0,
  totalAmount: 0,
})

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

// Check if source is email
const isEmailSource = computed(() => selectedSource.value?.id === 'panbubu-email')

// Check if source is Excel
const isExcelSource = computed(() => selectedSource.value?.id === 'excel-supplier')

// Check if source is file-based (invoice, email, or excel)
const isFileSource = computed(() => isInvoiceSource.value || isEmailSource.value || isExcelSource.value)

// Validation for step progression
const canProceedStep1 = computed(() => !!selectedSource.value)
const canProceedStep2 = computed(() => {
  // File-based sources don't need validation in step 2
  if (isFileSource.value) return true
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

// Transform email preview item to ProductToImport
function mapEmailItemToProduct(item: PanbubuPreviewItem): ProductToImport {
  return {
    externalId: item.code,
    code: item.code,
    name: item.name,
    productType: item.productType,
    costPriceRaw: item.costPrice,
    costPrice: item.costPrice,
    weightGrams: 0,
    metalType: '',
    size: '',
    stockQty: item.quantity,
    tags: [],
    notes: item.notes,
    imageUrl: item.imageUrl || '',
    suggestedCategoryId: item.suggestedCategoryId,
    exists: item.exists,
    selected: !item.exists,
    priceRetail: item.suggestedRetailPrice,
    priceWholesale: item.suggestedWholesalePrice,
  }
}

// Transform Excel preview item to ProductToImport
function mapExcelItemToProduct(item: ExcelPreviewItem): ProductToImport {
  return {
    externalId: item.code,
    code: item.code,
    name: item.code, // Use code as name for Excel items
    productType: item.productType,
    costPriceRaw: item.costPrice,
    costPrice: item.costPrice,
    weightGrams: 0,
    metalType: '',
    size: item.size || '',
    stockQty: item.quantity,
    tags: [],
    notes: item.notes,
    imageUrl: item.imageDataUrl || item.imageUrl || '', // Prefer dataUrl for preview
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

    // Store the PDF file for later upload
    invoicePdfFile.value = file

    // Store invoice info
    invoiceInfo.value = {
      number: response.invoiceNumber,
      date: response.invoiceDate,
      exists: response.invoiceExists,
      existingId: response.existingInvoiceId,
      subtotal: response.subtotal,
      shippingCost: response.shippingCost,
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

// Handle email file upload
async function onEmailSelect(event: { files: File[] }) {
  const file = event.files[0]
  if (!file) return

  parsingEmail.value = true
  try {
    const response = await api.import.parseEmail(file)

    // Store email info
    emailInfo.value = {
      orderNumber: response.orderNumber,
      orderDate: response.orderDate,
      orderExists: response.orderExists,
      existingOrderId: response.existingOrderId,
      trackingNumber: response.trackingNumber,
      carrier: response.carrier,
      subtotal: response.subtotal,
      shippingCost: response.shippingCost,
      chargeFee: response.chargeFee,
      total: response.total,
    }

    // Transform to ProductToImport format
    products.value = response.items.map(mapEmailItemToProduct)
    hasMorePages.value = false

    // Set suggested supplier if not already selected
    if (!selectedSupplier.value && response.suggestedSupplierId) {
      selectedSupplier.value = response.suggestedSupplierId
    }

    // Show warning if order exists
    if (response.orderExists) {
      toast.add({
        severity: 'warn',
        summary: labels.import.orderExists,
        detail: labels.import.orderExistsDetail.replace('{number}', response.orderNumber || ''),
        life: 8000,
      })
    }

    // Show summary
    const summary = labels.import.emailSummary
      .replace('{total}', String(response.summary.total))
      .replace('{existing}', String(response.summary.existing))

    toast.add({
      severity: 'info',
      summary: 'Email procesado',
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
    parsingEmail.value = false
  }
}

// Handle Excel file upload
async function onExcelSelect(event: { files: File[] }) {
  const file = event.files[0]
  if (!file) return

  // Require supplier to be selected
  if (!selectedSupplier.value) {
    toast.add({
      severity: 'warn',
      summary: 'Atención',
      detail: 'Selecciona un proveedor antes de subir el archivo Excel',
      life: 5000,
    })
    return
  }

  parsingExcel.value = true
  try {
    // Get supplier name for prefix (first 2 letters uppercase)
    const supplier = suppliers.value.find((s) => s.id === selectedSupplier.value)
    const prefix = supplier ? supplier.name.substring(0, 2).toUpperCase() : 'AT'

    const response = await api.import.parseExcel(file, prefix)

    // Store the Excel file for later upload (re-parsing for images)
    excelFile.value = file

    // Store Excel info
    excelInfo.value = {
      shippingCost: response.shippingCost,
      totalAmount: response.totalAmount,
    }

    // Transform to ProductToImport format
    products.value = response.items.map(mapExcelItemToProduct)
    hasMorePages.value = false

    // Show summary
    const summary = `${response.summary.total} productos encontrados, ${response.summary.existing} ya existen`

    toast.add({
      severity: 'info',
      summary: 'Excel procesado',
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
    parsingExcel.value = false
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
    const isInvoiceImport = selectedSource.value!.id === 'rainbow-invoice'
    const isEmailImport = selectedSource.value!.id === 'panbubu-email'
    const isExcelImport = selectedSource.value!.id === 'excel-supplier'

    // Generate invoice number for Excel imports: {SUPPLIER-NAME}-{YYYY-MM-DD}-EXCEL
    let excelInvoiceNumber: string | undefined
    if (isExcelImport && selectedSupplier.value) {
      const supplier = suppliers.value.find((s) => s.id === selectedSupplier.value)
      if (supplier) {
        const today = new Date().toISOString().split('T')[0]
        excelInvoiceNumber = `${supplier.name.toUpperCase().replace(/ /g, '-')}-${today}-EXCEL`
      }
    }

    const result = await api.import.execute(
      {
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
          size: p.size || undefined,
          supplierId: selectedSupplier.value ?? undefined,
          categoryId: selectedCategory.value ?? p.suggestedCategoryId ?? undefined,
          quantity: p.stockQty || undefined,
        })),
        // Invoice/Order metadata
        invoiceNumber: isInvoiceImport
          ? invoiceInfo.value.number ?? undefined
          : isEmailImport
            ? emailInfo.value.orderNumber ?? undefined
            : isExcelImport
              ? excelInvoiceNumber
              : undefined,
        invoiceDate: isInvoiceImport
          ? invoiceInfo.value.date ?? undefined
          : isEmailImport
            ? emailInfo.value.orderDate ?? undefined
            : isExcelImport
              ? new Date().toISOString().split('T')[0]
              : undefined,
        supplierId: selectedSupplier.value ?? undefined,
        shippingCost: isInvoiceImport
          ? invoiceInfo.value.shippingCost || undefined
          : isEmailImport
            ? emailInfo.value.shippingCost || undefined
            : isExcelImport
              ? excelInfo.value.shippingCost || undefined
              : undefined,
        // Save PDF to bucket (only for invoice)
        savePdf: isInvoiceImport && !!invoicePdfFile.value,
        // Tracking metadata (for panbubu-email source)
        trackingNumber: isEmailImport ? emailInfo.value.trackingNumber : undefined,
        carrier: isEmailImport ? emailInfo.value.carrier : undefined,
      },
      // Pass the file if available (PDF for invoice, Excel for excel-supplier)
      isInvoiceImport ? invoicePdfFile.value ?? undefined : isExcelImport ? excelFile.value ?? undefined : undefined,
    )

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
                          : source.id === 'panbubu-email'
                            ? 'pi pi-envelope'
                            : source.id === 'excel-supplier'
                              ? 'pi pi-file-excel'
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

            <!-- Email upload (when source is panbubu-email) -->
            <div v-else-if="isEmailSource" class="email-upload-section">
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

              <!-- Email file upload -->
              <div v-if="parsingEmail" class="loading-container">
                <ProgressSpinner />
                <p>{{ labels.import.parsingEmail }}</p>
              </div>

              <div v-else class="email-upload">
                <FileUpload
                  mode="basic"
                  accept=".eml"
                  :maxFileSize="5000000"
                  :auto="true"
                  :chooseLabel="labels.import.uploadEmail"
                  @select="onEmailSelect"
                />
                <p class="upload-hint">{{ labels.import.emailHint }}</p>
              </div>
            </div>

            <!-- Excel upload (when source is excel-supplier) -->
            <div v-else-if="isExcelSource" class="excel-upload-section">
              <!-- Supplier selection first (required) -->
              <div class="form-field">
                <label>{{ labels.import.targetSupplier }} <span class="required">*</span></label>
                <Select
                  v-model="selectedSupplier"
                  :options="supplierOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="labels.products.noSupplier"
                  class="w-full"
                />
                <small class="field-hint">El prefijo del código se genera a partir del nombre del proveedor</small>
              </div>

              <!-- Category selection -->
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

              <!-- Excel file upload -->
              <div v-if="parsingExcel" class="loading-container">
                <ProgressSpinner />
                <p>Procesando Excel...</p>
              </div>

              <div v-else class="excel-upload">
                <FileUpload
                  mode="basic"
                  accept=".xlsx,.xls"
                  :maxFileSize="10000000"
                  :auto="true"
                  chooseLabel="Subir archivo Excel"
                  :disabled="!selectedSupplier"
                  @select="onExcelSelect"
                />
                <p class="upload-hint">Formatos aceptados: .xlsx, .xls (máx. 10MB)</p>
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

            <!-- Order exists warning (for email) -->
            <Message v-if="emailInfo.orderExists" severity="warn" :closable="false" class="invoice-warning">
              <div class="warning-content">
                <strong>{{ labels.import.orderExists }}:</strong> {{ emailInfo.orderNumber }}
                <RouterLink :to="`/supplier-orders/${emailInfo.existingOrderId}`" class="view-link">
                  {{ labels.import.viewExistingOrder }}
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

              <!-- Order exists warning (for email) -->
              <Message v-if="emailInfo.orderExists" severity="warn" :closable="false" class="invoice-warning">
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
                    <div v-if="isFileSource" class="summary-item">
                      <span class="summary-label">{{ labels.import.totalStockToAdd }}</span>
                      <span class="summary-value">{{ totalStock }} uds.</span>
                    </div>
                  </div>

                  <!-- Invoice totals -->
                  <div v-if="isInvoiceSource && invoiceInfo.subtotal > 0" class="invoice-totals">
                    <div class="totals-row">
                      <span class="totals-label">{{ labels.supplierOrders.subtotalProducts }}</span>
                      <span class="totals-value">{{ formatCurrency(invoiceInfo.subtotal) }}</span>
                    </div>
                    <div v-if="invoiceInfo.shippingCost > 0" class="totals-row">
                      <span class="totals-label">{{ labels.supplierOrders.shipping }}</span>
                      <span class="totals-value">{{ formatCurrency(invoiceInfo.shippingCost) }}</span>
                    </div>
                    <div class="totals-row grand-total">
                      <span class="totals-label">{{ labels.supplierOrders.grandTotal }}</span>
                      <span class="totals-value">{{ formatCurrency(invoiceInfo.subtotal + invoiceInfo.shippingCost) }}</span>
                    </div>
                  </div>

                  <!-- Email totals -->
                  <div v-if="isEmailSource && emailInfo.subtotal > 0" class="invoice-totals">
                    <div class="totals-row">
                      <span class="totals-label">{{ labels.supplierOrders.subtotalProducts }}</span>
                      <span class="totals-value">{{ formatCurrency(emailInfo.subtotal) }}</span>
                    </div>
                    <div v-if="emailInfo.shippingCost > 0" class="totals-row">
                      <span class="totals-label">{{ labels.supplierOrders.shipping }}</span>
                      <span class="totals-value">{{ formatCurrency(emailInfo.shippingCost) }}</span>
                    </div>
                    <div v-if="emailInfo.chargeFee > 0" class="totals-row">
                      <span class="totals-label">Charge Fee</span>
                      <span class="totals-value">{{ formatCurrency(emailInfo.chargeFee) }}</span>
                    </div>
                    <div class="totals-row grand-total">
                      <span class="totals-label">{{ labels.supplierOrders.grandTotal }}</span>
                      <span class="totals-value">{{ formatCurrency(emailInfo.total) }}</span>
                    </div>
                    <div v-if="emailInfo.trackingNumber" class="totals-row">
                      <span class="totals-label">Tracking</span>
                      <span class="totals-value">{{ emailInfo.trackingNumber }} ({{ emailInfo.carrier }})</span>
                    </div>
                  </div>

                  <!-- Excel totals -->
                  <div v-if="isExcelSource && excelInfo.totalAmount > 0" class="invoice-totals">
                    <div class="totals-row">
                      <span class="totals-label">{{ labels.supplierOrders.subtotalProducts }}</span>
                      <span class="totals-value">{{ formatCurrency(excelInfo.totalAmount - excelInfo.shippingCost) }}</span>
                    </div>
                    <div v-if="excelInfo.shippingCost > 0" class="totals-row">
                      <span class="totals-label">{{ labels.supplierOrders.shipping }}</span>
                      <span class="totals-value">{{ formatCurrency(excelInfo.shippingCost) }}</span>
                    </div>
                    <div class="totals-row grand-total">
                      <span class="totals-label">{{ labels.supplierOrders.grandTotal }}</span>
                      <span class="totals-value">{{ formatCurrency(excelInfo.totalAmount) }}</span>
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

/* Invoice/Email/Excel upload */
.invoice-upload-section,
.email-upload-section,
.excel-upload-section {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.invoice-upload,
.email-upload,
.excel-upload {
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

.field-hint {
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.required {
  color: var(--p-red-500, #ef4444);
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
