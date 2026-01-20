# Plan de Implementación - Menú de Vender

## 📋 Resumen del Proyecto

Implementar un formulario completo para que los usuarios puedan agregar sus productos y enviarlos a un sistema externo de revisión, mostrando el estado de dicha revisión.

## 🎯 Requisitos del Usuario

### Campos del Formulario
- **Imágenes del producto** (con compresión automática)
- **Nombre** (title)
- **Categoría** (category)
- **Subcategoría** (subcategory)
- **Talla** (size)
- **Condición** (condition)
- **Descripción** (description)
- **Marca** (brand)
- **Precio** (price)
- **Precio original** (originalPrice)

### Proceso de Revisión
- Enviar producto a sistema externo para revisión
- Mostrar estado de revisión en la aplicación
- Estados: `pending` | `approved` | `rejected`

### Gestión de Imágenes
- Compresión automática de imágenes
- Subida a Firebase Storage

## 🏗️ Arquitectura Actual

### Tecnología
- **Astro + Vue 3 + TypeScript**
- **Firebase** (Firestore, Auth, Storage)
- **Tailwind CSS** para estilos
- **Arquitectura Limpia** (Domain, Infrastructure, Application, Presentation)

### Estructura de Carpetas
```
src/
├── domain/                 # Lógica de negocio
│   ├── entities/          # Entidades (User, Product, Category)
│   ├── repositories/      # Interfaces de repositorios
│   └── constants/         # Constantes (colecciones Firestore)
├── infrastructure/         # Implementación concreta
│   ├── repositories/      # Repositorios Firestore
│   └── mappers/          # Mapeos de datos
├── application/           # Casos de uso y lógica de aplicación
│   ├── use-cases/        # Casos de uso específicos
│   └── stores/           # Estado global (Vue 3 Composition API)
├── presentation/          # Capa de presentación
│   ├── components/       # Componentes Vue
│   └── utils/           # Utilidades de UI
└── pages/                # Páginas Astro (enrutamiento)
```

## 📊 Análisis del Estado Actual

### ✅ Ya Disponible
- Página `/sell` con auth guard funcionando
- Entidad `Product` básica (necesita extensión)
- Repositorio `FirestoreProductRepository` completo
- Sistema de categorías funcional
- Autenticación con Firebase implementada
- Patrones de componentes Vue establecidos
- Stores con Vue 3 Composition API

### ⚠️ Necesita Implementación
- Formulario de producto completo
- Campos adicionales en la entidad Product
- Sistema de estados de revisión
- Componente de formulario Vue
- Integración con compresión de imágenes

## 🛠 Plan de Implementación Detallado

### FASE 1: Extender Entidad Product (Alta Prioridad)

#### Archivo: `src/domain/entities/Product.ts`

**Cambios necesarios:**
```typescript
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;           // NUEVO
  images: string[];
  category: string;
  subcategory?: string;             // NUEVO
  brand?: string;                   // NUEVO
  size?: string;                    // NUEVO
  condition?: ProductCondition;     // NUEVO
  sellerId: string;
  status: "available" | "sold" | "reserved";
  reviewStatus: ReviewStatus;       // NUEVO
  reviewSubmittedAt?: Date;         // NUEVO
  reviewReviewedAt?: Date;          // NUEVO
  reviewRejectionReason?: string;   // NUEVO
  createdAt: Date;
  updatedAt: Date;
}

// NUEVOS TIPOS
export type ProductCondition = "new" | "like_new" | "good" | "fair" | "poor";
export type ReviewStatus = "pending" | "approved" | "rejected";
```

### FASE 2: Actualizar ProductMapper (Alta Prioridad)

#### Archivo: `src/infrastructure/mappers/ProductMapper.ts`

**Cambios necesarios:**
- Agregar mapeo de nuevos campos en `toDomain()`
- Manejar valores opcionales con defaults apropiados
- Convertir timestamps de revisión a Dates

### FASE 3: Actualizar Repositorio (Alta Prioridad)

#### Archivo: `src/infrastructure/repositories/FirestoreProductRepository.ts`

**Cambios necesarios:**
- No requiere cambios funcionales (el mapper maneja los nuevos campos)
- Posible agregado de métodos para filtrar por reviewStatus

### FASE 4: Crear Servicio de Compresión de Imágenes (Media Prioridad)

#### Archivo: `src/infrastructure/services/ImageCompressionService.ts`

**Implementación:**
- Usar `browser-image-compression` library
- Configurar compresión: máximo 1200px ancho, calidad 80%
- Soportar formatos: JPG, PNG, WebP
- Límite: 8 imágenes por producto, máximo 5MB cada una

### FASE 5: Crear Componente ImageUpload (Alta Prioridad)

#### Archivo: `src/presentation/components/ImageUpload.vue`

**Características:**
- Múltiple selección de archivos
- Previsualización de imágenes seleccionadas
- Compresión automática antes de subir
- Subida a Firebase Storage
- Indicadores de progreso
- Validación de formato y tamaño
- Opción de eliminar imágenes

### FASE 6: Crear Componente SellForm (Alta Prioridad)

#### Archivo: `src/presentation/components/SellForm.vue`

**Estructura Multi-Step:**

**Step 1: Información Básica**
- Título (required, min 3, max 100 caracteres)
- Descripción (required, min 10, max 1000 caracteres)
- Marca (optional, max 50 caracteres)

**Step 2: Categorización**
- Categoría (required, dropdown de categorías existentes)
- Subcategoría (optional, depende de categoría)
- Talla (optional, depende de categoría)

