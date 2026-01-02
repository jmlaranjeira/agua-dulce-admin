import { ref, computed, type Ref } from 'vue'
import type { ProductToImport } from '@/types'

export function useProductSelection(products: Ref<ProductToImport[]>) {
  const showMarginDialog = ref(false)
  const customMargin = ref(2)

  // Selected products (excluding already existing)
  const selectedProducts = computed(() =>
    products.value.filter((p) => p.selected && !p.exists)
  )

  const selectedCount = computed(() => selectedProducts.value.length)

  const allSelected = computed(() =>
    products.value.filter((p) => !p.exists).every((p) => p.selected)
  )

  // Summary calculations
  const totalCost = computed(() =>
    selectedProducts.value.reduce((sum, p) => sum + p.costPrice, 0)
  )

  const totalRetail = computed(() =>
    selectedProducts.value.reduce((sum, p) => sum + (p.priceRetail || 0), 0)
  )

  const totalStock = computed(() =>
    selectedProducts.value.reduce((sum, p) => sum + (p.stockQty || 0), 0)
  )

  const skippedCount = computed(() =>
    products.value.filter((p) => p.exists).length
  )

  // Validation
  const canProceed = computed(() => {
    if (selectedCount.value === 0) return false
    return selectedProducts.value.every((p) => p.priceRetail && p.priceRetail > 0)
  })

  // Actions
  function applyMargin(multiplier: number) {
    products.value
      .filter((p) => p.selected && !p.exists)
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
      if (!p.exists) {
        p.selected = checked
      }
    })
  }

  function rowClass(data: ProductToImport): string {
    return data.exists ? 'row-disabled' : ''
  }

  return {
    // State
    showMarginDialog,
    customMargin,
    // Computed
    selectedProducts,
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
