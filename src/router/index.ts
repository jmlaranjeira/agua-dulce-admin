import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const PUBLIC_ROUTES = ['login', 'register']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Auth
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { public: true },
    },

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

// Navigation guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const isPublicRoute = PUBLIC_ROUTES.includes(to.name as string)

  if (!authStore.isAuthenticated && !isPublicRoute) {
    // No autenticado intentando acceder a ruta protegida
    next({ name: 'login' })
  } else if (authStore.isAuthenticated && to.name === 'login') {
    // Autenticado intentando ir a login
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
