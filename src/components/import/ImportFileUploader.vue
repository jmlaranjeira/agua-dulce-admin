<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import ProgressSpinner from 'primevue/progressspinner'
import { api } from '@/services/api'
import { labels } from '@/locales/es'
import {
  mapInvoiceItemToProduct,
  mapEmailItemToProduct,
  mapExcelItemToProduct,
  mapMayoristaPlataItemToProduct,
} from '@/utils/importMappers'
import type { ProductToImport, InvoicePreviewResponse, PanbubuPreviewResponse, ExcelPreviewResponse, MayoristaPlataPreviewResponse } from '@/types'
import type { InvoiceInfo, EmailInfo, ExcelInfo } from '@/composables/useImportExecution'

type SourceType = 'invoice' | 'email' | 'excel' | 'mayorista-plata'

interface Props {
  sourceType: SourceType
  supplierOptions: Array<{ label: string; value: string }>
  categoryOptions: Array<{ label: string; value: string }>
  getSupplierPrefix: (id: string | null) => string
}

const props = defineProps<Props>()

const selectedSupplier = defineModel<string | null>('selectedSupplier')
const selectedCategory = defineModel<string | null>('selectedCategory')

const emit = defineEmits<{
  parsed: [data: {
    products: ProductToImport[]
    invoiceInfo?: InvoiceInfo
    emailInfo?: EmailInfo
    excelInfo?: ExcelInfo
    file: File
    suggestedSupplierId?: string
  }]
}>()

const toast = useToast()
const parsing = ref(false)

const config = computed(() => {
  switch (props.sourceType) {
    case 'invoice':
      return {
        accept: '.pdf',
        maxSize: 5000000,
        chooseLabel: labels.import.uploadInvoice,
        hint: labels.import.invoiceEurOnly,
        parsingLabel: labels.import.parsingInvoice,
        supplierRequired: false,
      }
    case 'email':
      return {
        accept: '.eml',
        maxSize: 5000000,
        chooseLabel: labels.import.uploadEmail,
        hint: labels.import.emailHint,
        parsingLabel: labels.import.parsingEmail,
        supplierRequired: false,
      }
    case 'excel':
      return {
        accept: '.xlsx,.xls',
        maxSize: 10000000,
        chooseLabel: 'Subir archivo Excel',
        hint: 'Formatos aceptados: .xlsx, .xls (máx. 10MB)',
        parsingLabel: 'Procesando Excel...',
        supplierRequired: true,
      }
    case 'mayorista-plata':
      return {
        accept: '.pdf',
        maxSize: 5000000,
        chooseLabel: 'Subir factura Mayorista Plata',
        hint: 'Factura PDF de Mayorista Plata (máx. 5MB)',
        parsingLabel: 'Procesando factura...',
        supplierRequired: false,
      }
  }
})

