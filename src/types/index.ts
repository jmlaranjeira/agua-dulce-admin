// Alineado con agua-dulce-api DTOs y Prisma schema

// ===========================================
// Auth types
// ===========================================
export interface User {
  id: number
  email: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

// ===========================================
// Enums
// ===========================================
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type StockMovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN'
export type CustomerType = 'RETAIL' | 'WHOLESALE'

// ===========================================
// Category colors
// ===========================================
export type CategoryColor = { bg: string; text: string }

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  anillos: { bg: '#dbeafe', text: '#1e40af' }, // blue
  pulseras: { bg: '#f3e8ff', text: '#6b21a8' }, // purple
  charms: { bg: '#fef3c7', text: '#92400e' }, // amber/gold
  colgantes: { bg: '#ccfbf1', text: '#0f766e' }, // teal
  pendientes: { bg: '#fce7f3', text: '#9d174d' }, // pink
  collares: { bg: '#e0e7ff', text: '#3730a3' }, // indigo
  bolsos: { bg: '#cffafe', text: '#0e7490' }, // cyan
  panuelos: { bg: '#fae8ff', text: '#86198f' }, // fuchsia
  otros: { bg: '#f1f5f9', text: '#475569' }, // gray
}

export const DEFAULT_CATEGORY_COLOR: CategoryColor = { bg: '#f1f5f9', text: '#475569' } // gray

// ===========================================
// Response types (lo que devuelve la API)
// ===========================================
export type Supplier = {
  id: string
  name: string
  phone: string | null
  url: string | null
  notes: string | null
  createdAt: string
}

export type Category = {
  id: string
  name: string
  slug: string
  order: number
}

export type Product = {
  id: string
  code: string
  name: string
  priceRetail: number
  priceWholesale: number | null
  costPrice: number | null
  imageUrl: string | null
  size: string | null
  isActive: boolean
  isVisible: boolean
  stock: number
  supplierId: string | null
  supplier?: Supplier
  categoryId: string | null
  category?: Category
  createdAt: string
  updatedAt: string
}

export type CustomerAddress = {
  id: string
  label: string
  street: string
  city: string
  postalCode: string
  province: string
  country: string | null
  notes: string | null
  isDefault: boolean
  customerId: string
}

export type Customer = {
  id: string
  phone: string
  name: string
  type: CustomerType
  notes: string | null
  isActive: boolean
  addresses?: CustomerAddress[]
  createdAt: string
}

export type OrderItem = {
  id: string
  orderId: string
  productId: string
  product: Product
  quantity: number
  unitPrice: number
}

