<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { CustomerAddress, CreateCustomerAddress } from '@/types'

const props = defineProps<{
  modelValue: boolean
  customerId: string
  address?: CustomerAddress
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const toast = useToast()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isEdit = computed(() => !!props.address)

const form = ref<CreateCustomerAddress>({
  label: '',
  street: '',
  city: '',
  postalCode: '',
  province: '',
  country: 'Espana',
  notes: '',
  isDefault: false,
  customerId: props.customerId,
})

const errors = ref<Record<string, string>>({})
const saving = ref(false)

watch(
  () => props.modelValue,
  (isVisible) => {
    if (isVisible) {
      if (props.address) {
        form.value = {
          label: props.address.label,
          street: props.address.street,
          city: props.address.city,
          postalCode: props.address.postalCode,
          province: props.address.province,
          country: props.address.country || 'Espana',
          notes: props.address.notes || '',
          isDefault: props.address.isDefault,
          customerId: props.customerId,
        }
      } else {
        form.value = {
          label: '',
          street: '',
          city: '',
          postalCode: '',
          province: '',
          country: 'Espana',
          notes: '',
          isDefault: false,
          customerId: props.customerId,
        }
      }
      errors.value = {}
    }
  }
)

watch(
  () => props.customerId,
  (newId) => {
    form.value.customerId = newId
  }
)

function validate(): boolean {
  errors.value = {}

  if (!form.value.label.trim()) {
    errors.value.label = labels.messages.required
  }
  if (!form.value.street.trim()) {
    errors.value.street = labels.messages.required
  }
  if (!form.value.city.trim()) {
    errors.value.city = labels.messages.required
  }
  if (!form.value.postalCode.trim()) {
    errors.value.postalCode = labels.messages.required
  }
  if (!form.value.province.trim()) {
    errors.value.province = labels.messages.required
  }

  return Object.keys(errors.value).length === 0
}

async function save() {
  if (!validate()) return

  saving.value = true
  try {
    const data = {
      label: form.value.label.trim(),
      street: form.value.street.trim(),
      city: form.value.city.trim(),
      postalCode: form.value.postalCode.trim(),
      province: form.value.province.trim(),
      country: form.value.country?.trim() || undefined,
      notes: form.value.notes?.trim() || undefined,
      isDefault: form.value.isDefault,
      customerId: props.customerId,
    }

    if (isEdit.value && props.address) {
      const { customerId, ...updateData } = data
      await api.customerAddresses.update(props.address.id, updateData)
    } else {
      await api.customerAddresses.create(data)
    }

    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.address.savedSuccess,
      life: 3000,
    })
    emit('saved')
    visible.value = false
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
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="isEdit ? labels.address.edit : labels.address.add"
    modal
    :style="{ width: '500px' }"
    class="address-dialog"
  >
    <div class="address-form">
      <div class="field">
        <label for="label">{{ labels.address.label }} *</label>
        <InputText
          id="label"
          v-model="form.label"
          :placeholder="labels.address.labelPlaceholder"
          :class="{ 'p-invalid': errors.label }"
          class="w-full"
        />
        <small v-if="errors.label" class="p-error">{{ errors.label }}</small>
      </div>

      <div class="field">
        <label for="street">{{ labels.address.street }} *</label>
        <InputText
          id="street"
          v-model="form.street"
          :class="{ 'p-invalid': errors.street }"
          class="w-full"
        />
        <small v-if="errors.street" class="p-error">{{ errors.street }}</small>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="city">{{ labels.address.city }} *</label>
          <InputText
            id="city"
            v-model="form.city"
            :class="{ 'p-invalid': errors.city }"
            class="w-full"
          />
          <small v-if="errors.city" class="p-error">{{ errors.city }}</small>
        </div>
        <div class="field">
          <label for="postalCode">{{ labels.address.postalCode }} *</label>
          <InputText
            id="postalCode"
            v-model="form.postalCode"
            :class="{ 'p-invalid': errors.postalCode }"
            class="w-full"
          />
          <small v-if="errors.postalCode" class="p-error">{{ errors.postalCode }}</small>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="province">{{ labels.address.province }} *</label>
          <InputText
            id="province"
            v-model="form.province"
            :class="{ 'p-invalid': errors.province }"
            class="w-full"
          />
          <small v-if="errors.province" class="p-error">{{ errors.province }}</small>
        </div>
        <div class="field">
          <label for="country">{{ labels.address.country }}</label>
          <InputText id="country" v-model="form.country" class="w-full" />
        </div>
      </div>

      <div class="field">
        <label for="notes">{{ labels.address.notes }}</label>
        <InputText
          id="notes"
          v-model="form.notes"
          :placeholder="labels.address.notesPlaceholder"
          class="w-full"
        />
      </div>

      <div class="field-checkbox">
        <Checkbox v-model="form.isDefault" binary inputId="isDefault" />
        <label for="isDefault">{{ labels.address.isDefault }}</label>
      </div>
    </div>

    <template #footer>
      <Button
        :label="labels.actions.cancel"
        severity="secondary"
        text
        @click="visible = false"
        :disabled="saving"
      />
      <Button :label="labels.actions.save" :loading="saving" @click="save" />
    </template>
  </Dialog>
</template>

<style scoped>
.address-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.field label {
  font-weight: 500;
  color: var(--color-text);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.field-checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.field-checkbox label {
  cursor: pointer;
}

.w-full {
  width: 100%;
}

.p-error {
  color: var(--p-red-500, #ef4444);
}

@media (max-width: 500px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
