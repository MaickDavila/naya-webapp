import { reactive, computed, ref } from 'vue';
import type { Product, ProductCondition, ProductStatus } from '../../domain/entities/Product';
import { CONDITION_LABELS } from '../../domain/entities/Product';
import { useAuth } from './authStore';

// Tipo para condición en el formulario UI
type FormCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

// Estado del formulario de venta
interface SellFormState {
  currentStep: number;
  isSubmitting: boolean;
  error: string | null;
  draftSaved: boolean;
  lastSaved: Date | null;
}

// Datos del producto en el formulario
interface ProductFormData {
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  category: string;
  subcategory: string;
  brand: string;
  size: string;
  condition: FormCondition | '';
  images: string[];
}

// Estado global de productos
interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
  userProducts: Product[];
  statusFilter: ProductStatus | 'all';
}

const sellFormState = reactive<SellFormState>({
  currentStep: 1,
  isSubmitting: false,
  error: null,
  draftSaved: false,
  lastSaved: null,
});

const productFormData = reactive<ProductFormData>({
  title: '',
  description: '',
  price: '',
  originalPrice: '',
  category: '',
  subcategory: '',
  brand: '',
  size: '',
  condition: '',
  images: [],
});

const productsState = reactive<ProductsState>({
  products: [],
  loading: false,
  error: null,
  selectedProduct: null,
  userProducts: [],
  statusFilter: 'all',
});

// Opciones para el formulario (valores UI)
const conditionOptions = [
  { value: 'new' as FormCondition, label: 'Nuevo' },
  { value: 'like_new' as FormCondition, label: 'Como nuevo' },
  { value: 'good' as FormCondition, label: 'Bueno' },
  { value: 'fair' as FormCondition, label: 'Regular' },
  { value: 'poor' as FormCondition, label: 'Malo' },
];

const categories = [
  { id: 'ropa', name: 'Ropa', subcategories: ['Camisetas', 'Pantalones', 'Vestidos', 'Chaquetas'] },
  { id: 'calzado', name: 'Calzado', subcategories: ['Zapatillas', 'Botas', 'Sandalias', 'Tacones'] },
  { id: 'accesorios', name: 'Accesorios', subcategories: ['Bolsos', 'Relojes', 'Gafas', 'Joyería'] },
  { id: 'electronica', name: 'Electrónica', subcategories: ['Móviles', 'Portátiles', 'Tablets', 'Consolas'] },
  { id: 'hogar', name: 'Hogar', subcategories: ['Muebles', 'Decoración', 'Cocina', 'Jardín'] },
];

