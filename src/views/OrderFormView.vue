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
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ImageThumbnail from '@/components/ImageThumbnail.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useOrderMargin } from '@/composables/useOrderMargin'
import type { Customer, Product, CreateOrder, CreateCustomer, CustomerAddress, Category, CustomerType } from '@/types'

type OrderItemForm = {
  product: Product
  quantity: number
  unitPrice: number
}

const router = useRouter()
const toast = useToast()

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
  type: 'CLIENTE',
  notes: '',
})
const savingCustomer = ref(false)
const customerErrors = ref<Record<string, string>>({})

// Shipping address
const customerAddresses = ref<CustomerAddress[]>([])
const selectedShippingAddressId = ref<string | null>(null)

// Product search modal
const categories = ref<Category[]>([])
const showProductModal = ref(false)
const modalSearchQuery = ref('')
const modalCategoryFilter = ref<string | null>(null)

const customerOptions = computed(() =>
  customers.value.map((c) => ({
    ...c,
    displayName: `${c.name} (${c.phone})`,
  }))
)

const isWholesaleCustomer = computed(() => selectedCustomer.value?.type === 'PROVEEDOR')

const customerTypeOptions: { value: CustomerType; label: string }[] = [
  { value: 'CLIENTE', label: labels.customerType.CLIENTE },
  { value: 'PROVEEDOR', label: labels.customerType.PROVEEDOR },
]

