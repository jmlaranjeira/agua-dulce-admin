<script setup lang="ts">
import { ref } from 'vue'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { labels } from '@/locales/es'
import type { ImportSource } from '@/types'

interface Props {
  source: ImportSource
  supplierOptions: Array<{ label: string; value: string }>
  categoryOptions: Array<{ label: string; value: string }>
  loading?: boolean
}

const props = defineProps<Props>()

const selectedSupplier = defineModel<string | null>('selectedSupplier')
const selectedCategory = defineModel<string | null>('selectedCategory')

const emit = defineEmits<{
  search: [params: { query: string; type: string | null }]
}>()

const searchQuery = ref('')
const selectedType = ref<string | null>(null)

const productTypeOptions = computed(() =>
  props.source.productTypes.map((type) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type,
  }))
)

const canSearch = computed(() => searchQuery.value.trim().length > 0 || !!selectedType.value)

function handleSearch() {
  emit('search', {
    query: searchQuery.value.trim(),
    type: selectedType.value,
  })
}
</script>

<script lang="ts">
import { computed } from 'vue'
</script>

<template>
  <div class="search-form">
    <div class="form-field">
      <label>{{ labels.import.searchText }}</label>
      <InputText
        v-model="searchQuery"
        :placeholder="labels.import.searchPlaceholder"
        class="w-full"
      />
    </div>

    <div class="form-field">
      <label>{{ labels.import.filterByCategory }}</label>
      <Select
        v-model="selectedType"
        :options="productTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="labels.import.allCategories"
        showClear
        class="w-full"
      />
    </div>

    <div class="form-field">
      <label>{{ labels.import.targetSupplier }}</label>
      <Select
        v-model="selectedSupplier"
        :options="supplierOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="labels.products.noSupplier"
        showClear
        class="w-full"
      />
    </div>

    <div class="form-field">
      <label>{{ labels.import.defaultCategory }}</label>
      <Select
        v-model="selectedCategory"
        :options="categoryOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="labels.products.noCategory"
        showClear
        class="w-full"
      />
    </div>

    <div class="search-action">
      <Button
        :label="labels.import.searchProducts"
        icon="pi pi-search"
        :loading="loading"
        :disabled="!canSearch"
        @click="handleSearch"
      />
    </div>
  </div>
</template>

<style scoped>
.search-form {
  max-width: 500px;
  margin: 0 auto;
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

.search-action {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-md);
}
</style>
