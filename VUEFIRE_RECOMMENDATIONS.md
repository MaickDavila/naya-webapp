# Recomendaciones para usar VueFire

## Estado Actual
- ✅ `vuefire` está instalado (v3.2.1)
- ❌ **NO se está usando** - Están usando Firebase directamente con `getDocs`, `getDoc`, etc.

## Ventajas de VueFire

### 1. **Reactividad Automática**
Los datos se actualizan automáticamente cuando cambian en Firestore, sin necesidad de recargar manualmente.

### 2. **Menos Código**
No necesitas manejar estados de `loading`, `error`, o llamadas manuales a `fetch`.

### 3. **Tiempo Real**
Los cambios en la base de datos se reflejan inmediatamente en la UI.

### 4. **Mejor Rendimiento**
VueFire gestiona las suscripciones de forma eficiente, evitando memory leaks.

## Estrategia Híbrida Recomendada

### ✅ Mantener Repositorios para SSR (Astro)
- Las páginas `.astro` deben seguir usando repositorios directamente
- Esto es necesario para Server-Side Rendering

### ✅ Usar VueFire en Componentes Vue
- Componentes que necesitan reactividad en tiempo real
- Componentes que solo se ejecutan en el cliente

## Ejemplo: MyProductsView con VueFire

**Antes (sin VueFire):**
```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuth } from '../../application/stores/authStore';
import { FirestoreProductRepository } from '../../infrastructure/repositories/FirestoreProductRepository';

const { user, initAuth } = useAuth();
const products = ref<Product[]>([]);
const loading = ref(true);
const productRepo = new FirestoreProductRepository();

const fetchUserProducts = async () => {
  if (!user.value) return;
  loading.value = true;
  try {
    products.value = await productRepo.getBySellerId(user.value.uid);
  } catch (error) {
    console.error("Error fetching user products:", error);
  } finally {
    loading.value = false;
  }
};

watch(user, (newUser) => {
  if (newUser) {
    fetchUserProducts();
  }
}, { immediate: true });
</script>
```

**Después (con VueFire):**
```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useFirestore, useCollection } from 'vuefire';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../application/stores/authStore';
import { ProductMapper } from '../../infrastructure/mappers/ProductMapper';
import type { Product } from '../../domain/entities/Product';

const { user, initAuth } = useAuth();
const db = useFirestore();

// Reactivo automáticamente - se actualiza cuando cambian los productos
const { data: productsData, pending: loading } = useCollection<Product>(
  computed(() => 
    user.value 
      ? query(
          collection(db, 'products'),
          where('sellerId', '==', user.value.uid),
          orderBy('createdAt', 'desc')
        )
      : null
  ),
  {
    wait: true, // Espera a que cargue antes de mostrar
  }
);

// Mapear a entidades de dominio
const products = computed(() => 
  productsData.value?.map((doc: any) => 
    ProductMapper.toDomain(doc.id, doc)
  ) || []
);

onMounted(() => {
  initAuth();
});
</script>
```

## Componentes Candidatos para VueFire

1. ✅ **MyProductsView** - Necesita actualizarse cuando se agregan/eliminan productos
2. ✅ **CartList** - Podría beneficiarse de actualizaciones en tiempo real
3. ✅ **ProductDetailView** - Si necesita mostrar cambios en tiempo real (precio, disponibilidad)
4. ✅ Cualquier componente que muestre datos que pueden cambiar frecuentemente

## Componentes que NO deben usar VueFire

1. ❌ Páginas Astro (SSR) - Deben usar repositorios directamente
2. ❌ Datos que solo se cargan una vez y no cambian

## Próximos Pasos

1. Refactorizar `MyProductsView` para usar VueFire
2. Evaluar otros componentes Vue que se beneficiarían
3. Mantener repositorios para SSR y casos de uso específicos
