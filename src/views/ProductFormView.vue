<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import InputSwitch from 'primevue/inputswitch'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ImageUpload from '@/components/ImageUpload.vue'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { Supplier, Category, CreateProduct, UpdateProduct } from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const productId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!productId.value)

const form = ref({
  code: '',
  name: '',
  priceRetail: null as number | null,
  priceWholesale: null as number | null,
  costPrice: null as number | null,
  imageUrl: '',
  supplierId: null as string | null,
  categoryId: null as string | null,
  isActive: true,
  isVisible: true,
  stock: 0,
})

const suppliers = ref<Supplier[]>([])
const categories = ref<Category[]>([])
const errors = ref<Record<string, string>>({})
const loading = ref(false)
const saving = ref(false)

const supplierOptions = computed(() => [
  { label: labels.products.noSupplier, value: null },
  ...suppliers.value.map((s) => ({ label: s.name, value: s.id })),
])

const categoryOptions = computed(() =>
  [...categories.value].sort((a, b) => a.order - b.order)
)

const margin = computed(() => {
  if (form.value.costPrice && form.value.priceRetail) {
    const marginValue = ((form.value.priceRetail - form.value.costPrice) / form.value.priceRetail) * 100
    return marginValue.toFixed(1)
  }
  return null
})

const marginAmount = computed(() => {
  if (form.value.costPrice && form.value.priceRetail) {
    return (form.value.priceRetail - form.value.costPrice).toFixed(2)
  }
  return null
})

function validate(): boolean {
  errors.value = {}

  if (!form.value.code.trim()) {
    errors.value.code = labels.messages.required
  }

  if (!form.value.name.trim()) {
    errors.value.name = labels.messages.required
  }

  if (!form.value.priceRetail || form.value.priceRetail <= 0) {
    errors.value.priceRetail = labels.messages.required
  }

  return Object.keys(errors.value).length === 0
}

async function loadData() {
  loading.value = true
  try {
    const [suppliersData, categoriesData] = await Promise.all([
      api.suppliers.list(),
      api.categories.list(),
    ])
    suppliers.value = suppliersData
    categories.value = categoriesData

    if (productId.value) {
      const product = await api.products.get(productId.value)
      form.value = {
        code: product.code,
        name: product.name,
        priceRetail: product.priceRetail,
        priceWholesale: product.priceWholesale,
        costPrice: product.costPrice,
        imageUrl: product.imageUrl || '',
        supplierId: product.supplierId,
        categoryId: product.categoryId,
        isActive: product.isActive,
        isVisible: product.isVisible,
        stock: product.stock,
      }
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 3000,
    })
    router.push('/products')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!validate()) return

  saving.value = true
  try {
    if (isEditMode.value && productId.value) {
      const data: UpdateProduct = {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        priceRetail: Number(form.value.priceRetail),
        priceWholesale: form.value.priceWholesale ? Number(form.value.priceWholesale) : undefined,
        costPrice: form.value.costPrice ? Number(form.value.costPrice) : undefined,
        imageUrl: form.value.imageUrl?.trim() || undefined,
        supplierId: form.value.supplierId || undefined,
        categoryId: form.value.categoryId || undefined,
        isActive: form.value.isActive,
        isVisible: form.value.isVisible,
      }
      await api.products.update(productId.value, data)
    } else {
      const data: CreateProduct = {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        priceRetail: Number(form.value.priceRetail),
        priceWholesale: form.value.priceWholesale ? Number(form.value.priceWholesale) : undefined,
        costPrice: form.value.costPrice ? Number(form.value.costPrice) : undefined,
        imageUrl: form.value.imageUrl?.trim() || undefined,
        supplierId: form.value.supplierId || undefined,
        categoryId: form.value.categoryId || undefined,
      }
      await api.products.create(data)
    }

    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.products.savedSuccess,
      life: 3000,
    })
    router.push('/products')
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
  router.push('/products')
}

onMounted(loadData)
</script>

