# Agents.md - Web App (Marketplace)

## Descripción del Proyecto

Aplicación web del marketplace **Naya** donde los usuarios pueden explorar, comprar y vender ropa y productos de segunda mano. Construida con Astro para optimización de rendimiento y SEO, con componentes interactivos en Vue.

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Astro | 5.x | Framework web (SSG/SSR) |
| Vue.js | 3.5+ | Componentes interactivos |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 3.x | Estilos utilitarios |
| Firebase | 11.x | Backend (Auth, Firestore, Storage) |
| VueFire | 3.x | Integración Vue-Firebase |
| Cloudflare | - | Deploy (Cloudflare Pages) |

## Arquitectura: Clean Architecture

El proyecto sigue principios de **Clean Architecture** con las siguientes capas:

```
src/
├── domain/              # Capa de Dominio (Entidades y Contratos)
│   ├── entities/        # Entidades del negocio
│   ├── repositories/    # Interfaces de repositorios
│   └── constants/       # Constantes del dominio
│
├── application/         # Capa de Aplicación (Casos de Uso)
│   ├── use-cases/       # Casos de uso del negocio
│   └── stores/          # Estados de la aplicación
│
├── infrastructure/      # Capa de Infraestructura (Implementaciones)
│   ├── repositories/    # Implementaciones de repositorios (Firestore)
│   ├── mappers/         # Mappers entre datos y entidades
│   └── services/        # Servicios externos
│
├── presentation/        # Capa de Presentación (UI)
│   ├── components/      # Componentes Vue
│   └── utils/           # Utilidades de presentación
│
├── pages/               # Páginas de Astro (Rutas)
└── lib/                 # Configuraciones compartidas (Firebase)
```

## Estructura Detallada

### Domain (Dominio)

```typescript
// domain/entities/Product.ts
export interface Product {
  id: string
  name: string
  description: string
  price: number
  images: string[]
  categoryId: string
  sellerId: string
  status: 'active' | 'sold' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

// domain/repositories/ProductRepository.ts
export interface ProductRepository {
  getById(id: string): Promise<Product | null>
  getBySeller(sellerId: string): Promise<Product[]>
  getByCategory(categoryId: string): Promise<Product[]>
  create(product: Omit<Product, 'id'>): Promise<string>
  update(id: string, data: Partial<Product>): Promise<void>
  delete(id: string): Promise<void>
}
```

### Application (Casos de Uso)

```typescript
// application/use-cases/GetProductById.ts
import type { Product } from '@/domain/entities/Product'
import type { ProductRepository } from '@/domain/repositories/ProductRepository'

export class GetProductById {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product | null> {
    return this.productRepository.getById(id)
  }
}
```

### Infrastructure (Implementaciones)

```typescript
// infrastructure/repositories/FirestoreProductRepository.ts
import { db } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import type { ProductRepository } from '@/domain/repositories/ProductRepository'
import { ProductMapper } from '../mappers/ProductMapper'

export class FirestoreProductRepository implements ProductRepository {
  private collection = collection(db, 'products')

  async getById(id: string): Promise<Product | null> {
    const docSnap = await getDoc(doc(this.collection, id))
    if (!docSnap.exists()) return null
    return ProductMapper.toDomain(docSnap)
  }

  // ... más métodos
}
```

### Presentation (Componentes Vue)

```vue
<!-- presentation/components/ProductCard.vue -->
<script setup lang="ts">
import type { Product } from '@/domain/entities/Product'
import { formatPrice } from '../utils/formatters'

defineProps<{
  product: Product
}>()
</script>

<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <img :src="product.images[0]" :alt="product.name" class="w-full h-48 object-cover" />
    <div class="p-4">
      <h3 class="font-semibold text-lg">{{ product.name }}</h3>
      <p class="text-green-600 font-bold">{{ formatPrice(product.price) }}</p>
    </div>
  </div>
</template>
```

### Pages (Astro)

```astro
---
// pages/products/[id].astro
import Layout from '@/layouts/Layout.astro'
import ProductDetailView from '@/presentation/components/ProductDetailView.vue'

const { id } = Astro.params
---

<Layout title="Detalle del Producto">
  <ProductDetailView client:load productId={id} />
</Layout>
```

## Patrones y Convenciones

### Reglas de UI
- **NUNCA usar emojis en la interfaz de usuario** - Usar iconos SVG o texto en su lugar
- Usar Tailwind CSS para estilos
- Preferir indicadores visuales claros (colores, badges, iconos) sobre emojis
- Mantener un diseño limpio y profesional

