import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Dashboard
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },

    // Suppliers
    {
      path: '/suppliers',
      name: 'suppliers',
      component: () => import('../views/SuppliersView.vue'),
    },
    {
      path: '/suppliers/new',
      name: 'supplier-new',
      component: () => import('../views/SupplierFormView.vue'),
    },
    {
      path: '/suppliers/:id/edit',
      name: 'supplier-edit',
      component: () => import('../views/SupplierFormView.vue'),
    },

    // Products
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductsView.vue'),
    },
    {
      path: '/products/new',
      name: 'product-new',
      component: () => import('../views/ProductFormView.vue'),
    },
    {
      path: '/products/:id/edit',
      name: 'product-edit',
      component: () => import('../views/ProductFormView.vue'),
    },

    // Customers
    {
      path: '/customers',
      name: 'customers',
      component: () => import('../views/CustomersView.vue'),
    },
    {
      path: '/customers/new',
      name: 'customer-new',
      component: () => import('../views/CustomerFormView.vue'),
    },
    {
      path: '/customers/:id/edit',
      name: 'customer-edit',
      component: () => import('../views/CustomerFormView.vue'),
    },

    // Orders
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/OrdersView.vue'),
    },
    {
      path: '/orders/new',
      name: 'order-new',
      component: () => import('../views/OrderFormView.vue'),
    },
    {
      path: '/orders/:id',
      name: 'order-detail',
      component: () => import('../views/OrderDetailView.vue'),
    },
  ],
})

export default router
