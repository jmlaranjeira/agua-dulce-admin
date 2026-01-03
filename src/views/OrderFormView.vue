<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Select from 'primevue/select'
import AutoComplete from 'primevue/autocomplete'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import AddressDialog from '@/components/AddressDialog.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useOrderMargin } from '@/composables/useOrderMargin'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { Customer, Product, CreateOrder, CreateCustomer, Category, CustomerType, CustomerAddress, ShippingCalculation, Supplier } from '@/types'

type OrderItemForm = {
  product: Product
  quantity: number
  unitPrice: number
}

const router = useRouter()
const toast = useToast()
const { isMobile } = useBreakpoints()

const customers = ref<Customer[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const saving = ref(false)

// Form state
const selectedCustomer = ref<Customer | null>(null)
const orderItems = ref<OrderItemForm[]>([])
const notes = ref('')

// Product search
const selectedProduct = ref<Product | null>(null)
const filteredProducts = ref<Product[]>([])
const quantity = ref(1)

// New customer dialog
const showNewCustomerDialog = ref(false)
const newCustomerForm = ref<CreateCustomer>({
  phone: '',
  name: '',
  type: 'RETAIL',
  notes: '',
})
const savingCustomer = ref(false)
const customerErrors = ref<Record<string, string>>({})

// Shipping address
const customerAddresses = ref<CustomerAddress[]>([])
const selectedShippingAddressId = ref<string | null>(null)
const loadingAddresses = ref(false)
const showAddressDialog = ref(false)

// Shipping calculation
const shippingCalculation = ref<ShippingCalculation | null>(null)
const loadingShipping = ref(false)

// Product search modal
const categories = ref<Category[]>([])
const suppliers = ref<Supplier[]>([])
const showProductModal = ref(false)
const modalSearchQuery = ref('')
const modalCategoryFilter = ref<string | null>(null)
const modalSupplierFilter = ref<string | null>(null)

const customerOptions = computed(() =>
  customers.value.map((c) => ({
    ...c,
    displayName: `${c.name} (${c.phone})`,
  }))
)

const isWholesaleCustomer = computed(() => selectedCustomer.value?.type === 'WHOLESALE')

const customerTypeOptions: { value: CustomerType; label: string }[] = [
  { value: 'RETAIL', label: labels.customerType.RETAIL },
  { value: 'WHOLESALE', label: labels.customerType.WHOLESALE },
]

function getEffectivePrice(product: Product): number {
  if (isWholesaleCustomer.value && product.priceWholesale) {
    return Number(product.priceWholesale) || 0
  }
  return Number(product.priceRetail) || 0
}

function hasWholesalePrice(product: Product): boolean {
  return isWholesaleCustomer.value && product.priceWholesale !== null
}

// Order calculations from composable
const {
  total,
  totalMargin,
  totalMarginAmount,
  calculateMargin,
  getMarginClass,
  getTotalMarginClass,
} = useOrderMargin(orderItems)

const totalQuantity = computed(() =>
  orderItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

const shippingPrice = computed(() => shippingCalculation.value?.shipping.price ?? 0)

const grandTotal = computed(() => total.value + shippingPrice.value)

const categoryOptions = computed(() => [
  { name: labels.products.allCategories, id: null },
  ...[...categories.value].sort((a, b) => a.order - b.order),
])

const supplierOptions = computed(() => [
  { name: labels.suppliers.allSuppliers, id: null },
  ...[...suppliers.value].sort((a, b) => a.name.localeCompare(b.name)),
])

const filteredModalProducts = computed(() => {
  let result = products.value

  if (modalSearchQuery.value) {
    const query = modalSearchQuery.value.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query)
    )
  }

  if (modalCategoryFilter.value) {
    result = result.filter((p) => p.categoryId === modalCategoryFilter.value)
  }

  if (modalSupplierFilter.value) {
    result = result.filter((p) => p.supplierId === modalSupplierFilter.value)
  }

  return result
})

async function loadCustomers() {
  try {
    customers.value = await api.customers.list()
  } catch (err) {
    console.error('Error loading customers:', err)
  }
}

async function loadProducts() {
  try {
    products.value = await api.products.list({ active: true })
  } catch (err) {
    console.error('Error loading products:', err)
  }
}

async function loadCategories() {
  try {
    categories.value = await api.categories.list()
  } catch (err) {
    console.error('Error loading categories:', err)
  }
}

