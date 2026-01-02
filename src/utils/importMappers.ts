import type {
  ImportProductPreview,
  ProductToImport,
  InvoicePreviewItem,
  PanbubuPreviewItem,
  ExcelPreviewItem,
  MayoristaPlataPreviewItem,
} from '@/types'

/**
 * Maps API search result to ProductToImport format
 */
export function mapSearchResultToProduct(p: ImportProductPreview): ProductToImport {
  return {
    ...p,
    selected: !p.exists,
    costPrice: p.costPriceRaw,
    priceRetail: null,
    priceWholesale: null,
  }
}

/**
 * Maps invoice preview item to ProductToImport format
 */
export function mapInvoiceItemToProduct(item: InvoicePreviewItem): ProductToImport {
  return {
    externalId: item.code,
    code: item.code,
    name: item.name,
    productType: item.productType,
    costPriceRaw: item.costPrice,
    costPrice: item.costPrice,
    weightGrams: item.parsedData.weight,
    metalType: 'Silver',
    size: '',
    stockQty: item.parsedData.quantity,
    tags: [],
    notes: item.foundInApi ? '' : 'Importado desde PDF',
    imageUrl: item.imageUrl || '',
    suggestedCategoryId: item.suggestedCategoryId,
    exists: item.exists,
    selected: !item.exists,
    priceRetail: item.suggestedRetailPrice,
    priceWholesale: item.suggestedWholesalePrice,
  }
}

/**
 * Maps email preview item to ProductToImport format
 */
export function mapEmailItemToProduct(item: PanbubuPreviewItem): ProductToImport {
  return {
    externalId: item.code,
    code: item.code,
    name: item.name,
    productType: item.productType,
    costPriceRaw: item.costPrice,
    costPrice: item.costPrice,
    weightGrams: 0,
    metalType: '',
    size: '',
    stockQty: item.quantity,
    tags: [],
    notes: item.notes,
    imageUrl: item.imageUrl || '',
    suggestedCategoryId: item.suggestedCategoryId,
    exists: item.exists,
    selected: !item.exists,
    priceRetail: item.suggestedRetailPrice,
    priceWholesale: item.suggestedWholesalePrice,
  }
}

/**
 * Maps Excel preview item to ProductToImport format
 */
export function mapExcelItemToProduct(item: ExcelPreviewItem): ProductToImport {
  return {
    externalId: item.code,
    code: item.code,
    name: item.code, // Use code as name for Excel items
    productType: item.productType,
    costPriceRaw: item.costPrice,
    costPrice: item.costPrice,
    weightGrams: 0,
    metalType: '',
    size: item.size || '',
    stockQty: item.quantity,
    tags: [],
    notes: item.notes,
    imageUrl: item.imageDataUrl || item.imageUrl || '',
    suggestedCategoryId: item.suggestedCategoryId,
    exists: item.exists,
    selected: !item.exists,
    priceRetail: item.suggestedRetailPrice,
    priceWholesale: item.suggestedWholesalePrice,
  }
}

/**
 * Maps Mayorista Plata preview item to ProductToImport format
 */
export function mapMayoristaPlataItemToProduct(item: MayoristaPlataPreviewItem): ProductToImport {
  return {
    externalId: item.code,
    code: item.code,
    name: item.name,
    productType: item.productType,
    costPriceRaw: item.costPrice,
    costPrice: item.costPrice,
    weightGrams: 0,
    metalType: 'Silver',
    size: item.size || '',
    stockQty: item.quantity,
    tags: [],
    notes: item.notes,
    imageUrl: '', // Mayorista Plata no proporciona imágenes automáticamente
    suggestedCategoryId: item.suggestedCategoryId,
    exists: item.exists,
    selected: !item.exists,
    priceRetail: item.suggestedRetailPrice,
    priceWholesale: item.suggestedWholesalePrice,
  }
}

/**
 * Format currency in EUR
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}