export type Order = {
  id: string
  number: string
  customerId: string
  customer: Customer
  shippingAddressId: string | null
  shippingAddress: CustomerAddress | null
  status: OrderStatus
  notes: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export type RecentOrder = {
  id: string
  number: string
  customerName: string
  total: number
  status: OrderStatus
  createdAt: string
}

export type DashboardStats = {
  ordersToday: number
  totalToday: number
  pendingOrders: number
  marginToday: number | null
  paidOrders: number
  shippedOrders: number
  customersCount: number
  productsCount: number
  recentOrders: RecentOrder[]
}

// ===========================================
// Create types (lo que envía el frontend)
// ===========================================
export type CreateSupplier = {
  name: string
  phone?: string
  url?: string
  notes?: string
}

export type CreateProduct = {
  code: string
  name: string
  priceRetail: number
  priceWholesale?: number
  costPrice?: number
  imageUrl?: string
  supplierId?: string
  categoryId?: string
}

export type CreateCustomer = {
  phone: string
  name: string
  type?: CustomerType
  notes?: string
}

export type CreateOrderItem = {
  productId: string
  quantity: number
}

export type CreateOrder = {
  customerId: string
  shippingAddressId?: string
  items: CreateOrderItem[]
  notes?: string
}

// ===========================================
// Update types (basados en backend DTOs)
// ===========================================
export type UpdateSupplier = Partial<CreateSupplier>

export type UpdateProduct = Partial<CreateProduct> & {
  isActive?: boolean
  isVisible?: boolean
}

export type UpdateCustomer = Partial<CreateCustomer>

export type CreateCustomerAddress = {
  label: string
  street: string
  city: string
  postalCode: string
  province: string
  country?: string
  notes?: string
  isDefault?: boolean
  customerId: string
}

export type UpdateCustomerAddress = Partial<Omit<CreateCustomerAddress, 'customerId'>>

export type UpdateOrderStatus = {
  status: OrderStatus
}

// ===========================================
// Import types (alineado con agua-dulce-api)
// ===========================================
export type ImportSource = {
  id: string
  name: string
  productTypes: string[]
}

export type ImportProductPreview = {
  externalId: string
  code: string
  name: string
  productType: string
  costPriceRaw: number
  weightGrams: number
  metalType: string
  size: string
  stockQty: number
  tags: string[]
  notes: string
  imageUrl: string
  suggestedCategoryId: string | null
  exists: boolean
}

export type ProductToImport = ImportProductPreview & {
  selected: boolean
  costPrice: number
  priceRetail: number | null
  priceWholesale: number | null
}

export type ImportSearchRequest = {
  source: string
  search?: string
  category?: string
  page?: number
  pageSize?: number
}

export type ImportProductItem = {
  externalId: string
  code: string
  name: string
  priceRetail?: number
  priceWholesale?: number
  costPrice?: number
  imageUrl?: string
  notes?: string
  size?: string
  supplierId?: string
  categoryId?: string
  quantity?: number
}

export type ExecuteImportRequest = {
  source: string
  products: ImportProductItem[]
  // Invoice metadata (for rainbow-invoice source)
  invoiceNumber?: string
  invoiceDate?: string
  supplierId?: string
  shippingCost?: number
  savePdf?: boolean
  // Tracking metadata (for panbubu-email source)
  trackingNumber?: string
  carrier?: string
}

export type ImportResult = {
  imported: number
  skipped: number
  errors: Array<{ code: string; error: string }>
}

// =============================================
// Invoice import types
// =============================================
export type ParsedInvoiceItem = {
  lineNumber: number
  itemCode: string
  description: string
  weight: number
  quantity: number
  unit: string
  pricePerGram: number
  totalAmount: number
}

export type InvoicePreviewItem = {
  code: string
  name: string
  imageUrl: string | null
  productType: string
  costPrice: number
  foundInApi: boolean
  exists: boolean
  suggestedRetailPrice: number
  suggestedWholesalePrice: number
  suggestedCategoryId: string | null
  parsedData: ParsedInvoiceItem
}

export type InvoicePreviewResponse = {
  invoiceNumber: string | null
  invoiceDate: string | null
  invoiceExists: boolean
  existingInvoiceId: string | null
  items: InvoicePreviewItem[]
  suggestedSupplierId: string
  subtotal: number
  shippingCost: number
  summary: {
    total: number
    found: number
    existing: number
  }
}

// =============================================
// Panbubu email import types
// =============================================
export type PanbubuParsedItem = {
  productId: string
  name: string
  variantNumber?: string
  size?: string
  colour?: string
  unitPrice: number
  quantity: number
  subtotal: number
  imageUrl?: string
}

export type PanbubuPreviewItem = {
  code: string
  name: string
  imageUrl: string | null
  productType: string
  costPrice: number
  quantity: number
  size: string | null
  exists: boolean
  suggestedRetailPrice: number
  suggestedWholesalePrice: number
  suggestedCategoryId: string | null
  notes: string
  parsedData: PanbubuParsedItem
}

export type PanbubuPreviewResponse = {
  orderNumber: string
  orderDate: string
  orderExists: boolean
  existingOrderId: string | null
  trackingNumber?: string
  carrier?: string
  items: PanbubuPreviewItem[]
  suggestedSupplierId: string
  subtotal: number
  shippingCost: number
  chargeFee: number
  total: number
  summary: {
    total: number
    existing: number
  }
}

// =============================================
// Excel import types (Proveedores)
// =============================================
export type ExcelParsedItem = {
  lineNumber: number
  itemCode: string
  originalCode: string
  description: string
  size: string | null
  unitPrice: number
  quantity: number
  totalAmount: number
  // imageBuffer y imageMimeType no se envían al frontend (solo se usa imageDataUrl)
}

export type ExcelPreviewItem = {
  code: string
  originalCode: string
  name: string
  imageUrl: string | null
  imageDataUrl: string | null // data:image/jpeg;base64,... para preview
  productType: string
  costPrice: number
  quantity: number
  size: string | null
  exists: boolean
  suggestedRetailPrice: number
  suggestedWholesalePrice: number
  suggestedCategoryId: string | null
  notes: string
  parsedData: ExcelParsedItem
}

export type ExcelPreviewResponse = {
  items: ExcelPreviewItem[]
  shippingCost: number
  totalAmount: number
  summary: {
    total: number
    existing: number
  }
}

// =============================================
// Mayorista Plata import types
// =============================================
export type MayoristaPlataParsedItem = {
  lineNumber: number
  reference: string
  description: string
  variant: string | null
  quantity: number
  unitPrice: number
  totalAmount: number
}

export type MayoristaPlataPreviewItem = {
  code: string
  name: string
  productType: string
  costPrice: number
  quantity: number
  size: string | null
  exists: boolean
  suggestedRetailPrice: number
  suggestedWholesalePrice: number
  suggestedCategoryId: string | null
  notes: string
  parsedData: MayoristaPlataParsedItem
}

export type MayoristaPlataPreviewResponse = {
  invoiceNumber: string | null
  invoiceDate: string | null
  invoiceExists: boolean
  existingInvoiceId: string | null
  items: MayoristaPlataPreviewItem[]
  suggestedSupplierId: string
  subtotal: number
  shippingCost: number
  summary: {
    total: number
    existing: number
  }
}

// =============================================
// Stock types
// =============================================
export type StockMovement = {
  id: string
  productId: string
  product?: { id: string; code: string; name: string }
  type: StockMovementType
  quantity: number
  reference?: string | null
  notes?: string | null
  createdAt: string
}

// =============================================
// Supplier Order types
// =============================================
export type SupplierOrderItem = {
  id: string
  productId: string
  product: { id: string; code: string; name: string; imageUrl: string | null }
  quantity: number
  unitCost: number
  totalCost: number
}

export type SupplierOrder = {
  id: string
  invoiceNumber: string
  supplierId: string
  supplier: { id: string; name: string }
  invoiceDate: string
  totalAmount: number
  shippingCost: number
  currency: string
  pdfUrl?: string | null
  notes?: string | null
  itemCount: number
  items?: SupplierOrderItem[]
  createdAt: string
}
