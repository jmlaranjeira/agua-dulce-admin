<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { CreateSupplier, UpdateSupplier, SupplierOrder } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isMobile } = useBreakpoints()

const supplierId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!supplierId.value)

const form = ref<CreateSupplier & { deliveryDaysMin: number | undefined; deliveryDaysMax: number | undefined; isInternational: boolean }>({
  name: '',
  phone: '',
  url: '',
  notes: '',
  deliveryDaysMin: undefined,
  deliveryDaysMax: undefined,
  isInternational: false,
})

const errors = ref<Record<string, string>>({})
const loading = ref(false)
const saving = ref(false)
const orders = ref<SupplierOrder[]>([])
const loadingOrders = ref(false)

function validate(): boolean {
  errors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = labels.messages.required
  }

  if (form.value.url && !isValidUrl(form.value.url)) {
    errors.value.url = labels.messages.invalidUrl
  }

  return Object.keys(errors.value).length === 0
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

async function loadSupplier() {
  if (!supplierId.value) return

  loading.value = true
  try {
    const supplier = await api.suppliers.get(supplierId.value)
    form.value = {
      name: supplier.name,
      phone: supplier.phone || '',
      url: supplier.url || '',
      notes: supplier.notes || '',
      deliveryDaysMin: supplier.deliveryDaysMin ?? undefined,
      deliveryDaysMax: supplier.deliveryDaysMax ?? undefined,
      isInternational: supplier.isInternational,
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
    router.push('/suppliers')
  } finally {
    loading.value = false
  }
}

async function loadOrders() {
  if (!supplierId.value) return

  loadingOrders.value = true
  try {
    orders.value = await api.supplierOrders.list({ supplierId: supplierId.value })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  } finally {
    loadingOrders.value = false
  }
}

async function save() {
  if (!validate()) return

  saving.value = true
  try {
    const data: CreateSupplier | UpdateSupplier = {
      name: form.value.name.trim(),
      phone: form.value.phone?.trim() || undefined,
      url: form.value.url?.trim() || undefined,
      notes: form.value.notes?.trim() || undefined,
      deliveryDaysMin: form.value.deliveryDaysMin || undefined,
      deliveryDaysMax: form.value.deliveryDaysMax || undefined,
      isInternational: form.value.isInternational,
    }

    if (isEditMode.value && supplierId.value) {
      await api.suppliers.update(supplierId.value, data)
    } else {
      await api.suppliers.create(data as CreateSupplier)
    }

    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.suppliers.savedSuccess,
      life: 3000,
    })
    router.push('/suppliers')
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
  router.push('/suppliers')
}

function goToOrder(id: string) {
  router.push(`/supplier-orders/${id}`)
}

function openPdf(url: string) {
  window.open(url, '_blank')
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(value)
}

onMounted(() => {
  loadSupplier()
  if (isEditMode.value) {
    loadOrders()
  }
})
</script>

