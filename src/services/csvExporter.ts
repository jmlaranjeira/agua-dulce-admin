import type { Order } from '@/types'
import { labels } from '@/locales/es'

export function exportOrdersToCsv(orders: Order[]) {
  const headers = [
    'Nº Pedido',
    'Fecha',
    'Cliente',
    'Teléfono',
    'Estado',
    'Productos',
    'Total (€)',
    'Notas',
  ]

  const rows = orders.map((order) => {
    const total = order.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.unitPrice),
      0
    )

    return [
      order.number,
      formatDate(order.createdAt),
      order.customer.name,
      order.customer.phone,
      labels.status[order.status as keyof typeof labels.status],
      order.items.map((i) => `${i.product.name} x${i.quantity}`).join(' | '),
      total.toFixed(2),
      order.notes || '',
    ]
  })

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pedidos-${formatDateForFilename(new Date())}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}
