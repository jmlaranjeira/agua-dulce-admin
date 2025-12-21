<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const isLoading = ref(true)

const publicRoutes = ['login', 'register']
const isPublicRoute = () => publicRoutes.includes(route.name as string)

onMounted(async () => {
  await authStore.loadFromStorage()
  isLoading.value = false
})
</script>

<template>
  <div v-if="isLoading" class="app-loading">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
  </div>
  <template v-else>
    <template v-if="isPublicRoute()">
      <RouterView />
    </template>
    <template v-else>
      <AppLayout>
        <RouterView />
      </AppLayout>
    </template>
  </template>
  <Toast />
  <ConfirmDialog />
</template>

<style>
.app-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-50);
}
</style>