### Componentes Astro vs Vue

- **Astro (`.astro`)**: Páginas y layouts estáticos
- **Vue (`.vue`)**: Componentes interactivos que requieren JavaScript del lado del cliente

### Directivas de Cliente en Astro

```astro
<!-- Carga el componente cuando la página está idle -->
<ProductCard client:idle :product={product} />

<!-- Carga inmediatamente -->
<LoginForm client:load />

<!-- Carga cuando es visible -->
<ProductList client:visible />

<!-- Solo servidor (sin JS en cliente) -->
<StaticContent />
```

### Stores (Estado de la Aplicación)

```typescript
// application/stores/cartStore.ts
import { atom, map } from 'nanostores'
import type { Product } from '@/domain/entities/Product'

export const cartItems = map<Record<string, { product: Product; quantity: number }>>({})

export const cartTotal = computed(cartItems, items => {
  return Object.values(items).reduce((total, item) => {
    return total + item.product.price * item.quantity
  }, 0)
})

export function addToCart(product: Product) {
  const current = cartItems.get()[product.id]
  cartItems.setKey(product.id, {
    product,
    quantity: (current?.quantity || 0) + 1
  })
}
```

### Estilos con Tailwind

```vue
<template>
  <!-- Usa clases de Tailwind para estilos -->
  <button 
    class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    @click="handleClick"
  >
    Comprar
  </button>
</template>
```

## Instrucciones para el Agente

### Al crear páginas:
1. Crea el archivo `.astro` en `src/pages/`
2. Usa layouts existentes de `src/layouts/`
3. Para rutas dinámicas usa `[param].astro`
4. Importa componentes Vue con la directiva `client:*` apropiada

### Al crear componentes Vue:
1. Ubícalos en `src/presentation/components/`
2. Usa TypeScript con `<script setup lang="ts">`
3. Importa tipos desde `@/domain/entities/`
4. Usa Tailwind CSS para estilos

### Al trabajar con datos:
1. Crea/usa entidades en `src/domain/entities/`
2. Define interfaces de repositorio en `src/domain/repositories/`
3. Implementa en `src/infrastructure/repositories/`
4. Crea casos de uso en `src/application/use-cases/`
5. Usa mappers para transformar datos de Firestore a entidades

### Al trabajar con Firebase:
1. La configuración está en `src/lib/firebase.ts`
2. Usa los repositorios de infraestructura, no accedas directamente
3. Los mappers convierten DocumentSnapshot a entidades del dominio

### Al modificar estilos:
1. Prefiere clases de Tailwind CSS
2. Estilos globales en `src/styles/global.css`
3. Para componentes complejos, usa `@apply` en estilos scoped

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Build
npm run build            # Compila para producción
npm run preview          # Preview de producción

# Astro CLI
npm run astro -- --help  # Comandos de Astro
```

## Rutas de la Aplicación

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `index.astro` | Página principal |
| `/login` | `login.astro` | Inicio de sesión |
| `/products/[id]` | `products/[id].astro` | Detalle de producto |
| `/categories/[slug]` | `categories/[slug].astro` | Productos por categoría |
| `/sellers/[id]` | `sellers/[id].astro` | Perfil de vendedor |
| `/profile` | `profile.astro` | Perfil del usuario |
| `/edit-profile` | `edit-profile.astro` | Editar perfil |
| `/sell` | `sell.astro` | Publicar producto |
| `/my-products` | `my-products.astro` | Mis productos |
| `/cart` | `cart.astro` | Carrito de compras |
| `/checkout` | `checkout.astro` | Checkout y pago |
| `/addresses` | `addresses.astro` | Gestionar direcciones de envio |

## Consideraciones de SEO

- Usa meta tags apropiados en cada página
- Las páginas estáticas se pre-renderizan para mejor SEO
- Usa `<Image>` de Astro para optimización automática de imágenes
- Implementa datos estructurados (JSON-LD) para productos

## Integración con Firebase

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  // Configuración desde variables de entorno
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
```

## Notas Importantes

- La app usa SSG (Static Site Generation) por defecto
- Los componentes Vue con `client:*` se hidratan en el cliente
- Firebase Auth se maneja desde el cliente (componentes Vue)
- Las imágenes se comprimen con `browser-image-compression` antes de subir
- El deploy está configurado para Cloudflare Pages