export const useProductStore = () => {
  const { user } = useAuth();

  // Computed properties para el formulario de venta
  const totalSteps = computed(() => 5);
  
  const canGoNext = computed(() => {
    switch (sellFormState.currentStep) {
      case 1:
        return productFormData.title.trim().length >= 3 && 
               productFormData.description.trim().length >= 10;
      case 2:
        return productFormData.category !== '';
      case 3:
        return productFormData.price !== '' && 
               parseFloat(productFormData.price) > 0 &&
               (!productFormData.originalPrice || parseFloat(productFormData.originalPrice) >= parseFloat(productFormData.price));
      case 4:
        return productFormData.condition !== '' && 
               productFormData.images.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  });

  const selectedCategory = computed(() => 
    categories.find(cat => cat.id === productFormData.category)
  );

  const remainingSlots = computed(() => 8 - productFormData.images.length);

  const stepTitle = computed(() => {
    const titles = [
      'Información Básica',
      'Categorización',
      'Precios',
      'Características',
      'Vista Previa'
    ];
    return titles[sellFormState.currentStep - 1];
  });

  // Computed properties para productos (ahora usa status en lugar de reviewStatus)
  const productsByStatus = computed(() => {
    if (productsState.statusFilter === 'all') {
      return productsState.userProducts;
    }
    return productsState.userProducts.filter(product => 
      product.status === productsState.statusFilter
    );
  });

  const pendingProducts = computed(() => 
    productsState.userProducts.filter(product => product.status === 'pending')
  );

  const approvedProducts = computed(() => 
    productsState.userProducts.filter(product => product.status === 'approved')
  );

  const rejectedProducts = computed(() => 
    productsState.userProducts.filter(product => product.status === 'rejected')
  );

  const soldProducts = computed(() => 
    productsState.userProducts.filter(product => product.status === 'sold')
  );

  // Acciones del formulario de venta
  const nextStep = () => {
    if (canGoNext.value && sellFormState.currentStep < totalSteps.value) {
      sellFormState.currentStep++;
      saveDraft();
      sellFormState.error = null;
    } else {
      sellFormState.error = 'Por favor completa todos los campos requeridos';
    }
  };

  const previousStep = () => {
    if (sellFormState.currentStep > 1) {
      sellFormState.currentStep--;
      sellFormState.error = null;
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps.value && step <= sellFormState.currentStep) {
      sellFormState.currentStep = step;
    }
  };

  const updateFormField = (field: keyof ProductFormData, value: any) => {
    (productFormData as any)[field] = value;
  };

  const addImages = (images: string[]) => {
    productFormData.images = [...productFormData.images, ...images];
  };

  const removeImage = (index: number) => {
    productFormData.images = productFormData.images.filter((_, i) => i !== index);
  };

  const resetForm = () => {
    Object.assign(productFormData, {
      title: '',
      description: '',
      price: '',
      originalPrice: '',
      category: '',
      subcategory: '',
      brand: '',
      size: '',
      condition: '',
      images: [],
    });
    
    Object.assign(sellFormState, {
      currentStep: 1,
      isSubmitting: false,
      error: null,
      draftSaved: false,
      lastSaved: null,
    });
  };

  const saveDraft = () => {
    if (!user.value) return;
    
    const draft = {
      ...productFormData,
      currentStep: sellFormState.currentStep,
      userId: user.value.uid,
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`sellFormDraft_${user.value.uid}`, JSON.stringify(draft));
    
    sellFormState.draftSaved = true;
    sellFormState.lastSaved = new Date();
    
    setTimeout(() => {
      sellFormState.draftSaved = false;
    }, 2000);
  };

  const loadDraft = () => {
    if (!user.value) return;
    
    const draftKey = `sellFormDraft_${user.value.uid}`;
    const draft = localStorage.getItem(draftKey);
    
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        
        // Cargar datos del formulario
        Object.assign(productFormData, {
          title: parsedDraft.title || '',
          description: parsedDraft.description || '',
          price: parsedDraft.price || '',
          originalPrice: parsedDraft.originalPrice || '',
          category: parsedDraft.category || '',
          subcategory: parsedDraft.subcategory || '',
          brand: parsedDraft.brand || '',
          size: parsedDraft.size || '',
          condition: parsedDraft.condition || '',
          images: parsedDraft.images || [],
        });
        
        sellFormState.currentStep = parsedDraft.currentStep || 1;
        
      } catch (error) {
        console.error('Error al cargar borrador:', error);
        clearDraft();
      }
    }
  };

  const clearDraft = () => {
    if (!user.value) return;
    localStorage.removeItem(`sellFormDraft_${user.value.uid}`);
  };

  const submitProduct = async () => {
    if (!user.value) {
      sellFormState.error = 'Debes estar autenticado para vender un producto';
      return null;
    }

    sellFormState.isSubmitting = true;
    sellFormState.error = null;

    try {
      // Nota: Este método es una simulación para testing.
      // En producción, el SellForm.vue usa directamente el CreateProductUseCase
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Crear producto compatible con el backend
      const product: Product = {
        id: `product_${Date.now()}`,
        sellerId: user.value.uid,
        sellerName: user.value.displayName || user.value.email?.split('@')[0] || 'Usuario',
        sellerEmail: user.value.email || '',
        title: productFormData.title.trim(),
        description: productFormData.description.trim(),
        price: parseFloat(productFormData.price),
        originalPrice: productFormData.originalPrice ? parseFloat(productFormData.originalPrice) : undefined,
        currency: 'USD',
        images: productFormData.images,
        category: productFormData.category,
        subcategory: productFormData.subcategory || undefined,
        brand: productFormData.brand.trim() || undefined,
        size: productFormData.size || undefined,
        condition: 'buen_estado', // Valor por defecto del backend
        tags: [],
        status: 'pending', // Pendiente de aprobación
        views: 0,
        favorites: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Limpiar formulario y draft
      resetForm();
      clearDraft();

      // Agregar a la lista de productos del usuario
      productsState.userProducts.unshift(product);

      return product;

    } catch (error) {
      console.error('Error al crear producto:', error);
      sellFormState.error = 'Error al crear el producto. Por favor intenta nuevamente.';
      return null;
    } finally {
      sellFormState.isSubmitting = false;
    }
  };

  // Acciones de productos
  const loadUserProducts = async () => {
    if (!user.value) return;
    
    productsState.loading = true;
    productsState.error = null;
    
    try {
      // Simulación de carga de productos
      // En una implementación real, esto usaría el repositorio
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos simulados para testing (compatible con backend)
      productsState.userProducts = [
        {
          id: 'product_1',
          sellerId: user.value.uid,
          sellerName: user.value.displayName || 'Usuario',
          sellerEmail: user.value.email || '',
          title: 'Zapatillas Nike Air Max',
          description: 'Zapatillas casi nuevas, usadas solo 3 veces',
          price: 89.99,
          originalPrice: 150.00,
          currency: 'USD',
          images: ['https://via.placeholder.com/400x300?text=Zapatillas'],
          category: 'calzado',
          subcategory: 'Zapatillas',
          brand: 'Nike',
          size: '42',
          condition: 'como_nuevo',
          tags: ['nike', 'zapatillas', 'calzado', 'air-max'],
          status: 'approved',
          views: 45,
          favorites: 12,
          publishedAt: new Date('2024-01-15'),
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: 'product_2',
          sellerId: user.value.uid,
          sellerName: user.value.displayName || 'Usuario',
          sellerEmail: user.value.email || '',
          title: 'Camiseta Adidas Original',
          description: 'Camiseta en excelente estado, talla M',
          price: 25.00,
          currency: 'USD',
          images: ['https://via.placeholder.com/400x300?text=Camiseta'],
          category: 'ropa',
          subcategory: 'Camisetas',
          brand: 'Adidas',
          size: 'M',
          condition: 'buen_estado',
          tags: ['adidas', 'camiseta', 'ropa'],
          status: 'pending',
          views: 0,
          favorites: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
    } catch (error) {
      console.error('Error al cargar productos:', error);
      productsState.error = 'Error al cargar tus productos';
    } finally {
      productsState.loading = false;
    }
  };

  const setStatusFilter = (status: ProductStatus | 'all') => {
    productsState.statusFilter = status;
  };

  const selectProduct = (product: Product) => {
    productsState.selectedProduct = product;
  };

  const clearSelectedProduct = () => {
    productsState.selectedProduct = null;
  };

  // Inicialización
  const initialize = () => {
    loadDraft();
    if (user.value) {
      loadUserProducts();
    }
  };

  return {
    // Estado del formulario
    sellFormState: computed(() => sellFormState),
    productFormData: computed(() => productFormData),
    
    // Computed del formulario
    totalSteps,
    canGoNext,
    selectedCategory,
    remainingSlots,
    stepTitle,
    
    // Opciones
    conditionOptions,
    categories,
    
    // Estado de productos
    productsState: computed(() => productsState),
    productsByStatus,
    pendingProducts,
    approvedProducts,
    rejectedProducts,
    soldProducts,
    
    // Acciones del formulario
    nextStep,
    previousStep,
    goToStep,
    updateFormField,
    addImages,
    removeImage,
    resetForm,
    saveDraft,
    loadDraft,
    clearDraft,
    submitProduct,
    
    // Acciones de productos
    loadUserProducts,
    setStatusFilter,
    selectProduct,
    clearSelectedProduct,
    
    // Inicialización
    initialize,
  };
};