<template>
  <div class="product-form-view">
    <Card>
      <template #content>
        <form @submit.prevent="save" class="form">
          <!-- Toggles - Top Right (edit mode only) -->
          <div v-if="isEditMode" class="form-header">
            <div class="active-toggle">
              <label for="isVisible">{{ labels.products.visibleInStore }}</label>
              <InputSwitch id="isVisible" v-model="form.isVisible" :disabled="loading" />
            </div>
            <div class="active-toggle">
              <label for="isActive">{{ labels.products.active }}</label>
              <InputSwitch id="isActive" v-model="form.isActive" :disabled="loading" />
            </div>
          </div>

          <!-- Section 1: Image + Basic Info (50/50) -->
          <div class="product-main">
            <div class="product-image-col">
              <ImageUpload v-model="form.imageUrl" folder="products" />
            </div>
            <div class="product-info-col">
              <div class="form-field">
                <label for="code">{{ labels.fields.code }} *</label>
                <InputText
                  id="code"
                  v-model="form.code"
                  :class="{ 'p-invalid': errors.code }"
                  :disabled="loading"
                />
                <small v-if="errors.code" class="p-error">{{ errors.code }}</small>
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
                <label for="category">{{ labels.fields.category }}</label>
                <Select
                  id="category"
                  v-model="form.categoryId"
                  :options="categoryOptions"
                  optionLabel="name"
                  optionValue="id"
                  :placeholder="labels.products.selectCategory"
                  :disabled="loading"
                  showClear
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label for="supplier">{{ labels.fields.supplier }}</label>
                <Select
                  id="supplier"
                  v-model="form.supplierId"
                  :options="supplierOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="labels.products.noSupplier"
                  :disabled="loading"
                  showClear
                  class="w-full"
                />
              </div>

              <div v-if="isEditMode" class="form-field">
                <label>{{ labels.fields.stock }}</label>
                <div class="stock-display">
                  <Tag
                    :value="form.stock"
                    :severity="form.stock < 5 ? 'danger' : form.stock < 10 ? 'warn' : 'success'"
                  />
                  <small v-if="form.stock < 5" class="stock-warning">
                    <i class="pi pi-exclamation-triangle" /> {{ labels.stock.lowStockWarning }}
                  </small>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Pricing (3-col) + Margin -->
          <div class="product-pricing">
            <div class="price-row">
              <div class="form-field">
                <label for="costPrice">{{ labels.fields.costPrice }}</label>
                <InputNumber
                  id="costPrice"
                  v-model="form.costPrice"
                  mode="currency"
                  currency="EUR"
                  locale="es-ES"
                  :disabled="loading"
                />
              </div>

              <div class="form-field">
                <label for="priceRetail">{{ labels.fields.priceRetail }} *</label>
                <InputNumber
                  id="priceRetail"
                  v-model="form.priceRetail"
                  mode="currency"
                  currency="EUR"
                  locale="es-ES"
                  :class="{ 'p-invalid': errors.priceRetail }"
                  :disabled="loading"
                />
                <small v-if="errors.priceRetail" class="p-error">{{ errors.priceRetail }}</small>
              </div>

              <div class="form-field">
                <label for="priceWholesale">{{ labels.fields.priceWholesale }}</label>
                <InputNumber
                  id="priceWholesale"
                  v-model="form.priceWholesale"
                  mode="currency"
                  currency="EUR"
                  locale="es-ES"
                  :disabled="loading"
                />
              </div>
            </div>

            <div v-if="margin !== null" class="margin-display">
              {{ labels.products.margin }}: <strong>€{{ marginAmount }} ({{ margin }}%)</strong>
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
  </div>
</template>

<style scoped>
.product-form-view {
  width: 100%;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-header {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-lg);
}

.active-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.active-toggle label {
  font-weight: 500;
  color: var(--color-text);
}

.product-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
}

.product-image-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image-col :deep(.image-upload) {
  width: 100%;
  max-width: 320px;
}

.product-image-col :deep(.drop-zone) {
  aspect-ratio: 1;
  padding: 0;
}

.product-image-col :deep(.preview-container) {
  display: flex;
  justify-content: center;
  width: 100%;
}

.product-image-col :deep(.preview-image) {
  max-width: 100%;
  max-height: 320px;
  width: auto;
  height: auto;
}

.product-info-col {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.product-pricing {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.price-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
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
.form-field :deep(.p-inputnumber),
.form-field :deep(.p-select) {
  width: 100%;
}

.margin-display {
  padding: var(--spacing-md);
  background-color: #f0fdf4;
  border-radius: var(--border-radius);
  color: #166534;
}

.stock-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stock-warning {
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 4px;
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

.w-full {
  width: 100%;
}

@media (max-width: 768px) {
  .product-main {
    grid-template-columns: 1fr;
  }

  .price-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
