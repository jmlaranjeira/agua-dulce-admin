<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'
import { labels } from '@/locales/es'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = ref<Record<string, string>>({})
const loading = ref(false)
const registrationDisabled = ref(false)

function validate(): boolean {
  errors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = labels.messages.required
  }

  if (!form.value.email.trim()) {
    errors.value.email = labels.messages.required
  }

  if (!form.value.password) {
    errors.value.password = labels.messages.required
  }

  if (!form.value.confirmPassword) {
    errors.value.confirmPassword = labels.messages.required
  } else if (form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = labels.auth.passwordMismatch
  }

  return Object.keys(errors.value).length === 0
}

async function register() {
  if (!validate()) return

  loading.value = true
  try {
    await authStore.register({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
    })

    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: labels.auth.userCreated,
      life: 3000,
    })

    router.push('/login')
  } catch (err) {
    const message = err instanceof Error ? err.message : labels.messages.errorGeneric

    // Verificar si es error 403 (registro deshabilitado)
    if (message.includes('403') || message.toLowerCase().includes('disabled') || message.toLowerCase().includes('deshabilitado')) {
      registrationDisabled.value = true
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-view">
    <div class="register-container">
      <div class="register-header">
        <h1 class="register-title">{{ labels.app.name }}</h1>
        <p class="register-subtitle">{{ labels.auth.createFirstUser }}</p>
      </div>

      <Card v-if="!registrationDisabled">
        <template #content>
          <form @submit.prevent="register" class="form">
            <div class="form-field">
              <label for="name">{{ labels.auth.name }} *</label>
              <InputText
                id="name"
                v-model="form.name"
                :class="{ 'p-invalid': errors.name }"
                :disabled="loading"
                autocomplete="name"
              />
              <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
            </div>

            <div class="form-field">
              <label for="email">{{ labels.auth.email }} *</label>
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
              <label for="password">{{ labels.auth.password }} *</label>
              <Password
                id="password"
                v-model="form.password"
                :class="{ 'p-invalid': errors.password }"
                :disabled="loading"
                :feedback="false"
                toggleMask
                fluid
                autocomplete="new-password"
              />
              <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
            </div>

            <div class="form-field">
              <label for="confirmPassword">{{ labels.auth.confirmPassword }} *</label>
              <Password
                id="confirmPassword"
                v-model="form.confirmPassword"
                :class="{ 'p-invalid': errors.confirmPassword }"
                :disabled="loading"
                :feedback="false"
                toggleMask
                fluid
                autocomplete="new-password"
              />
              <small v-if="errors.confirmPassword" class="p-error">{{ errors.confirmPassword }}</small>
            </div>

            <Button
              type="submit"
              :label="labels.auth.register"
              :loading="loading"
              class="register-button"
            />
          </form>
        </template>
      </Card>

      <Card v-else>
        <template #content>
          <div class="disabled-message">
            <i class="pi pi-info-circle" style="font-size: 2rem; color: var(--p-primary-color)"></i>
            <p>{{ labels.auth.registrationDisabled }}</p>
            <RouterLink to="/login" class="login-link">
              {{ labels.auth.goToLogin }}
            </RouterLink>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.register-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: var(--p-surface-50);
}

.register-container {
  width: 100%;
  max-width: 400px;
}

.register-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.register-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--p-primary-color);
  margin: 0;
}

.register-subtitle {
  color: var(--color-text-secondary);
  margin-top: var(--spacing-sm);
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

.register-button {
  width: 100%;
  margin-top: var(--spacing-sm);
}

.p-error {
  color: var(--p-red-500, #ef4444);
}

.disabled-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
  padding: var(--spacing-lg);
}

.disabled-message p {
  color: var(--color-text-secondary);
  margin: 0;
}

.login-link {
  color: var(--p-primary-color);
  text-decoration: none;
  font-weight: 500;
}

.login-link:hover {
  text-decoration: underline;
}
</style>
