# CLAUDE.md - Instrucciones para Claude Code

## Rol
Eres un Senior Software Engineer trabajando en este proyecto. Aplica buenas prácticas, escribe código limpio y mantenible. No te embales: espera confirmación antes de hacer cambios grandes.

## Proyecto
Frontend del CRM para gestión de productos, clientes y pedidos de una vendedora de joyería.
Stack: Vue 3 + Vite + TypeScript + PrimeVue + Pinia.

## Estructura del proyecto
```
src/
├── views/             # Vistas (páginas)
│   ├── DashboardView.vue
│   ├── SuppliersView.vue
│   ├── SupplierFormView.vue
│   ├── ProductsView.vue
│   ├── ProductFormView.vue
│   ├── CustomersView.vue
│   ├── CustomerFormView.vue
│   ├── OrdersView.vue
│   ├── OrderFormView.vue
│   └── OrderDetailView.vue
├── components/        # Componentes reutilizables
├── stores/            # Pinia stores
├── services/          # API y servicios
│   └── api.ts
├── types/             # Tipos TypeScript
│   └── index.ts
├── router/            # Vue Router
│   └── index.ts
├── App.vue
└── main.ts
```

## Reglas de código

### Estructura
- Vistas en `src/views/` (una por ruta)
- Componentes reutilizables en `src/components/`
- Lógica de estado en `src/stores/`
- Llamadas API en `src/services/api.ts`
- Tipos en `src/types/index.ts`

### No duplicar
- Si algo se usa en 2+ lugares, extraer a componente
- Lógica compartida → composables o stores
- Tipos: definir UNA vez en `types/index.ts`

### No hardcodear
- URL del API → variable de entorno VITE_API_URL
- Textos repetidos → constantes
- Colores/estilos → usar PrimeVue theming

### Convenciones
- Composition API con `<script setup lang="ts">`
- Un componente = una responsabilidad
- Props tipadas con `defineProps<{...}>()`
- Emits tipados con `defineEmits<{...}>()`
- Nombres descriptivos (evitar "data", "info", "item")
- PascalCase para componentes
- camelCase para variables y funciones

### Antes de crear código
1. Verifica si ya existe algo similar
2. Lee los archivos relacionados primero
3. Propón el enfoque antes de implementar cambios grandes
4. Revisa los tipos del backend en `agua-dulce-api`

## Vistas (10 total)
- **Dashboard**: Estadísticas y accesos rápidos
- **Suppliers**: Lista + Formulario (crear/editar)
- **Products**: Lista con filtros + Formulario
- **Customers**: Lista + Formulario
- **Orders**: Lista con filtros + Nuevo pedido + Detalle

## Modelo de datos
5 entidades principales (tipos en `src/types/index.ts`):
- **Supplier**: Proveedores de productos
- **Product**: Catálogo con 3 niveles de precio
- **Customer**: Clientes identificados por teléfono
- **Order**: Pedidos con número automático
- **OrderItem**: Líneas de pedido

Estados de pedido: PENDING → PAID → SHIPPED → DELIVERED | CANCELLED

## Comandos útiles
```bash
npm run dev            # Desarrollo (HMR)
npm run build          # Build producción
npm run preview        # Preview del build
```

## Variables de entorno
```env
VITE_API_URL=http://localhost:3000
```

## PrimeVue
- Tema: Aura
- Importar componentes según se necesiten
- Documentación: https://primevue.org/

## Documentación
- Especificación completa en el repo padre: `agua-dulce-v2-spec.md`
- Backend: `agua-dulce-api/`
