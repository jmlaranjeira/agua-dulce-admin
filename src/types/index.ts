// Alineado con agua-dulce-api DTOs y Prisma schema

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

export type DashboardStats = {
  ordersToday: number
  totalToday: number
  pendingOrders: number
  marginToday: number | null
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
