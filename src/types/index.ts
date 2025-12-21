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
  isActive: boolean
  supplierId: string | null
  supplier?: Supplier
  categoryId: string | null
  category?: Category
  createdAt: string
  updatedAt: string
}

export type Customer = {
  id: string
  phone: string
  name: string
  notes: string | null
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
  notes?: string
}

export type CreateOrderItem = {
  productId: string
  quantity: number
}

export type CreateOrder = {
  customerId: string
  items: CreateOrderItem[]
  notes?: string
}

// ===========================================
// Update types (basados en backend DTOs)
// ===========================================
export type UpdateSupplier = Partial<CreateSupplier>

export type UpdateProduct = Partial<CreateProduct> & {
  isActive?: boolean
}

export type UpdateCustomer = Partial<CreateCustomer>

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
}

export type ProductToImport = ImportProductPreview & {
  selected: boolean
  costPrice: number
  priceRetail: number | null
  priceWholesale: number | null
  exists?: boolean
}

export type ImportSearchRequest = {
  source: string
  productType: string
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
  supplierId?: string
  categoryId?: string
}

export type ExecuteImportRequest = {
  source: string
  products: ImportProductItem[]
}

export type ImportResult = {
  imported: number
  skipped: number
  errors: Array<{ code: string; error: string }>
}
