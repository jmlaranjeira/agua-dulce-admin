import { ref, computed } from 'vue'
import type { ImportSource, Supplier } from '@/types'

export type ImportSourceId = 'rainbow-silver' | 'rainbow-invoice' | 'panbubu-email' | 'excel-supplier' | 'mayorista-plata' | 'csv'

const FILE_SOURCES: ImportSourceId[] = ['rainbow-invoice', 'panbubu-email', 'excel-supplier', 'mayorista-plata']

export function useImportWizard() {
  const currentStep = ref(0)
  const selectedSource = ref<ImportSource | null>(null)
  const selectedSupplier = ref<string | null>(null)
  const selectedCategory = ref<string | null>(null)

  const isInvoiceSource = computed(() => selectedSource.value?.id === 'rainbow-invoice')
  const isEmailSource = computed(() => selectedSource.value?.id === 'panbubu-email')
  const isExcelSource = computed(() => selectedSource.value?.id === 'excel-supplier')
  const isMayoristaPlataSource = computed(() => selectedSource.value?.id === 'mayorista-plata')
  const isFileSource = computed(() => FILE_SOURCES.includes(selectedSource.value?.id as ImportSourceId))

  const sourceIcon = computed(() => {
    const iconMap: Record<string, string> = {
      'rainbow-silver': 'pi pi-globe',
      'rainbow-invoice': 'pi pi-file-pdf',
      'panbubu-email': 'pi pi-envelope',
      'excel-supplier': 'pi pi-file-excel',
      'mayorista-plata': 'pi pi-file-pdf',
    }
    return selectedSource.value ? iconMap[selectedSource.value.id] || 'pi pi-file' : 'pi pi-file'
  })

  function nextStep() {
    if (currentStep.value < 3) {
      currentStep.value++
    }
  }

  function previousStep() {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  function selectSource(source: ImportSource) {
    if (source.id === 'csv') return // Disabled
    selectedSource.value = source
  }

  function reset() {
    currentStep.value = 0
    selectedSource.value = null
    selectedSupplier.value = null
    selectedCategory.value = null
  }

  function getSupplierName(suppliers: Supplier[]): string {
    if (!selectedSupplier.value) return '-'
    const supplier = suppliers.find((s) => s.id === selectedSupplier.value)
    return supplier?.name || '-'
  }

  return {
    // State
    currentStep,
    selectedSource,
    selectedSupplier,
    selectedCategory,
    // Computed
    isInvoiceSource,
    isEmailSource,
    isExcelSource,
    isMayoristaPlataSource,
    isFileSource,
    sourceIcon,
    // Actions
    nextStep,
    previousStep,
    selectSource,
    reset,
    getSupplierName,
  }
}
