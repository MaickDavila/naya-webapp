# Fix: Botón "Finalizar Compra" no funciona

## Problema
El botón de "Finalizar Compra" en `/checkout` no estaba funcionando debido a problemas de hidratación entre Astro y Vue.

## Solución Aplicada

### 1. Cambio de directiva de cliente
**Antes:**
```astro
<CheckoutView client:load />
```

**Después:**
```astro
<CheckoutView client:only="vue" />
```

**Razón:** `client:only="vue"` evita problemas de hidratación al renderizar el componente completamente en el cliente, mientras que `client:load` intenta hacer SSR primero.

### 2. Mejoras en el handler
- Agregado manejo de eventos con `preventDefault`
- Agregados logs de debugging para identificar problemas
- Mejorada la validación de URLs de pago
- Agregado `type="button"` al botón para evitar submit accidental

### 3. Logs de debugging
Se agregaron logs en:
- `onMounted` - Para verificar que el componente se monta
- `canCheckout` - Para verificar el estado del botón
- `handleCheckout` - Para rastrear el flujo de pago

## Cómo verificar que funciona

1. Abre la consola del navegador (F12)
2. Ve a `/checkout`
3. Deberías ver: `CheckoutView montado`
4. Agrega productos al carrito si no tienes
5. Haz clic en "Pagar con MercadoPago"
6. Deberías ver: `handleCheckout llamado` en la consola
7. Deberías ser redirigido a Mercado Pago

## Si aún no funciona

1. Verifica en la consola:
   - ¿Se monta el componente? (debe aparecer "CheckoutView montado")
   - ¿Tienes items en el carrito? (debe mostrar `itemsCount > 0`)
   - ¿Estás autenticado? (debe mostrar `hasUser: true`)
   - ¿El botón está habilitado? (debe mostrar `can: true`)

2. Verifica que:
   - Tienes productos en el carrito
   - Estás autenticado (inicia sesión si no lo estás)
   - Las funciones de Firebase están desplegadas

3. Si el botón está deshabilitado:
   - Verifica que `canCheckout` sea `true` en la consola
   - Asegúrate de tener items en el carrito
   - Asegúrate de estar autenticado

## Archivos modificados

- `web-app/src/pages/checkout.astro` - Cambio de `client:load` a `client:only="vue"`
- `web-app/src/presentation/components/CheckoutView.vue` - Mejoras en el handler y logs
