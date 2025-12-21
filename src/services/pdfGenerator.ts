import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Order } from '@/types'
import { labels } from '@/locales/es'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function generateOrderPdf(order: Order) {
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake = pdfMakeModule.default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fonts = pdfFontsModule as any
  pdfMake.vfs = fonts.pdfMake?.vfs || fonts.default || fonts

  const bizumPhone = import.meta.env.VITE_BIZUM_PHONE || ''
  const total = order.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0
  )

  const docDefinition: TDocumentDefinitions = {
    content: [
      // Cabecera
      {
        columns: [
          {
            text: labels.app.name.toUpperCase(),
            style: 'brandName',
          },
          {
            text: [
              { text: 'Nota de Pedido\n', style: 'docTitle' },
              { text: order.number, style: 'orderNumber' },
            ],
            alignment: 'right',
          },
        ],
      },

      { text: '', margin: [0, 20] },

      // Info cliente y fecha
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: `${labels.orders.customerInfo}:`, style: 'label' },
              { text: order.customer.name, style: 'value' },
              { text: order.customer.phone, style: 'valueSmall' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: `${labels.fields.date}:`, style: 'label' },
              { text: formatDate(order.createdAt), style: 'value' },
            ],
            alignment: 'right',
          },
        ],
      },

      // Dirección de envío (si existe)
      ...(order.shippingAddress
        ? [
            { text: '', margin: [0, 10] as [number, number] },
            { text: `${labels.address.shippingAddress}:`, style: 'label' },
            { text: order.shippingAddress.street, style: 'value' },
            {
              text: `${order.shippingAddress.postalCode} ${order.shippingAddress.city}, ${order.shippingAddress.province}`,
              style: 'value',
            },
            ...(order.shippingAddress.notes
              ? [{ text: order.shippingAddress.notes, style: 'notes' }]
              : []),
          ]
        : []),

      { text: '', margin: [0, 20] },

      // Tabla de productos
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Producto', style: 'tableHeader' },
              { text: labels.fields.price, style: 'tableHeader', alignment: 'right' as const },
              { text: 'Cant.', style: 'tableHeader', alignment: 'center' as const },
              { text: labels.orders.subtotal, style: 'tableHeader', alignment: 'right' as const },
            ],
            ...order.items.map((item) => [
              { text: item.product.name },
              { text: `${Number(item.unitPrice).toFixed(2)} €`, alignment: 'right' as const },
              { text: item.quantity.toString(), alignment: 'center' as const },
              {
                text: `${(item.quantity * Number(item.unitPrice)).toFixed(2)} €`,
                alignment: 'right' as const,
              },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === 1 || i === node.table.body.length ? 1 : 0,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },

      { text: '', margin: [0, 10] },

      // Total
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              body: [
                [
                  { text: labels.fields.total.toUpperCase(), style: 'totalLabel' },
                  { text: `${total.toFixed(2)} €`, style: 'totalValue' },
                ],
              ],
            },
            layout: 'noBorders',
          },
        ],
      },

      { text: '', margin: [0, 30] },

      // Datos de pago
      {
        stack: [
          { text: 'Datos de pago:', style: 'label' },
          { text: `Bizum: ${bizumPhone}`, style: 'value' },
        ],
      },

      { text: '', margin: [0, 30] },

      // Notas (si hay)
      ...(order.notes
        ? [
            { text: `${labels.fields.notes}:`, style: 'label' },
            { text: order.notes, style: 'notes' },
          ]
        : []),

      // Footer
      {
        text: labels.whatsapp.thanksPlain,
        style: 'footer',
        margin: [0, 40, 0, 0] as [number, number, number, number],
      },
    ],

    styles: {
      brandName: {
        fontSize: 24,
        bold: true,
        color: '#1e293b',
      },
      docTitle: {
        fontSize: 14,
        color: '#64748b',
      },
      orderNumber: {
        fontSize: 18,
        bold: true,
        color: '#1e293b',
      },
      label: {
        fontSize: 10,
        color: '#64748b',
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      value: {
        fontSize: 12,
        color: '#1e293b',
      },
      valueSmall: {
        fontSize: 10,
        color: '#64748b',
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: '#64748b',
        fillColor: '#f8fafc',
      },
      totalLabel: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 20, 0] as [number, number, number, number],
      },
      totalValue: {
        fontSize: 16,
        bold: true,
        color: '#1e293b',
      },
      notes: {
        fontSize: 10,
        color: '#64748b',
        italics: true,
      },
      footer: {
        fontSize: 12,
        alignment: 'center',
        color: '#64748b',
      },
    },

    defaultStyle: {
      font: 'Roboto',
    },

    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
  }

  pdfMake.createPdf(docDefinition).download(`pedido-${order.number}.pdf`)
}
