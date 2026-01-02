import { ref, computed, type Ref } from 'vue'
import type { ProductToImport } from '@/types'

export function useProductSelection(products: Ref<ProductToImport[]>) {
  const showMarginDialog = ref(false)
  const customMargin = ref(2)

  // Selected products (all selected, including existing for stock addition)
  const selectedProducts = computed(() =>
    products.value.filter((p) => p.selected)
  )

  // New products only (need pricing)
  const selectedNewProducts = computed(() =>
    products.value.filter((p) => p.selected && !p.exists)
  )

  // Existing products (for stock addition)
  const selectedExistingProducts = computed(() =>
    products.value.filter((p) => p.selected && p.exists)
  )

  const selectedCount = computed(() => selectedProducts.value.length)

  const allSelected = computed(() =>
    products.value.every((p) => p.selected)
  )

  // Summary calculations
  const totalCost = computed(() =>
    selectedProducts.value.reduce((sum, p) => sum + p.costPrice * (p.stockQty || 1), 0)
  )

  const totalRetail = computed(() =>
    selectedNewProducts.value.reduce((sum, p) => sum + (p.priceRetail || 0), 0)
  )

  const totalStock = computed(() =>
    selectedProducts.value.reduce((sum, p) => sum + (p.stockQty || 1), 0)
  )

  const skippedCount = computed(() =>
    products.value.filter((p) => !p.selected).length
  )

  // Validation - only NEW products need retail price
  const canProceed = computed(() => {
    if (selectedCount.value === 0) return false
    return selectedNewProducts.value.every((p) => p.priceRetail && p.priceRetail > 0)
  })

  // Actions
  function applyMargin(multiplier: number) {
    products.value
      .filter((p) => p.selected)
      .forEach((p) => {
        const price = Math.round(p.costPrice * multiplier * 100) / 100
        p.priceRetail = price
        p.priceWholesale = price
      })
  }

  function applyCustomMargin() {
    applyMargin(customMargin.value)
    showMarginDialog.value = false
  }

  function toggleSelectAll(checked: boolean) {
    products.value.forEach((p) => {
      p.selected = checked
    })
  }

  function rowClass(data: ProductToImport): string {
    return data.exists ? 'row-existing' : ''
  }

  return {
    // State
    showMarginDialog,
    customMargin,
    // Computed
    selectedProducts,
    selectedNewProducts,
    selectedExistingProducts,
    selectedCount,
    allSelected,
    totalCost,
    totalRetail,
    totalStock,
    skippedCount,
    canProceed,
    // Actions
    applyMargin,
    applyCustomMargin,
    toggleSelectAll,
    rowClass,
  }
}
