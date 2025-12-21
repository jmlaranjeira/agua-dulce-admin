<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
  <Toast />
  <ConfirmDialog />
</template>