async function loadSuppliers() {
  try {
    suppliers.value = await api.suppliers.list()
  } catch (err) {
    console.error('Error loading suppliers:', err)
  }
}

// Watch customer changes to recalculate prices and load addresses
watch(selectedCustomer, async (newCustomer, oldCustomer) => {
  // Recalculate prices if customer type changed
  if (newCustomer?.type !== oldCustomer?.type) {
    orderItems.value.forEach((item) => {
      item.unitPrice = getEffectivePrice(item.product)
    })
  }

  // Load customer addresses
  if (newCustomer) {
    loadingAddresses.value = true
    try {
      customerAddresses.value = await api.customerAddresses.getByCustomer(newCustomer.id)
      // Auto-select default address
      const defaultAddress = customerAddresses.value.find((a) => a.isDefault)
      selectedShippingAddressId.value = defaultAddress?.id || customerAddresses.value[0]?.id || null
    } catch (err) {
      console.error('Error loading addresses:', err)
      customerAddresses.value = []
      selectedShippingAddressId.value = null
    } finally {
      loadingAddresses.value = false
    }
  } else {
    customerAddresses.value = []
    selectedShippingAddressId.value = null
  }
})

async function onAddressSaved() {
  if (!selectedCustomer.value) return

  const existingIds = new Set(customerAddresses.value.map((a) => a.id))
  customerAddresses.value = await api.customerAddresses.getByCustomer(selectedCustomer.value.id)

  // Select the newly created address
  const newAddress = customerAddresses.value.find((a) => !existingIds.has(a.id))
  if (newAddress) {
    selectedShippingAddressId.value = newAddress.id
  }
}

async function calculateShipping() {
  const address = customerAddresses.value.find((a) => a.id === selectedShippingAddressId.value)
  if (!address || total.value === 0) {
    shippingCalculation.value = null
    return
  }

  loadingShipping.value = true
  try {
    const productIds = orderItems.value.map((item) => item.product.id)
    shippingCalculation.value = await api.shippingZones.calculate(
      address.postalCode,
      total.value,
      productIds
    )
  } catch (err) {
    console.error('Error calculating shipping:', err)
    shippingCalculation.value = null
  } finally {
    loadingShipping.value = false
  }
}

// Recalculate shipping when address or items change
watch([selectedShippingAddressId, orderItems], calculateShipping, { deep: true })

function searchProducts(event: { query: string }) {
  const query = event.query.toLowerCase()
  filteredProducts.value = products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query)
  )
}

function addItem() {
  if (!selectedProduct.value) return

  const product = selectedProduct.value
  const qty = Math.max(1, Math.floor(Number(quantity.value) || 1))
  const existingItem = orderItems.value.find((item) => item.product.id === product.id)

  if (existingItem) {
    existingItem.quantity += qty
  } else {
    orderItems.value.push({
      product,
      quantity: qty,
      unitPrice: getEffectivePrice(product),
    })
  }

  selectedProduct.value = null
  quantity.value = 1
}

function addProductFromModal(product: Product) {
  const existingItem = orderItems.value.find((item) => item.product.id === product.id)

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    orderItems.value.push({
      product,
      quantity: 1,
      unitPrice: getEffectivePrice(product),
    })
  }

  showProductModal.value = false
  modalSearchQuery.value = ''
  modalCategoryFilter.value = null
  modalSupplierFilter.value = null
}

function removeItem(index: number) {
  orderItems.value.splice(index, 1)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function validateCustomer(): boolean {
  customerErrors.value = {}
  if (!newCustomerForm.value.phone.trim()) {
    customerErrors.value.phone = labels.messages.required
  }
  if (!newCustomerForm.value.name.trim()) {
    customerErrors.value.name = labels.messages.required
  }
  return Object.keys(customerErrors.value).length === 0
}

async function saveNewCustomer() {
  if (!validateCustomer()) return

  savingCustomer.value = true
  try {
    const customer = await api.customers.create({
      phone: newCustomerForm.value.phone.trim(),
      name: newCustomerForm.value.name.trim(),
      type: newCustomerForm.value.type,
      notes: newCustomerForm.value.notes?.trim() || undefined,
    })
    customers.value.push(customer)
    selectedCustomer.value = customer
    showNewCustomerDialog.value = false
    newCustomerForm.value = { phone: '', name: '', type: 'RETAIL', notes: '' }
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.customers.savedSuccess,
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
    savingCustomer.value = false
  }
}

async function createOrder() {
  if (!selectedCustomer.value) {
    toast.add({
      severity: 'warn',
      summary: 'Atención',
      detail: labels.orders.selectCustomer,
      life: 3000,
    })
    return
  }

  if (orderItems.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Atención',
      detail: labels.orders.minOneItem,
      life: 3000,
    })
    return
  }

  saving.value = true
  try {
    const data: CreateOrder = {
      customerId: selectedCustomer.value.id,
      shippingAddressId: selectedShippingAddressId.value || undefined,
      items: orderItems.value.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      notes: notes.value.trim() || undefined,
    }

    const order = await api.orders.create(data)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.orders.createdSuccess,
      life: 3000,
    })
    router.push(`/orders/${order.id}`)
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.push('/orders')
}

