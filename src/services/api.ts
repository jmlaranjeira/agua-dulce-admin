import type {
  Supplier,
  Category,
  Product,
  Customer,
  Order,
  OrderStatus,
  DashboardStats,
  CreateSupplier,
  CreateProduct,
  CreateCustomer,
  CreateOrder,
  UpdateSupplier,
  UpdateProduct,
  UpdateCustomer,
} from '@/types'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authStore = useAuthStore()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  }

  // Añadir token de autenticación si existe
  if (authStore.token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${authStore.token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  // Manejar 401 Unauthorized
  if (response.status === 401) {
    authStore.logout()
    router.push('/login')
    throw new Error('Sesión expirada')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))

    let message: string
    if (error.message) {
      message = Array.isArray(error.message) ? error.message[0] : error.message
    } else {
      message = `Error ${response.status}`
    }

    throw new Error(message)
  }

  return response.json()
}

export const api = {
  suppliers: {
    list: () => request<Supplier[]>('/suppliers'),
    get: (id: string) => request<Supplier>(`/suppliers/${id}`),
    products: (id: string) => request<Product[]>(`/suppliers/${id}/products`),
    create: (data: CreateSupplier) =>
      request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateSupplier) =>
      request<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  },

  products: {
    list: (filters?: { active?: boolean; supplierId?: string; categoryId?: string }) => {
      const params = new URLSearchParams()
      if (filters?.active !== undefined) params.set('active', String(filters.active))
      if (filters?.supplierId) params.set('supplierId', filters.supplierId)
      if (filters?.categoryId) params.set('categoryId', filters.categoryId)
      const query = params.toString()
      return request<Product[]>(`/products${query ? `?${query}` : ''}`)
    },
    get: (id: string) => request<Product>(`/products/${id}`),
    create: (data: CreateProduct) =>
      request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateProduct) =>
      request<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
  },

  customers: {
    list: () => request<Customer[]>('/customers'),
    get: (id: string) => request<Customer>(`/customers/${id}`),
    orders: (id: string) => request<Order[]>(`/customers/${id}/orders`),
    create: (data: CreateCustomer) =>
      request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateCustomer) =>
      request<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/customers/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: (filters?: { status?: OrderStatus; customerId?: string; from?: Date; to?: Date }) => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.customerId) params.set('customerId', filters.customerId)
      if (filters?.from) params.set('from', filters.from.toISOString())
      if (filters?.to) params.set('to', filters.to.toISOString())
      const query = params.toString()
      return request<Order[]>(`/orders${query ? `?${query}` : ''}`)
    },
    get: (id: string) => request<Order>(`/orders/${id}`),
    create: (data: CreateOrder) =>
      request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: OrderStatus) =>
      request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },

  categories: {
    list: () => request<Category[]>('/categories'),
  },

  dashboard: {
    stats: () => request<DashboardStats>('/dashboard/stats'),
  },

  upload: {
    getAuth: () => request<{ token: string; expire: number; signature: string }>('/upload/auth'),
  },
}
