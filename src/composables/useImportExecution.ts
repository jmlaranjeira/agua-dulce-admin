import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import type { ProductToImport, Supplier } from '@/types'

export interface InvoiceInfo {
  number: string | null
  date: string | null
  exists: boolean
  existingId: string | null
  subtotal: number
  shippingCost: number
}

export interface EmailInfo {
  orderNumber: string | null
  orderDate: string | null
  orderExists: boolean
  existingOrderId: string | null
  trackingNumber?: string
  carrier?: string
  subtotal: number
  shippingCost: number
  chargeFee: number
  total: number
}

export interface ExcelInfo {
  shippingCost: number
  totalAmount: number
}

export interface ExecuteImportParams {
  sourceId: string
  selectedProducts: ProductToImport[]
  selectedSupplier: string | null
  selectedCategory: string | null
  invoiceInfo: InvoiceInfo
  emailInfo: EmailInfo
  excelInfo: ExcelInfo
  invoicePdfFile: File | null
  excelFile: File | null
  suppliers: Supplier[]
}

export function useImportExecution() {
  const router = useRouter()
  const toast = useToast()
  const importing = ref(false)

  async function executeImport(params: ExecuteImportParams) {
    const {
      sourceId,
      selectedProducts,
      selectedSupplier,
      selectedCategory,
      invoiceInfo,
      emailInfo,
      excelInfo,
      invoicePdfFile,
      excelFile,
      suppliers,
    } = params

    if (selectedProducts.length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'Atención',
        detail: labels.import.noProductsSelected,
        life: 3000,
      })
      return false
    }

    importing.value = true
    try {
      const isInvoiceImport = sourceId === 'rainbow-invoice'
      const isEmailImport = sourceId === 'panbubu-email'
      const isExcelImport = sourceId === 'excel-supplier'

      // Generate invoice number for Excel imports
      let excelInvoiceNumber: string | undefined
      if (isExcelImport && selectedSupplier) {
        const supplier = suppliers.find((s) => s.id === selectedSupplier)
        if (supplier) {
          const today = new Date().toISOString().split('T')[0]
          excelInvoiceNumber = `${supplier.name.toUpperCase().replace(/ /g, '-')}-${today}-EXCEL`
        }
      }

      const result = await api.import.execute(
        {
          source: sourceId,
          products: selectedProducts.map((p) => ({
            externalId: p.externalId,
            code: p.code,
            name: p.name,
            priceRetail: p.priceRetail!,
            priceWholesale: p.priceWholesale ?? undefined,
            costPrice: p.costPrice,
            imageUrl: p.imageUrl,
            notes: p.notes,
            size: p.size || undefined,
            supplierId: selectedSupplier ?? undefined,
            categoryId: selectedCategory ?? p.suggestedCategoryId ?? undefined,
            quantity: p.stockQty || undefined,
          })),
          invoiceNumber: isInvoiceImport
            ? invoiceInfo.number ?? undefined
            : isEmailImport
              ? emailInfo.orderNumber ?? undefined
              : isExcelImport
                ? excelInvoiceNumber
                : undefined,
          invoiceDate: isInvoiceImport
            ? invoiceInfo.date ?? undefined
            : isEmailImport
              ? emailInfo.orderDate ?? undefined
              : isExcelImport
                ? new Date().toISOString().split('T')[0]
                : undefined,
          supplierId: selectedSupplier ?? undefined,
          shippingCost: isInvoiceImport
            ? invoiceInfo.shippingCost || undefined
            : isEmailImport
              ? emailInfo.shippingCost || undefined
              : isExcelImport
                ? excelInfo.shippingCost || undefined
                : undefined,
          savePdf: isInvoiceImport && !!invoicePdfFile,
          trackingNumber: isEmailImport ? emailInfo.trackingNumber : undefined,
          carrier: isEmailImport ? emailInfo.carrier : undefined,
        },
        isInvoiceImport ? invoicePdfFile ?? undefined : isExcelImport ? excelFile ?? undefined : undefined
      )

      const message = labels.import.importedCount
        .replace('{imported}', String(result.imported))
        .replace('{skipped}', String(result.skipped))

      toast.add({
        severity: 'success',
        summary: labels.import.importSuccess,
        detail: message,
        life: 5000,
      })

      if (result.errors && result.errors.length > 0) {
        toast.add({
          severity: 'warn',
          summary: 'Errores',
          detail: `${result.errors.length} productos con errores`,
          life: 5000,
        })
      }

      router.push('/products')
      return true
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
        life: 3000,
      })
      return false
    } finally {
      importing.value = false
    }
  }

  return {
    importing,
    executeImport,
  }
}
