<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { Supplier } from '@/types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const suppliers = ref<Supplier[]>([])
const loading = ref(true)
const searchQuery = ref('')

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
      <div class="search-box">
        <span class="p-input-icon-left">
          <i class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            :placeholder="labels.actions.search"
          />
        </span>
      </div>
      <Button
        :label="labels.suppliers.newSupplier"
        icon="pi pi-plus"
        @click="goToNew"
      />
    </div>

    <DataTable
      :value="suppliers"
      :loading="loading"
      :globalFilterFields="['name', 'phone']"
      :global-filter="searchQuery"
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      stripedRows
      class="suppliers-table"
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
              @click="goToEdit(data.id)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
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

.search-box input {
  width: 100%;
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
