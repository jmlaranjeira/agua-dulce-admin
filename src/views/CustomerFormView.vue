<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { CreateCustomer, UpdateCustomer, Order } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const customerId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!customerId.value)

const form = ref<CreateCustomer>({
  phone: '',
  name: '',
  notes: '',
})

const orders = ref<Order[]>([])
const errors = ref<Record<string, string>>({})
const loading = ref(false)
const loadingOrders = ref(false)
const saving = ref(false)

function validate(): boolean {
  errors.value = {}

  if (!form.value.phone.trim()) {
    errors.value.phone = labels.messages.required
  }

  if (!form.value.name.trim()) {
    errors.value.name = labels.messages.required
  }

  return Object.keys(errors.value).length === 0
}

async function loadCustomer() {
  if (!customerId.value) return

  loading.value = true
  try {
    const customer = await api.customers.get(customerId.value)
    form.value = {
      phone: customer.phone,
      name: customer.name,
      notes: customer.notes || '',
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
    router.push('/customers')
  } finally {
    loading.value = false
  }
}

async function loadOrders() {
  if (!customerId.value) return

  loadingOrders.value = true
  try {
    orders.value = await api.customers.orders(customerId.value)
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
    const data: CreateCustomer | UpdateCustomer = {
      phone: form.value.phone.trim(),
      name: form.value.name.trim(),
      notes: form.value.notes?.trim() || undefined,
    }

    if (isEditMode.value && customerId.value) {
      await api.customers.update(customerId.value, data)
    } else {
      await api.customers.create(data as CreateCustomer)
    }

    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.customers.savedSuccess,
      life: 3000,
    })
    router.push('/customers')
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
  router.push('/customers')
}

function goToOrder(id: string) {
  router.push(`/orders/${id}`)
}

function calculateTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

onMounted(() => {
  loadCustomer()
  if (isEditMode.value) {
    loadOrders()
  }
})
</script>

<template>
  <div class="customer-form-view">
    <Card>
      <template #content>
        <form @submit.prevent="save" class="form">
          <div class="form-field">
            <label for="phone">{{ labels.fields.phone }} *</label>
            <InputText
              id="phone"
              v-model="form.phone"
              :class="{ 'p-invalid': errors.phone }"
              :disabled="loading"
            />
            <small v-if="errors.phone" class="p-error">{{ errors.phone }}</small>
          </div>

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
            <label for="notes">{{ labels.fields.notes }}</label>
            <Textarea
              id="notes"
              v-model="form.notes"
              :disabled="loading"
              rows="4"
              autoResize
            />
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

    <Card v-if="isEditMode" class="orders-card">
      <template #title>
        {{ labels.customers.ordersSection }}
      </template>
      <template #content>
        <DataTable
          :value="orders"
          :loading="loadingOrders"
          stripedRows
          rowHover
          class="orders-table"
          @row-click="(e) => goToOrder(e.data.id)"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.customers.noOrders }}
            </div>
          </template>

          <Column field="number" header="#">
            <template #body="{ data }">
              <span class="order-number">{{ data.number }}</span>
            </template>
          </Column>

          <Column field="createdAt" :header="labels.fields.date">
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>

          <Column field="status" :header="labels.fields.status">
            <template #body="{ data }">
              <Tag :value="labels.status[data.status as keyof typeof labels.status]" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>

          <Column field="total" :header="labels.fields.total">
            <template #body="{ data }">
              {{ formatCurrency(calculateTotal(data)) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.customer-form-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form {
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

.empty-message {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-muted);
}
</style>
