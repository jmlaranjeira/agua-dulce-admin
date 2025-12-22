import { computed, type Ref } from 'vue'

type OrderItemWithMargin = {
  product: { costPrice: number | null }
  quantity: number
  unitPrice: number
}

export function useOrderMargin<T extends OrderItemWithMargin>(items: Ref<T[]>) {
  const total = computed(() =>
    items.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  )

  const totalCost = computed(() =>
    items.value.reduce((sum, item) => {
      const cost = item.product.costPrice || 0
      return sum + cost * item.quantity
    }, 0)
  )

  const totalMargin = computed(() => {
    if (!total.value || !totalCost.value) return null
    return ((total.value - totalCost.value) / total.value) * 100
  })

  const totalMarginAmount = computed(() => {
    if (!total.value || !totalCost.value) return null
    return total.value - totalCost.value
  })

  function calculateMargin(item: OrderItemWithMargin): string {
    if (!item.product.costPrice) return '0'
    const margin = ((item.unitPrice - item.product.costPrice) / item.unitPrice) * 100
    return margin.toFixed(0)
  }

  function getMarginClass(item: OrderItemWithMargin): string {
    if (!item.product.costPrice) return ''
    const margin = ((item.unitPrice - item.product.costPrice) / item.unitPrice) * 100
    return getMarginClassByValue(margin)
  }

  function getTotalMarginClass(): string {
    if (!totalMargin.value) return ''
    return getMarginClassByValue(totalMargin.value)
  }

  function getMarginClassByValue(margin: number): string {
    if (margin >= 40) return 'margin-high'
    if (margin >= 20) return 'margin-medium'
    return 'margin-low'
  }

  return {
    total,
    totalCost,
    totalMargin,
    totalMarginAmount,
    calculateMargin,
    getMarginClass,
    getTotalMarginClass,
  }
}
