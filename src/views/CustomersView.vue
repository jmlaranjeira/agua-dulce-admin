<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { Customer } from '@/types'

const router = useRouter()
const toast = useToast()

const customers = ref<Customer[]>([])
const loading = ref(true)
const filters = ref({
  global: { value: '', matchMode: 'contains' },
})

async function loadCustomers() {
  loading.value = true
  try {
    customers.value = await api.customers.list()
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

onMounted(loadCustomers)
</script>

<template>
  <div class="customers-view">
    <div class="view-header">
      <IconField class="search-box">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="filters.global.value"
          :placeholder="labels.actions.search"
        />
      </IconField>
      <Button
        :label="labels.customers.newCustomer"
        icon="pi pi-plus"
        @click="goToNew"
      />
    </div>

    <Card class="table-card">
      <template #content>
        <DataTable
          v-model:filters="filters"
          :value="customers"
          :loading="loading"
          :globalFilterFields="['name', 'phone']"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 25, 50]"
          stripedRows
          rowHover
          scrollable
          class="customers-table table-responsive"
          @row-click="(e) => goToEdit(e.data.id)"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.customers.noCustomers }}
            </div>
          </template>

          <Column field="name" :header="labels.fields.name" sortable />

          <Column field="phone" :header="labels.fields.phone" />

          <Column field="notes" :header="labels.fields.notes">
            <template #body="{ data }">
              <span :title="data.notes || ''">{{ truncateNotes(data.notes) }}</span>
            </template>
          </Column>

          <Column :header="labels.fields.actions" style="width: 80px">
            <template #body="{ data }">
              <div class="actions">
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  v-tooltip.top="labels.actions.edit"
                  @click.stop="goToEdit(data.id)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
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
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  max-width: 300px;
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

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }
}
</style>