<template>
  <div class="supplier-form-view">
    <Card>
      <template #title>
        {{ labels.suppliers.supplierData }}
      </template>
      <template #content>
        <form @submit.prevent="save" class="form">
          <!-- Fila 1: Nombre y Teléfono -->
          <div class="form-row">
            <div class="form-field">
              <label for="name">{{ labels.fields.name }} *</label>
              <InputText
                id="name"
                v-model="form.name"
                :class="{ 'p-invalid': errors.name }"
                :disabled="loading"
              />
              <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
            </div>

            <div class="form-field">
              <label for="phone">{{ labels.fields.phone }}</label>
              <InputText
                id="phone"
                v-model="form.phone"
                :disabled="loading"
              />
            </div>
          </div>

          <!-- Fila 2: URL -->
          <div class="form-row">
            <div class="form-field">
              <label for="url">{{ labels.fields.url }}</label>
              <InputText
                id="url"
                v-model="form.url"
                :class="{ 'p-invalid': errors.url }"
                :disabled="loading"
                placeholder="https://..."
              />
              <small v-if="errors.url" class="p-error">{{ errors.url }}</small>
            </div>
          </div>

          <!-- Fila 3: Notas -->
          <div class="form-field">
            <label for="notes">{{ labels.fields.notes }}</label>
            <Textarea
              id="notes"
              v-model="form.notes"
              :disabled="loading"
              rows="4"
              autoResize
            />
          </div>

          <!-- Sección: Tiempos de entrega -->
          <div class="form-section">
            <h3 class="section-title">{{ labels.shipping.deliveryTimes }}</h3>
            <div class="form-row">
              <div class="form-field">
                <label for="deliveryDaysMin">{{ labels.shipping.deliveryDaysMin }}</label>
                <InputNumber
                  id="deliveryDaysMin"
                  v-model="form.deliveryDaysMin"
                  :disabled="loading"
                  :min="1"
                  :max="60"
                />
                <small class="field-hint">{{ labels.shipping.deliveryDaysMinHint }}</small>
              </div>

              <div class="form-field">
                <label for="deliveryDaysMax">{{ labels.shipping.deliveryDaysMax }}</label>
                <InputNumber
                  id="deliveryDaysMax"
                  v-model="form.deliveryDaysMax"
                  :disabled="loading"
                  :min="1"
                  :max="60"
                />
                <small class="field-hint">{{ labels.shipping.deliveryDaysMaxHint }}</small>
              </div>
            </div>

            <div class="form-field switch-row">
              <InputSwitch
                id="isInternational"
                v-model="form.isInternational"
                :disabled="loading"
              />
              <div class="switch-label">
                <label for="isInternational">{{ labels.shipping.isInternational }}</label>
                <small class="field-hint">{{ labels.shipping.isInternationalHint }}</small>
              </div>
            </div>
          </div>

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
              type="submit"
              :label="labels.actions.save"
              :loading="saving"
              :disabled="loading"
            />
          </div>
        </form>
      </template>
    </Card>

    <!-- Tabla de facturas (solo en modo edición) -->
    <Card v-if="isEditMode" class="orders-card">
      <template #title>
        {{ labels.pages.supplierOrders }}
      </template>
      <template #content>
        <!-- Desktop: Table -->
        <DataTable
          v-if="!isMobile"
          :value="orders"
          :loading="loadingOrders"
          stripedRows
          rowHover
          class="orders-table"
          @row-click="(e) => goToOrder(e.data.id)"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.supplierOrders.noOrders }}
            </div>
          </template>

          <Column field="invoiceNumber" :header="labels.supplierOrders.invoiceNumber">
            <template #body="{ data }">
              <span class="order-number">{{ data.invoiceNumber }}</span>
            </template>
          </Column>

          <Column field="invoiceDate" :header="labels.supplierOrders.invoiceDate">
            <template #body="{ data }">
              {{ formatDate(data.invoiceDate) }}
            </template>
          </Column>

          <Column field="itemCount" :header="labels.supplierOrders.itemCount">
            <template #body="{ data }">
              {{ data.itemCount }}
            </template>
          </Column>

          <Column field="totalAmount" :header="labels.supplierOrders.totalAmount">
            <template #body="{ data }">
              {{ formatCurrency(data.totalAmount, data.currency) }}
            </template>
          </Column>

          <Column header="" style="width: 100px">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  v-if="data.pdfUrl"
                  icon="pi pi-file-pdf"
                  text
                  rounded
                  size="small"
                  v-tooltip.top="labels.supplierOrders.viewPdf"
                  @click.stop="openPdf(data.pdfUrl)"
                />
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  size="small"
                  @click.stop="goToOrder(data.id)"
                />
              </div>
            </template>
          </Column>
        </DataTable>

        <!-- Mobile: Cards -->
        <div v-else class="mobile-orders-list">
          <div v-if="loadingOrders" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
          </div>
          <template v-else>
            <div
              v-for="order in orders"
              :key="order.id"
              class="mobile-order-card"
              @click="goToOrder(order.id)"
            >
              <div class="mobile-order-header">
                <span class="order-number">{{ order.invoiceNumber }}</span>
                <div class="mobile-order-actions">
                  <Button
                    v-if="order.pdfUrl"
                    icon="pi pi-file-pdf"
                    text
                    rounded
                    size="small"
                    @click.stop="openPdf(order.pdfUrl)"
                  />
                </div>
              </div>
              <div class="mobile-order-footer">
                <span class="mobile-order-date">{{ formatDate(order.invoiceDate) }}</span>
                <span class="mobile-order-total">{{ formatCurrency(order.totalAmount, order.currency) }}</span>
              </div>
            </div>
            <div v-if="orders.length === 0" class="empty-message">
              {{ labels.supplierOrders.noOrders }}
            </div>
          </template>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.supplier-form-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
}

.p-error {
  color: var(--p-red-500, #ef4444);
}

/* Form section */
.form-section {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-lg);
  margin-top: var(--spacing-md);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--spacing-md) 0;
}

.field-hint {
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.switch-row {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.switch-label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.switch-label label {
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
  }
}

/* Orders table */
.orders-card {
  margin-top: var(--spacing-md);
}

.orders-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

.orders-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f1f5f9 !important;
}

.order-number {
  font-weight: 600;
  color: var(--color-primary);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.empty-message {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-muted);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.loading-state i {
  font-size: 1.5rem;
  color: var(--color-text-muted);
}

/* Mobile order cards */
.mobile-orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.mobile-order-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
}

.mobile-order-card:hover {
  background-color: #f8fafc;
}

.mobile-order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.mobile-order-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.mobile-order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.mobile-order-date {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.mobile-order-total {
  font-weight: 600;
}
</style>
