<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { Customer, Product, CreateOrder, CreateCustomer } from '@/types'

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
  notes: '',
})
const savingCustomer = ref(false)
const customerErrors = ref<Record<string, string>>({})

const customerOptions = computed(() =>
  customers.value.map((c) => ({
    ...c,
    displayName: `${c.name} (${c.phone})`,
  }))
)

const total = computed(() =>
  orderItems.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
)

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
      unitPrice: product.priceRetail,
    })
  }

  selectedProduct.value = null
  quantity.value = 1
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
      notes: newCustomerForm.value.notes?.trim() || undefined,
    })
    customers.value.push(customer)
    selectedCustomer.value = customer
    showNewCustomerDialog.value = false
    newCustomerForm.value = { phone: '', name: '', notes: '' }
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
              <Button
                icon="pi pi-plus"
                :label="labels.customers.newCustomer"
                severity="secondary"
                outlined
                @click="showNewCustomerDialog = true"
              />
            </div>
          </div>

          <!-- Product Search -->
          <div class="form-section">
            <label>{{ labels.pages.products }}</label>
            <div class="product-row">
              <AutoComplete
                v-model="selectedProduct"
                :suggestions="filteredProducts"
                optionLabel="name"
                :placeholder="labels.orders.selectProduct"
                @complete="searchProducts"
                class="product-search"
                :disabled="loading"
              >
                <template #option="{ option }">
                  <div class="product-option">
                    <span class="product-code">{{ option.code }}</span>
                    <span class="product-name">{{ option.name }}</span>
                    <span class="product-price">{{ formatCurrency(option.priceRetail) }}</span>
                  </div>
                </template>
              </AutoComplete>
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

          <!-- Order Items Table -->
          <div class="form-section">
            <DataTable :value="orderItems" class="items-table">
              <template #empty>
                <div class="empty-cart">
                  {{ labels.orders.emptyCart }}
                </div>
              </template>

              <Column field="product.name" header="Producto">
                <template #body="{ data }">
                  <div>
                    <span class="item-name">{{ data.product.name }}</span>
                    <span class="item-code">{{ data.product.code }}</span>
                  </div>
                </template>
              </Column>

              <Column field="unitPrice" :header="labels.fields.price">
                <template #body="{ data }">
                  {{ formatCurrency(data.unitPrice) }}
                </template>
              </Column>

              <Column field="quantity" :header="labels.fields.quantity" style="width: 100px">
                <template #body="{ data }">
                  {{ data.quantity }}
                </template>
              </Column>

              <Column :header="labels.orders.subtotal" style="width: 120px">
                <template #body="{ data }">
                  {{ formatCurrency(data.unitPrice * data.quantity) }}
                </template>
              </Column>

              <Column style="width: 60px">
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
              <span class="total-label">{{ labels.fields.total }}:</span>
              <span class="total-value">{{ formatCurrency(total) }}</span>
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

.product-search {
  flex: 1;
}

.quantity-input {
  width: 100px;
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

.total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: #f8fafc;
  border-radius: var(--border-radius);
  margin-top: var(--spacing-sm);
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

@media (max-width: 768px) {
  .customer-row,
  .product-row {
    flex-direction: column;
    align-items: stretch;
  }

  .customer-select,
  .product-search {
    width: 100%;
  }

  .quantity-input {
    width: 100%;
  }
}
</style>
