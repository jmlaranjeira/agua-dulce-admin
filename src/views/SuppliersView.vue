<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { Supplier } from '@/types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const suppliers = ref<Supplier[]>([])
const loading = ref(true)
const filters = ref({
  global: { value: '', matchMode: 'contains' },
})

async function loadSuppliers() {
  loading.value = true
  try {
    suppliers.value = await api.suppliers.list()
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
  router.push('/suppliers/new')
}

function goToEdit(id: string) {
  router.push(`/suppliers/${id}/edit`)
}

function confirmDelete(supplier: Supplier) {
  confirm.require({
    message: labels.suppliers.confirmDelete,
    header: labels.actions.delete,
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteSupplier(supplier.id),
  })
}

async function deleteSupplier(id: string) {
  try {
    await api.suppliers.delete(id)
    suppliers.value = suppliers.value.filter((s) => s.id !== id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.suppliers.deletedSuccess,
      life: 3000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

onMounted(loadSuppliers)
</script>

<template>
  <div class="suppliers-view">
    <div class="view-header">
      <IconField class="search-box">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="filters.global.value"
          :placeholder="labels.actions.search"
        />
      </IconField>
      <Button
        :label="labels.suppliers.newSupplier"
        icon="pi pi-plus"
        @click="goToNew"
      />
    </div>

    <Card class="table-card">
      <template #content>
        <DataTable
          v-model:filters="filters"
          :value="suppliers"
          :loading="loading"
          :globalFilterFields="['name', 'phone']"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 25, 50]"
          stripedRows
          rowHover
          scrollable
          class="suppliers-table table-responsive"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.suppliers.noSuppliers }}
            </div>
          </template>

          <Column field="name" :header="labels.fields.name" sortable />

          <Column field="phone" :header="labels.fields.phone">
            <template #body="{ data }">
              {{ data.phone || '-' }}
            </template>
          </Column>

          <Column field="url" :header="labels.fields.url">
            <template #body="{ data }">
              <a
                v-if="data.url"
                :href="data.url"
                target="_blank"
                rel="noopener"
                class="url-link"
              >
                {{ data.url }}
              </a>
              <span v-else>-</span>
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
                  @click="goToEdit(data.id)"
                />
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  severity="danger"
                  v-tooltip.top="labels.actions.delete"
                  @click="confirmDelete(data)"
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
.suppliers-view {
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

/* Table header styling */
.suppliers-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8fafc;
  font-weight: 600;
  color: var(--color-text);
  padding: 1rem 1.25rem;
  border-bottom: 2px solid var(--color-border);
}

/* Table cells padding */
.suppliers-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.875rem 1.25rem;
}

/* Row hover */
.suppliers-table :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f1f5f9 !important;
}

.empty-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.url-link {
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;
}

.url-link:hover {
  text-decoration: underline;
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
