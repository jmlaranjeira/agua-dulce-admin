<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'
import { labels } from '@/locales/es'
import type { LoginRequest } from '@/types'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const form = ref<LoginRequest>({
  email: '',
  password: '',
})

const errors = ref<Record<string, string>>({})
const loading = ref(false)

function validate(): boolean {
  errors.value = {}

  if (!form.value.email.trim()) {
    errors.value.email = labels.messages.required
  }

  if (!form.value.password) {
    errors.value.password = labels.messages.required
  }

  return Object.keys(errors.value).length === 0
}

async function login() {
  if (!validate()) return

  loading.value = true
  try {
    await authStore.login({
      email: form.value.email.trim(),
      password: form.value.password,
    })
    router.push('/')
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.auth.invalidCredentials,
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-header">
        <h1 class="login-title">{{ labels.app.name }}</h1>
      </div>

      <Card>
        <template #content>
          <form @submit.prevent="login" class="form">
            <div class="form-field">
              <label for="email">{{ labels.auth.email }}</label>
              <InputText
                id="email"
                v-model="form.email"
                type="email"
                :class="{ 'p-invalid': errors.email }"
                :disabled="loading"
                autocomplete="email"
              />
              <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
            </div>

            <div class="form-field">
              <label for="password">{{ labels.auth.password }}</label>
              <Password
                id="password"
                v-model="form.password"
                :class="{ 'p-invalid': errors.password }"
                :disabled="loading"
                :feedback="false"
                toggleMask
                fluid
                autocomplete="current-password"
              />
              <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
            </div>

            <Button
              type="submit"
              :label="labels.auth.login"
              :loading="loading"
              class="login-button"
            />
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: var(--p-surface-50);
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--p-primary-color);
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-field label {
  font-weight: 500;
  color: var(--color-text);
}

.form-field input {
  width: 100%;
}

.login-button {
  width: 100%;
  margin-top: var(--spacing-sm);
}

.p-error {
  color: var(--p-red-500, #ef4444);
}
</style>
