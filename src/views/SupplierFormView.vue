<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { CreateSupplier, UpdateSupplier } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const supplierId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!supplierId.value)

const form = ref<CreateSupplier>({
  name: '',
  phone: '',
  url: '',
  notes: '',
})

const errors = ref<Record<string, string>>({})
const loading = ref(false)
const saving = ref(false)

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

async function save() {
  if (!validate()) return

  saving.value = true
  try {
    const data: CreateSupplier | UpdateSupplier = {
      name: form.value.name.trim(),
      phone: form.value.phone?.trim() || undefined,
      url: form.value.url?.trim() || undefined,
      notes: form.value.notes?.trim() || undefined,
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

onMounted(loadSupplier)
</script>

<template>
  <div class="supplier-form-view">
    <Card>
      <template #content>
        <form @submit.prevent="save" class="form">
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
  </div>
</template>

<style scoped>
.supplier-form-view {
  width: 100%;
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
</style>