async function onFileSelect(event: { files: File[] }) {
  const file = event.files[0]
  if (!file) return

  if (props.sourceType === 'excel' && !selectedSupplier.value) {
    toast.add({
      severity: 'warn',
      summary: 'Atención',
      detail: 'Selecciona un proveedor antes de subir el archivo Excel',
      life: 5000,
    })
    return
  }

  parsing.value = true
  try {
    if (props.sourceType === 'invoice') {
      const response: InvoicePreviewResponse = await api.import.parseInvoice(file)

      const invoiceInfo: InvoiceInfo = {
        number: response.invoiceNumber,
        date: response.invoiceDate,
        exists: response.invoiceExists,
        existingId: response.existingInvoiceId,
        subtotal: response.subtotal,
        shippingCost: response.shippingCost,
      }

      if (response.invoiceExists) {
        toast.add({
          severity: 'warn',
          summary: labels.import.invoiceExists,
          detail: labels.import.invoiceExistsDetail.replace('{number}', response.invoiceNumber || ''),
          life: 8000,
        })
      }

      const summary = labels.import.invoiceSummary
        .replace('{total}', String(response.summary.total))
        .replace('{found}', String(response.summary.found))
        .replace('{existing}', String(response.summary.existing))

      toast.add({
        severity: 'info',
        summary: 'Factura procesada',
        detail: summary,
        life: 5000,
      })

      emit('parsed', {
        products: response.items.map(mapInvoiceItemToProduct),
        invoiceInfo,
        file,
        suggestedSupplierId: response.suggestedSupplierId,
      })
    } else if (props.sourceType === 'email') {
      const response: PanbubuPreviewResponse = await api.import.parseEmail(file)

      const emailInfo: EmailInfo = {
        orderNumber: response.orderNumber,
        orderDate: response.orderDate,
        orderExists: response.orderExists,
        existingOrderId: response.existingOrderId,
        trackingNumber: response.trackingNumber,
        carrier: response.carrier,
        subtotal: response.subtotal,
        shippingCost: response.shippingCost,
        chargeFee: response.chargeFee,
        total: response.total,
      }

      if (response.orderExists) {
        toast.add({
          severity: 'warn',
          summary: labels.import.orderExists,
          detail: labels.import.orderExistsDetail.replace('{number}', response.orderNumber || ''),
          life: 8000,
        })
      }

      const summary = labels.import.emailSummary
        .replace('{total}', String(response.summary.total))
        .replace('{existing}', String(response.summary.existing))

      toast.add({
        severity: 'info',
        summary: 'Email procesado',
        detail: summary,
        life: 5000,
      })

      emit('parsed', {
        products: response.items.map(mapEmailItemToProduct),
        emailInfo,
        file,
        suggestedSupplierId: response.suggestedSupplierId,
      })
    } else if (props.sourceType === 'excel') {
      const prefix = props.getSupplierPrefix(selectedSupplier.value ?? null)
      const response: ExcelPreviewResponse = await api.import.parseExcel(file, prefix)

      const excelInfo: ExcelInfo = {
        shippingCost: response.shippingCost,
        totalAmount: response.totalAmount,
      }

      const summary = `${response.summary.total} productos encontrados, ${response.summary.existing} ya existen`

      toast.add({
        severity: 'info',
        summary: 'Excel procesado',
        detail: summary,
        life: 5000,
      })

      emit('parsed', {
        products: response.items.map(mapExcelItemToProduct),
        excelInfo,
        file,
      })
    } else if (props.sourceType === 'mayorista-plata') {
      const response: MayoristaPlataPreviewResponse = await api.import.parseMayoristaPlata(file)

      const invoiceInfo: InvoiceInfo = {
        number: response.invoiceNumber,
        date: response.invoiceDate,
        exists: response.invoiceExists,
        existingId: response.existingInvoiceId,
        subtotal: response.subtotal,
        shippingCost: response.shippingCost,
      }

      if (response.invoiceExists) {
        toast.add({
          severity: 'warn',
          summary: labels.import.invoiceExists,
          detail: labels.import.invoiceExistsDetail.replace('{number}', response.invoiceNumber || ''),
          life: 8000,
        })
      }

      const summary = `${response.summary.total} productos encontrados, ${response.summary.existing} ya existen`

      toast.add({
        severity: 'info',
        summary: 'Factura procesada',
        detail: summary,
        life: 5000,
      })

      emit('parsed', {
        products: response.items.map(mapMayoristaPlataItemToProduct),
        invoiceInfo,
        file,
        suggestedSupplierId: response.suggestedSupplierId,
      })
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err instanceof Error ? err.message : labels.messages.errorGeneric,
      life: 5000,
    })
  } finally {
    parsing.value = false
  }
}
</script>

<template>
  <div class="file-upload-section">
    <!-- Supplier selection -->
    <div class="form-field">
      <label>
        {{ labels.import.targetSupplier }}
        <span v-if="config.supplierRequired" class="required">*</span>
      </label>
      <Select
        v-model="selectedSupplier"
        :options="supplierOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="labels.products.noSupplier"
        :showClear="!config.supplierRequired"
        class="w-full"
      />
      <small v-if="sourceType === 'excel'" class="field-hint">
        El prefijo del código se genera a partir del nombre del proveedor
      </small>
    </div>

    <!-- Category selection (only for Excel) -->
    <div v-if="sourceType === 'excel'" class="form-field">
      <label>{{ labels.import.defaultCategory }}</label>
      <Select
        v-model="selectedCategory"
        :options="categoryOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="labels.products.noCategory"
        showClear
        class="w-full"
      />
    </div>

    <!-- Loading state -->
    <div v-if="parsing" class="loading-container">
      <ProgressSpinner />
      <p>{{ config.parsingLabel }}</p>
    </div>

    <!-- File upload -->
    <div v-else class="file-upload">
      <FileUpload
        mode="basic"
        :accept="config.accept"
        :maxFileSize="config.maxSize"
        :auto="true"
        :chooseLabel="config.chooseLabel"
        :disabled="config.supplierRequired && !selectedSupplier"
        @select="onFileSelect"
      />
      <p class="upload-hint">{{ config.hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.file-upload-section {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
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

.required {
  color: var(--p-red-500, #ef4444);
}

.field-hint {
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-md);
}

.file-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  border: 2px dashed var(--color-border);
  border-radius: var(--border-radius);
  background: var(--p-surface-50, #fafafa);
}

.upload-hint {
  color: var(--color-text-muted);
  font-size: 0.9em;
  margin: 0;
}
</style>
