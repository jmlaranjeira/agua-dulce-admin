<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { Customer, CustomerType } from '@/types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { isMobile } = useBreakpoints()

const customers = ref<Customer[]>([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'archived'>('active')

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
]

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return customers.value
  const query = searchQuery.value.toLowerCase()
  return customers.value.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      c.type.toLowerCase().includes(query)
  )
})

async function loadCustomers() {
  loading.value = true
  try {
    const activeFilter = statusFilter.value === 'all' ? undefined : statusFilter.value === 'active'
    customers.value = await api.customers.list({ active: activeFilter })
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

watch(statusFilter, loadCustomers)

function goToNew() {
  router.push('/customers/new')
}

function goToEdit(id: string) {
  router.push(`/customers/${id}/edit`)
}

function truncateNotes(notes: string | null, maxLength = 50): string {
  if (!notes) return '-'
  return notes.length > maxLength ? notes.substring(0, maxLength) + '...' : notes
}

function getTypeSeverity(type: CustomerType): 'info' | 'warn' {
  return type === 'WHOLESALE' ? 'warn' : 'info'
}

function confirmArchive(customer: Customer) {
  confirm.require({
    message: `¿Estás seguro de que quieres archivar a "${customer.name}"?`,
    header: 'Archivar cliente',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Archivar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-warning',
    accept: () => archiveCustomer(customer),
  })
}

async function archiveCustomer(customer: Customer) {
  try {
    await api.customers.archive(customer.id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Cliente archivado correctamente',
      life: 3000,
    })
    loadCustomers()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

async function restoreCustomer(customer: Customer) {
  try {
    await api.customers.restore(customer.id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Cliente restaurado correctamente',
      life: 3000,
    })
    loadCustomers()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

function confirmDelete(customer: Customer) {
  confirm.require({
    message: `¿Eliminar permanentemente "${customer.name}"? Esta acción no se puede deshacer.`,
    header: 'Eliminar cliente',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: () => deleteCustomer(customer),
  })
}

async function deleteCustomer(customer: Customer) {
  try {
    await api.customers.delete(customer.id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Cliente eliminado permanentemente',
      life: 3000,
    })
    loadCustomers()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

onMounted(loadCustomers)
</script>

<template>
  <div class="customers-view">
    <div class="view-header">
      <div class="header-filters">
        <IconField class="search-box">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            :placeholder="labels.actions.search"
          />
        </IconField>
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          class="status-filter"
        />
      </div>
      <Button
        :label="isMobile ? undefined : labels.customers.newCustomer"
        icon="pi pi-plus"
        @click="goToNew"
      />
    </div>

    <!-- Desktop: Tabla -->
    <Card v-if="!isMobile" class="table-card">
      <template #content>
        <DataTable
          :value="filteredCustomers"
          :loading="loading"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 25, 50]"
          stripedRows
          rowHover
          scrollable
          class="customers-table"
          @row-click="(e) => goToEdit(e.data.id)"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.customers.noCustomers }}
            </div>
          </template>

          <Column field="name" :header="labels.fields.name" sortable style="width: 180px" />

          <Column field="phone" :header="labels.fields.phone" style="width: 130px" />

          <Column field="type" :header="labels.fields.type" style="width: 100px">
            <template #body="{ data }">
              <Tag
                :value="labels.customerType[data.type as keyof typeof labels.customerType]"
                :severity="getTypeSeverity(data.type)"
              />
            </template>
          </Column>

          <Column header="Estado" style="width: 90px">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? 'Activo' : 'Archivado'"
                :severity="data.isActive ? 'success' : 'secondary'"
              />
            </template>
          </Column>

          <Column field="notes" :header="labels.fields.notes" class="hidden-tablet">
            <template #body="{ data }">
              <span :title="data.notes || ''" v-tooltip.top="data.notes">
                {{ truncateNotes(data.notes) }}
              </span>
            </template>
          </Column>

          <Column :header="labels.fields.actions" style="width: 120px">
            <template #body="{ data }">
              <div class="actions">
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  v-tooltip.top="labels.actions.edit"
                  @click.stop="goToEdit(data.id)"
                />
                <Button
                  v-if="data.isActive"
                  icon="pi pi-inbox"
                  text
                  rounded
                  severity="warn"
                  v-tooltip.top="'Archivar'"
                  @click.stop="confirmArchive(data)"
                />
                <template v-else>
                  <Button
                    icon="pi pi-replay"
                    text
                    rounded
                    severity="success"
                    v-tooltip.top="'Restaurar'"
                    @click.stop="restoreCustomer(data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    v-tooltip.top="'Eliminar'"
                    @click.stop="confirmDelete(data)"
                  />
                </template>
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Mobile: Tarjetas -->
    <div v-else class="mobile-list">
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
      </div>
      <template v-else>
        <div
          v-for="customer in filteredCustomers"
          :key="customer.id"
          class="mobile-card"
          @click="goToEdit(customer.id)"
        >
          <div class="mobile-card-header">
            <div>
              <div class="mobile-card-title">{{ customer.name }}</div>
              <div class="mobile-card-tags">
                <Tag
                  :value="labels.customerType[customer.type as keyof typeof labels.customerType]"
                  :severity="getTypeSeverity(customer.type)"
                />
                <Tag
                  v-if="!customer.isActive"
                  value="Archivado"
                  severity="secondary"
                />
              </div>
            </div>
            <div class="mobile-card-actions">
              <Button
                v-if="customer.isActive"
                icon="pi pi-inbox"
                text
                rounded
                size="small"
                severity="warn"
                @click.stop="confirmArchive(customer)"
              />
              <template v-else>
                <Button
                  icon="pi pi-replay"
                  text
                  rounded
                  size="small"
                  severity="success"
                  @click.stop="restoreCustomer(customer)"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  @click.stop="confirmDelete(customer)"
                />
              </template>
              <Button
                icon="pi pi-chevron-right"
                text
                rounded
                size="small"
              />
            </div>
          </div>
          <div class="mobile-card-content">
            <div class="mobile-card-row">
              <i class="pi pi-phone"></i>
              <a :href="'tel:' + customer.phone" @click.stop>{{ customer.phone }}</a>
            </div>
            <div v-if="customer.notes" class="mobile-card-row notes">
              <i class="pi pi-comment"></i>
              <span>{{ truncateNotes(customer.notes, 40) }}</span>
            </div>
          </div>
        </div>

        <div v-if="filteredCustomers.length === 0" class="empty-message">
          {{ labels.customers.noCustomers }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.customers-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
}

.header-filters {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.status-filter {
  min-width: 140px;
}

.search-box :deep(input) {
  width: 100%;
}

.table-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
}

.table-card :deep(.p-card-body) {
  padding: 0;
}

.table-card :deep(.p-card-content) {
  padding: 0;
}

.customers-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8fafc;
  font-weight: 600;
  color: var(--color-text);
  padding: 1rem 1.25rem;
  border-bottom: 2px solid var(--color-border);
}

.customers-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.875rem 1.25rem;
}

.customers-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

.customers-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f1f5f9 !important;
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* Hide notes column on tablet */
@media (max-width: 1024px) {
  .hidden-tablet :deep(th),
  .hidden-tablet :deep(td) {
    display: none;
  }
}

/* Mobile styles */
.mobile-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.mobile-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.mobile-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mobile-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.mobile-card-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--color-text);
}

.mobile-card-tags {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.mobile-card-actions {
  display: flex;
  align-items: center;
}

.mobile-card-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.mobile-card-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.mobile-card-row i {
  font-size: 0.8rem;
  width: 1rem;
}

.mobile-card-row a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.mobile-card-row a:hover {
  color: var(--color-primary);
}

.mobile-card-row.notes {
  font-style: italic;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.loading-state i {
  font-size: 1.5rem;
}

@media (max-width: 768px) {
  .search-box {
    max-width: none;
  }
}
</style>
