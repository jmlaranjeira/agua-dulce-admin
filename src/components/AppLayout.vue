<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Sidebar from 'primevue/sidebar'
import { labels } from '@/locales/es'

const route = useRoute()
const router = useRouter()
const sidebarVisible = ref(false)

const menuItems = [
  { label: labels.menu.dashboard, icon: 'pi pi-home', route: '/' },
  { label: labels.menu.suppliers, icon: 'pi pi-truck', route: '/suppliers' },
  { label: labels.menu.products, icon: 'pi pi-box', route: '/products' },
  { label: labels.menu.customers, icon: 'pi pi-users', route: '/customers' },
  { label: labels.menu.orders, icon: 'pi pi-shopping-cart', route: '/orders' },
]

const pageTitleMap: Record<string, string> = {
  dashboard: labels.pages.dashboard,
  suppliers: labels.pages.suppliers,
  'supplier-new': labels.pages.supplierNew,
  'supplier-edit': labels.pages.supplierEdit,
  products: labels.pages.products,
  'product-new': labels.pages.productNew,
  'product-edit': labels.pages.productEdit,
  customers: labels.pages.customers,
  'customer-new': labels.pages.customerNew,
  'customer-edit': labels.pages.customerEdit,
  orders: labels.pages.orders,
  'order-new': labels.pages.orderNew,
  'order-detail': labels.pages.orderDetail,
}

const pageTitle = computed(() => {
  return pageTitleMap[route.name as string] || labels.app.name
})

function navigateTo(path: string) {
  router.push(path)
  sidebarVisible.value = false
}

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="app-layout">
    <!-- Desktop Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-logo">{{ labels.app.name }}</span>
      </div>
      <nav class="sidebar-nav">
        <button
          v-for="item in menuItems"
          :key="item.route"
          class="nav-item"
          :class="{ active: isActive(item.route) }"
          @click="navigateTo(item.route)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- Mobile Sidebar -->
    <Sidebar v-model:visible="sidebarVisible" class="mobile-sidebar">
      <template #header>
        <span class="sidebar-logo">{{ labels.app.name }}</span>
      </template>
      <nav class="sidebar-nav">
        <button
          v-for="item in menuItems"
          :key="item.route"
          class="nav-item"
          :class="{ active: isActive(item.route) }"
          @click="navigateTo(item.route)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </Sidebar>

    <!-- Main Content -->
    <div class="main-container">
      <header class="header">
        <Button
          icon="pi pi-bars"
          class="mobile-menu-btn"
          text
          @click="sidebarVisible = true"
        />
        <h1 class="page-title">{{ pageTitle }}</h1>
      </header>

      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>