function getEffectivePrice(product: Product): number {
  if (isWholesaleCustomer.value && product.priceWholesale) {
    return product.priceWholesale
  }
  return product.priceRetail
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

const categoryOptions = computed(() => [
  { name: labels.products.allCategories, id: null },
  ...[...categories.value].sort((a, b) => a.order - b.order),
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

// Watch customer changes to load addresses and recalculate prices
watch(selectedCustomer, async (newCustomer, oldCustomer) => {
  selectedShippingAddressId.value = null
  customerAddresses.value = []

  if (newCustomer) {
    try {
      customerAddresses.value = await api.customerAddresses.getByCustomer(newCustomer.id)
      // Auto-select default address
      const defaultAddress = customerAddresses.value.find((a) => a.isDefault)
      if (defaultAddress) {
        selectedShippingAddressId.value = defaultAddress.id
      }
    } catch (err) {
      console.error('Error loading addresses:', err)
    }
  }

  // Recalculate prices if customer type changed
  if (newCustomer?.type !== oldCustomer?.type) {
    orderItems.value.forEach((item) => {
      item.unitPrice = getEffectivePrice(item.product)
    })
  }
})

function getAddressLabel(addressId: string): string {
  const address = customerAddresses.value.find((a) => a.id === addressId)
  if (!address) return ''
  return `${address.label} - ${address.street}, ${address.city}`
}

function searchProducts(event: { query: string }) {
  const query = event.query.toLowerCase()
  filteredProducts.value = products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query)
  )
}

function addItem() {
  if (!selectedProduct.value || quantity.value < 1) return

  const product = selectedProduct.value
  const existingItem = orderItems.value.find((item) => item.product.id === product.id)

  if (existingItem) {
    existingItem.quantity += quantity.value
  } else {
    orderItems.value.push({
      product,
      quantity: quantity.value,
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
    newCustomerForm.value = { phone: '', name: '', type: 'CLIENTE', notes: '' }
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
})
</script>

<template>
  <div class="order-form-view">
    <Card>
      <template #content>
        <div class="form">
          <!-- Customer Selection -->
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
              />
              <Tag
                v-if="isWholesaleCustomer"
                :value="labels.customerType.wholesaleIndicator"
                severity="warn"
                class="wholesale-tag"
              />
              <Button
                icon="pi pi-plus"
                :label="labels.customers.newCustomer"
                severity="secondary"
                outlined
                @click="showNewCustomerDialog = true"
              />
            </div>
          </div>

          <!-- Shipping Address Selection -->
          <div v-if="selectedCustomer && customerAddresses.length > 0" class="form-section">
            <label>{{ labels.address.shippingAddress }}</label>
            <Select
              v-model="selectedShippingAddressId"
              :options="customerAddresses"
              optionLabel="label"
              optionValue="id"
              :placeholder="labels.address.selectAddress"
              class="w-full"
              showClear
            >
              <template #option="{ option }">
                <div class="address-option">
                  <span class="address-option-label">
                    {{ option.label }}
                    <Tag v-if="option.isDefault" severity="success" value="Principal" size="small" />
                  </span>
                  <span class="address-option-detail">
                    {{ option.street }}, {{ option.postalCode }} {{ option.city }}
                  </span>
                </div>
              </template>
              <template #value="slotProps">
                <span v-if="slotProps.value">{{ getAddressLabel(slotProps.value) }}</span>
                <span v-else>{{ slotProps.placeholder }}</span>
              </template>
            </Select>
          </div>

          <!-- Product Search -->
          <div class="form-section">
            <label>{{ labels.pages.products }}</label>
            <div class="product-row">
              <div class="product-search-group">
                <AutoComplete
                  v-model="selectedProduct"
                  :suggestions="filteredProducts"
                  optionLabel="name"
                  :placeholder="labels.orders.selectProduct"
                  @complete="searchProducts"
                  class="product-autocomplete"
                  :disabled="loading"
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
                <Button
                  icon="pi pi-search"
                  severity="secondary"
                  outlined
                  v-tooltip.top="'Buscar productos'"
                  @click="showProductModal = true"
                />
              </div>
              <div class="product-add-group">
                <InputNumber
                  v-model="quantity"
                  :min="1"
                  :max="99"
                  showButtons
                  class="quantity-input"
                />
                <Button
                  icon="pi pi-plus"
                  :label="labels.orders.addProduct"
                  @click="addItem"
                  :disabled="!selectedProduct"
                />
              </div>
            </div>
          </div>

          <!-- Order Items Table -->
          <div class="form-section">
            <DataTable :value="orderItems" class="items-table">
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

              <Column header="Margen" style="width: 90px">
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

            <div class="total-row" v-if="orderItems.length > 0">
              <div class="total-margin" v-if="totalMargin !== null">
                <span class="total-margin-label">Margen:</span>
                <span class="margin-badge" :class="getTotalMarginClass()">
                  {{ formatCurrency(totalMarginAmount!) }} ({{ totalMargin.toFixed(0) }}%)
                </span>
              </div>
              <div class="total-amount">
                <span class="total-label">{{ labels.fields.total }}:</span>
                <span class="total-value">{{ formatCurrency(total) }}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-section">
            <label for="notes">{{ labels.fields.notes }}</label>
            <Textarea
              id="notes"
              v-model="notes"
              rows="3"
              autoResize
              :disabled="loading"
            />
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
      :style="{ width: '90vw', maxWidth: '800px' }"
      class="product-search-modal"
    >
      <div class="modal-filters">
        <IconField class="modal-search">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="modalSearchQuery"
            placeholder="Buscar por nombre o código..."
            class="w-full"
          />
        </IconField>
        <Select
          v-model="modalCategoryFilter"
          :options="categoryOptions"
          optionLabel="name"
          optionValue="id"
          :placeholder="labels.products.allCategories"
          class="modal-category-filter"
        />
      </div>

      <DataTable
        :value="filteredModalProducts"
        paginator
        :rows="5"
        class="modal-products-table"
        scrollable
        scrollHeight="400px"
      >
        <template #empty>
          <div class="empty-message">{{ labels.messages.noResults }}</div>
        </template>

        <Column header="" style="width: 60px">
          <template #body="{ data }">
            <ImageThumbnail :src="data.imageUrl" :size="40" :preview-size="150" />
          </template>
        </Column>

        <Column field="code" header="Código" style="width: 100px" />

        <Column field="name" header="Nombre" />

        <Column header="Precio" style="width: 120px">
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

        <Column header="" style="width: 100px">
          <template #body="{ data }">
            <Button
              icon="pi pi-plus"
              label="Añadir"
              size="small"
              @click="addProductFromModal(data)"
            />
          </template>
        </Column>
      </DataTable>
    </Dialog>
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

.product-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.product-search-group {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  flex: 1;
  min-width: 0;
}

.product-autocomplete {
  flex: 1;
  min-width: 0;
}

.product-autocomplete :deep(input) {
  width: 100%;
}

.product-add-group {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-shrink: 0;
}

.quantity-input {
  width: 90px;
}

.quantity-input :deep(input) {
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

.total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-md);
  background-color: #f8fafc;
  border-radius: var(--border-radius);
  margin-top: var(--spacing-sm);
}

.total-margin {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.total-margin-label {
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
  font-size: 1.25em;
  color: var(--color-primary);
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
}

.modal-search {
  flex: 1;
}

.modal-search :deep(input) {
  width: 100%;
}

.modal-category-filter {
  min-width: 200px;
}

.modal-products-table {
  margin-top: var(--spacing-sm);
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .customer-row {
    flex-direction: column;
    align-items: stretch;
  }

  .customer-select {
    width: 100%;
  }

  .product-row {
    flex-wrap: wrap;
  }

  .product-search-group {
    flex: 1 1 100%;
  }

  .product-add-group {
    flex: 1 1 100%;
  }

  .product-add-group .quantity-input {
    flex: 1;
    width: auto;
  }

  .product-add-group button {
    flex: 1;
  }

  .modal-filters {
    flex-direction: column;
  }

  .modal-category-filter {
    width: 100%;
  }
}
</style>
