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
import Select from 'primevue/select'
import Menu from 'primevue/menu'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import { useBreakpoints } from '@/composables/useBreakpoints'
import type { Supplier } from '@/types'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { isMobile } = useBreakpoints()

const suppliers = ref<Supplier[]>([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'archived'>('active')
const mobileMenu = ref()
const selectedSupplier = ref<Supplier | null>(null)

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
]

const filteredSuppliers = computed(() => {
  if (!searchQuery.value) return suppliers.value
  const query = searchQuery.value.toLowerCase()
  return suppliers.value.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.phone?.toLowerCase().includes(query)
  )
})

const mobileMenuItems = computed(() => {
  const items = [
    {
      label: labels.actions.edit,
      icon: 'pi pi-pencil',
      command: () => { if (selectedSupplier.value) goToEdit(selectedSupplier.value.id) },
    },
  ]
  if (selectedSupplier.value?.isActive) {
    items.push({
      label: 'Archivar',
      icon: 'pi pi-inbox',
      command: () => { if (selectedSupplier.value) confirmArchive(selectedSupplier.value) },
    })
  } else {
    items.push(
      {
        label: 'Restaurar',
        icon: 'pi pi-replay',
        command: () => { if (selectedSupplier.value) restoreSupplier(selectedSupplier.value) },
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        command: () => { if (selectedSupplier.value) confirmDelete(selectedSupplier.value) },
      },
    )
  }
  return items
})

async function loadSuppliers() {
  loading.value = true
  try {
    const activeFilter =
      statusFilter.value === 'all' ? undefined : statusFilter.value === 'active'
    suppliers.value = await api.suppliers.list({ active: activeFilter })
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

watch(statusFilter, loadSuppliers)

function goToNew() {
  router.push('/suppliers/new')
}

function goToEdit(id: string) {
  router.push(`/suppliers/${id}/edit`)
}

function confirmArchive(supplier: Supplier) {
  confirm.require({
    message: `¿Estás seguro de que quieres archivar "${supplier.name}"?`,
    header: 'Archivar proveedor',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Archivar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-warning',
    accept: () => archiveSupplier(supplier),
  })
}

async function archiveSupplier(supplier: Supplier) {
  try {
    await api.suppliers.archive(supplier.id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Proveedor archivado correctamente',
      life: 3000,
    })
    loadSuppliers()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

async function restoreSupplier(supplier: Supplier) {
  try {
    await api.suppliers.restore(supplier.id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Proveedor restaurado correctamente',
      life: 3000,
    })
    loadSuppliers()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

function confirmDelete(supplier: Supplier) {
  confirm.require({
    message: `¿Eliminar permanentemente "${supplier.name}"? Esta acción no se puede deshacer.`,
    header: 'Eliminar proveedor',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: () => deleteSupplier(supplier),
  })
}

async function deleteSupplier(supplier: Supplier) {
  try {
    await api.suppliers.delete(supplier.id)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Proveedor eliminado permanentemente',
      life: 3000,
    })
    loadSuppliers()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

function toggleMobileMenu(event: Event, supplier: Supplier) {
  selectedSupplier.value = supplier
  mobileMenu.value.toggle(event)
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url.length > 25 ? url.substring(0, 25) + '...' : url
  }
}

onMounted(loadSuppliers)
</script>

<template>
  <div class="suppliers-view">
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
        :label="isMobile ? undefined : labels.suppliers.newSupplier"
        icon="pi pi-plus"
        @click="goToNew"
      />
    </div>

    <!-- Desktop: Tabla -->
    <Card v-if="!isMobile" class="table-card">
      <template #content>
        <DataTable
          :value="filteredSuppliers"
          :loading="loading"
          paginator
          :rows="10"
          :rowsPerPageOptions="[10, 25, 50]"
          stripedRows
          rowHover
          scrollable
          class="suppliers-table"
          @row-click="(e) => goToEdit(e.data.id)"
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

          <Column field="url" :header="labels.fields.url" class="hidden-tablet">
            <template #body="{ data }">
              <a
                v-if="data.url"
                :href="data.url"
                target="_blank"
                rel="noopener"
                class="url-link"
                v-tooltip.top="data.url"
              >
                {{ extractDomain(data.url) }}
              </a>
              <span v-else>-</span>
            </template>
          </Column>

          <Column header="Facturas" class="hidden-tablet">
            <template #body="{ data }">
              {{ data._count?.orders || 0 }}
            </template>
          </Column>

          <Column header="Entrega" class="hidden-tablet">
            <template #body="{ data }">
              <span v-if="data.deliveryDaysMin && data.deliveryDaysMax">
                {{ data.deliveryDaysMin }}-{{ data.deliveryDaysMax }} días
              </span>
              <span v-else>-</span>
            </template>
          </Column>

          <Column :header="labels.fields.actions">
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
                    @click.stop="restoreSupplier(data)"
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
          v-for="supplier in filteredSuppliers"
          :key="supplier.id"
          class="mobile-card"
          @click="goToEdit(supplier.id)"
        >
          <div class="mobile-card-header">
            <div class="mobile-card-title">{{ supplier.name }}</div>
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              size="small"
              @click.stop="toggleMobileMenu($event, supplier)"
            />
          </div>
          <div class="mobile-card-content">
            <div v-if="supplier.phone" class="mobile-card-row">
              <i class="pi pi-phone"></i>
              <a :href="'tel:' + supplier.phone" @click.stop>{{ supplier.phone }}</a>
            </div>
            <div v-if="supplier.url" class="mobile-card-row">
              <i class="pi pi-external-link"></i>
              <a :href="supplier.url" target="_blank" rel="noopener" @click.stop class="url-link">
                {{ extractDomain(supplier.url) }}
              </a>
            </div>
          </div>
        </div>

        <div v-if="filteredSuppliers.length === 0" class="empty-message">
          {{ labels.suppliers.noSuppliers }}
        </div>
      </template>
    </div>

    <!-- Menú contextual móvil -->
    <Menu ref="mobileMenu" :model="mobileMenuItems" popup />
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
}

.header-filters {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
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

.suppliers-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8fafc;
  font-weight: 600;
  color: var(--color-text);
  padding: 1rem 1.25rem;
  border-bottom: 2px solid var(--color-border);
}

.suppliers-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.875rem 1.25rem;
}

.suppliers-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}

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
}

.url-link:hover {
  text-decoration: underline;
}

.actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* Hide URL column on tablet */
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
  .header-filters {
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .search-box {
    max-width: none;
  }

  .status-filter {
    width: 100%;
  }
}
</style>
