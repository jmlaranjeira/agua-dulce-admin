<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner'
import { labels } from '@/locales/es'
import type { ImportSource } from '@/types'

interface Props {
  sources: ImportSource[]
  loading?: boolean
}

defineProps<Props>()

const selectedSource = defineModel<ImportSource | null>({ required: true })

// Color mapping per source
const sourceColors: Record<string, string> = {
  'rainbow-silver': 'blue',
  'rainbow-invoice': 'rose',
  'panbubu-email': 'amber',
  'excel-supplier': 'emerald',
  'mayorista-plata': 'purple',
}

// Icon mapping per source
const sourceIcons: Record<string, string> = {
  'rainbow-silver': 'pi pi-globe',
  'rainbow-invoice': 'pi pi-file-pdf',
  'panbubu-email': 'pi pi-envelope',
  'excel-supplier': 'pi pi-file-excel',
  'mayorista-plata': 'pi pi-file-pdf',
}

function getSourceColor(sourceId: string): string {
  return sourceColors[sourceId] || 'gray'
}

function getSourceIcon(sourceId: string): string {
  return sourceIcons[sourceId] || 'pi pi-file'
}

function getSourceName(sourceId: string): string {
  return labels.import.sources[sourceId]?.name || sourceId
}

function getSourceDescription(sourceId: string): string {
  return labels.import.sources[sourceId]?.description || ''
}

function selectSource(source: ImportSource) {
  if (source.id === 'csv') return // Disabled
  selectedSource.value = source
}
</script>

<template>
  <div class="source-selector">
    <!-- Header -->
    <div class="selector-header">
      <h2 class="selector-title">{{ labels.import.sourceQuestion }}</h2>
      <p class="selector-subtitle">{{ labels.import.sourceSubtitle }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
    </div>

    <!-- Grid de sources -->
    <div v-else class="sources-grid">
      <button
        v-for="source in sources"
        :key="source.id"
        type="button"
        class="source-card"
        :class="[
          `source-card--${getSourceColor(source.id)}`,
          {
            'source-card--selected': selectedSource?.id === source.id,
            'source-card--disabled': source.id === 'csv'
          }
        ]"
        :disabled="source.id === 'csv'"
        @click="selectSource(source)"
      >
        <!-- Check badge -->
        <div v-if="selectedSource?.id === source.id" class="source-check">
          <i class="pi pi-check" />
        </div>

        <!-- Icon container -->
        <div class="source-icon-container">
          <i :class="getSourceIcon(source.id)" />
        </div>

        <!-- Content -->
        <h3 class="source-name">{{ getSourceName(source.id) }}</h3>
        <p class="source-description">{{ getSourceDescription(source.id) }}</p>

        <!-- Tags -->
        <div v-if="source.productTypes?.length" class="source-tags">
          <span
            v-for="type in source.productTypes.slice(0, 3)"
            :key="type"
            class="source-tag"
          >
            {{ type }}
          </span>
          <span v-if="source.productTypes.length > 3" class="source-tag">
            +{{ source.productTypes.length - 3 }}
          </span>
        </div>

        <!-- Coming soon badge -->
        <span v-if="source.id === 'csv'" class="coming-soon">
          {{ labels.import.comingSoon }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.source-selector {
  padding: var(--spacing-md) 0;
}

.selector-header {
  text-align: center;
  margin-bottom: 2rem;
}

.selector-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 0.5rem 0;
}

.selector-subtitle {
  font-size: 1rem;
  color: var(--p-text-muted-color);
  margin: 0;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-width: 900px;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .sources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .sources-grid {
    grid-template-columns: 1fr;
  }
}

/* Base card */
.source-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem 1rem;
  border: 2px solid var(--p-surface-200);
  border-radius: 12px;
  background: var(--p-surface-0);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.source-card:hover:not(.source-card--disabled) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.source-card:focus {
  outline: none;
}

.source-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(var(--source-color), 0.3);
}

.source-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Color schemes */
.source-card--blue { --source-color: 59, 130, 246; }
.source-card--rose { --source-color: 244, 63, 94; }
.source-card--amber { --source-color: 245, 158, 11; }
.source-card--emerald { --source-color: 16, 185, 129; }
.source-card--purple { --source-color: 139, 92, 246; }
.source-card--gray { --source-color: 107, 114, 128; }

/* Hover state */
.source-card:hover:not(.source-card--disabled):not(.source-card--selected) {
  border-color: rgb(var(--source-color));
}

/* Selected state */
.source-card--selected {
  background: rgba(var(--source-color), 0.05);
  border-color: rgb(var(--source-color));
}

/* Check badge */
.source-check {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--source-color), 0.15);
  color: rgb(var(--source-color));
  font-size: 0.75rem;
  animation: checkPop 0.2s ease;
}

@keyframes checkPop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Icon container */
.source-icon-container {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  background: var(--p-surface-100);
  color: var(--p-text-muted-color);
  font-size: 1.5rem;
  transition: all 0.2s ease;
}

.source-card:hover:not(.source-card--disabled) .source-icon-container {
  background: rgba(var(--source-color), 0.1);
  color: rgb(var(--source-color));
}

.source-card--selected .source-icon-container {
  background: rgba(var(--source-color), 0.15);
  color: rgb(var(--source-color));
}

/* Content */
.source-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 0.25rem 0;
}

.source-description {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin: 0;
  line-height: 1.4;
}

/* Tags */
.source-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  justify-content: center;
  margin-top: 0.75rem;
}

.source-tag {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: var(--p-surface-100);
  color: var(--p-text-muted-color);
  transition: all 0.2s ease;
}

.source-card--selected .source-tag {
  background: rgba(var(--source-color), 0.1);
  color: rgb(var(--source-color));
}

/* Coming soon */
.coming-soon {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--p-text-muted-color);
}
</style>
