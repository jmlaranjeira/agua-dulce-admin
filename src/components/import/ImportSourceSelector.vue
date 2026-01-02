<script setup lang="ts">
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import { labels } from '@/locales/es'
import type { ImportSource } from '@/types'

interface Props {
  sources: ImportSource[]
  loading?: boolean
}

defineProps<Props>()

const selectedSource = defineModel<ImportSource | null>({ required: true })

function getSourceIcon(sourceId: string): string {
  const iconMap: Record<string, string> = {
    'rainbow-silver': 'pi pi-globe',
    'rainbow-invoice': 'pi pi-file-pdf',
    'panbubu-email': 'pi pi-envelope',
    'excel-supplier': 'pi pi-file-excel',
  }
  return iconMap[sourceId] || 'pi pi-file'
}

function selectSource(source: ImportSource) {
  if (source.id === 'csv') return // Disabled
  selectedSource.value = source
}
</script>

<template>
  <div class="step-panel">
    <p class="step-description">{{ labels.import.selectSource }}</p>

    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
    </div>

    <div v-else class="sources-grid">
      <div
        v-for="source in sources"
        :key="source.id"
        class="source-card"
        :class="{
          selected: selectedSource?.id === source.id,
          disabled: source.id === 'csv',
        }"
        @click="selectSource(source)"
      >
        <div class="source-icon">
          <i :class="getSourceIcon(source.id)" />
        </div>
        <h3 class="source-name">{{ source.name }}</h3>
        <div v-if="source.productTypes?.length" class="source-types">
          <Tag
            v-for="type in source.productTypes.slice(0, 4)"
            :key="type"
            :value="type"
            severity="secondary"
          />
          <Tag
            v-if="source.productTypes.length > 4"
            :value="`+${source.productTypes.length - 4}`"
            severity="secondary"
          />
        </div>
        <span v-if="source.id === 'csv'" class="coming-soon">
          {{ labels.import.comingSoon }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-panel {
  padding: var(--spacing-md) 0;
}

.step-description {
  text-align: center;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xl);
  font-size: 1.1em;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-md);
}

.sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  max-width: 600px;
  margin: 0 auto;
}

.source-card {
  border: 2px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-background);
}

.source-card:hover:not(.disabled) {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.source-card.selected {
  border-color: var(--color-primary);
  background: var(--p-primary-50, #eff6ff);
}

.source-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.source-icon {
  font-size: 2.5rem;
  color: var(--color-primary);
  margin-bottom: var(--spacing-md);
}

.source-name {
  margin: 0 0 var(--spacing-sm);
  font-size: 1.25rem;
}

.source-types {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  justify-content: center;
}

.coming-soon {
  display: block;
  margin-top: var(--spacing-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

@media (max-width: 768px) {
  .sources-grid {
    grid-template-columns: 1fr;
  }
}
</style>
