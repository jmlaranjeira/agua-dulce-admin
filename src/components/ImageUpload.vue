<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import ImageKit from 'imagekit-javascript'
import { api } from '@/services/api'

const props = withDefaults(
  defineProps<{
    modelValue: string
    folder?: string
  }>(),
  {
    folder: 'products',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const toast = useToast()
const uploading = ref(false)
const progress = ref(0)
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const hasImage = computed(() => !!props.modelValue)

const imagekit = new ImageKit({
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
})

function openFileDialog() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    uploadFile(file)
  }
  input.value = ''
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    uploadFile(file)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

async function uploadFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Solo se permiten archivos de imagen',
      life: 3000,
    })
    return
  }

  uploading.value = true
  progress.value = 0

  try {
    const auth = await api.upload.getAuth()

    const result = await imagekit.upload({
      file: file,
      fileName: file.name,
      folder: props.folder,
      token: auth.token,
      signature: auth.signature,
      expire: auth.expire,
    })

    emit('update:modelValue', result.url)
    toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Imagen subida correctamente',
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al subir imagen',
      life: 3000,
    })
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

function removeImage() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="image-upload">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileSelect"
    />

    <!-- Upload zone when no image -->
    <div
      v-if="!hasImage && !uploading"
      class="drop-zone"
      :class="{ 'drag-over': isDragOver }"
      @click="openFileDialog"
      @drop.prevent="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <i class="pi pi-cloud-upload"></i>
      <span>Arrastra o haz clic para subir</span>
    </div>

    <!-- Uploading state -->
    <div v-else-if="uploading" class="uploading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Subiendo imagen...</span>
      <ProgressBar :value="progress" :showValue="false" class="progress-bar" />
    </div>

    <!-- Image preview when there's an image -->
    <div v-else class="preview-container">
      <img :src="modelValue" alt="Preview" class="preview-image" />
      <Button
        icon="pi pi-times"
        severity="danger"
        rounded
        text
        class="remove-button"
        @click="removeImage"
        aria-label="Eliminar imagen"
      />
    </div>
  </div>
</template>

<style scoped>
.image-upload {
  width: 100%;
}

.hidden-input {
  display: none;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: 2rem;
  border: 2px dashed var(--p-surface-300);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--p-text-muted-color);
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--p-primary-color);
  background-color: var(--p-primary-50);
}

.drop-zone i {
  font-size: 2rem;
}

.uploading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 2rem;
  border: 2px dashed var(--p-surface-300);
  border-radius: 8px;
  color: var(--p-text-muted-color);
}

.uploading-state i {
  font-size: 2rem;
  color: var(--p-primary-color);
}

.progress-bar {
  width: 100%;
  max-width: 200px;
}

.preview-container {
  position: relative;
  display: inline-block;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
}

.remove-button {
  position: absolute;
  top: -8px;
  right: -8px;
}
</style>