onMounted(() => {
  loadCustomers()
  loadProducts()
  loadCategories()
  loadSuppliers()
})
</script>

<template>
  <div class="order-form-view">
    <Card>
      <template #content>
        <div class="form">
          <!-- Fila 1: Cliente + Dirección -->
          <div class="form-grid">
            <div class="form-section">
              <label>{{ labels.fields.customer }} *</label>
              <div class="customer-row">
                <Select
                  v-model="selectedCustomer"
                  :options="customerOptions"
                  optionLabel="displayName"
                  :placeholder="labels.orders.selectCustomer"
                  filter
                  class="customer-select"
                  :disabled="loading"
                  appendTo="body"
                />
                <Button
                  icon="pi pi-plus"
                  severity="secondary"
                  outlined
                  v-tooltip.top="labels.customers.newCustomer"
                  @click="showNewCustomerDialog = true"
                />
              </div>
              <small v-if="isWholesaleCustomer" class="wholesale-hint">
                <i class="pi pi-tag"></i>
                Cliente mayorista - Se aplicarán precios de mayorista
              </small>
            </div>

            <div class="form-section" v-if="selectedCustomer">
              <label>{{ labels.address.shippingAddress }}</label>
              <div class="address-row">
                <Select
                  v-model="selectedShippingAddressId"
                  :options="customerAddresses"
                  optionLabel="label"
                  optionValue="id"
                  :placeholder="customerAddresses.length ? labels.address.selectAddress : labels.address.noAddresses"
                  :disabled="loadingAddresses || customerAddresses.length === 0"
                  :loading="loadingAddresses"
                  class="address-select"
                  appendTo="body"
                >
                  <template #option="{ option }">
                    <div class="address-option">
                      <div class="address-option-label">
                        <span>{{ option.label }}</span>
                        <Tag v-if="option.isDefault" severity="info" size="small">{{ labels.address.isDefault }}</Tag>
                      </div>
                      <span class="address-option-detail">
                        {{ option.street }}, {{ option.city }} {{ option.postalCode }}
                      </span>
                    </div>
                  </template>
                  <template #value="{ value }">
                    <span v-if="value">
                      {{ customerAddresses.find(a => a.id === value)?.label || '' }}
                    </span>
                    <span v-else class="text-muted">
                      {{ customerAddresses.length ? labels.address.selectAddress : labels.address.noAddresses }}
                    </span>
                  </template>
                </Select>
                <Button
                  icon="pi pi-plus"
                  severity="secondary"
                  outlined
                  v-tooltip.top="labels.address.add"
                  @click="showAddressDialog = true"
                />
              </div>
              <small v-if="customerAddresses.length === 0 && !loadingAddresses" class="no-address-hint">
                <i class="pi pi-info-circle"></i>
                {{ labels.address.addAddressHint }}
              </small>
            </div>
          </div>

          <!-- Fila 2: Productos (ancho completo) -->
          <div class="form-section products-section">
            <div class="section-header">
              <label>{{ labels.pages.products }}</label>
              <Tag v-if="isWholesaleCustomer" severity="warn" class="wholesale-section-tag">
                <i class="pi pi-info-circle"></i>
                {{ labels.customerType.wholesaleIndicator }}
              </Tag>
            </div>

            <!-- Product Search Inline -->
            <div class="product-search-inline">
              <div class="search-field">
                <AutoComplete
                  v-model="selectedProduct"
                  :suggestions="filteredProducts"
                  optionLabel="name"
                  :placeholder="labels.orders.selectProduct"
                  @complete="searchProducts"
                  class="w-full"
                  :disabled="loading"
                  appendTo="body"
                >
                  <template #option="{ option }">
                    <div class="product-option">
                      <span class="product-code">{{ option.code }}</span>
                      <span class="product-name">{{ option.name }}</span>
                      <span class="product-price">
                        {{ formatCurrency(getEffectivePrice(option)) }}
                        <i v-if="hasWholesalePrice(option)" class="pi pi-tag wholesale-icon-small" />
                      </span>
                    </div>
                  </template>
                </AutoComplete>
              </div>
              <div class="quantity-field">
                <InputNumber
                  v-model="quantity"
                  :min="1"
                  :max="99"
                  showButtons
                  class="w-full"
                />
              </div>
              <Button
                icon="pi pi-plus"
                :label="labels.orders.addProduct"
                @click="addItem"
                :disabled="!selectedProduct"
              />
              <Button
                icon="pi pi-search"
                severity="secondary"
                outlined
                v-tooltip.top="'Buscar en catálogo'"
                @click="showProductModal = true"
              />
            </div>

            <!-- Order Items Table (Desktop) -->
            <DataTable v-if="!isMobile" :value="orderItems" class="items-table">
              <template #empty>
                <div class="empty-cart">
                  {{ labels.orders.emptyCart }}
                </div>
              </template>

              <Column header="" style="width: 50px">
                <template #body="{ data }">
                  <ImageThumbnail :src="data.product.imageUrl" :size="36" :preview-size="180" />
                </template>
              </Column>

              <Column field="product.name" header="Producto">
                <template #body="{ data }">
                  <div>
                    <span class="item-name">{{ data.product.name }}</span>
                    <span class="item-code">{{ data.product.code }}</span>
                  </div>
                </template>
              </Column>

              <Column field="unitPrice" :header="labels.fields.price" style="width: 120px">
                <template #body="{ data }">
                  <div class="price-cell">
                    {{ formatCurrency(data.unitPrice) }}
                    <i
                      v-if="hasWholesalePrice(data.product)"
                      class="pi pi-tag wholesale-icon"
                      v-tooltip.top="labels.customerType.wholesaleIndicator"
                    />
                  </div>
                </template>
              </Column>

              <Column header="Margen" style="width: 90px" class="hidden-tablet">
                <template #body="{ data }">
                  <span v-if="data.product.costPrice" class="margin-badge" :class="getMarginClass(data)">
                    {{ calculateMargin(data) }}%
                  </span>
                  <span v-else class="text-muted">-</span>
                </template>
              </Column>

              <Column field="quantity" :header="labels.fields.quantity" style="width: 130px">
                <template #body="{ data }">
                  <InputNumber
                    v-model="data.quantity"
                    :min="1"
                    :max="99"
                    showButtons
                    buttonLayout="stacked"
                    class="quantity-edit"
                  />
                </template>
              </Column>

              <Column :header="labels.orders.subtotal" style="width: 100px">
                <template #body="{ data }">
                  {{ formatCurrency(data.unitPrice * data.quantity) }}
                </template>
              </Column>

              <Column style="width: 50px">
                <template #body="{ index }">
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    @click="removeItem(index)"
                  />
                </template>
              </Column>
            </DataTable>

            <!-- Order Items Cards (Mobile) -->
            <div v-else class="mobile-items-list">
              <div v-if="orderItems.length === 0" class="empty-cart">
                {{ labels.orders.emptyCart }}
              </div>
              <div
                v-for="(item, index) in orderItems"
                :key="item.product.id"
                class="mobile-item-card"
              >
                <ImageThumbnail :src="item.product.imageUrl" :size="50" :preview-size="180" />
                <div class="mobile-item-content">
                  <div class="mobile-item-name">{{ item.product.name }}</div>
                  <div class="mobile-item-price">
                    {{ formatCurrency(item.unitPrice) }}
                    <i v-if="hasWholesalePrice(item.product)" class="pi pi-tag wholesale-icon" />
                  </div>
                  <div class="mobile-item-quantity-row">
                    <InputNumber
                      v-model="item.quantity"
                      :min="1"
                      :max="99"
                      showButtons
                      buttonLayout="horizontal"
                      class="mobile-quantity-input"
                    />
                    <span class="mobile-item-subtotal">{{ formatCurrency(item.unitPrice * item.quantity) }}</span>
                  </div>
                </div>
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  severity="danger"
                  @click="removeItem(index)"
                  class="mobile-item-delete"
                />
              </div>
            </div>
          </div>

          <!-- Fila 3: Notas + Resumen -->
          <div class="form-grid notes-summary-row">
            <div class="form-section notes-section">
              <label for="notes">{{ labels.fields.notes }}</label>
              <Textarea
                id="notes"
                v-model="notes"
                rows="4"
                autoResize
                :disabled="loading"
              />
            </div>

            <div class="summary-card">
              <div class="summary-title">{{ labels.orders.summary }}</div>

              <div class="summary-row">
                <span class="summary-label">{{ labels.orders.products }}:</span>
                <span>{{ orderItems.length }} items</span>
              </div>

              <div class="summary-row">
                <span class="summary-label">{{ labels.orders.units }}:</span>
                <span>{{ totalQuantity }}</span>
              </div>

              <div v-if="totalMargin !== null" class="summary-row">
                <span class="summary-label">{{ labels.orders.margin }}:</span>
                <span class="margin-badge" :class="getTotalMarginClass()">
                  {{ formatCurrency(totalMarginAmount!) }} ({{ totalMargin.toFixed(0) }}%)
                </span>
              </div>

              <Divider />

              <div class="summary-row">
                <span class="summary-label">{{ labels.orders.subtotal }}:</span>
                <span>{{ formatCurrency(total) }}</span>
              </div>

              <div class="summary-row">
                <span class="summary-label">{{ labels.orders.shipping }}:</span>
                <span v-if="loadingShipping" class="text-muted">
                  <i class="pi pi-spin pi-spinner"></i>
                </span>
                <span v-else-if="shippingCalculation?.shipping.price === null" class="text-muted">
                  {{ labels.orders.shippingConsult }}
                </span>
                <span v-else-if="shippingCalculation?.shipping.isFree" class="shipping-free">
                  {{ labels.orders.shippingFree }}
                </span>
                <span v-else-if="shippingCalculation">
                  {{ formatCurrency(shippingCalculation.shipping.price!) }}
                </span>
                <span v-else class="text-muted">-</span>
              </div>

              <div v-if="shippingCalculation?.delivery.message" class="shipping-delivery-info">
                <i class="pi pi-truck"></i>
                {{ shippingCalculation.delivery.message }}
              </div>

              <div v-if="shippingCalculation?.warnings.length" class="shipping-warnings">
                <div v-for="warning in shippingCalculation.warnings" :key="warning.type" class="shipping-warning">
                  <i class="pi pi-exclamation-triangle"></i>
                  {{ warning.message }}
                </div>
              </div>

              <Divider />

              <div class="summary-total">
                <span>Total:</span>
                <span class="summary-total-value">{{ formatCurrency(grandTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <Button
              type="button"
              :label="labels.actions.cancel"
              severity="secondary"
              outlined
              @click="cancel"
              :disabled="saving"
            />
            <Button
              :label="labels.orders.newOrder"
              icon="pi pi-check"
              :loading="saving"
              @click="createOrder"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- New Customer Dialog -->
    <Dialog
      v-model:visible="showNewCustomerDialog"
      :header="labels.customers.newCustomer"
      modal
      class="customer-dialog"
    >
      <div class="dialog-form">
        <div class="form-field">
          <label for="newPhone">{{ labels.fields.phone }} *</label>
          <InputText
            id="newPhone"
            v-model="newCustomerForm.phone"
            :class="{ 'p-invalid': customerErrors.phone }"
          />
          <small v-if="customerErrors.phone" class="p-error">{{ customerErrors.phone }}</small>
        </div>

        <div class="form-field">
          <label for="newName">{{ labels.fields.name }} *</label>
          <InputText
            id="newName"
            v-model="newCustomerForm.name"
            :class="{ 'p-invalid': customerErrors.name }"
          />
          <small v-if="customerErrors.name" class="p-error">{{ customerErrors.name }}</small>
        </div>

        <div class="form-field">
          <label for="newType">{{ labels.customerType.label }}</label>
          <Select
            id="newType"
            v-model="newCustomerForm.type"
            :options="customerTypeOptions"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div class="form-field">
          <label for="newNotes">{{ labels.fields.notes }}</label>
          <Textarea
            id="newNotes"
            v-model="newCustomerForm.notes"
            rows="2"
            autoResize
          />
        </div>
      </div>

      <template #footer>
        <Button
          :label="labels.actions.cancel"
          severity="secondary"
          outlined
          @click="showNewCustomerDialog = false"
          :disabled="savingCustomer"
        />
        <Button
          :label="labels.actions.save"
          :loading="savingCustomer"
          @click="saveNewCustomer"
        />
      </template>
    </Dialog>

    <!-- Product Search Modal -->
    <Dialog
      v-model:visible="showProductModal"
      header="Buscar Producto"
      modal
      :style="{ width: '95vw', maxWidth: '1100px' }"
      class="product-search-modal"
    >
      <div class="modal-filters">
        <IconField class="modal-search">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="modalSearchQuery"
            :placeholder="labels.orders.selectProduct"
            class="w-full"
          />
        </IconField>
        <Select
          v-model="modalCategoryFilter"
          :options="categoryOptions"
          optionLabel="name"
          optionValue="id"
          :placeholder="labels.products.allCategories"
          class="modal-filter-select"
        />
        <Select
          v-model="modalSupplierFilter"
          :options="supplierOptions"
          optionLabel="name"
          optionValue="id"
          :placeholder="labels.suppliers.allSuppliers"
          class="modal-filter-select"
        />
      </div>

      <DataTable
        :value="filteredModalProducts"
        paginator
        :rows="8"
        class="modal-products-table"
        scrollable
        scrollHeight="450px"
      >
        <template #empty>
          <div class="empty-message">{{ labels.messages.noResults }}</div>
        </template>

        <Column header="" class="col-image">
          <template #body="{ data }">
            <ImageThumbnail :src="data.imageUrl" :size="40" :preview-size="150" />
          </template>
        </Column>

        <Column field="code" :header="labels.fields.code" class="col-code" />

        <Column field="name" :header="labels.fields.name" class="col-name" />

        <Column :header="labels.fields.supplier" class="col-supplier">
          <template #body="{ data }">
            <span v-if="data.supplier" class="supplier-name">{{ data.supplier.name }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </Column>

        <Column :header="labels.fields.price" class="col-price">
          <template #body="{ data }">
            <div class="modal-price-cell">
              <span :class="{ 'price-strikethrough': hasWholesalePrice(data) }">
                {{ formatCurrency(data.priceRetail) }}
              </span>
              <span v-if="hasWholesalePrice(data)" class="wholesale-price">
                {{ formatCurrency(data.priceWholesale!) }}
              </span>
            </div>
          </template>
        </Column>

        <Column header="" class="col-action">
          <template #body="{ data }">
            <Button
              icon="pi pi-plus"
              :label="labels.orders.addProduct"
              size="small"
              @click="addProductFromModal(data)"
            />
          </template>
        </Column>
      </DataTable>
    </Dialog>

    <!-- Address Dialog -->
    <AddressDialog
      v-if="selectedCustomer"
      v-model="showAddressDialog"
      :customer-id="selectedCustomer.id"
      @saved="onAddressSaved"
    />
  </div>
</template>

<style scoped>
.order-form-view {
  width: 100%;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-section > label {
  font-weight: 600;
  color: var(--color-text);
}

.customer-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.customer-select {
  flex: 1;
}

.address-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.address-select {
  flex: 1;
}

.wholesale-hint {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--p-orange-600, #ea580c);
  margin-top: 0.25rem;
}

.wholesale-hint i {
  font-size: 0.75rem;
}

.no-address-hint {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.no-address-hint i {
  font-size: 0.75rem;
}

.no-address-placeholder {
  padding: 0.75rem;
  border: 1px dashed var(--surface-border, #e5e7eb);
  border-radius: var(--border-radius);
  text-align: center;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header label {
  font-weight: 600;
  color: var(--color-text);
}

.wholesale-section-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.wholesale-section-tag i {
  font-size: 0.75rem;
}

.product-search-inline {
  display: flex;
  gap: var(--spacing-sm);
  align-items: flex-end;
}

.search-field {
  flex: 1;
  min-width: 0;
}

.search-field :deep(.p-autocomplete) {
  width: 100%;
}

.search-field :deep(input) {
  width: 100%;
}

.quantity-field {
  width: 90px;
}

.quantity-field :deep(input) {
  width: 100%;
}

.product-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
}

.product-code {
  font-weight: 600;
  color: var(--color-text-muted);
  min-width: 60px;
}

.product-name {
  flex: 1;
}

.product-price {
  font-weight: 500;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.wholesale-tag {
  flex-shrink: 0;
}

.price-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wholesale-icon {
  color: var(--p-yellow-600, #ca8a04);
  font-size: 0.75rem;
}

.wholesale-icon-small {
  color: var(--p-yellow-600, #ca8a04);
  font-size: 0.65rem;
}

.modal-price-cell {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.price-strikethrough {
  text-decoration: line-through;
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.wholesale-price {
  color: var(--p-yellow-600, #ca8a04);
  font-weight: 600;
}

.items-table {
  margin-top: var(--spacing-sm);
}

.empty-cart {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
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

.quantity-edit {
  width: 100%;
}

.quantity-edit :deep(input) {
  width: 100%;
  text-align: center;
}

.text-muted {
  color: var(--color-text-muted);
}

/* Notes + Summary Row */
.notes-summary-row {
  grid-template-columns: 7fr 5fr;
}

.notes-section {
  min-height: 150px;
}

.summary-card {
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: var(--border-radius);
  border: 1px solid var(--surface-border, #e5e7eb);
}

.summary-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-text);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.summary-label {
  color: var(--color-text-muted);
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 700;
}

.summary-total-value {
  color: var(--color-primary);
}

.shipping-free {
  color: var(--p-green-600, #16a34a);
  font-weight: 600;
}

.shipping-delivery-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.shipping-delivery-info i {
  font-size: 0.75rem;
}

.shipping-warnings {
  margin-top: 0.5rem;
}

.shipping-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--p-orange-600, #ea580c);
  margin-bottom: 0.25rem;
}

.shipping-warning i {
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  min-width: 350px;
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

.form-field input,
.form-field textarea {
  width: 100%;
}

.p-error {
  color: var(--p-red-500, #ef4444);
}

.w-full {
  width: 100%;
}

.address-option {
  display: flex;
  flex-direction: column;
}

.address-option-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.address-option-detail {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #64748b);
}

/* Product Search Modal */
.modal-filters {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}

.modal-search {
  flex: 1;
  min-width: 200px;
}

.modal-search :deep(input) {
  width: 100%;
}

.modal-filter-select {
  min-width: 180px;
}

.modal-products-table {
  margin-top: var(--spacing-sm);
}

/* Modal table columns with flex */
.modal-products-table :deep(.col-image) {
  flex: 0 0 60px;
}

.modal-products-table :deep(.col-code) {
  flex: 0 0 100px;
}

.modal-products-table :deep(.col-name) {
  flex: 2;
  min-width: 150px;
}

.modal-products-table :deep(.col-supplier) {
  flex: 1;
  min-width: 120px;
}

.modal-products-table :deep(.col-price) {
  flex: 0 0 110px;
}

.modal-products-table :deep(.col-action) {
  flex: 0 0 100px;
}

.supplier-name {
  font-size: 0.9em;
  color: var(--color-text-muted);
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .notes-summary-row {
    grid-template-columns: 1fr;
  }
}

/* Hide column on tablet */
@media (max-width: 1024px) {
  .hidden-tablet :deep(th),
  .hidden-tablet :deep(td) {
    display: none;
  }
}

/* Mobile item cards */
.mobile-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.mobile-item-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: #f8fafc;
  border-radius: var(--border-radius);
  position: relative;
}

.mobile-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.mobile-item-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-item-price {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.mobile-item-quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xs);
}

.mobile-quantity-input {
  width: 110px;
}

.mobile-quantity-input :deep(input) {
  width: 100%;
  text-align: center;
}

.mobile-item-subtotal {
  font-weight: 600;
  font-size: 1.1rem;
}

.mobile-item-delete {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
}

@media (max-width: 768px) {
  .customer-row {
    flex-direction: column;
    align-items: stretch;
  }

  .customer-select {
    width: 100%;
  }

  .address-row {
    flex-direction: column;
    align-items: stretch;
  }

  .address-select {
    width: 100%;
  }

  .product-search-inline {
    flex-wrap: wrap;
  }

  .search-field {
    flex: 1 1 100%;
    margin-bottom: var(--spacing-sm);
  }

  .quantity-field {
    flex: 1;
    width: auto;
  }

  .product-search-inline button {
    flex: 1;
  }

  .modal-filters {
    flex-direction: column;
  }

  .modal-filter-select {
    width: 100%;
  }

  .modal-products-table :deep(.col-supplier) {
    display: none;
  }

  .modal-products-table :deep(.col-code) {
    display: none;
  }

  .summary-card {
    order: -1;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
  }

  .dialog-form {
    min-width: auto;
  }
}
</style>
