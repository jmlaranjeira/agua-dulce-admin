import type {
  Supplier,
  Category,
  Product,
  Customer,
  CustomerAddress,
  Order,
  OrderStatus,
  DashboardStats,
  CreateSupplier,
  CreateProduct,
  CreateCustomer,
  CreateCustomerAddress,
  CreateOrder,
  UpdateSupplier,
  UpdateProduct,
  UpdateCustomer,
  UpdateCustomerAddress,
  ImportSource,
  ImportProductPreview,
  ImportSearchRequest,
  ExecuteImportRequest,
  ImportResult,
  InvoicePreviewResponse,
  PanbubuPreviewResponse,
  ExcelPreviewResponse,
  MayoristaPlataPreviewResponse,
  StockMovement,
  SupplierOrder,
  ShippingZone,
  UpdateShippingZone,
  ShippingCalculation,
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
    list: (filters?: { active?: boolean }) => {
      const params = new URLSearchParams()
      if (filters?.active !== undefined) params.set('active', String(filters.active))
      const query = params.toString()
      return request<Supplier[]>(`/suppliers${query ? `?${query}` : ''}`)
    },
    get: (id: string) => request<Supplier>(`/suppliers/${id}`),
    products: (id: string) => request<Product[]>(`/suppliers/${id}/products`),
    create: (data: CreateSupplier) =>
      request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateSupplier) =>
      request<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    archive: (id: string) => request<Supplier>(`/suppliers/${id}/archive`, { method: 'PATCH' }),
    restore: (id: string) => request<Supplier>(`/suppliers/${id}/restore`, { method: 'PATCH' }),
    delete: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  },

  products: {
    list: (filters?: { active?: boolean; visible?: boolean; supplierId?: string; categoryId?: string }) => {
      const params = new URLSearchParams()
      if (filters?.active !== undefined) params.set('active', String(filters.active))
      if (filters?.visible !== undefined) params.set('visible', String(filters.visible))
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
    checkCodes: (codes: string[]) =>
      request<{ existing: string[] }>(`/products/check-codes?codes=${encodeURIComponent(codes.join(','))}`),
  },

  customers: {
    list: (filters?: { active?: boolean }) => {
      const params = new URLSearchParams()
      if (filters?.active !== undefined) params.set('active', String(filters.active))
      const query = params.toString()
      return request<Customer[]>(`/customers${query ? `?${query}` : ''}`)
    },
    get: (id: string) => request<Customer>(`/customers/${id}`),
    orders: (id: string) => request<Order[]>(`/customers/${id}/orders`),
    create: (data: CreateCustomer) =>
      request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateCustomer) =>
      request<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/customers/${id}`, { method: 'DELETE' }),
    archive: (id: string) => request<Customer>(`/customers/${id}/archive`, { method: 'PATCH' }),
    restore: (id: string) => request<Customer>(`/customers/${id}/restore`, { method: 'PATCH' }),
  },

  customerAddresses: {
    getByCustomer: (customerId: string) =>
      request<CustomerAddress[]>(`/customer-addresses/customer/${customerId}`),
    getOne: (id: string) => request<CustomerAddress>(`/customer-addresses/${id}`),
    create: (data: CreateCustomerAddress) =>
      request<CustomerAddress>('/customer-addresses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateCustomerAddress) =>
      request<CustomerAddress>(`/customer-addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/customer-addresses/${id}`, { method: 'DELETE' }),
    setDefault: (id: string) =>
      request<CustomerAddress>(`/customer-addresses/${id}/set-default`, { method: 'PATCH' }),
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

  import: {
    getSources: () => request<ImportSource[]>('/import/sources'),
    search: (data: ImportSearchRequest) =>
      request<ImportProductPreview[]>('/import/search', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    execute: async (data: ExecuteImportRequest, file?: File): Promise<ImportResult> => {
      const authStore = useAuthStore()

      // If file is provided, send as multipart/form-data
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('data', JSON.stringify(data))

        const headers: HeadersInit = {}
        if (authStore.token) {
          headers['Authorization'] = `Bearer ${authStore.token}`
        }

        const response = await fetch(`${API_URL}/import/execute`, {
          method: 'POST',
          headers,
          body: formData,
        })

        if (response.status === 401) {
          authStore.logout()
          router.push('/login')
          throw new Error('Sesión expirada')
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          const message = error.message
            ? Array.isArray(error.message)
              ? error.message[0]
              : error.message
            : `Error ${response.status}`
          throw new Error(message)
        }

        return response.json()
      }

      // No file, send as JSON
      return request<ImportResult>('/import/execute', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    parseInvoice: async (file: File): Promise<InvoicePreviewResponse> => {
      const authStore = useAuthStore()
      const formData = new FormData()
      formData.append('file', file)

      const headers: HeadersInit = {}
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }
      // No añadir Content-Type, el browser lo pone con el boundary

      const response = await fetch(`${API_URL}/import/parse-invoice`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (response.status === 401) {
        authStore.logout()
        router.push('/login')
        throw new Error('Sesión expirada')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const message = error.message
          ? Array.isArray(error.message)
            ? error.message[0]
            : error.message
          : `Error ${response.status}`
        throw new Error(message)
      }

      return response.json()
    },
    parseEmail: async (file: File): Promise<PanbubuPreviewResponse> => {
      const authStore = useAuthStore()
      const formData = new FormData()
      formData.append('file', file)

      const headers: HeadersInit = {}
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const response = await fetch(`${API_URL}/import/parse-email`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (response.status === 401) {
        authStore.logout()
        router.push('/login')
        throw new Error('Sesión expirada')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const message = error.message
          ? Array.isArray(error.message)
            ? error.message[0]
            : error.message
          : `Error ${response.status}`
        throw new Error(message)
      }

      return response.json()
    },
    parseExcel: async (file: File, prefix: string = 'AT'): Promise<ExcelPreviewResponse> => {
      const authStore = useAuthStore()
      const formData = new FormData()
      formData.append('file', file)

      const headers: HeadersInit = {}
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const response = await fetch(`${API_URL}/import/parse-excel?prefix=${prefix}`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (response.status === 401) {
        authStore.logout()
        router.push('/login')
        throw new Error('Sesión expirada')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const message = error.message
          ? Array.isArray(error.message)
            ? error.message[0]
            : error.message
          : `Error ${response.status}`
        throw new Error(message)
      }

      return response.json()
    },
    parseMayoristaPlata: async (file: File): Promise<MayoristaPlataPreviewResponse> => {
      const authStore = useAuthStore()
      const formData = new FormData()
      formData.append('file', file)

      const headers: HeadersInit = {}
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const response = await fetch(`${API_URL}/import/parse-mayorista-plata`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (response.status === 401) {
        authStore.logout()
        router.push('/login')
        throw new Error('Sesión expirada')
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const message = error.message
          ? Array.isArray(error.message)
            ? error.message[0]
            : error.message
          : `Error ${response.status}`
        throw new Error(message)
      }

      return response.json()
    },
    getPdfUrl: (supplierOrderId: string) =>
      request<{ url: string }>(`/import/pdf/${supplierOrderId}`),
  },

  stock: {
    getMovements: (limit?: number) => {
      const params = limit ? `?limit=${limit}` : ''
      return request<StockMovement[]>(`/stock/movements${params}`)
    },
    getMovementsByProduct: (productId: string) =>
      request<StockMovement[]>(`/stock/movements/${productId}`),
    getLowStock: (threshold?: number) => {
      const params = threshold ? `?threshold=${threshold}` : ''
      return request<Product[]>(`/stock/low-stock${params}`)
    },
    adjust: (productId: string, quantity: number, notes?: string) =>
      request<StockMovement>('/stock/adjustment', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, notes }),
      }),
  },

  supplierOrders: {
    list: (filters?: { supplierId?: string }) => {
      const params = new URLSearchParams()
      if (filters?.supplierId) params.set('supplierId', filters.supplierId)
      const query = params.toString()
      return request<SupplierOrder[]>(`/supplier-orders${query ? `?${query}` : ''}`)
    },
    get: (id: string) => request<SupplierOrder>(`/supplier-orders/${id}`),
    delete: (id: string) => request<void>(`/supplier-orders/${id}`, { method: 'DELETE' }),
  },

  shippingZones: {
    list: () => request<ShippingZone[]>('/shipping/zones'),
    get: (id: string) => request<ShippingZone>(`/shipping/zones/${id}`),
    update: (id: string, data: UpdateShippingZone) =>
      request<ShippingZone>(`/shipping/zones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    calculate: (postalCode: string, subtotal: number, productIds?: string[]) => {
      const params = new URLSearchParams({
        zip: postalCode,
        subtotal: subtotal.toString(),
      })
      if (productIds?.length) {
        params.set('productIds', productIds.join(','))
      }
      return request<ShippingCalculation>(`/public/shipping/calculate?${params}`)
    },
  },
}
