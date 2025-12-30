<script setup lang="ts">
import { ref } from 'vue'
import { useImagePreview } from '@/composables/useImagePreview'

const props = withDefaults(
  defineProps<{
    src: string | null | undefined
    size?: number
    previewSize?: number
  }>(),
  {
    size: 40,
    previewSize: 200,
  }
)

const imageError = ref(false)

function handleImageError() {
  imageError.value = true
}

const { previewImage, previewStyle, showPreview, updatePreviewPosition, hidePreview } =
  useImagePreview(props.previewSize)
</script>

<template>
  <img
    v-if="src && !imageError"
    :src="src"
    alt=""
    class="thumbnail"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @mouseenter="showPreview($event, src)"
    @mousemove="updatePreviewPosition"
    @mouseleave="hidePreview"
    @error="handleImageError"
  />
  <span v-else class="pi pi-image placeholder-icon" :style="{ fontSize: `${Math.max(size * 0.5, 16)}px` }"></span>

  <Teleport to="body">
    <div
      v-if="previewImage"
      class="image-preview-popup"
      :style="previewStyle"
    >
      <img
        :src="previewImage"
        alt=""
        :style="{ width: `${previewSize}px`, height: `${previewSize}px` }"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.thumbnail {
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.thumbnail:hover {
  transform: scale(1.1);
}

.placeholder-icon {
  font-size: 1.25rem;
  color: var(--p-text-muted-color);
}
</style>

<style>
.image-preview-popup {
  position: fixed;
  z-index: 9999;
  padding: 6px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.image-preview-popup img {
  display: block;
  object-fit: cover;
  border-radius: 6px;
}
</style>
