import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { ImportSource, Supplier, Category } from '@/types'

export function useImportSources() {
  const toast = useToast()
  const loading = ref(false)
  const sources = ref<ImportSource[]>([])
  const suppliers = ref<Supplier[]>([])
  const categories = ref<Category[]>([])

  const supplierOptions = () =>
    suppliers.value.map((s) => ({
      label: s.name,
      value: s.id,
    }))

  const categoryOptions = () =>
    categories.value.map((c) => ({
      label: c.name,
      value: c.id,
    }))

  function getCategoryName(categoryId: string | null): string {
    if (!categoryId) return '-'
    const category = categories.value.find((c) => c.id === categoryId)
    return category?.name || '-'
  }

  function getSupplierName(supplierId: string | null): string {
    if (!supplierId) return '-'
    const supplier = suppliers.value.find((s) => s.id === supplierId)
    return supplier?.name || '-'
  }

  function getSupplierPrefix(supplierId: string | null): string {
    if (!supplierId) return 'AT'
    const supplier = suppliers.value.find((s) => s.id === supplierId)
    return supplier ? supplier.name.substring(0, 2).toUpperCase() : 'AT'
  }

  async function loadData() {
    loading.value = true
    try {
      const [sourcesData, suppliersData, categoriesData] = await Promise.all([
        api.import.getSources(),
        api.suppliers.list(),
        api.categories.list(),
      ])
      sources.value = sourcesData
      suppliers.value = suppliersData
      categories.value = categoriesData
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

  onMounted(loadData)

  return {
    loading,
    sources,
    suppliers,
    categories,
    supplierOptions,
    categoryOptions,
    getCategoryName,
    getSupplierName,
    getSupplierPrefix,
    loadData,
  }
}
