import { ref } from 'vue'

export function useImagePreview(previewSize = 200) {
  const previewImage = ref<string | null>(null)
  const previewStyle = ref({ top: '0px', left: '0px' })

  function showPreview(event: MouseEvent, imageUrl: string) {
    previewImage.value = imageUrl
    updatePreviewPosition(event)
  }

  function updatePreviewPosition(event: MouseEvent) {
    const offset = 15
    const size = previewSize + 12 // padding
    let left = event.clientX + offset
    let top = event.clientY - size / 2

    if (left + size > window.innerWidth) {
      left = event.clientX - size - offset
    }
    if (top < 10) top = 10
    if (top + size > window.innerHeight - 10) {
      top = window.innerHeight - size - 10
    }

    previewStyle.value = { top: `${top}px`, left: `${left}px` }
  }

  function hidePreview() {
    previewImage.value = null
  }

  return {
    previewImage,
    previewStyle,
    showPreview,
    updatePreviewPosition,
    hidePreview,
  }
}
