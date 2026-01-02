<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { ShippingZone, UpdateShippingZone } from '@/types'

const toast = useToast()

const zones = ref<ShippingZone[]>([])
const loading = ref(true)
const saving = ref(false)

// Edit dialog
const editDialogVisible = ref(false)
const editingZone = ref<ShippingZone | null>(null)
const editForm = ref<UpdateShippingZone>({})

async function loadZones() {
  loading.value = true
  try {
    zones.value = await api.shippingZones.list()
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

function openEditDialog(zone: ShippingZone) {
  editingZone.value = zone
  editForm.value = {
    name: zone.name,
    price: zone.price,
    freeAbove: zone.freeAbove,
    hasCustomsRisk: zone.hasCustomsRisk,
    transitDaysMin: zone.transitDaysMin,
    transitDaysMax: zone.transitDaysMax,
    isActive: zone.isActive,
  }
  editDialogVisible.value = true
}

async function saveZone() {
  if (!editingZone.value) return

  saving.value = true
  try {
    const updated = await api.shippingZones.update(editingZone.value.id, editForm.value)
    const index = zones.value.findIndex((z) => z.id === updated.id)
    if (index !== -1) {
      zones.value[index] = updated
    }
    editDialogVisible.value = false
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.shipping.savedSuccess,
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
    saving.value = false
  }
}

async function toggleActive(zone: ShippingZone) {
  try {
    const updated = await api.shippingZones.update(zone.id, { isActive: !zone.isActive })
    const index = zones.value.findIndex((z) => z.id === updated.id)
    if (index !== -1) {
      zones.value[index] = updated
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

onMounted(loadZones)
</script>

<template>
  <div class="shipping-zones-view">
    <Card>
      <template #content>
        <DataTable
          :value="zones"
          :loading="loading"
          stripedRows
          rowHover
          class="zones-table"
        >
          <template #empty>
            <div class="empty-message">
              {{ labels.shipping.noZones }}
            </div>
          </template>

          <Column field="name" :header="labels.shipping.zoneName">
            <template #body="{ data }">
              <div class="zone-name">
                <span class="name">{{ data.name }}</span>
                <span class="code">{{ data.code }}</span>
              </div>
            </template>
          </Column>

          <Column field="price" :header="labels.shipping.price" style="width: 120px">
            <template #body="{ data }">
              {{ formatCurrency(data.price) }}
            </template>
          </Column>

          <Column field="freeAbove" :header="labels.shipping.freeAbove" style="width: 140px">
            <template #body="{ data }">
              <span v-if="data.freeAbove !== null">{{ formatCurrency(data.freeAbove) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </Column>

          <Column :header="labels.shipping.transitDays" style="width: 120px">
            <template #body="{ data }">
              {{ data.transitDaysMin }}-{{ data.transitDaysMax }} {{ labels.shipping.days }}
            </template>
          </Column>

          <Column field="hasCustomsRisk" :header="labels.shipping.customs" style="width: 100px">
            <template #body="{ data }">
              <Tag v-if="data.hasCustomsRisk" severity="warn" :value="labels.shipping.yes" />
              <span v-else class="text-muted">{{ labels.shipping.no }}</span>
            </template>
          </Column>

          <Column field="isActive" :header="labels.shipping.active" style="width: 100px">
            <template #body="{ data }">
              <InputSwitch :modelValue="data.isActive" @update:modelValue="toggleActive(data)" />
            </template>
          </Column>

          <Column :header="labels.fields.actions" style="width: 80px">
            <template #body="{ data }">
              <Button
                icon="pi pi-pencil"
                text
                rounded
                size="small"
                v-tooltip.top="labels.actions.edit"
                @click="openEditDialog(data)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Edit Dialog -->
    <Dialog
      v-model:visible="editDialogVisible"
      :header="labels.shipping.editZone"
      :style="{ width: '450px' }"
      modal
    >
      <div class="edit-form" v-if="editingZone">
        <div class="form-field">
          <label>{{ labels.shipping.zoneName }}</label>
          <span class="zone-code-display">{{ editingZone.code }}</span>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>{{ labels.shipping.price }}</label>
            <InputNumber
              v-model="editForm.price"
              mode="currency"
              currency="EUR"
              locale="es-ES"
              :min="0"
              fluid
            />
          </div>

          <div class="form-field">
            <label>{{ labels.shipping.freeAbove }}</label>
            <InputNumber
              v-model="editForm.freeAbove"
              mode="currency"
              currency="EUR"
              locale="es-ES"
              :min="0"
              fluid
              :placeholder="labels.shipping.never"
            />
            <small class="hint">{{ labels.shipping.freeAboveHint }}</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>{{ labels.shipping.transitDaysMin }}</label>
            <InputNumber v-model="editForm.transitDaysMin" :min="1" :max="60" fluid />
          </div>

          <div class="form-field">
            <label>{{ labels.shipping.transitDaysMax }}</label>
            <InputNumber v-model="editForm.transitDaysMax" :min="1" :max="60" fluid />
          </div>
        </div>

        <div class="form-field switch-field">
          <label>{{ labels.shipping.hasCustomsRisk }}</label>
          <InputSwitch v-model="editForm.hasCustomsRisk" />
          <small class="hint">{{ labels.shipping.customsHint }}</small>
        </div>
      </div>

      <template #footer>
        <Button
          :label="labels.actions.cancel"
          severity="secondary"
          outlined
          @click="editDialogVisible = false"
          :disabled="saving"
        />
        <Button :label="labels.actions.save" @click="saveZone" :loading="saving" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.shipping-zones-view {
  width: 100%;
}

.zones-table :deep(.p-datatable-tbody > tr) {
  cursor: default;
}

.zone-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.zone-name .name {
  font-weight: 500;
}

.zone-name .code {
  font-size: 0.85em;
  color: var(--color-text-muted);
}

.text-muted {
  color: var(--color-text-muted);
}

.empty-message {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-muted);
}

/* Edit form */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
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

.zone-code-display {
  color: var(--color-text-muted);
  font-family: monospace;
}

.switch-field {
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-md);
}

.switch-field label {
  margin: 0;
}

.hint {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
</style>