**Step 3: Precios**
- Precio actual (required, min 1, max 99999)
- Precio original (optional, debe ser >= precio actual)

**Step 4: Características**
- Condición (required: new | like_new | good | fair | poor)
- Imágenes (required, mínimo 1, máximo 8)

**Step 5: Vista Previa y Confirmación**
- Vista previa completa del producto
- Botón "Enviar a Revisión"

### FASE 7: Crear Caso de Uso (Media Prioridad)

#### Archivo: `src/application/use-cases/CreateProductUseCase.ts`

**Responsabilidades:**
- Validar datos del producto
- Procesar imágenes (compresión y subida)
- Crear producto en Firestore
- Enviar a sistema externo de revisión
- Manejar errores y rollback

### FASE 8: Crear ProductStore (Media Prioridad)

#### Archivo: `src/application/stores/productStore.ts`

**Estado:**
```typescript
interface ProductState {
  loading: boolean;
  error: string | null;
  currentProduct: Partial<Product> | null;
  uploadedImages: string[];
  currentStep: number;
  isSubmitting: boolean;
}
```

**Acciones:**
- `updateProduct(field: string, value: any)`
- `nextStep()` / `previousStep()`
- `uploadImages(files: File[])`
- `submitProduct()`
- `resetForm()`

### FASE 9: Crear Servicio de Revisión (Media Prioridad)

#### Archivo: `src/infrastructure/services/ReviewSystemService.ts`

**Implementación:**
- Enviar producto a sistema externo (API endpoint)
- Manejar respuestas de aprobación/rechazo
- Actualizar estado de revisión en Firestore
- Webhook o polling para sincronización

### FASE 10: Integrar en Página Sell (Alta Prioridad)

#### Archivo: `src/pages/sell.astro`

**Cambios:**
- Importar SellForm.vue
- Reemplazar placeholder
- Configurar props y estado
- Manejar redirección post-envío

### FASE 11: Actualizar My-Products (Media Prioridad)

#### Archivo: `src/pages/my-products.astro`

**Cambios:**
- Mostrar productos con diferentes estados de revisión
- Indicadores visuales para pending/approved/rejected
- Opciones para reenviar productos rechazados
- Mensajes informativos sobre el proceso de revisión

### FASE 12: Instalar Dependencia (Baja Prioridad)

#### Comando: `npm install browser-image-compression`

**Configuración:**
- Agregar a package.json
- Importar en ImageCompressionService
- Configurar TypeScript si es necesario

## 🎨 Diseño y UX

### Estilo del Formulario
- Diseño mobile-first (siguiendo patrones existentes)
- Colores de la marca Naya: `#D9D2C8`, `#FDFCFB`
- Bordes redondeados: `[2rem]` para elementos principales
- Tipografía: font-black para títulos, tracking-tight

### Flujo de Usuario
1. Usuario autenticado accede a `/sell`
2. Formulario multi-step con indicador de progreso
3. Autoguardado de borrador en localStorage
4. Vista previa en tiempo real
5. Envío a revisión con feedback inmediato
6. Redirección a `/my-products` con estado

### Validaciones
- Validación en tiempo real
- Mensajes de error claros y específicos
- Prevención de envío duplicado
- Manejo de errores de red

## 📋 Lista de Tareas Final

### 🔥 Alta Prioridad (Base del Sistema)
1. ✅ Extender entidad Product.ts
2. ✅ Actualizar ProductMapper.ts  
3. ✅ Modificar FirestoreProductRepository.ts
4. ✅ Crear ImageUpload.vue
5. ✅ Crear SellForm.vue
6. ✅ Actualizar sell.astro

### ⚡ Media Prioridad (Lógica y Servicios)
7. ✅ Crear CreateProductUseCase.ts
8. ✅ Crear productStore.ts
9. ✅ Crear ImageCompressionService.ts
10. ✅ Crear ReviewSystemService.ts
11. ✅ Actualizar my-products.astro
12. ✅ Probar flujo completo
13. ✅ Probar sistema de revisión

### 📦 Baja Prioridad (Dependencias)
14. ✅ Instalar browser-image-compression

## 🚀 Consideraciones Adicionales

### Testing
- Probar flujo completo con diferentes tipos de productos
- Testing de validaciones y manejo de errores
- Pruebas de carga de imágenes
- Testing de estados de revisión

### Performance
- Lazy loading de imágenes
- Optimización de bundle
- Compresión automática de imágenes
- Caching estratégico

### Seguridad
- Validación de tipos de archivo
- Límites de tamaño de archivo
- Sanitización de datos de entrada
- Prevención de XSS

### Accesibilidad
- Formulario navegable por teclado
- Etiquetas ARIA apropiadas
- Contraste de colores suficiente
- Feedback para screen readers

## 📈 Métricas de Éxito

### Métricas Funcionales
- Formulario funcional con todos los campos
- Sistema de revisión integrado
- Compresión de imágenes funcionando
- Estados de producto mostrados correctamente

### Métricas de UX
- Tiempo de carga del formulario < 2s
- Tasa de abandono del formulario < 30%
- Tasa de éxito en el envío > 90%
- Satisfacción del usuario (feedback cualitativo)

### Métricas Técnicas
- Bundle size optimizado
- Sin errores de TypeScript
- Cobertura de testing > 80%
- Performance scores > 90

---

**Estado del Plan:** ✅ COMPLETO Y LISTO PARA IMPLEMENTACIÓN

**Próximo Paso:** Comenzar con la FASE 1 - Extender entidad Product.ts